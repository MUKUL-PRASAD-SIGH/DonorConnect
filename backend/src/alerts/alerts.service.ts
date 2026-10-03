import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Error as MongooseError, Model, Types } from 'mongoose';
import { randomInt } from 'crypto';
import {
  Alert,
  AlertDocument,
  AlertStatus,
  DispatchState,
  DonorResponse,
  ResponseStatus,
} from '../schemas/alert.schema';
import { Donor, DonorDocument } from '../schemas/donor.schema';
import { Hospital, HospitalDocument } from '../schemas/hospital.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateAlertDto } from './dto/create-alert.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { SocketGateway } from '../socket/socket.gateway';
import { BloodComponent, compatibleDonorGroups, donationTypeFor, haversineKm } from '../common/blood';
import { isEligibleFor } from '../eligibility/rules';
import {
  Candidate,
  acceptProbability,
  coverage,
  etaMinutesFor,
  holdMinutesFor,
  inviteDeficit,
  planWave,
  radiusLadder,
  showProbability,
  waveIntervalMinutes,
} from '../dispatch/planner';
import { COMPONENT_LABELS, donorView, hospitalView, phenotypeLabel, publicView } from './alert-views';

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L
const randomCode = (len: number) => Array.from({ length: len }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');

// Donors whose phenotype makes ABO typing misleading (Bombay types as "O")
const PHENOTYPE_OVERRIDES_ABO = new Set(['bombay', 'para_bombay']);

const OPEN_STATUSES = [ResponseStatus.INVITED, ResponseStatus.ACCEPTED, ResponseStatus.STANDBY];

type DonorEvent = { donorId: string; kind: 'invite' | 'confirmed' | 'standby' | 'stood_down' | 'lapsed' | 'closed' };

interface Effects {
  donorEvents: DonorEvent[];
  redispatch: boolean;
}

@Injectable()
export class AlertsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertsService.name);
  private timer: NodeJS.Timeout | undefined;
  private ticking = false;

  constructor(
    @InjectModel(Alert.name) private alertModel: Model<AlertDocument>,
    @InjectModel(Donor.name) private donorModel: Model<DonorDocument>,
    @InjectModel(Hospital.name) private hospitalModel: Model<HospitalDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private notificationsService: NotificationsService,
    private socketGateway: SocketGateway,
  ) {}

  async onModuleInit() {
    // Older versions used a TTL index that deleted alerts at expiry; we keep history now
    await this.alertModel.collection.dropIndex('expiresAt_1').catch(() => undefined);
    if (process.env.DISPATCH_TICK !== 'off') {
      this.timer = setInterval(() => void this.tick(), 30_000);
    }
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // ---------------------------------------------------------------- hospital

  async createAlert(dto: CreateAlertDto, hospitalUserId: string) {
    const hospital = await this.hospitalFor(hospitalUserId);
    const requiredBy = new Date(dto.requiredBy);
    if (requiredBy.getTime() < Date.now() - 60_000) {
      throw new BadRequestException('requiredBy must be in the future');
    }

    const alert = await this.alertModel.create({
      ...dto,
      component: dto.component || BloodComponent.WHOLE_BLOOD,
      hospitalId: hospital._id,
      publicCode: await this.uniquePublicCode(),
      // Keep accepting arrivals for a few hours past the deadline
      expiresAt: new Date(requiredBy.getTime() + 6 * 60 * 60 * 1000),
    });

    await this.hospitalModel.updateOne({ _id: hospital._id }, { $inc: { totalAlertsRaised: 1 } });
    await this.dispatchWave(String(alert._id));
    return this.hospitalAlertView(String(alert._id));
  }

  async getAlertsByHospital(hospitalUserId: string, status?: AlertStatus) {
    const hospital = await this.hospitalFor(hospitalUserId);
    const query: any = { hospitalId: hospital._id };
    if (status) query.status = status;
    const alerts = await this.alertModel.find(query).sort({ createdAt: -1 }).limit(100);
    const donors = await this.donorsById(alerts.flatMap((a) => a.responses.map((r) => r.donorId)));
    return alerts.map((a) => hospitalView(a, donors));
  }

  async closeAlert(alertId: string, status: AlertStatus.FULFILLED | AlertStatus.CANCELLED, hospitalUserId: string) {
    await this.assertOwner(alertId, hospitalUserId);
    const effects = await this.mutate(alertId, (alert, fx) => {
      if (alert.status !== AlertStatus.ACTIVE) return false;
      this.close(alert, status, fx);
    });
    await this.afterChange(alertId, effects);
    return this.hospitalAlertView(alertId);
  }

  async markArrived(alertId: string, donorId: string, hospitalUserId: string) {
    const hospital = await this.assertOwner(alertId, hospitalUserId);
    let component: BloodComponent;
    const effects = await this.mutate(alertId, (alert, fx) => {
      component = alert.component;
      const r = alert.responses.find((x) => String(x.donorId) === donorId);
      if (!r) throw new NotFoundException('Donor is not part of this request');
      if (r.status === ResponseStatus.ARRIVED) return false;
      r.status = ResponseStatus.ARRIVED;
      r.arrivedAt = new Date();
      alert.unitsCollected += 1;
      if (alert.unitsCollected >= alert.unitsNeeded) {
        this.close(alert, AlertStatus.FULFILLED, fx);
      } else {
        this.rebalance(alert, fx);
      }
    });

    if (effects) {
      const type = donationTypeFor(component);
      const now = new Date();
      await this.donorModel.updateOne(
        { _id: donorId },
        {
          $set: { [`lastDonations.${type}`]: now, lastDonationDate: now },
          $inc: { totalDonations: 1, rewardPoints: 10, 'reliability.arrived': 1 },
        },
      );
      await this.hospitalModel.updateOne({ _id: hospital._id }, { $inc: { successfulMatches: 1 } });
    }
    await this.afterChange(alertId, effects);
    return this.hospitalAlertView(alertId);
  }

  async markNoShow(alertId: string, donorId: string, hospitalUserId: string) {
    await this.assertOwner(alertId, hospitalUserId);
    const effects = await this.mutate(alertId, (alert, fx) => {
      const r = alert.responses.find((x) => String(x.donorId) === donorId);
      if (!r || r.status !== ResponseStatus.ACCEPTED) return false;
      this.lapse(alert, r, fx);
    });
    if (effects) await this.donorModel.updateOne({ _id: donorId }, { $inc: { 'reliability.lapsed': 1 } });
    await this.afterChange(alertId, effects);
    return this.hospitalAlertView(alertId);
  }

  // ------------------------------------------------------------------- donor

  async getInvites(donorUserId: string) {
    const donor = await this.donorFor(donorUserId);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const alerts = await this.alertModel
      .find({
        'responses.donorId': donor._id,
        $or: [{ status: AlertStatus.ACTIVE }, { closedAt: { $gte: since } }],
      })
      .sort({ createdAt: -1 })
      .limit(50);
    return this.withHospitals(alerts, (a, h, hu) => donorView(a, String(donor._id), h, hu));
  }

  /** Open requests a donor can volunteer for, even if they weren't in a wave yet. */
  async getNearbyForDonor(donorUserId: string, radiusKm = 25) {
    const donor = await this.donorFor(donorUserId);
    const user = await this.userModel.findById(donor.userId);
    const alerts = await this.alertModel
      .find({ status: AlertStatus.ACTIVE, 'responses.donorId': { $ne: donor._id } })
      .sort({ createdAt: -1 })
      .limit(200);
    const matching = alerts.filter((a) => this.donorMatches(donor, a));
    const views = await this.withHospitals(matching, (a, h, hu) => {
      const distanceKm = hu?.location && user?.location ? haversineKm(user.location.coordinates, hu.location.coordinates) : null;
      const limit = a.requiredPhenotype ? Infinity : radiusKm;
      if (distanceKm !== null && distanceKm > limit) return null;
      return { ...donorView(a, null, h, hu), distanceKm: distanceKm === null ? null : Math.round(distanceKm * 10) / 10 };
    });
    return views.filter(Boolean);
  }

  async respond(alertId: string, donorUserId: string, action: 'accept' | 'decline' | 'withdraw', notes?: string) {
    const donor = await this.donorFor(donorUserId);
    const donorId = String(donor._id);
    const donorUser = await this.userModel.findById(donor.userId);
    let becameCommitted = false;

    const effects = await this.mutate(alertId, async (alert, fx) => {
      if (alert.status !== AlertStatus.ACTIVE) throw new ForbiddenException('This request is no longer active');
      let r = alert.responses.find((x) => String(x.donorId) === donorId);

      if (action === 'accept') {
        if (!r) {
          // Volunteering from the nearby list or a shared link
          if (!this.donorMatches(donor, alert)) {
            throw new ForbiddenException('Your blood group or eligibility does not match this request');
          }
          const hospital = await this.hospitalModel.findById(alert.hospitalId);
          const hospitalUser = hospital && (await this.userModel.findById(hospital.userId));
          const distanceKm =
            hospitalUser?.location && donorUser?.location
              ? haversineKm(donorUser.location.coordinates, hospitalUser.location.coordinates)
              : 10;
          const eta = etaMinutesFor(distanceKm);
          alert.responses.push({
            donorId: donor._id as any,
            status: ResponseStatus.INVITED,
            wave: 0,
            invitedAt: new Date(),
            distanceKm: Math.round(distanceKm * 10) / 10,
            etaMinutes: eta,
            acceptProbability: 1,
            showProbability: showProbability(donor.reliability, eta, minutesUntil(alert.requiredBy)),
            replyCode: this.replyCodeFor(alert),
          } as DonorResponse);
          r = alert.responses[alert.responses.length - 1];
        }
        const acceptable = [ResponseStatus.INVITED, ResponseStatus.DECLINED, ResponseStatus.STOOD_DOWN, ResponseStatus.WITHDRAWN];
        if (!acceptable.includes(r.status as ResponseStatus)) return false;
        becameCommitted = r.status === ResponseStatus.INVITED;
        r.respondedAt = new Date();
        r.notes = notes;
        if (coverage(alert.unitsNeeded, alert.unitsCollected, alert.responses).openSlots > 0) {
          this.hold(r);
          fx.donorEvents.push({ donorId, kind: 'confirmed' });
        } else {
          r.status = ResponseStatus.STANDBY;
          fx.donorEvents.push({ donorId, kind: 'standby' });
        }
        this.rebalance(alert, fx);
      } else if (action === 'decline') {
        if (!r || r.status !== ResponseStatus.INVITED) return false;
        r.status = ResponseStatus.DECLINED;
        r.respondedAt = new Date();
        r.notes = notes;
        this.rebalance(alert, fx);
      } else {
        if (!r || ![ResponseStatus.ACCEPTED, ResponseStatus.STANDBY].includes(r.status as ResponseStatus)) return false;
        r.status = ResponseStatus.WITHDRAWN;
        r.respondedAt = new Date();
        r.notes = notes;
        r.holdExpiresAt = undefined;
        this.rebalance(alert, fx);
      }
    });

    if (becameCommitted) await this.donorModel.updateOne({ _id: donor._id }, { $inc: { 'reliability.accepted': 1 } });
    await this.afterChange(alertId, effects);
    const alert = await this.alertModel.findById(alertId);
    const [view] = await this.withHospitals([alert], (a, h, hu) => donorView(a, donorId, h, hu));
    return view;
  }

  /** Handles "YES K7Q2" / "NO K7Q2" text replies from donors without the app. */
  async respondBySms(fromPhone: string, body: string): Promise<string> {
    const m = /^\s*(yes|y|no|n)\s+([a-z0-9]{4,6})\s*$/i.exec(body || '');
    if (!m) return 'Reply YES <code> to help or NO <code> to decline.';
    const code = m[2].toUpperCase();
    const alert = await this.alertModel.findOne({ status: AlertStatus.ACTIVE, 'responses.replyCode': code });
    const r = alert?.responses.find((x) => x.replyCode === code);
    if (!alert || !r) return 'That code has expired. Thank you for being willing to help!';
    const donor = await this.donorModel.findById(r.donorId);
    const user = donor && (await this.userModel.findById(donor.userId));
    if (!user || !samePhone(user.phone, fromPhone)) return 'This code was not sent to this number.';
    const accept = m[1].toLowerCase().startsWith('y');
    const view: any = await this.respond(String(alert._id), String(user._id), accept ? 'accept' : 'decline');
    if (!accept) return 'Thanks for letting us know.';
    return view?.myResponse?.status === ResponseStatus.ACCEPTED
      ? `Confirmed — your slot is held. Please head to ${view.hospital?.name}${view.hospital?.address ? `, ${view.hospital.address}` : ''}.`
      : 'All slots are filled right now — you are on standby and we will text you if one opens.';
  }

  // ------------------------------------------------------------------ public

  async getPublicRequest(code: string) {
    const alert = await this.alertModel.findOne({ publicCode: code.toUpperCase() });
    if (!alert) throw new NotFoundException('Request not found');
    const [view] = await this.withHospitals([alert], (a, h, hu) => publicView(a, h, hu));
    return view;
  }

  // ---------------------------------------------------------------- dispatch

  /** Invite the next ranked wave if the expected arrivals don't cover the need yet. */
  async dispatchWave(alertId: string) {
    const alert = await this.alertModel.findById(alertId);
    if (!alert || alert.status !== AlertStatus.ACTIVE) return;
    if (alert.dispatchState === DispatchState.COVERED || alert.dispatchState === DispatchState.CLOSED) return;

    const deficit = inviteDeficit(alert.unitsNeeded, alert.unitsCollected, alert.responses);
    if (deficit <= 0) return;

    const hospital = await this.hospitalModel.findById(alert.hospitalId);
    const hospitalUser = hospital && (await this.userModel.findById(hospital.userId));
    if (!hospitalUser?.location) return;

    const ladder = radiusLadder(alert.searchRadius, !!alert.requiredPhenotype);
    let level = Math.min(alert.escalationLevel, ladder.length - 1);
    let candidates: Candidate[] = [];
    for (; level < ladder.length; level++) {
      candidates = await this.findCandidates(alert, hospitalUser.location.coordinates, ladder[level]);
      if (candidates.length) break;
    }

    const wave = planWave(candidates, deficit);
    const invitedIds: string[] = [];
    const effects = await this.mutate(alertId, (a, fx) => {
      if (a.status !== AlertStatus.ACTIVE || a.dispatchState === DispatchState.COVERED) return false;
      if (!wave.length) {
        if (a.dispatchState === DispatchState.EXHAUSTED) return false;
        a.dispatchState = DispatchState.EXHAUSTED;
        a.escalationLevel = ladder.length - 1;
        return;
      }
      const already = new Set(a.responses.map((r) => String(r.donorId)));
      const fresh = wave.filter((c) => !already.has(c.donorId));
      if (!fresh.length) return false;
      const number = a.waves.length + 1;
      for (const c of fresh) {
        a.responses.push({
          donorId: new Types.ObjectId(c.donorId),
          status: ResponseStatus.INVITED,
          wave: number,
          invitedAt: new Date(),
          distanceKm: Math.round(c.distanceKm * 10) / 10,
          etaMinutes: c.etaMinutes,
          acceptProbability: round2(c.acceptProbability),
          showProbability: round2(c.showProbability),
          replyCode: this.replyCodeFor(a),
        } as DonorResponse);
        fx.donorEvents.push({ donorId: c.donorId, kind: 'invite' });
        invitedIds.push(c.donorId);
      }
      a.waves.push({ number, sentAt: new Date(), radiusKm: ladder[level], invited: fresh.length });
      a.escalationLevel = level;
      a.dispatchState = DispatchState.DISPATCHING;
    });

    if (invitedIds.length) {
      await this.donorModel.updateMany({ _id: { $in: invitedIds } }, { $inc: { 'reliability.invited': 1 } });
    }
    await this.afterChange(alertId, effects, { skipRedispatch: true });
  }

  private async findCandidates(alert: AlertDocument, origin: number[], radiusKm: number | null): Promise<Candidate[]> {
    const excluded = alert.responses.map((r) => r.donorId);
    const query: any = {
      _id: { $nin: excluded },
      availableForEmergency: true,
      notificationsEnabled: true,
    };
    if (alert.requiredPhenotype) query.rarePhenotypes = alert.requiredPhenotype;
    if (!PHENOTYPE_OVERRIDES_ABO.has(alert.requiredPhenotype)) {
      query.bloodGroup = { $in: compatibleDonorGroups(alert.bloodGroup, alert.component) };
    }

    if (radiusKm !== null) {
      const nearby = await this.userModel
        .find({
          role: 'donor',
          isActive: true,
          location: { $nearSphere: { $geometry: { type: 'Point', coordinates: origin }, $maxDistance: radiusKm * 1000 } },
        })
        .select('_id')
        .limit(2000);
      query.userId = { $in: nearby.map((u) => u._id) };
    }

    const donors = await this.donorModel.find(query).populate('userId', 'location isActive').limit(2000);
    const type = donationTypeFor(alert.component);
    const now = new Date();
    const minutesLeft = minutesUntil(alert.requiredBy);

    return donors
      .filter((d: any) => d.userId?.isActive && d.userId?.location)
      .filter((d) => isEligibleFor(this.facts(d), type, now))
      .map((d: any) => {
        const distanceKm = haversineKm(origin, d.userId.location.coordinates);
        const etaMinutes = etaMinutesFor(distanceKm);
        return {
          donorId: String(d._id),
          distanceKm,
          etaMinutes,
          acceptProbability: acceptProbability(d.reliability),
          showProbability: showProbability(d.reliability, etaMinutes, minutesLeft),
        };
      })
      .filter((c) => radiusKm === null || c.distanceKm <= radiusKm);
  }

  /** Periodic housekeeping: expire requests, release lapsed holds, send due waves. */
  async tick() {
    if (this.ticking) return;
    this.ticking = true;
    try {
      const now = new Date();

      const expired = await this.alertModel.find({ status: AlertStatus.ACTIVE, expiresAt: { $lt: now } }).select('_id');
      for (const { _id } of expired) {
        const fx = await this.mutate(String(_id), (a, e) => {
          if (a.status !== AlertStatus.ACTIVE) return false;
          this.close(a, AlertStatus.EXPIRED, e);
        });
        await this.afterChange(String(_id), fx);
      }

      const lapsing = await this.alertModel
        .find({ status: AlertStatus.ACTIVE, responses: { $elemMatch: { status: ResponseStatus.ACCEPTED, holdExpiresAt: { $lt: now } } } })
        .select('_id');
      for (const { _id } of lapsing) {
        const lapsedDonors: string[] = [];
        const fx = await this.mutate(String(_id), (a, e) => {
          const due = a.responses.filter((r) => r.status === ResponseStatus.ACCEPTED && r.holdExpiresAt && r.holdExpiresAt < now);
          if (!due.length) return false;
          for (const r of due) {
            this.lapse(a, r, e);
            lapsedDonors.push(String(r.donorId));
          }
        });
        if (lapsedDonors.length) {
          await this.donorModel.updateMany({ _id: { $in: lapsedDonors } }, { $inc: { 'reliability.lapsed': 1 } });
        }
        await this.afterChange(String(_id), fx);
      }

      const dispatching = await this.alertModel.find({
        status: AlertStatus.ACTIVE,
        dispatchState: { $in: [DispatchState.DISPATCHING, DispatchState.EXHAUSTED] },
      });
      for (const a of dispatching) {
        const last = a.waves[a.waves.length - 1];
        // Exhausted requests re-check every 30 min in case new donors registered
        const interval = a.dispatchState === DispatchState.EXHAUSTED ? 30 : waveIntervalMinutes(a.priority, a.isPlanned);
        if (!last || now.getTime() - new Date(last.sentAt).getTime() >= interval * 60000) {
          await this.dispatchWave(String(a._id));
        }
      }
    } catch (error) {
      this.logger.error('Dispatch tick failed', error as Error);
    } finally {
      this.ticking = false;
    }
  }

  // ----------------------------------------------------------- state helpers

  private hold(r: DonorResponse) {
    r.status = ResponseStatus.ACCEPTED;
    r.holdExpiresAt = new Date(Date.now() + holdMinutesFor(r.etaMinutes || 30) * 60000);
  }

  private lapse(alert: AlertDocument, r: DonorResponse, fx: Effects) {
    r.status = ResponseStatus.LAPSED;
    r.holdExpiresAt = undefined;
    fx.donorEvents.push({ donorId: String(r.donorId), kind: 'lapsed' });
    this.rebalance(alert, fx);
  }

  /**
   * Keep slots consistent after any change: promote standby donors into free
   * slots, stand down pending invites once covered, reopen dispatch if not.
   */
  private rebalance(alert: AlertDocument, fx: Effects) {
    let cov = coverage(alert.unitsNeeded, alert.unitsCollected, alert.responses);
    for (const r of alert.responses) {
      if (cov.openSlots <= 0) break;
      if (r.status === ResponseStatus.STANDBY) {
        this.hold(r);
        fx.donorEvents.push({ donorId: String(r.donorId), kind: 'confirmed' });
        cov = coverage(alert.unitsNeeded, alert.unitsCollected, alert.responses);
      }
    }

    if (cov.openSlots === 0) {
      alert.dispatchState = DispatchState.COVERED;
      for (const r of alert.responses) {
        if (r.status === ResponseStatus.INVITED) {
          r.status = ResponseStatus.STOOD_DOWN;
          fx.donorEvents.push({ donorId: String(r.donorId), kind: 'stood_down' });
        }
      }
    } else if (alert.dispatchState === DispatchState.COVERED) {
      alert.dispatchState = DispatchState.DISPATCHING;
      fx.redispatch = true;
    } else if (inviteDeficit(alert.unitsNeeded, alert.unitsCollected, alert.responses) > 0) {
      fx.redispatch = true;
    }
  }

  private close(alert: AlertDocument, status: AlertStatus, fx: Effects) {
    alert.status = status;
    alert.dispatchState = DispatchState.CLOSED;
    alert.closedAt = new Date();
    for (const r of alert.responses) {
      if (OPEN_STATUSES.includes(r.status as ResponseStatus)) {
        r.status = ResponseStatus.STOOD_DOWN;
        r.holdExpiresAt = undefined;
        fx.donorEvents.push({ donorId: String(r.donorId), kind: 'closed' });
      }
    }
  }

  /**
   * Load → modify → save with optimistic concurrency, retrying on conflicts so
   * two donors accepting the last slot at the same moment can't both get it.
   * Returns null when the mutator decided there was nothing to do.
   */
  private async mutate(
    alertId: string,
    fn: (alert: AlertDocument, fx: Effects) => void | boolean | Promise<void | boolean>,
  ): Promise<Effects | null> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const alert = await this.alertModel.findById(alertId);
      if (!alert) throw new NotFoundException('Alert not found');
      const fx: Effects = { donorEvents: [], redispatch: false };
      if ((await fn(alert, fx)) === false) return null;
      try {
        await alert.save();
        return fx;
      } catch (error) {
        if (error instanceof MongooseError.VersionError) continue;
        throw error;
      }
    }
    throw new BadRequestException('Request is busy, please try again');
  }

  private async afterChange(alertId: string, fx: Effects | null, opts: { skipRedispatch?: boolean } = {}) {
    if (!fx) return;
    const alert = await this.alertModel.findById(alertId);
    if (!alert) return;
    const hospital = await this.hospitalModel.findById(alert.hospitalId);
    const hospitalUser = hospital && (await this.userModel.findById(hospital.userId));

    if (hospital) {
      const donors = await this.donorsById(alert.responses.map((r) => r.donorId));
      this.socketGateway.toUser(String(hospital.userId), 'alert:update', hospitalView(alert, donors));
    }
    this.socketGateway.toPublicRequest(alert.publicCode, publicView(alert, hospital, hospitalUser));

    if (fx.donorEvents.length) {
      const donors = await this.donorModel
        .find({ _id: { $in: fx.donorEvents.map((e) => e.donorId) } })
        .populate('userId', 'name phone email');
      const byId = new Map(donors.map((d) => [String(d._id), d]));
      for (const event of fx.donorEvents) {
        const donor: any = byId.get(event.donorId);
        if (!donor?.userId) continue;
        const view = donorView(alert, event.donorId, hospital, hospitalUser);
        this.socketGateway.toUser(String(donor.userId._id), 'invite:update', { kind: event.kind, alert: view });
        void this.notifyDonor(donor, event.kind, alert, hospital, hospitalUser);
      }
    }

    if (fx.redispatch && !opts.skipRedispatch) await this.dispatchWave(alertId);
  }

  private async notifyDonor(donor: any, kind: DonorEvent['kind'], alert: AlertDocument, hospital: any, hospitalUser: any) {
    const user = donor.userId;
    const r = alert.responses.find((x) => String(x.donorId) === String(donor._id));
    const what = `${alert.bloodGroup} ${COMPONENT_LABELS[alert.component]}${
      alert.requiredPhenotype ? ` (${phenotypeLabel(alert.requiredPhenotype)})` : ''
    }`;
    const name = hospital?.hospitalName || 'A hospital';
    const link = `${process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000'}/r/${alert.publicCode}`;

    const messages: Record<DonorEvent['kind'], [string, string] | null> = {
      invite: [
        alert.isPlanned ? 'Blood appointment request' : 'Urgent blood request',
        `${name} needs ${what}. You're a match about ${r?.distanceKm ?? '?'} km away. ` +
          `Reply YES ${r?.replyCode} to hold a slot or NO ${r?.replyCode}. Details: ${link}`,
      ],
      confirmed: [
        'Your slot is confirmed',
        `Thank you! Your slot at ${name} is held. Address: ${hospitalUser?.address || 'see app'}. ` +
          `Hospital contact: ${hospital?.emergencyContact || 'see app'}.`,
      ],
      standby: ['You are on standby', `All slots at ${name} are filled. You're on standby — we'll tell you if one opens.`],
      stood_down: ['Request covered — thank you', `${name}'s request for ${what} is now covered. No need to travel. Thank you!`],
      lapsed: ['Your slot was released', `Your held slot at ${name} expired and was offered to another donor.`],
      closed: ['Request closed', `${name}'s request for ${what} has closed. Thank you for being ready to help.`],
    };
    const msg = messages[kind];
    if (!msg) return;
    const [title, body] = msg;
    await Promise.allSettled([
      this.notificationsService.sendSMS(user.phone, body),
      this.notificationsService.sendEmail(user.email, title, body),
      donor.fcmToken ? this.notificationsService.sendPushNotification(donor.fcmToken, title, body) : Promise.resolve(true),
    ]);
  }

  // --------------------------------------------------------------- lookups

  private facts(d: any) {
    return {
      dateOfBirth: d.dateOfBirth,
      weightKg: d.weight,
      sex: d.sex,
      lastDonations: d.lastDonations,
      screening: d.screening,
    };
  }

  private donorMatches(donor: DonorDocument, alert: AlertDocument) {
    if (alert.requiredPhenotype && !(donor.rarePhenotypes || []).includes(alert.requiredPhenotype)) return false;
    if (!PHENOTYPE_OVERRIDES_ABO.has(alert.requiredPhenotype)) {
      if (!compatibleDonorGroups(alert.bloodGroup, alert.component).includes(donor.bloodGroup)) return false;
    }
    return isEligibleFor(this.facts(donor), donationTypeFor(alert.component));
  }

  private replyCodeFor(alert: AlertDocument) {
    const used = new Set(alert.responses.map((r) => r.replyCode));
    let code: string;
    do code = randomCode(4);
    while (used.has(code));
    return code;
  }

  private async uniquePublicCode() {
    for (;;) {
      const code = randomCode(8);
      if (!(await this.alertModel.exists({ publicCode: code }))) return code;
    }
  }

  private async hospitalFor(userId: string) {
    const hospital = await this.hospitalModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!hospital) throw new NotFoundException('Hospital profile not found');
    return hospital;
  }

  private async donorFor(userId: string) {
    const donor = await this.donorModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!donor) throw new NotFoundException('Donor profile not found');
    return donor;
  }

  private async assertOwner(alertId: string, hospitalUserId: string) {
    if (!Types.ObjectId.isValid(alertId)) throw new NotFoundException('Alert not found');
    const [alert, hospital] = await Promise.all([this.alertModel.findById(alertId), this.hospitalFor(hospitalUserId)]);
    if (!alert) throw new NotFoundException('Alert not found');
    if (String(alert.hospitalId) !== String(hospital._id)) throw new ForbiddenException('Not authorized to update this alert');
    return hospital;
  }

  private async hospitalAlertView(alertId: string) {
    const alert = await this.alertModel.findById(alertId);
    const donors = await this.donorsById(alert.responses.map((r) => r.donorId));
    return hospitalView(alert, donors);
  }

  private async donorsById(ids: any[]) {
    const donors = await this.donorModel.find({ _id: { $in: ids } }).populate('userId', 'name phone');
    return new Map(donors.map((d) => [String(d._id), d]));
  }

  private async withHospitals<T>(alerts: AlertDocument[], fn: (a: AlertDocument, h: any, hu: any) => T): Promise<T[]> {
    const hospitals = await this.hospitalModel
      .find({ _id: { $in: alerts.map((a) => a.hospitalId) } })
      .populate('userId', 'address location');
    const byId = new Map(hospitals.map((h) => [String(h._id), h]));
    return alerts.map((a) => {
      const h: any = byId.get(String(a.hospitalId));
      return fn(a, h, h?.userId);
    });
  }
}

const minutesUntil = (d: Date) => (new Date(d).getTime() - Date.now()) / 60000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const digits = (p: string) => (p || '').replace(/\D/g, '');
// Compare on the last 10 digits so "+91 98xxx" matches "98xxx"
const samePhone = (a: string, b: string) => digits(a).slice(-10) === digits(b).slice(-10) && digits(a).length >= 7;

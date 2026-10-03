import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  InventoryLot,
  InventoryLotDocument,
  LotStatus,
  TransferOffer,
  TransferOfferDocument,
  TransferStatus,
  UsageEvent,
  UsageEventDocument,
  UsageKind,
} from '../schemas/inventory.schema';
import { Hospital, HospitalDocument } from '../schemas/hospital.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { BloodComponent, BloodGroup, SHELF_LIFE_DAYS, compatibleDonorGroups, haversineKm } from '../common/blood';
import { FORECAST, ForecastResult, forecast } from './forecast';
import { AddLotDto, CreateOfferDto, RecordUsageDto } from './dto/inventory.dto';
import { SocketGateway } from '../socket/socket.gateway';

const DAY = 24 * 60 * 60 * 1000;
const EXCHANGE_RADIUS_KM = 40;
const key = (g: string, c: string) => `${g}|${c}`;

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(InventoryLot.name) private lotModel: Model<InventoryLotDocument>,
    @InjectModel(UsageEvent.name) private usageModel: Model<UsageEventDocument>,
    @InjectModel(TransferOffer.name) private offerModel: Model<TransferOfferDocument>,
    @InjectModel(Hospital.name) private hospitalModel: Model<HospitalDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private socketGateway: SocketGateway,
  ) {}

  // ------------------------------------------------------------- inventory

  async getInventory(hospitalUserId: string) {
    const hospital = await this.hospitalFor(hospitalUserId);
    await this.expireLots(hospital._id);
    const lots = await this.lotModel
      .find({ hospitalId: hospital._id, status: LotStatus.AVAILABLE })
      .sort({ expiresAt: 1 });

    const totals = new Map<string, { bloodGroup: string; component: string; units: number; earliestExpiry: Date }>();
    for (const l of lots) {
      const k = key(l.bloodGroup, l.component);
      const t = totals.get(k) || { bloodGroup: l.bloodGroup, component: l.component, units: 0, earliestExpiry: l.expiresAt };
      t.units += l.units;
      if (l.expiresAt < t.earliestExpiry) t.earliestExpiry = l.expiresAt;
      totals.set(k, t);
    }
    return { lots, totals: [...totals.values()] };
  }

  async addLot(hospitalUserId: string, dto: AddLotDto) {
    const hospital = await this.hospitalFor(hospitalUserId);
    const collectedAt = dto.collectedAt ? new Date(dto.collectedAt) : new Date();
    const expiresAt = dto.expiresAt
      ? new Date(dto.expiresAt)
      : new Date(collectedAt.getTime() + SHELF_LIFE_DAYS[dto.component] * DAY);
    if (expiresAt <= new Date()) throw new BadRequestException('This lot has already expired');
    await this.lotModel.create({ ...dto, hospitalId: hospital._id, collectedAt, expiresAt, source: dto.source || 'donation' });
    return this.getInventory(hospitalUserId);
  }

  /** Consume units first-expiry-first-out and log usage for forecasting. */
  async recordUsage(hospitalUserId: string, dto: RecordUsageDto) {
    const hospital = await this.hospitalFor(hospitalUserId);
    await this.expireLots(hospital._id);
    const lots = await this.lotModel
      .find({ hospitalId: hospital._id, status: LotStatus.AVAILABLE, bloodGroup: dto.bloodGroup, component: dto.component })
      .sort({ expiresAt: 1 });
    const available = lots.reduce((s, l) => s + l.units, 0);
    if (available < dto.units) throw new BadRequestException(`Only ${available} unit(s) in stock`);

    let need = dto.units;
    for (const lot of lots) {
      if (need <= 0) break;
      const take = Math.min(lot.units, need);
      lot.units -= take;
      if (lot.units === 0) lot.status = LotStatus.DEPLETED;
      need -= take;
      await lot.save();
    }
    await this.usageModel.create({ ...dto, hospitalId: hospital._id, kind: UsageKind.USED, at: new Date() });
    return this.getInventory(hospitalUserId);
  }

  async discardLot(hospitalUserId: string, lotId: string) {
    const hospital = await this.hospitalFor(hospitalUserId);
    const lot = await this.ownLot(hospital._id, lotId);
    await this.usageModel.create({
      hospitalId: hospital._id,
      bloodGroup: lot.bloodGroup,
      component: lot.component,
      units: lot.units,
      kind: UsageKind.EXPIRED,
      at: new Date(),
    });
    lot.status = LotStatus.DISCARDED;
    await lot.save();
    return this.getInventory(hospitalUserId);
  }

  // -------------------------------------------------------------- forecast

  async getForecast(hospitalUserId: string) {
    const hospital = await this.hospitalFor(hospitalUserId);
    const results = await this.forecastsFor(hospital._id);
    return {
      horizonDays: FORECAST.horizonDays,
      generatedAt: new Date(),
      items: results.sort(
        (a, b) =>
          (a.shortfallDate?.getTime() ?? Infinity) - (b.shortfallDate?.getTime() ?? Infinity) ||
          b.projectedWastage.length - a.projectedWastage.length,
      ),
    };
  }

  private async forecastsFor(hospitalId: Types.ObjectId | any, only?: Set<string>): Promise<ForecastResult[]> {
    await this.expireLots(hospitalId);
    const since = new Date(Date.now() - FORECAST.historyDays * DAY);
    const [lots, usage, first] = await Promise.all([
      this.lotModel.find({ hospitalId, status: LotStatus.AVAILABLE }),
      this.usageModel.find({ hospitalId, kind: UsageKind.USED, at: { $gte: since } }),
      this.usageModel.aggregate([
        { $match: { hospitalId, kind: UsageKind.USED } },
        { $group: { _id: { g: '$bloodGroup', c: '$component' }, first: { $min: '$at' } } },
      ]),
    ]);

    const keys = new Set<string>([
      ...lots.map((l) => key(l.bloodGroup, l.component)),
      ...usage.map((u) => key(u.bloodGroup, u.component)),
    ]);
    const firstByKey = new Map(first.map((f) => [key(f._id.g, f._id.c), f.first as Date]));

    return [...keys]
      .filter((k) => !only || only.has(k))
      .map((k) => {
        const [g, c] = k.split('|') as [BloodGroup, BloodComponent];
        return forecast(
          g,
          c,
          lots.filter((l) => l.bloodGroup === g && l.component === c).map((l) => ({ id: String(l._id), units: l.units, expiresAt: l.expiresAt })),
          usage.filter((u) => u.bloodGroup === g && u.component === c),
          new Date(),
          firstByKey.get(k),
        );
      });
  }

  // -------------------------------------------------------------- exchange

  /**
   * Units this hospital will likely waste, matched to nearby hospitals whose
   * forecast says they'll run short of a compatible group before those units expire.
   */
  async getExchangeSuggestions(hospitalUserId: string) {
    const hospital = await this.hospitalFor(hospitalUserId);
    const mine = await this.forecastsFor(hospital._id);
    const surplus = mine.flatMap((f) => f.projectedWastage.map((w) => ({ ...w, bloodGroup: f.bloodGroup, component: f.component })));
    if (!surplus.length) return [];

    const me = await this.userModel.findById(hospital.userId);
    if (!me?.location) return [];
    const neighbours = await this.nearbyHospitals(me.location.coordinates, hospital._id);
    const openOffers = await this.offerModel.find({
      fromHospitalId: hospital._id,
      status: { $in: [TransferStatus.OFFERED, TransferStatus.ACCEPTED] },
    });

    const suggestions = [];
    for (const n of neighbours) {
      const theirs = await this.forecastsFor(n.hospital._id);
      for (const s of surplus) {
        const offered = openOffers.filter((o) => String(o.lotId) === s.lotId).reduce((sum, o) => sum + o.units, 0);
        const units = s.units - offered;
        if (units <= 0) continue;
        // Recipient groups that can safely receive this lot's group
        const match = theirs.find(
          (t) =>
            t.component === s.component &&
            compatibleDonorGroups(t.bloodGroup, t.component).includes(s.bloodGroup) &&
            t.shortfallDate &&
            t.shortfallDate < s.expiresAt,
        );
        if (!match) continue;
        suggestions.push({
          lotId: s.lotId,
          bloodGroup: s.bloodGroup,
          component: s.component,
          expiresAt: s.expiresAt,
          unitsAtRisk: units,
          suggestedUnits: Math.max(1, Math.min(units, match.unitsShortByHorizon || units)),
          to: {
            hospitalId: String(n.hospital._id),
            name: n.hospital.hospitalName,
            verified: n.hospital.isVerified,
            distanceKm: n.distanceKm,
            shortfallGroup: match.bloodGroup,
            shortfallDate: match.shortfallDate,
            unitsShort: match.unitsShortByHorizon,
          },
        });
      }
    }
    return suggestions.sort((a, b) => +a.expiresAt - +b.expiresAt || a.to.distanceKm - b.to.distanceKm);
  }

  async listOffers(hospitalUserId: string) {
    const hospital = await this.hospitalFor(hospitalUserId);
    const offers = await this.offerModel
      .find({ $or: [{ fromHospitalId: hospital._id }, { toHospitalId: hospital._id }] })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('fromHospitalId', 'hospitalName isVerified emergencyContact')
      .populate('toHospitalId', 'hospitalName isVerified emergencyContact');
    return offers.map((o: any) => ({
      _id: String(o._id),
      direction: String(o.fromHospitalId._id) === String(hospital._id) ? 'outgoing' : 'incoming',
      from: { id: String(o.fromHospitalId._id), name: o.fromHospitalId.hospitalName, contact: o.fromHospitalId.emergencyContact },
      to: { id: String(o.toHospitalId._id), name: o.toHospitalId.hospitalName, contact: o.toHospitalId.emergencyContact },
      bloodGroup: o.bloodGroup,
      component: o.component,
      units: o.units,
      expiresAt: o.expiresAt,
      distanceKm: o.distanceKm,
      status: o.status,
      note: o.note,
      createdAt: o.createdAt,
    }));
  }

  async createOffer(hospitalUserId: string, dto: CreateOfferDto) {
    const hospital = await this.hospitalFor(hospitalUserId);
    const lot = await this.ownLot(hospital._id, dto.lotId);
    if (dto.units > lot.units) throw new BadRequestException(`Lot only has ${lot.units} unit(s)`);
    if (String(dto.toHospitalId) === String(hospital._id)) throw new BadRequestException('Cannot offer to yourself');
    const target = await this.hospitalModel.findById(dto.toHospitalId);
    if (!target) throw new NotFoundException('Hospital not found');

    const [a, b] = await Promise.all([this.userModel.findById(hospital.userId), this.userModel.findById(target.userId)]);
    const distanceKm = a?.location && b?.location ? Math.round(haversineKm(a.location.coordinates, b.location.coordinates) * 10) / 10 : undefined;

    const offer = await this.offerModel.create({
      fromHospitalId: hospital._id,
      toHospitalId: target._id,
      lotId: lot._id,
      bloodGroup: lot.bloodGroup,
      component: lot.component,
      units: dto.units,
      expiresAt: lot.expiresAt,
      distanceKm,
      note: dto.note,
    });
    this.socketGateway.toUser(String(target.userId), 'exchange:update', { offerId: String(offer._id), status: offer.status });
    return this.listOffers(hospitalUserId);
  }

  async updateOffer(hospitalUserId: string, offerId: string, action: 'accept' | 'decline' | 'cancel' | 'complete') {
    const hospital = await this.hospitalFor(hospitalUserId);
    if (!Types.ObjectId.isValid(offerId)) throw new NotFoundException('Offer not found');
    const offer = await this.offerModel.findById(offerId);
    if (!offer) throw new NotFoundException('Offer not found');
    const isSender = String(offer.fromHospitalId) === String(hospital._id);
    const isReceiver = String(offer.toHospitalId) === String(hospital._id);
    if (!isSender && !isReceiver) throw new ForbiddenException('Not your offer');

    const transitions: Record<string, { who: boolean; from: TransferStatus[]; to: TransferStatus }> = {
      accept: { who: isReceiver, from: [TransferStatus.OFFERED], to: TransferStatus.ACCEPTED },
      decline: { who: isReceiver, from: [TransferStatus.OFFERED], to: TransferStatus.DECLINED },
      cancel: { who: isSender, from: [TransferStatus.OFFERED, TransferStatus.ACCEPTED], to: TransferStatus.CANCELLED },
      // The receiving hospital confirms the units physically arrived
      complete: { who: isReceiver, from: [TransferStatus.ACCEPTED], to: TransferStatus.COMPLETED },
    };
    const t = transitions[action];
    if (!t.who) throw new ForbiddenException(`Only the ${action === 'cancel' ? 'sending' : 'receiving'} hospital can ${action}`);
    if (!t.from.includes(offer.status)) throw new BadRequestException(`Offer is ${offer.status}`);

    if (action === 'complete') await this.moveUnits(offer);
    offer.status = t.to;
    await offer.save();

    const other = await this.hospitalModel.findById(isSender ? offer.toHospitalId : offer.fromHospitalId);
    if (other) this.socketGateway.toUser(String(other.userId), 'exchange:update', { offerId, status: offer.status });
    return this.listOffers(hospitalUserId);
  }

  private async moveUnits(offer: TransferOfferDocument) {
    const lot = await this.lotModel.findOneAndUpdate(
      { _id: offer.lotId, status: LotStatus.AVAILABLE, units: { $gte: offer.units } },
      { $inc: { units: -offer.units } },
      { new: true },
    );
    if (!lot) throw new BadRequestException('The sending hospital no longer has these units');
    if (lot.units === 0) await this.lotModel.updateOne({ _id: lot._id }, { $set: { status: LotStatus.DEPLETED } });
    if (lot.expiresAt <= new Date()) throw new BadRequestException('These units have expired');

    const sender = await this.hospitalModel.findById(offer.fromHospitalId);
    await this.lotModel.create({
      hospitalId: offer.toHospitalId,
      bloodGroup: lot.bloodGroup,
      component: lot.component,
      units: offer.units,
      collectedAt: lot.collectedAt,
      expiresAt: lot.expiresAt,
      source: `Transfer from ${sender?.hospitalName || 'partner hospital'}`,
    });
    const base = { bloodGroup: lot.bloodGroup, component: lot.component, units: offer.units, at: new Date() };
    await this.usageModel.create([
      { ...base, hospitalId: offer.fromHospitalId, kind: UsageKind.SENT },
      { ...base, hospitalId: offer.toHospitalId, kind: UsageKind.RECEIVED },
    ]);
  }

  // --------------------------------------------------------------- helpers

  private async nearbyHospitals(origin: number[], excludeId: Types.ObjectId | any) {
    const users = await this.userModel
      .find({
        role: 'hospital',
        isActive: true,
        location: { $nearSphere: { $geometry: { type: 'Point', coordinates: origin }, $maxDistance: EXCHANGE_RADIUS_KM * 1000 } },
      })
      .limit(20);
    const hospitals = await this.hospitalModel.find({ userId: { $in: users.map((u) => u._id) }, _id: { $ne: excludeId } });
    return hospitals.map((h) => {
      const u = users.find((x) => String(x._id) === String(h.userId));
      return { hospital: h, distanceKm: Math.round(haversineKm(origin, u.location.coordinates) * 10) / 10 };
    });
  }

  /** Lazily mark lots past expiry and log them as wastage. */
  private async expireLots(hospitalId: Types.ObjectId | any) {
    const expired = await this.lotModel.find({ hospitalId, status: LotStatus.AVAILABLE, expiresAt: { $lte: new Date() } });
    for (const lot of expired) {
      const res = await this.lotModel.updateOne({ _id: lot._id, status: LotStatus.AVAILABLE }, { $set: { status: LotStatus.EXPIRED } });
      if (res.modifiedCount && lot.units > 0) {
        await this.usageModel.create({
          hospitalId,
          bloodGroup: lot.bloodGroup,
          component: lot.component,
          units: lot.units,
          kind: UsageKind.EXPIRED,
          at: lot.expiresAt,
        });
      }
    }
  }

  private async ownLot(hospitalId: Types.ObjectId | any, lotId: string) {
    if (!Types.ObjectId.isValid(lotId)) throw new NotFoundException('Lot not found');
    const lot = await this.lotModel.findOne({ _id: lotId, hospitalId, status: LotStatus.AVAILABLE });
    if (!lot) throw new NotFoundException('Lot not found');
    return lot;
  }

  private async hospitalFor(userId: string) {
    const hospital = await this.hospitalModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!hospital) throw new NotFoundException('Hospital profile not found');
    return hospital;
  }
}

import { BloodComponent, RARE_PHENOTYPES, compatibleDonorGroups } from '../common/blood';
import { AlertDocument, AlertStatus, DispatchState, ResponseStatus } from '../schemas/alert.schema';
import { coverage, radiusLadder, waveIntervalMinutes } from '../dispatch/planner';

export const COMPONENT_LABELS: Record<BloodComponent, string> = {
  [BloodComponent.WHOLE_BLOOD]: 'whole blood',
  [BloodComponent.RBC]: 'red cells',
  [BloodComponent.PLATELETS]: 'platelets',
  [BloodComponent.PLASMA]: 'plasma',
};

// Statuses where the hospital needs the donor's phone number
const CONTACT_VISIBLE = new Set<string>([ResponseStatus.ACCEPTED, ResponseStatus.ARRIVED]);

export function phenotypeLabel(code?: string) {
  return code ? RARE_PHENOTYPES[code as keyof typeof RARE_PHENOTYPES] || code : undefined;
}

export function shareState(alert: AlertDocument): 'open' | 'covered' | 'closed' {
  if (alert.status !== AlertStatus.ACTIVE) return 'closed';
  return alert.dispatchState === DispatchState.COVERED ? 'covered' : 'open';
}

function nextWaveAt(alert: AlertDocument): Date | null {
  if (alert.status !== AlertStatus.ACTIVE || alert.dispatchState !== DispatchState.DISPATCHING) return null;
  const last = alert.waves[alert.waves.length - 1];
  if (!last) return null;
  return new Date(new Date(last.sentAt).getTime() + waveIntervalMinutes(alert.priority, alert.isPlanned) * 60000);
}

function baseView(alert: AlertDocument) {
  return {
    _id: String(alert._id),
    publicCode: alert.publicCode,
    bloodGroup: alert.bloodGroup,
    component: alert.component,
    componentLabel: COMPONENT_LABELS[alert.component],
    requiredPhenotype: alert.requiredPhenotype,
    requiredPhenotypeLabel: phenotypeLabel(alert.requiredPhenotype),
    unitsNeeded: alert.unitsNeeded,
    unitsCollected: alert.unitsCollected,
    priority: alert.priority,
    status: alert.status,
    dispatchState: alert.dispatchState,
    shareState: shareState(alert),
    requiredBy: alert.requiredBy,
    isEmergency: alert.isEmergency,
    isPlanned: alert.isPlanned,
    createdAt: (alert as any).createdAt,
    updatedAt: (alert as any).updatedAt,
    closedAt: alert.closedAt,
  };
}

function hospitalSummary(hospital: any, hospitalUser: any, includeContact: boolean) {
  if (!hospital) return null;
  return {
    _id: String(hospital._id),
    name: hospital.hospitalName,
    verified: !!hospital.isVerified,
    address: hospitalUser?.address,
    location: hospitalUser?.location?.coordinates,
    emergencyContact: includeContact ? hospital.emergencyContact : undefined,
  };
}

/** Full dispatch picture for the hospital that owns the request. */
export function hospitalView(alert: AlertDocument, donorsById: Map<string, any>) {
  const ladder = radiusLadder(alert.searchRadius, !!alert.requiredPhenotype);
  return {
    ...baseView(alert),
    patientCondition: alert.patientCondition,
    additionalNotes: alert.additionalNotes,
    searchRadius: alert.searchRadius,
    escalationLevel: alert.escalationLevel,
    escalationLadder: ladder,
    currentRadiusKm: ladder[Math.min(alert.escalationLevel, ladder.length - 1)],
    coverage: coverage(alert.unitsNeeded, alert.unitsCollected, alert.responses),
    waves: alert.waves,
    nextWaveAt: nextWaveAt(alert),
    responses: alert.responses.map((r) => {
      const donor = donorsById.get(String(r.donorId));
      const user = donor?.userId;
      return {
        donorId: String(r.donorId),
        name: user?.name || 'Donor',
        phone: CONTACT_VISIBLE.has(r.status) ? user?.phone : undefined,
        bloodGroup: donor?.bloodGroup,
        rareVerified: donor?.rarePhenotypeVerified,
        status: r.status,
        wave: r.wave,
        invitedAt: r.invitedAt,
        respondedAt: r.respondedAt,
        holdExpiresAt: r.holdExpiresAt,
        arrivedAt: r.arrivedAt,
        distanceKm: r.distanceKm,
        etaMinutes: r.etaMinutes,
        showProbability: r.showProbability,
        notes: r.notes,
      };
    }),
  };
}

/** What one donor sees about a request they were invited to (or can volunteer for). */
export function donorView(alert: AlertDocument, donorId: string | null, hospital: any, hospitalUser: any) {
  const mine = donorId ? alert.responses.find((r) => String(r.donorId) === donorId) : undefined;
  const confirmed = mine && CONTACT_VISIBLE.has(mine.status);
  const cov = coverage(alert.unitsNeeded, alert.unitsCollected, alert.responses);
  return {
    ...baseView(alert),
    patientCondition: alert.patientCondition,
    additionalNotes: alert.additionalNotes,
    hospital: hospitalSummary(hospital, hospitalUser, !!confirmed),
    openSlots: cov.openSlots,
    myResponse: mine
      ? {
          status: mine.status,
          wave: mine.wave,
          invitedAt: mine.invitedAt,
          respondedAt: mine.respondedAt,
          holdExpiresAt: mine.holdExpiresAt,
          distanceKm: mine.distanceKm,
          etaMinutes: mine.etaMinutes,
          replyCode: mine.replyCode,
        }
      : null,
  };
}

/** Public, anonymous view for /r/<code>. No patient details, no donor data. */
export function publicView(alert: AlertDocument, hospital: any, hospitalUser: any) {
  const cov = coverage(alert.unitsNeeded, alert.unitsCollected, alert.responses);
  const view = baseView(alert);
  delete (view as any)._id;
  return {
    ...view,
    compatibleDonorGroups: compatibleDonorGroups(alert.bloodGroup, alert.component),
    openSlots: cov.openSlots,
    donorsConfirmed: cov.held + cov.arrived,
    hospital: hospitalSummary(hospital, hospitalUser, !!hospital?.isVerified),
  };
}

import { AlertPriority, ResponseStatus } from '../schemas/alert.schema';

/**
 * Wave dispatch planning — pure functions, no database access.
 *
 * Instead of broadcasting a request to every donor in range (which either gets
 * nobody or a crowd of 40 for 2 units), we invite small, ranked waves until the
 * *expected* number of donors who will actually turn up covers the need.
 */

export const DISPATCH = {
  // Aim slightly above the need to absorb no-shows
  overbook: 1.3,
  minWave: 3,
  maxWave: 12,
  // Minutes to wait for responses before sending the next wave
  waveIntervalMinutes: { critical: 3, high: 8, medium: 20, low: 60 } as Record<AlertPriority, number>,
  // Planned (forecast-driven) requests move slowly on purpose
  plannedWaveIntervalMinutes: 240,
  // Average urban travel speed used for ETA estimates
  travelKmh: 25,
  prepMinutes: 10,
  // A held slot is released if the donor hasn't arrived by ETA + grace
  holdGraceMinutes: 30,
  minHoldMinutes: 45,
  // Priors for donors without history (Bayesian smoothing)
  acceptPrior: { hits: 1, trials: 3 }, // ≈ 33% accept an invite
  showPrior: { hits: 3, trials: 4 }, // ≈ 75% of accepters turn up
};

/** Radii (km) to search at each escalation level. null = no limit. */
export function radiusLadder(baseKm: number, rare: boolean): (number | null)[] {
  if (rare) return [Math.max(baseKm, 10), 50, 200, 800, null];
  const ladder = [baseKm, baseKm * 2, baseKm * 4].map((r) => Math.min(r, 50));
  return [...new Set(ladder)];
}

export interface Reliability {
  invited?: number;
  accepted?: number;
  arrived?: number;
  lapsed?: number;
}

export function acceptProbability(r: Reliability = {}): number {
  const { hits, trials } = DISPATCH.acceptPrior;
  return (Number(r.accepted || 0) + hits) / (Number(r.invited || 0) + trials);
}

export function showProbability(r: Reliability = {}, etaMinutes: number, minutesUntilNeeded: number): number {
  const { hits, trials } = DISPATCH.showPrior;
  const base = (Number(r.arrived || 0) + hits) / (Number(r.accepted || 0) + trials);
  // Donors who can't physically make it before the deadline are much less useful
  const timing = etaMinutes <= minutesUntilNeeded ? 1 : 0.4;
  return Math.min(1, base * timing);
}

export function etaMinutesFor(distanceKm: number): number {
  return Math.round((distanceKm / DISPATCH.travelKmh) * 60 + DISPATCH.prepMinutes);
}

export function holdMinutesFor(etaMinutes: number): number {
  return Math.max(DISPATCH.minHoldMinutes, etaMinutes + DISPATCH.holdGraceMinutes);
}

export interface Candidate {
  donorId: string;
  distanceKm: number;
  etaMinutes: number;
  acceptProbability: number;
  showProbability: number;
}

/** Expected donors arriving per invite — what we rank on. Closer breaks ties. */
export function candidateScore(c: Candidate): number {
  return (c.acceptProbability * c.showProbability) / (1 + c.distanceKm / 25);
}

export interface ResponseLike {
  status: ResponseStatus | string;
  acceptProbability?: number;
  showProbability?: number;
}

export interface Coverage {
  slots: number;
  arrived: number;
  held: number;
  standby: number;
  pending: number;
  openSlots: number;
  /** Units we expect to actually receive from donors already arrived or holding slots */
  expectedUnits: number;
  /** Units we expect including donors who haven't answered yet */
  expectedWithPending: number;
}

export function coverage(unitsNeeded: number, unitsCollected: number, responses: ResponseLike[]): Coverage {
  let held = 0;
  let standby = 0;
  let pending = 0;
  let heldExpected = 0;
  let pendingExpected = 0;
  for (const r of responses) {
    if (r.status === ResponseStatus.ACCEPTED) {
      held++;
      heldExpected += r.showProbability ?? DISPATCH.showPrior.hits / DISPATCH.showPrior.trials;
    } else if (r.status === ResponseStatus.STANDBY) {
      standby++;
    } else if (r.status === ResponseStatus.INVITED) {
      pending++;
      pendingExpected += (r.acceptProbability ?? 0.33) * (r.showProbability ?? 0.75);
    }
  }
  const remaining = Math.max(0, unitsNeeded - unitsCollected);
  const expectedUnits = Math.min(unitsNeeded, unitsCollected + heldExpected);
  return {
    slots: unitsNeeded,
    arrived: unitsCollected,
    held,
    standby,
    pending,
    openSlots: Math.max(0, remaining - held),
    expectedUnits: round1(expectedUnits),
    expectedWithPending: round1(unitsCollected + heldExpected + pendingExpected),
  };
}

/**
 * How many more "expected donors" we need to invite for. ≤ 0 means wait.
 */
export function inviteDeficit(unitsNeeded: number, unitsCollected: number, responses: ResponseLike[]): number {
  const c = coverage(unitsNeeded, unitsCollected, responses);
  if (c.openSlots === 0) return 0;
  return unitsNeeded * DISPATCH.overbook - c.expectedWithPending;
}

/**
 * Pick the next wave from ranked candidates: keep adding the best donors until
 * their combined expected arrivals cover the deficit (bounded by min/max wave).
 */
export function planWave(candidates: Candidate[], deficit: number): Candidate[] {
  if (deficit <= 0) return [];
  const ranked = [...candidates].sort((a, b) => candidateScore(b) - candidateScore(a) || a.distanceKm - b.distanceKm);
  const wave: Candidate[] = [];
  let expected = 0;
  for (const c of ranked) {
    if (wave.length >= DISPATCH.maxWave) break;
    if (expected >= deficit && wave.length >= DISPATCH.minWave) break;
    wave.push(c);
    expected += c.acceptProbability * c.showProbability;
  }
  return wave;
}

export function waveIntervalMinutes(priority: AlertPriority, planned: boolean): number {
  return planned ? DISPATCH.plannedWaveIntervalMinutes : DISPATCH.waveIntervalMinutes[priority];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

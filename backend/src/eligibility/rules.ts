import { DonationType } from '../common/blood';

/**
 * Donor eligibility engine.
 *
 * Thresholds below are conservative defaults modelled on India's NBTC donor
 * selection guidelines. They are configuration, not medical advice — the
 * collecting blood bank's medical officer always makes the final call.
 */
export const RULES = {
  minAge: 18,
  maxAge: { whole_blood: 65, platelets: 60, plasma: 60 } as Record<DonationType, number>,
  minWeightKg: { whole_blood: 45, platelets: 50, plasma: 50 } as Record<DonationType, number>,
  minHemoglobin: 12.5,
  // Days to wait before donating `next` after having donated `previous`
  intervalDays: {
    whole_blood: { whole_blood: { male: 90, female: 120, unknown: 120 }, platelets: 28, plasma: 28 },
    platelets: { whole_blood: 7, platelets: 2, plasma: 2 },
    plasma: { whole_blood: 7, platelets: 2, plasma: 2 },
  },
  deferralDays: {
    tattooOrPiercing: 365,
    majorSurgery: 365,
    illnessRecovery: 14,
    antibioticsCompleted: 7,
    malariaTreated: 90,
    childbirth: 365,
    alcohol: 1,
  },
  permanentConditions: {
    hiv: 'HIV',
    hepatitis_b: 'Hepatitis B',
    hepatitis_c: 'Hepatitis C',
    cancer: 'Cancer',
    heart_disease: 'Heart disease',
    bleeding_disorder: 'Bleeding disorder',
  } as Record<string, string>,
};

export type Sex = 'male' | 'female' | 'other';

export interface ScreeningAnswers {
  hemoglobin?: number;
  tattooOrPiercingOn?: string;
  majorSurgeryOn?: string;
  illnessRecoveredOn?: string;
  antibioticsCompletedOn?: string;
  malariaTreatedOn?: string;
  childbirthOn?: string;
  pregnantOrBreastfeeding?: boolean;
  alcoholLast24h?: boolean;
  conditions?: string[];
}

export interface DonorFacts {
  dateOfBirth?: Date | string;
  weightKg?: number;
  sex?: Sex;
  lastDonations?: Partial<Record<DonationType, Date | string>>;
  screening?: ScreeningAnswers & { completedAt?: Date | string };
}

export interface Deferral {
  code: string;
  label: string;
  /** null = permanent / indefinite */
  until: Date | null;
}

export interface ComponentEligibility {
  type: DonationType;
  eligible: boolean;
  nextEligibleDate: Date | null;
  deferrals: Deferral[];
}

export interface EligibilityReport {
  evaluatedAt: Date;
  screeningCompleted: boolean;
  screeningStale: boolean;
  components: Record<DonationType, ComponentEligibility>;
  notes: string[];
}

const DAY = 24 * 60 * 60 * 1000;
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * DAY);
const toDate = (v?: Date | string) => (v ? new Date(v) : undefined);

function ageOn(dob: Date, at: Date) {
  let age = at.getFullYear() - dob.getFullYear();
  const m = at.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < dob.getDate())) age--;
  return age;
}

function intervalFor(next: DonationType, prev: DonationType, sex?: Sex): number {
  const v = RULES.intervalDays[next][prev];
  if (typeof v === 'number') return v;
  return sex === 'male' ? v.male : sex === 'female' ? v.female : v.unknown;
}

export function evaluateEligibility(facts: DonorFacts, at: Date = new Date()): EligibilityReport {
  const s = facts.screening || {};
  const notes: string[] = [];
  const shared: Deferral[] = [];

  const timed = (code: string, label: string, on: string | undefined, days: number) => {
    const d = toDate(on);
    if (!d) return;
    const until = addDays(d, days);
    if (until > at) shared.push({ code, label, until });
  };

  timed('tattoo', 'Tattoo or piercing in the last 12 months', s.tattooOrPiercingOn, RULES.deferralDays.tattooOrPiercing);
  timed('surgery', 'Major surgery in the last 12 months', s.majorSurgeryOn, RULES.deferralDays.majorSurgery);
  timed('illness', 'Recent fever or infection', s.illnessRecoveredOn, RULES.deferralDays.illnessRecovery);
  timed('antibiotics', 'Recently finished antibiotics', s.antibioticsCompletedOn, RULES.deferralDays.antibioticsCompleted);
  timed('malaria', 'Malaria treatment in the last 3 months', s.malariaTreatedOn, RULES.deferralDays.malariaTreated);
  timed('childbirth', 'Childbirth in the last 12 months', s.childbirthOn, RULES.deferralDays.childbirth);

  if (s.alcoholLast24h) {
    shared.push({ code: 'alcohol', label: 'Alcohol in the last 24 hours', until: addDays(at, RULES.deferralDays.alcohol) });
  }
  if (s.pregnantOrBreastfeeding) {
    shared.push({ code: 'pregnancy', label: 'Pregnant or breastfeeding', until: null });
  }
  for (const c of s.conditions || []) {
    const label = RULES.permanentConditions[c];
    if (label) shared.push({ code: `condition:${c}`, label, until: null });
  }
  if (typeof s.hemoglobin === 'number' && s.hemoglobin < RULES.minHemoglobin) {
    shared.push({
      code: 'hemoglobin',
      label: `Hemoglobin ${s.hemoglobin} g/dL is below ${RULES.minHemoglobin}`,
      until: null,
    });
    notes.push('Low hemoglobin clears once a re-test at a blood bank is normal — update your screening after.');
  }
  if (typeof s.hemoglobin !== 'number') {
    notes.push('Hemoglobin is checked on site before every donation.');
  }

  const dob = toDate(facts.dateOfBirth);
  const types: DonationType[] = ['whole_blood', 'platelets', 'plasma'];
  const components = {} as Record<DonationType, ComponentEligibility>;

  for (const type of types) {
    const deferrals = [...shared];

    if (dob) {
      const age = ageOn(dob, at);
      if (age < RULES.minAge) {
        const until = new Date(dob);
        until.setFullYear(dob.getFullYear() + RULES.minAge);
        deferrals.push({ code: 'age_min', label: `Must be at least ${RULES.minAge}`, until });
      } else if (age > RULES.maxAge[type]) {
        deferrals.push({ code: 'age_max', label: `Above the age limit of ${RULES.maxAge[type]}`, until: null });
      }
    }
    if (facts.weightKg && facts.weightKg < RULES.minWeightKg[type]) {
      deferrals.push({ code: 'weight', label: `Minimum weight is ${RULES.minWeightKg[type]} kg`, until: null });
    }

    for (const prev of types) {
      const last = toDate(facts.lastDonations?.[prev]);
      if (!last) continue;
      const until = addDays(last, intervalFor(type, prev, facts.sex));
      if (until > at) {
        deferrals.push({ code: `interval:${prev}`, label: `Recovery after your last ${prev.replace('_', ' ')} donation`, until });
      }
    }

    const permanent = deferrals.some((d) => d.until === null);
    const latest = deferrals.reduce<Date | null>((m, d) => (d.until && (!m || d.until > m) ? d.until : m), null);
    components[type] = {
      type,
      eligible: deferrals.length === 0,
      nextEligibleDate: permanent ? null : latest || at,
      deferrals,
    };
  }

  const completedAt = toDate(s.completedAt as any);
  return {
    evaluatedAt: at,
    screeningCompleted: !!completedAt,
    // Answers older than 90 days are likely out of date
    screeningStale: !!completedAt && at.getTime() - completedAt.getTime() > 90 * DAY,
    components,
    notes,
  };
}

/** Eligible to donate `type` at time `at` — used by dispatch to filter invites. */
export function isEligibleFor(facts: DonorFacts, type: DonationType, at: Date = new Date()): boolean {
  return evaluateEligibility(facts, at).components[type].eligible;
}

export enum BloodGroup {
  A_POSITIVE = 'A+',
  A_NEGATIVE = 'A-',
  B_POSITIVE = 'B+',
  B_NEGATIVE = 'B-',
  AB_POSITIVE = 'AB+',
  AB_NEGATIVE = 'AB-',
  O_POSITIVE = 'O+',
  O_NEGATIVE = 'O-',
}

export const BLOOD_GROUPS = Object.values(BloodGroup);

export enum BloodComponent {
  WHOLE_BLOOD = 'whole_blood',
  RBC = 'rbc',
  PLATELETS = 'platelets',
  PLASMA = 'plasma',
}

// Shelf life in days, used for new inventory lots when no expiry is given
export const SHELF_LIFE_DAYS: Record<BloodComponent, number> = {
  [BloodComponent.WHOLE_BLOOD]: 35,
  [BloodComponent.RBC]: 42,
  [BloodComponent.PLATELETS]: 5,
  [BloodComponent.PLASMA]: 365,
};

// Which kind of donation a donor has to give to supply a component.
// RBC units are separated from whole blood; platelets and plasma come from apheresis.
export type DonationType = 'whole_blood' | 'platelets' | 'plasma';

export function donationTypeFor(component: BloodComponent): DonationType {
  if (component === BloodComponent.PLATELETS) return 'platelets';
  if (component === BloodComponent.PLASMA) return 'plasma';
  return 'whole_blood';
}

// Rare phenotypes tracked by the registry. Requests for these escalate past the
// normal search radius because matching donors may be hundreds of km away.
export const RARE_PHENOTYPES = {
  bombay: 'Bombay (hh)',
  para_bombay: 'Para-Bombay',
  rh_null: 'Rh-null',
  kell_null: 'Kell-null (K0)',
  k_negative: 'Cellano-negative (kk-)',
  jk_null: 'Kidd-null Jk(a-b-)',
  vel_negative: 'Vel-negative',
  lutheran_null: 'Lutheran-null Lu(a-b-)',
} as const;

export type RarePhenotype = keyof typeof RARE_PHENOTYPES;

const ABO = (g: BloodGroup) => g.replace(/[+-]$/, '') as 'A' | 'B' | 'AB' | 'O';
const RH = (g: BloodGroup) => g.endsWith('+');

/**
 * Donor groups that can supply `component` to a recipient of `recipient` group.
 * Red cells / whole blood / platelets follow red-cell rules; plasma is the reverse
 * (AB plasma is universal). Bombay recipients bypass this — see dispatch.
 */
export function compatibleDonorGroups(recipient: BloodGroup, component: BloodComponent): BloodGroup[] {
  if (component === BloodComponent.PLASMA) {
    const r = ABO(recipient);
    const ok: Record<string, string[]> = { O: ['O', 'A', 'B', 'AB'], A: ['A', 'AB'], B: ['B', 'AB'], AB: ['AB'] };
    return BLOOD_GROUPS.filter((d) => ok[r].includes(ABO(d)));
  }
  const r = ABO(recipient);
  const okAbo: Record<string, string[]> = { O: ['O'], A: ['A', 'O'], B: ['B', 'O'], AB: ['AB', 'A', 'B', 'O'] };
  return BLOOD_GROUPS.filter((d) => okAbo[r].includes(ABO(d)) && (RH(recipient) || !RH(d)));
}

export function haversineKm([lng1, lat1]: number[], [lng2, lat2]: number[]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

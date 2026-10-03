import { BloodComponent, BloodGroup, compatibleDonorGroups, haversineKm } from './blood';

describe('compatibleDonorGroups', () => {
  it('only O- can give red cells to O-', () => {
    expect(compatibleDonorGroups(BloodGroup.O_NEGATIVE, BloodComponent.RBC)).toEqual([BloodGroup.O_NEGATIVE]);
  });

  it('AB+ can receive red cells from everyone', () => {
    expect(compatibleDonorGroups(BloodGroup.AB_POSITIVE, BloodComponent.WHOLE_BLOOD)).toHaveLength(8);
  });

  it('Rh-negative recipients never get Rh-positive red cells', () => {
    const donors = compatibleDonorGroups(BloodGroup.A_NEGATIVE, BloodComponent.RBC);
    expect(donors.sort()).toEqual([BloodGroup.A_NEGATIVE, BloodGroup.O_NEGATIVE].sort());
  });

  it('plasma compatibility is reversed — AB plasma is universal', () => {
    expect(compatibleDonorGroups(BloodGroup.O_POSITIVE, BloodComponent.PLASMA)).toHaveLength(8);
    expect(compatibleDonorGroups(BloodGroup.AB_NEGATIVE, BloodComponent.PLASMA).sort()).toEqual(
      [BloodGroup.AB_POSITIVE, BloodGroup.AB_NEGATIVE].sort(),
    );
  });
});

describe('haversineKm', () => {
  it('measures Chennai → Bengaluru at roughly 290 km', () => {
    const d = haversineKm([80.2707, 13.0827], [77.5946, 12.9716]);
    expect(d).toBeGreaterThan(280);
    expect(d).toBeLessThan(300);
  });
});

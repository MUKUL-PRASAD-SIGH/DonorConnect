import { evaluateEligibility, isEligibleFor } from './rules';

const at = new Date('2026-10-03T10:00:00Z');
const daysAgo = (n: number) => new Date(at.getTime() - n * 86400000).toISOString();
const adult = { dateOfBirth: '1995-05-01', weightKg: 70, sex: 'male' as const };

describe('evaluateEligibility', () => {
  it('a healthy adult with no history is eligible for everything', () => {
    const r = evaluateEligibility(adult, at);
    expect(r.components.whole_blood.eligible).toBe(true);
    expect(r.components.platelets.eligible).toBe(true);
    expect(r.screeningCompleted).toBe(false);
  });

  it('gives an exact next date after a whole blood donation (90 days for men)', () => {
    const r = evaluateEligibility({ ...adult, lastDonations: { whole_blood: daysAgo(30) } }, at);
    expect(r.components.whole_blood.eligible).toBe(false);
    expect(r.components.whole_blood.nextEligibleDate.getTime()).toBe(new Date(daysAgo(30)).getTime() + 90 * 86400000);
    // Platelets need a shorter (28 day) gap after whole blood
    expect(r.components.platelets.eligible).toBe(true);
  });

  it('uses the longer interval for women', () => {
    const r = evaluateEligibility({ ...adult, sex: 'female', lastDonations: { whole_blood: daysAgo(100) } }, at);
    expect(r.components.whole_blood.eligible).toBe(false);
  });

  it('platelet donors can give again after 48 hours', () => {
    expect(isEligibleFor({ ...adult, lastDonations: { platelets: daysAgo(1) } }, 'platelets', at)).toBe(false);
    expect(isEligibleFor({ ...adult, lastDonations: { platelets: daysAgo(3) } }, 'platelets', at)).toBe(true);
  });

  it('a recent tattoo defers for 12 months', () => {
    const r = evaluateEligibility({ ...adult, screening: { tattooOrPiercingOn: daysAgo(60) } }, at);
    expect(r.components.whole_blood.eligible).toBe(false);
    expect(r.components.whole_blood.deferrals[0].code).toBe('tattoo');
  });

  it('permanent conditions give no next date', () => {
    const r = evaluateEligibility({ ...adult, screening: { conditions: ['hepatitis_b'] } }, at);
    expect(r.components.whole_blood.nextEligibleDate).toBeNull();
  });

  it('underweight donors can give whole blood but not apheresis', () => {
    const r = evaluateEligibility({ ...adult, weightKg: 47 }, at);
    expect(r.components.whole_blood.eligible).toBe(true);
    expect(r.components.platelets.eligible).toBe(false);
  });

  it('minors become eligible on their 18th birthday', () => {
    const r = evaluateEligibility({ ...adult, dateOfBirth: '2009-01-15' }, at);
    expect(r.components.whole_blood.nextEligibleDate.toISOString().slice(0, 10)).toBe('2027-01-15');
  });
});

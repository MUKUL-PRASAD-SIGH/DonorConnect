import { BloodComponent, BloodGroup } from '../common/blood';
import { forecast } from './forecast';

const today = new Date('2026-03-10T12:00:00');
const daysFromNow = (n: number) => new Date(today.getTime() + n * 86400000);
const steadyUsage = (perDay: number, days: number) =>
  Array.from({ length: days }, (_, i) => ({ units: perDay, at: daysFromNow(-i - 1) }));

describe('forecast', () => {
  it('predicts the day stock drops below safety level', () => {
    const r = forecast(
      BloodGroup.O_POSITIVE,
      BloodComponent.RBC,
      [{ id: 'a', units: 10, expiresAt: daysFromNow(30) }],
      steadyUsage(2, 30),
      today,
      daysFromNow(-30),
    );
    expect(r.avgDailyUse).toBe(2);
    expect(r.daysOfCover).toBe(5);
    // 10 units, 2/day, safety = 4 → below safety after day 4
    expect(r.shortfallDate.getDate()).toBe(daysFromNow(4).getDate());
    expect(r.unitsShortByHorizon).toBe(18);
  });

  it('flags units that will expire before they can be used', () => {
    const r = forecast(
      BloodGroup.B_POSITIVE,
      BloodComponent.PLATELETS,
      [{ id: 'p1', units: 6, expiresAt: daysFromNow(2) }],
      steadyUsage(1, 20),
      today,
      daysFromNow(-20),
    );
    expect(r.projectedWastage).toHaveLength(1);
    expect(r.projectedWastage[0].units).toBeGreaterThan(3);
  });

  it('reports low confidence and no shortfall without history', () => {
    const r = forecast(BloodGroup.A_NEGATIVE, BloodComponent.RBC, [{ id: 'x', units: 3, expiresAt: daysFromNow(20) }], [], today);
    expect(r.confidence).toBe('low');
    expect(r.shortfallDate).toBeNull();
    expect(r.daysOfCover).toBeNull();
  });

  it('applies seasonal demand drivers', () => {
    const sept = new Date('2026-09-10T12:00:00');
    const r = forecast(BloodGroup.O_POSITIVE, BloodComponent.PLATELETS, [], [], sept);
    expect(r.drivers.join()).toMatch(/Dengue/);
  });
});

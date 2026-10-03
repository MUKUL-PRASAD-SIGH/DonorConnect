import { ResponseStatus } from '../schemas/alert.schema';
import { Candidate, DISPATCH, acceptProbability, coverage, inviteDeficit, planWave, radiusLadder, showProbability } from './planner';

const cand = (id: string, distanceKm: number, a = 0.33, s = 0.75): Candidate => ({
  donorId: id,
  distanceKm,
  etaMinutes: 20,
  acceptProbability: a,
  showProbability: s,
});

describe('planner', () => {
  it('does not broadcast to everyone — a 2-unit request invites a small wave', () => {
    const pool = Array.from({ length: 50 }, (_, i) => cand(`d${i}`, i * 0.3));
    const wave = planWave(pool, inviteDeficit(2, 0, []));
    expect(wave.length).toBeGreaterThanOrEqual(DISPATCH.minWave);
    expect(wave.length).toBeLessThan(15);
  });

  it('prefers reliable donors over slightly closer unreliable ones', () => {
    const wave = planWave([cand('flaky', 1, 0.05, 0.3), cand('solid', 3, 0.8, 0.95), cand('x', 5), cand('y', 6)], 0.5);
    expect(wave[0].donorId).toBe('solid');
  });

  it('stops inviting once accepted holds cover the need', () => {
    const responses = [
      { status: ResponseStatus.ACCEPTED, showProbability: 0.9 },
      { status: ResponseStatus.ACCEPTED, showProbability: 0.9 },
    ];
    expect(coverage(2, 0, responses).openSlots).toBe(0);
    expect(inviteDeficit(2, 0, responses)).toBe(0);
  });

  it('expected units reflect show-up probability, not raw yeses', () => {
    const c = coverage(2, 0, [
      { status: ResponseStatus.ACCEPTED, showProbability: 0.5 },
      { status: ResponseStatus.ACCEPTED, showProbability: 0.7 },
    ]);
    expect(c.expectedUnits).toBe(1.2);
  });

  it('counts pending invites so it does not over-invite between waves', () => {
    const pending = Array.from({ length: 10 }, () => ({ status: ResponseStatus.INVITED, acceptProbability: 0.33, showProbability: 0.75 }));
    expect(inviteDeficit(2, 0, pending)).toBeLessThan(0.2);
  });

  it('bayesian priors reward a good track record', () => {
    expect(acceptProbability({})).toBeCloseTo(1 / 3);
    expect(acceptProbability({ invited: 10, accepted: 9 })).toBeGreaterThan(0.7);
    expect(showProbability({ accepted: 10, arrived: 2 }, 10, 60)).toBeLessThan(0.4);
    expect(showProbability({}, 90, 30)).toBeLessThan(showProbability({}, 10, 30));
  });

  it('rare requests escalate all the way to nationwide', () => {
    expect(radiusLadder(5, true).at(-1)).toBeNull();
    expect(radiusLadder(5, false)).toEqual([5, 10, 20]);
  });
});

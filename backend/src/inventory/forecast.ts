import { BloodComponent, BloodGroup } from '../common/blood';

/**
 * Shortage forecasting — pure functions.
 *
 * Demand is an exponentially-weighted daily usage rate, adjusted by weekday
 * pattern and seasonal multipliers. We then simulate stock day by day using
 * first-expiry-first-out, which yields both the shortfall date *and* the units
 * projected to expire unused (the input to the inter-hospital exchange).
 */

export const FORECAST = {
  horizonDays: 14,
  historyDays: 56,
  alpha: 0.2,
  safetyStockDays: 2,
  // Region-specific demand drivers. Defaults reflect South-Asian dengue season
  // (platelet demand spikes Jul–Nov). Adjust for your region.
  seasonal: [
    { component: BloodComponent.PLATELETS, months: [7, 8, 9, 10, 11], factor: 1.5, reason: 'Dengue season' },
  ] as { component: BloodComponent; months: number[]; factor: number; reason: string }[],
};

export interface LotLike {
  id: string;
  units: number;
  expiresAt: Date;
}

export interface UsageLike {
  units: number;
  at: Date;
}

export interface ForecastResult {
  bloodGroup: BloodGroup;
  component: BloodComponent;
  availableUnits: number;
  avgDailyUse: number;
  daysOfCover: number | null; // null = no measurable usage
  shortfallDate: Date | null;
  unitsShortByHorizon: number;
  projectedWastage: { lotId: string; units: number; expiresAt: Date }[];
  confidence: 'low' | 'medium' | 'high';
  drivers: string[];
  daily: { date: Date; demand: number; stock: number }[];
}

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Daily totals for the `days` complete days before today (today is still in progress). */
export function dailySeries(usage: UsageLike[], today: Date, days: number): number[] {
  const end = startOfDay(today).getTime() - DAY;
  const series = new Array(days).fill(0);
  for (const u of usage) {
    const idx = days - 1 - Math.floor((end - startOfDay(new Date(u.at)).getTime()) / DAY);
    if (idx >= 0 && idx < days) series[idx] += u.units;
  }
  return series;
}

export function forecast(
  bloodGroup: BloodGroup,
  component: BloodComponent,
  lots: LotLike[],
  usage: UsageLike[],
  today: Date = new Date(),
  firstUsageAt?: Date,
): ForecastResult {
  const drivers: string[] = [];
  // Only count days the hospital has actually been tracking usage
  const trackedDays = firstUsageAt
    ? Math.min(FORECAST.historyDays, Math.max(1, Math.round((startOfDay(today).getTime() - startOfDay(firstUsageAt).getTime()) / DAY)))
    : 0;
  const series = trackedDays ? dailySeries(usage, today, trackedDays) : [];

  let level = 0;
  if (series.length) {
    const seed = series.slice(0, Math.min(7, series.length));
    level = seed.reduce((s, v) => s + v, 0) / seed.length;
    for (const v of series.slice(seed.length)) level = FORECAST.alpha * v + (1 - FORECAST.alpha) * level;
  }

  // Weekday pattern, only once there are 4+ weeks of data
  const weekday = new Array(7).fill(1);
  if (series.length >= 28) {
    const mean = series.reduce((s, v) => s + v, 0) / series.length || 1;
    for (let dow = 0; dow < 7; dow++) {
      const vals = series.filter((_, i) => new Date(today.getTime() - (series.length - i) * DAY).getDay() === dow);
      const avg = vals.reduce((s, v) => s + v, 0) / (vals.length || 1);
      weekday[dow] = Math.min(1.8, Math.max(0.5, avg / mean));
    }
  }

  const seasonalFor = (d: Date) =>
    FORECAST.seasonal
      .filter((s) => s.component === component && s.months.includes(d.getMonth() + 1))
      .reduce((f, s) => f * s.factor, 1);
  for (const s of FORECAST.seasonal) {
    if (s.component === component && s.months.includes(today.getMonth() + 1)) {
      drivers.push(`${s.reason}: +${Math.round((s.factor - 1) * 100)}% demand`);
    }
  }

  // FEFO simulation
  const stock = lots
    .filter((l) => l.units > 0 && new Date(l.expiresAt) > today)
    .map((l) => ({ ...l, expiresAt: new Date(l.expiresAt), left: l.units }))
    .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());
  const availableUnits = stock.reduce((s, l) => s + l.left, 0);
  const safety = level * FORECAST.safetyStockDays;

  let shortfallDate: Date | null = null;
  let unmet = 0;
  let carry = 0;
  const wastage = new Map<string, { lotId: string; units: number; expiresAt: Date }>();
  const daily: ForecastResult['daily'] = [];

  for (let i = 1; i <= FORECAST.horizonDays; i++) {
    const day = new Date(startOfDay(today).getTime() + i * DAY);
    const demand = level * weekday[day.getDay()] * seasonalFor(day);
    // Units are whole; carry fractional demand forward
    carry += demand;
    let need = Math.floor(carry);
    carry -= need;
    for (const lot of stock) {
      if (need <= 0) break;
      if (lot.left <= 0 || lot.expiresAt <= day) continue;
      const take = Math.min(lot.left, need);
      lot.left -= take;
      need -= take;
    }
    unmet += need;
    for (const lot of stock) {
      if (lot.left > 0 && lot.expiresAt <= new Date(day.getTime() + DAY)) {
        wastage.set(lot.id, { lotId: lot.id, units: lot.left, expiresAt: lot.expiresAt });
        lot.left = 0;
      }
    }
    const remaining = stock.reduce((s, l) => s + l.left, 0);
    daily.push({ date: day, demand: round1(demand), stock: remaining });
    if (!shortfallDate && level > 0 && (remaining < safety || need > 0)) shortfallDate = day;
  }

  if (trackedDays < 7) drivers.push('Less than a week of usage history');
  return {
    bloodGroup,
    component,
    availableUnits,
    avgDailyUse: round1(level),
    daysOfCover: level > 0 ? round1(availableUnits / level) : null,
    shortfallDate,
    unitsShortByHorizon: Math.ceil(unmet),
    projectedWastage: [...wastage.values()],
    confidence: trackedDays >= 42 ? 'high' : trackedDays >= 14 ? 'medium' : 'low',
    drivers,
    daily,
  };
}

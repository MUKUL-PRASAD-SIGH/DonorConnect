/**
 * Demo data: two verified hospitals in Chennai, ~30 donors around them with
 * realistic track records, 5 weeks of usage history, and near-expiry stock so
 * the forecast and exchange screens have something to show.
 *
 *   npm run seed            # refuses to touch a database that already has users
 *   npm run seed -- --reset # wipes the database first
 *
 * Every account uses the password "password123".
 */
import 'dotenv/config';
process.env.DISPATCH_TICK = 'off';

import { NestFactory } from '@nestjs/core';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { AlertsService } from '../src/alerts/alerts.service';
import { BLOOD_GROUPS, BloodComponent } from '../src/common/blood';
import { AlertPriority } from '../src/schemas/alert.schema';

const CENTER = { lat: 13.0604, lng: 80.2496 }; // Chennai
const at = (dLatKm: number, dLngKm: number) => ({
  type: 'Point',
  coordinates: [CENTER.lng + dLngKm / 108, CENTER.lat + dLatKm / 111],
});
const DAY = 86400000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const pick = <T>(xs: T[], i: number) => xs[i % xs.length];

// Roughly India's ABO/Rh distribution
const GROUP_WEIGHTS = { 'O+': 36, 'B+': 31, 'A+': 22, 'AB+': 7, 'O-': 2, 'B-': 1, 'A-': 0.5, 'AB-': 0.5 };
const FIRST = ['Aarav', 'Diya', 'Karthik', 'Meera', 'Rahul', 'Priya', 'Vikram', 'Ananya', 'Arjun', 'Kavya', 'Sanjay', 'Lakshmi', 'Rohan', 'Nisha', 'Imran', 'Fatima', 'Joseph', 'Grace', 'Suresh', 'Divya'];
const LAST = ['Iyer', 'Reddy', 'Nair', 'Khan', 'Fernandes', 'Sharma', 'Pillai', 'Menon', 'Das', 'Rao'];

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const conn = app.get<Connection>(getConnectionToken());
  const model = (name: string) => app.get<Model<any>>(getModelToken(name));
  const [User, Donor, Hospital, Lot, Usage] = ['User', 'Donor', 'Hospital', 'InventoryLot', 'UsageEvent'].map(model);

  if (process.argv.includes('--reset')) {
    await conn.dropDatabase();
    await conn.syncIndexes();
  } else if (await User.estimatedDocumentCount()) {
    console.error('Database already has users. Re-run with --reset to wipe it first.');
    process.exit(1);
  }

  const password = await bcrypt.hash('password123', 12);
  await User.create({ name: 'Platform Admin', email: 'admin@donorconnect.demo', password, phone: '+91 90000 00000', role: 'admin', address: 'Chennai', location: at(0, 0) });

  const hospitals = [];
  for (const [i, h] of [
    { name: 'Government General Hospital', short: 'gh', pos: at(0, 0), license: 'TN-BB-0101' },
    { name: 'Adyar Cancer Institute', short: 'adyar', pos: at(-8, -2), license: 'TN-BB-0207' },
  ].entries()) {
    const user = await User.create({
      name: h.name,
      email: `${h.short}@donorconnect.demo`,
      password,
      phone: `+91 44 2530 50${i}0`,
      role: 'hospital',
      address: i === 0 ? 'Park Town, Chennai' : 'Gandhi Nagar, Adyar, Chennai',
      location: h.pos,
    });
    hospitals.push(
      await Hospital.create({
        userId: user._id,
        hospitalName: h.name,
        licenseNumber: h.license,
        contactPerson: i === 0 ? 'Dr. S. Raman' : 'Dr. V. Krishnan',
        emergencyContact: `+91 44 2530 51${i}0`,
        isVerified: true,
        verifiedAt: new Date(),
      }),
    );
  }

  const weighted = Object.entries(GROUP_WEIGHTS).flatMap(([g, w]) => Array(Math.max(1, Math.round(w))).fill(g));
  for (let i = 0; i < 30; i++) {
    const name = `${pick(FIRST, i)} ${pick(LAST, i * 3)}`;
    const user = await User.create({
      name,
      email: i === 0 ? 'donor@donorconnect.demo' : `donor${i}@donorconnect.demo`,
      password,
      phone: `+91 98400 ${String(10000 + i).slice(-5)}`,
      role: 'donor',
      address: 'Chennai',
      location: at(((i * 37) % 17) - 8, ((i * 53) % 15) - 7),
    });
    const invited = (i * 7) % 9;
    const accepted = Math.min(invited, (i * 5) % 6);
    const arrived = Math.min(accepted, (i * 3) % 5);
    await Donor.create({
      userId: user._id,
      bloodGroup: i === 0 ? 'O+' : pick(weighted, i * 11),
      dateOfBirth: new Date(1975 + (i % 25), i % 12, 1 + (i % 27)),
      weight: 52 + (i % 30),
      sex: i % 2 ? 'female' : 'male',
      totalDonations: arrived + (i % 4),
      lastDonations: i % 5 === 0 && i > 0 ? { whole_blood: daysAgo(20 + i) } : {},
      reliability: { invited, accepted, arrived, lapsed: accepted - arrived },
      rarePhenotypes: i === 7 ? ['bombay'] : i === 13 ? ['k_negative'] : [],
      rarePhenotypeVerified: i === 7,
      screening: { completedAt: daysAgo(i % 40) },
    });
  }

  // Five weeks of usage and current stock for each hospital
  for (const [hi, h] of hospitals.entries()) {
    const usage = [];
    for (const g of BLOOD_GROUPS) {
      for (const c of [BloodComponent.RBC, BloodComponent.PLATELETS, BloodComponent.PLASMA]) {
        const base = (GROUP_WEIGHTS[g] / 36) * (c === BloodComponent.RBC ? 3 : c === BloodComponent.PLATELETS ? 1.6 : 0.8) * (hi ? 0.7 : 1);
        if (base < 0.15) continue;
        for (let d = 1; d <= 35; d++) {
          const units = Math.round(base * (0.6 + ((d * 7 + g.length) % 9) / 10));
          if (units) usage.push({ hospitalId: h._id, bloodGroup: g, component: c, units, kind: 'used', at: daysAgo(d) });
        }
        const shelf = c === BloodComponent.PLATELETS ? 5 : c === BloodComponent.RBC ? 42 : 365;
        // Mostly healthy stock with a few groups running low, so the forecast has a story
        const stockDays = hi === 0 ? 5 + ((g.charCodeAt(0) * 7 + c.length * 3) % 11) : 7 + ((g.charCodeAt(0) + c.length) % 9);
        const units = Math.max(1, Math.round(base * stockDays));
        await Lot.create({ hospitalId: h._id, bloodGroup: g, component: c, units, collectedAt: daysAgo(2), expiresAt: new Date(Date.now() + (shelf - 2) * DAY), source: 'donation' });
      }
    }
    await Usage.insertMany(usage);
  }
  // Surplus platelets at Adyar that will expire before they're used
  await Lot.create({ hospitalId: hospitals[1]._id, bloodGroup: 'B+', component: 'platelets', units: 6, collectedAt: daysAgo(4), expiresAt: new Date(Date.now() + 1.2 * DAY), source: 'donation camp' });

  const alerts = app.get(AlertsService);
  await alerts.createAlert(
    {
      bloodGroup: 'O+' as any,
      component: BloodComponent.RBC,
      unitsNeeded: 3,
      priority: AlertPriority.CRITICAL,
      patientCondition: 'Road traffic accident — emergency surgery',
      requiredBy: new Date(Date.now() + 4 * 3600000).toISOString(),
      searchRadius: 8,
      isEmergency: true,
    },
    String(hospitals[0].userId),
  );

  console.log(`Seeded DonorConnect demo data. Password for every account: password123
  admin@donorconnect.demo
  gh@donorconnect.demo      (Government General Hospital)
  adyar@donorconnect.demo   (Adyar Cancer Institute)
  donor@donorconnect.demo   (O+ donor, plus donor1..donor29)`);
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

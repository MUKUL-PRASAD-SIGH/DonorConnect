/**
 * End-to-end flow against a real MongoDB (set E2E_MONGODB_URI, default localhost:27099).
 *   docker run -d --rm --name dc-e2e-mongo -p 27099:27017 mongo:7
 */
process.env.MONGODB_URI = process.env.E2E_MONGODB_URI || `mongodb://localhost:27099/donorconnect-e2e-${Date.now()}`;
process.env.JWT_SECRET = 'e2e-secret';
process.env.AUTO_VERIFY_HOSPITALS = 'true';
process.env.DISPATCH_TICK = 'off';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import * as request from 'supertest';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppModule } = require('../src/app.module');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AlertsService } = require('../src/alerts/alerts.service');

const CHENNAI = { lat: 13.0827, lng: 80.2707 };
const offset = (km: number) => ({ latitude: CHENNAI.lat + km / 111, longitude: CHENNAI.lng });

jest.setTimeout(60000);

describe('Coordinated response flow (e2e)', () => {
  let app: INestApplication;
  let http: () => request.SuperTest<request.Test>;
  const tokens: Record<string, string> = {};
  const ids: Record<string, string> = {};

  const register = async (key: string, body: Record<string, any>) => {
    const res = await http()
      .post('/auth/register')
      .send({ password: 'password123', phone: `+91 98400 0${Object.keys(tokens).length.toString().padStart(4, '0')}`, address: 'Chennai', ...body })
      .expect(201);
    tokens[key] = res.body.token;
    ids[key] = res.body.user.donorId || res.body.user.hospitalId;
    return res.body;
  };
  const donor = (key: string, km: number, extra: Record<string, any> = {}) =>
    register(key, { name: key, email: `${key}@e2e.test`, role: 'donor', bloodGroup: 'O+', dateOfBirth: '1994-02-02', weight: 72, sex: 'male', ...offset(km), ...extra });
  const as = (key: string) => ({ Authorization: `Bearer ${tokens[key]}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    http = () => request(app.getHttpServer());
    await app.get(getConnectionToken()).syncIndexes();
  }, 60000);

  afterAll(async () => {
    await app.get(getConnectionToken()).dropDatabase();
    await app.close();
  });

  it('rejects self-registration as admin', async () => {
    await http()
      .post('/auth/register')
      .send({ name: 'x', email: 'admin@e2e.test', password: 'password123', phone: '1', address: 'x', role: 'admin', ...offset(0) })
      .expect(400);
  });

  it('runs wave dispatch, slot capping, standby promotion and the live link', async () => {
    const hospital = await register('hospital', {
      name: 'City General',
      email: 'hospital@e2e.test',
      role: 'hospital',
      hospitalName: 'City General Hospital',
      licenseNumber: 'TN-001',
      contactPerson: 'Dr. Rao',
      emergencyContact: '+91 44 0000 0000',
      ...offset(0),
    });
    expect(hospital.user.isVerified).toBe(true);
    expect(JSON.stringify(hospital)).not.toMatch(/password/);

    for (let i = 1; i <= 6; i++) await donor(`d${i}`, i * 0.5);
    await donor('wrongGroup', 1, { bloodGroup: 'A+' });
    await donor('farAway', 120);
    await donor('tattooed', 1);
    await http()
      .post('/donors/screening')
      .set(as('tattooed'))
      .send({ tattooOrPiercingOn: new Date(Date.now() - 30 * 86400000).toISOString() })
      .expect(201);

    const created = await http()
      .post('/alerts')
      .set(as('hospital'))
      .send({
        bloodGroup: 'O+',
        component: 'rbc',
        unitsNeeded: 2,
        priority: 'critical',
        patientCondition: 'Post-partum haemorrhage',
        requiredBy: new Date(Date.now() + 3 * 3600000).toISOString(),
        searchRadius: 5,
      })
      .expect(201);
    const alert = created.body;
    expect(alert.waves).toHaveLength(1);
    const invited = alert.responses.map((r) => r.donorId);
    expect(invited.length).toBeGreaterThanOrEqual(3);
    expect(invited.length).toBeLessThan(9);
    for (const excluded of ['wrongGroup', 'farAway', 'tattooed']) expect(invited).not.toContain(ids[excluded]);
    expect(JSON.stringify(alert)).not.toMatch(/password/);
    // Donor phones stay hidden until they hold a slot
    expect(alert.responses.every((r) => r.phone === undefined)).toBe(true);

    const keyFor = (donorId: string) => Object.keys(ids).find((k) => ids[k] === donorId);
    const [first, second, third] = invited.map(keyFor);

    const invites = await http().get('/alerts/invites').set(as(first)).expect(200);
    expect(invites.body[0].myResponse.status).toBe('invited');
    expect(invites.body[0].hospital.emergencyContact).toBeUndefined();

    const a1 = await http().post(`/alerts/${alert._id}/respond`).set(as(first)).send({ action: 'accept' }).expect(201);
    expect(a1.body.myResponse.status).toBe('accepted');
    expect(a1.body.hospital.emergencyContact).toBeDefined();
    await http().post(`/alerts/${alert._id}/respond`).set(as(second)).send({ action: 'accept' }).expect(201);

    let view = (await http().get('/alerts/hospital').set(as('hospital')).expect(200)).body[0];
    expect(view.dispatchState).toBe('covered');
    expect(view.coverage.openSlots).toBe(0);
    expect(view.responses.filter((r) => r.status === 'stood_down').length).toBe(invited.length - 2);
    expect(view.responses.find((r) => r.donorId === ids[first]).phone).toBeDefined();

    // A stood-down donor who still wants to help goes to standby, not over-capacity
    const late = await http().post(`/alerts/${alert._id}/respond`).set(as(third)).send({ action: 'accept' }).expect(201);
    expect(late.body.myResponse.status).toBe('standby');

    // When a committed donor drops out, standby is promoted automatically
    await http().post(`/alerts/${alert._id}/respond`).set(as(first)).send({ action: 'withdraw' }).expect(201);
    view = (await http().get('/alerts/hospital').set(as('hospital')).expect(200)).body[0];
    expect(view.responses.find((r) => r.donorId === ids[third]).status).toBe('accepted');
    expect(view.dispatchState).toBe('covered');

    // Public link: no patient details, live state
    let pub = (await http().get(`/public/requests/${alert.publicCode}`).expect(200)).body;
    expect(pub.shareState).toBe('covered');
    expect(pub.patientCondition).toBeUndefined();
    expect(pub.responses).toBeUndefined();
    expect(pub.hospital.verified).toBe(true);
    expect(pub.compatibleDonorGroups).toContain('O-');

    await http().post(`/alerts/${alert._id}/responses/${ids[second]}/arrived`).set(as('hospital')).expect(201);
    await http().post(`/alerts/${alert._id}/responses/${ids[third]}/arrived`).set(as('hospital')).expect(201);
    pub = (await http().get(`/public/requests/${alert.publicCode}`).expect(200)).body;
    expect(pub.status).toBe('fulfilled');
    expect(pub.shareState).toBe('closed');

    const profile = (await http().get('/donors/profile').set(as(second)).expect(200)).body;
    expect(profile.totalDonations).toBe(1);
    expect(profile.reliability.arrived).toBe(1);
    expect(profile.eligibility.components.whole_blood.eligible).toBe(false);
  });

  it('lets donors reply by SMS with their code', async () => {
    const created = await http()
      .post('/alerts')
      .set(as('hospital'))
      .send({
        bloodGroup: 'O+',
        unitsNeeded: 1,
        priority: 'high',
        patientCondition: 'Surgery',
        requiredBy: new Date(Date.now() + 6 * 3600000).toISOString(),
      })
      .expect(201);
    const r = created.body.responses[0];
    const donorKey = Object.keys(ids).find((k) => ids[k] === r.donorId);
    const invites = (await http().get('/alerts/invites').set(as(donorKey)).expect(200)).body;
    const code = invites.find((i) => i._id === created.body._id).myResponse.replyCode;
    const me = (await http().get('/auth/me').set(as(donorKey)).expect(200)).body;

    const sms = await http().post('/sms/inbound').type('form').send({ From: me.phone, Body: `yes ${code.toLowerCase()}` }).expect(200);
    expect(sms.text).toMatch(/Confirmed/);
    const wrong = await http().post('/sms/inbound').type('form').send({ From: '+1 555 0000', Body: `YES ${code}` }).expect(200);
    expect(wrong.text).toMatch(/not sent to this number/);
  });

  it('escalates rare-blood requests beyond the normal radius', async () => {
    await donor('bombayDonor', 300, { rarePhenotypes: ['bombay'] });
    const created = await http()
      .post('/alerts')
      .set(as('hospital'))
      .send({
        bloodGroup: 'O+',
        requiredPhenotype: 'bombay',
        unitsNeeded: 1,
        priority: 'critical',
        patientCondition: 'Bombay phenotype patient',
        requiredBy: new Date(Date.now() + 24 * 3600000).toISOString(),
      })
      .expect(201);
    expect(created.body.responses.map((r) => r.donorId)).toEqual([ids.bombayDonor]);
    expect(created.body.currentRadiusKm).toBeGreaterThanOrEqual(200);
    const registry = (await http().get('/public/registry').expect(200)).body;
    expect(registry.find((r) => r.code === 'bombay').registered).toBe(1);
  });

  it('forecasts shortages and matches near-expiry surplus to a neighbour', async () => {
    await register('hospital2', {
      name: 'Harbour Clinic',
      email: 'h2@e2e.test',
      role: 'hospital',
      hospitalName: 'Harbour Clinic',
      licenseNumber: 'TN-002',
      contactPerson: 'Dr. Iyer',
      emergencyContact: '+91 44 1111 1111',
      ...offset(6),
    });

    // Hospital 1 holds platelets that will expire tomorrow
    await http()
      .post('/inventory/lots')
      .set(as('hospital'))
      .send({ bloodGroup: 'B+', component: 'platelets', units: 4, expiresAt: new Date(Date.now() + 36 * 3600000).toISOString() })
      .expect(201);
    await http().post('/inventory/usage').set(as('hospital')).send({ bloodGroup: 'B+', component: 'platelets', units: 9 }).expect(400);

    // Hospital 2 uses B+ platelets daily and has almost none left
    const conn = app.get(getConnectionToken());
    const h2 = await conn.collection('hospitals').findOne({ hospitalName: 'Harbour Clinic' });
    await conn.collection('usageevents').insertMany(
      Array.from({ length: 21 }, (_, i) => ({
        hospitalId: h2._id,
        bloodGroup: 'B+',
        component: 'platelets',
        units: 2,
        kind: 'used',
        at: new Date(Date.now() - (i + 1) * 86400000),
      })),
    );
    await http()
      .post('/inventory/lots')
      .set(as('hospital2'))
      .send({ bloodGroup: 'B+', component: 'platelets', units: 1, expiresAt: new Date(Date.now() + 4 * 86400000).toISOString() })
      .expect(201);

    const fc = (await http().get('/inventory/forecast').set(as('hospital2')).expect(200)).body;
    const item = fc.items.find((i) => i.bloodGroup === 'B+');
    expect(item.avgDailyUse).toBe(2);
    expect(item.shortfallDate).toBeTruthy();

    const suggestions = (await http().get('/inventory/exchange/suggestions').set(as('hospital')).expect(200)).body;
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].to.name).toBe('Harbour Clinic');

    const offers = (
      await http()
        .post('/inventory/exchange/offers')
        .set(as('hospital'))
        .send({ lotId: suggestions[0].lotId, toHospitalId: suggestions[0].to.hospitalId, units: 4 })
        .expect(201)
    ).body;
    const offerId = offers[0]._id;
    await http().patch(`/inventory/exchange/offers/${offerId}`).set(as('hospital')).send({ action: 'accept' }).expect(403);
    await http().patch(`/inventory/exchange/offers/${offerId}`).set(as('hospital2')).send({ action: 'accept' }).expect(200);
    await http().patch(`/inventory/exchange/offers/${offerId}`).set(as('hospital2')).send({ action: 'complete' }).expect(200);

    const inv2 = (await http().get('/inventory').set(as('hospital2')).expect(200)).body;
    expect(inv2.totals.find((t) => t.bloodGroup === 'B+').units).toBe(5);
    const inv1 = (await http().get('/inventory').set(as('hospital')).expect(200)).body;
    expect(inv1.totals.find((t) => t.bloodGroup === 'B+')).toBeUndefined();
  });

  it('releases a held slot when the donor does not arrive in time and promotes standby', async () => {
    const created = (
      await http()
        .post('/alerts')
        .set(as('hospital'))
        .send({ bloodGroup: 'O+', unitsNeeded: 1, priority: 'critical', patientCondition: 'Trauma', requiredBy: new Date(Date.now() + 3600000).toISOString() })
        .expect(201)
    ).body;
    const [k1, k2] = created.responses.map((r) => Object.keys(ids).find((k) => ids[k] === r.donorId));
    await http().post(`/alerts/${created._id}/respond`).set(as(k1)).send({ action: 'accept' }).expect(201);
    await http().post(`/alerts/${created._id}/respond`).set(as(k2)).send({ action: 'accept' }).expect(201);

    const conn = app.get(getConnectionToken());
    await conn
      .collection('alerts')
      .updateOne({ publicCode: created.publicCode, 'responses.status': 'accepted' }, { $set: { 'responses.$.holdExpiresAt': new Date(Date.now() - 1000) } });
    await app.get(AlertsService).tick();

    const view = (await http().get('/alerts/hospital').set(as('hospital')).expect(200)).body.find((a) => a._id === created._id);
    expect(view.responses.find((r) => r.donorId === ids[k1]).status).toBe('lapsed');
    expect(view.responses.find((r) => r.donorId === ids[k2]).status).toBe('accepted');
    expect(view.dispatchState).toBe('covered');
  });

  it('blocks donors from editing protected fields', async () => {
    await http().patch('/donors/profile').set(as('d4')).send({ rewardPoints: 99999 }).expect(400);
    await http().patch('/donors/profile').set(as('d4')).send({ availableForEmergency: false }).expect(200);
  });
});

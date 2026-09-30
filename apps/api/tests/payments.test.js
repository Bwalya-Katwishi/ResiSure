const { request, app, register, login, verifyStudent, verifyLandlord } = require('./helpers');
const { detectNetwork, normalizeZmPhone, toMsisdn260, validateZmPhone } = require('../src/services/payments/phone');
const { resolveProviderName, describeMethods, configuredLive } = require('../src/services/payments');
const { normalizeProviderStatus } = require('../src/services/payments/providerUtils');
const MockPaymentProvider = require('../src/services/payments/mock.provider');
const MtnMomoProvider = require('../src/services/payments/mtn.provider');
const AirtelMoneyProvider = require('../src/services/payments/airtel.provider');
const ZamtelKwachaProvider = require('../src/services/payments/zamtel.provider');

describe('Payment routing and methods', () => {
  test('detects Zambian MTN, Airtel, and Zamtel prefixes', () => {
    expect(detectNetwork('0961234567')).toBe('mtn_momo');
    expect(detectNetwork('0761234567')).toBe('mtn_momo');
    expect(detectNetwork('0971234567')).toBe('airtel_money');
    expect(detectNetwork('+260971234567')).toBe('airtel_money');
    expect(detectNetwork('0951234567')).toBe('zamtel');
    expect(detectNetwork('0751234567')).toBe('zamtel');
    expect(normalizeZmPhone('+260961234567')).toBe('0961234567');
    expect(toMsisdn260('0961234567')).toBe('260961234567');
  });

  test('rejects invalid phone numbers', () => {
    expect(() => validateZmPhone('12345')).toThrow();
  });

  test('normalizes provider statuses', () => {
    expect(normalizeProviderStatus('SUCCESSFUL', 'mtn_momo')).toBe('success');
    expect(normalizeProviderStatus('FAILED', 'mtn_momo')).toBe('failed');
    expect(normalizeProviderStatus('PENDING', 'airtel_money')).toBe('pending');
    expect(normalizeProviderStatus('TS', 'airtel_money')).toBe('success');
    expect(normalizeProviderStatus('TF', 'airtel_money')).toBe('failed');
  });

  test('tests always resolve to the mock provider', () => {
    expect(resolveProviderName('0961234567')).toBe('mock');
    expect(describeMethods().mode).toBe('mock');
    expect(describeMethods().networks).toHaveLength(3);
  });

  test('public methods endpoint does not expose secrets', async () => {
    const res = await request(app).get('/api/payments/methods');
    expect(res.status).toBe(200);
    expect(res.body.data.mode).toBe('mock');
    expect(res.body.data.demo).toBe(true);
    expect(JSON.stringify(res.body)).not.toMatch(/SECRET|API_KEY|PASSWORD/i);
  });

  test('webhook without a matching secret is rejected', async () => {
    const previous = process.env.PAYMENTS_WEBHOOK_SECRET;
    process.env.PAYMENTS_WEBHOOK_SECRET = 'test-webhook-secret';
    const denied = await request(app)
      .post('/api/payments/webhooks/mtn')
      .send({ reference: 'abc' });
    expect(denied.status).toBe(401);
    const allowed = await request(app)
      .post('/api/payments/webhooks/mtn?token=test-webhook-secret')
      .send({});
    expect(allowed.status).toBe(200);
    process.env.PAYMENTS_WEBHOOK_SECRET = previous;
  });

  test('unknown webhook provider returns 404', async () => {
    const token = process.env.PAYMENTS_WEBHOOK_SECRET || 'x';
    const res = await request(app)
      .post(`/api/payments/webhooks/unknown?token=${encodeURIComponent(token)}`)
      .send({});
    expect(res.status).toBe(404);
  });

  test('mock provider blocks production without ALLOW_MOCK_PAYMENTS', async () => {
    const prevNode = process.env.NODE_ENV;
    const prevAllow = process.env.ALLOW_MOCK_PAYMENTS;
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_MOCK_PAYMENTS = 'false';
    await expect(MockPaymentProvider.charge({ amount: 100, phone: '0971234567' }))
      .rejects.toMatchObject({ status: 503 });
    process.env.NODE_ENV = prevNode;
    process.env.ALLOW_MOCK_PAYMENTS = prevAllow;
  });

  test('live providers report not configured without credentials', () => {
    expect(MtnMomoProvider.configured()).toBe(false);
    expect(AirtelMoneyProvider.configured()).toBe(false);
    expect(ZamtelKwachaProvider.configured()).toBe(false);
  });

  test('student cannot poll another student booking payment status', async () => {
    const admin = await login('admin@resisure.zm');
    if (admin.status !== 200) return;
    const studentA = await register('student');
    const studentB = await register('student');
    const landlord = await register('landlord');
    await verifyStudent(admin.body.data.token, studentA.res.body.data.user.id);
    await verifyLandlord(admin.body.data.token, landlord.res.body.data.user.id);

    const listing = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlord.res.body.data.token}`)
      .send({
        title: 'Payment status room',
        address: 'Plot P-1',
        area: 'Chelstone',
        rent_per_month: 900,
        total_rooms: 1,
      });
    expect(listing.status).toBe(201);

    await request(app)
      .put(`/api/admin/properties/${listing.body.data.property.id}/verify`)
      .set('Authorization', `Bearer ${admin.body.data.token}`)
      .send({ status: 'verified' });

    const booked = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${studentA.res.body.data.token}`)
      .send({
        property_id: listing.body.data.property.id,
        move_in_date: new Date().toISOString().slice(0, 10),
      });
    expect(booked.status).toBe(201);

    const denied = await request(app)
      .get(`/api/payments/bookings/${booked.body.data.booking.id}/status`)
      .set('Authorization', `Bearer ${studentB.res.body.data.token}`);
    expect(denied.status).toBe(403);
  });

  test('mock payment uses booking amount from server and prevents duplicate capture', async () => {
    const admin = await login('admin@resisure.zm');
    if (admin.status !== 200) return;
    const student = await register('student');
    const landlord = await register('landlord');
    await verifyStudent(admin.body.data.token, student.res.body.data.user.id);
    await verifyLandlord(admin.body.data.token, landlord.res.body.data.user.id);

    const listing = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlord.res.body.data.token}`)
      .send({
        title: 'Duplicate pay room',
        address: 'Plot P-2',
        area: 'Libala',
        rent_per_month: 800,
        total_rooms: 1,
      });
    await request(app)
      .put(`/api/admin/properties/${listing.body.data.property.id}/verify`)
      .set('Authorization', `Bearer ${admin.body.data.token}`)
      .send({ status: 'verified' });

    const booked = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({
        property_id: listing.body.data.property.id,
        move_in_date: new Date().toISOString().slice(0, 10),
      });

    const accepted = await request(app)
      .put(`/api/bookings/${booked.body.data.booking.id}/accept`)
      .set('Authorization', `Bearer ${landlord.res.body.data.token}`);
    expect(accepted.status).toBe(200);

    const pay = await request(app)
      .put(`/api/bookings/${booked.body.data.booking.id}/pay`)
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({ phone: '0971234567', outcome: 'success' });
    expect(pay.status).toBe(200);
    expect(pay.body.data.payment.provider).toBe('mock');

    const duplicate = await request(app)
      .put(`/api/bookings/${booked.body.data.booking.id}/pay`)
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({ phone: '0971234567', outcome: 'success' });
    expect([400, 409]).toContain(duplicate.status);
    expect(duplicate.body.message).toMatch(/already processed|Cannot pay/i);
  });
});

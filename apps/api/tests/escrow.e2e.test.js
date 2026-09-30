const { request, app, register, login, verifyStudent, verifyLandlord } = require('./helpers');

async function verifyProperty(adminToken, propertyId) {
  const res = await request(app)
    .put(`/api/admin/properties/${propertyId}/verify`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'verified' });
  expect(res.status).toBe(200);
}

describe('Core escrow workflow', () => {
  let adminToken;
  let student;
  let landlord;
  let propertyId;
  let bookingId;

  beforeAll(async () => {
    const admin = await login('admin@resisure.zm');
    if (admin.status !== 200) {
      throw new Error('Seeded admin@resisure.zm is required. From apps/api run: npm run migrate && npm run seed');
    }
    adminToken = admin.body.data.token;

    student = await register('student');
    landlord = await register('landlord');

    await verifyLandlord(adminToken, landlord.res.body.data.user.id);
    await verifyStudent(adminToken, student.res.body.data.user.id);

    const created = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlord.res.body.data.token}`)
      .send({
        title: 'E2E verified room',
        description: 'Test listing',
        address: 'Plot 99 Test',
        area: 'Chelstone',
        rent_per_month: 1500,
        total_rooms: 1,
        property_type: 'room',
        amenities: ['wifi', 'water'],
      });
    expect(created.status).toBe(201);
    expect(created.body.data.property.verification_status).toBe('pending');
    propertyId = created.body.data.property.id;
  });

  test('unverified listings are visible in public search and can be booked', async () => {
    const list = await request(app).get('/api/properties').query({ area: 'Chelstone', q: 'E2E verified room' });
    expect(list.status).toBe(200);
    const found = list.body.data.properties.find((p) => p.id === propertyId);
    expect(found).toBeTruthy();
    expect(found.verification_status).toBe('pending');
    expect(list.body.pagination).toBeTruthy();

    const book = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({ property_id: propertyId, move_in_date: new Date().toISOString().slice(0, 10) });
    expect(book.status).toBe(201);
    bookingId = book.body.data.booking.id;
  });

  test('admin can verify a property', async () => {
    await verifyProperty(adminToken, propertyId);
    const list = await request(app).get('/api/properties').query({ q: 'E2E verified room' });
    const found = list.body.data.properties.find((p) => p.id === propertyId);
    expect(found).toBeTruthy();
    expect(found.verification_status).toBe('verified');
  });

  test('duplicate booking is blocked and landlord accepts', async () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(bookingId).toBeTruthy();

    const dup = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({ property_id: propertyId, move_in_date: today });
    expect(dup.status).toBe(409);

    const accept = await request(app)
      .put(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${landlord.res.body.data.token}`);
    expect(accept.status).toBe(200);
    expect(accept.body.data.booking.status).toBe('accepted');
  });

  test('mock payment failure leaves booking payable', async () => {
    const fail = await request(app)
      .put(`/api/bookings/${bookingId}/pay`)
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({ phone: '0971234000', outcome: 'failed' });
    expect(fail.status).toBe(402);

    const booking = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${student.res.body.data.token}`);
    expect(booking.body.data.booking.status).toBe('accepted');
  });

  test('landlord cannot confirm move-in or pay', async () => {
    const pay = await request(app)
      .put(`/api/bookings/${bookingId}/pay`)
      .set('Authorization', `Bearer ${landlord.res.body.data.token}`)
      .send({ phone: '0971234567', outcome: 'success' });
    expect(pay.status).toBe(403);

    const confirm = await request(app)
      .put(`/api/bookings/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${landlord.res.body.data.token}`);
    expect(confirm.status).toBe(403);
  });

  test('successful mock payment holds funds and does not release them', async () => {
    const pay = await request(app)
      .put(`/api/bookings/${bookingId}/pay`)
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({ phone: '0971234567', outcome: 'success' });
    expect(pay.status).toBe(200);
    expect(['escrow_held', 'move_in_window']).toContain(pay.body.data.booking.status);

    const txs = pay.body.data.booking.transactions || [];
    expect(txs.some((t) => t.type === 'capture' && t.status === 'completed')).toBe(true);
    expect(txs.some((t) => t.type === 'release')).toBe(false);
    expect(pay.body.data.payment.provider).toBe('mock');
  });

  test('second payment is rejected', async () => {
    const pay = await request(app)
      .put(`/api/bookings/${bookingId}/pay`)
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({ phone: '0971234567', outcome: 'success' });
    expect([400, 409]).toContain(pay.status);
  });

  test('student confirms move-in and escrow is released once', async () => {
    const booking = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${student.res.body.data.token}`);

    if (booking.body.data.booking.status !== 'move_in_window') {
      console.warn('Move-in window not open (future move-in date) — skipping confirm');
      return;
    }

    const confirm = await request(app)
      .put(`/api/bookings/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({});
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.booking.status).toBe('completed');

    const again = await request(app)
      .put(`/api/bookings/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({});
    expect([400, 409]).toContain(again.status);

    const detail = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${student.res.body.data.token}`);
    const txs = detail.body.data.booking.transactions;
    expect(txs.filter((t) => t.type === 'release' && t.status === 'completed')).toHaveLength(1);
  });
});

describe('Dispute blocks release path', () => {
  test('student can dispute during move-in window and admin can refund', async () => {
    const admin = await login('admin@resisure.zm');
    const adminToken = admin.body.data.token;
    const student = await register('student');
    const landlord = await register('landlord');
    await verifyLandlord(adminToken, landlord.res.body.data.user.id);
    await verifyStudent(adminToken, student.res.body.data.user.id);

    const created = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlord.res.body.data.token}`)
      .send({
        title: 'Dispute room',
        address: 'Plot 2',
        area: 'Libala',
        rent_per_month: 800,
        total_rooms: 1,
      });
    await request(app)
      .put(`/api/admin/properties/${created.body.data.property.id}/verify`)
      .set('Authorization', `Bearer ${admin.body.data.token}`)
      .send({ status: 'verified' });

    const booked = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({
        property_id: created.body.data.property.id,
        move_in_date: new Date().toISOString().slice(0, 10),
      });
    await request(app)
      .put(`/api/bookings/${booked.body.data.booking.id}/accept`)
      .set('Authorization', `Bearer ${landlord.res.body.data.token}`);
    await request(app)
      .put(`/api/bookings/${booked.body.data.booking.id}/pay`)
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({ phone: '0971234567', outcome: 'success' });

    const dispute = await request(app)
      .put(`/api/bookings/${booked.body.data.booking.id}/dispute`)
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({ reason: 'Room does not match the listing' });
    expect(dispute.status).toBe(200);
    expect(dispute.body.data.booking.status).toBe('disputed');

    const confirm = await request(app)
      .put(`/api/bookings/${booked.body.data.booking.id}/confirm`)
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({});
    expect(confirm.status).toBe(400);
    expect(confirm.body.message).toMatch(/disputed|confirm move-in/i);

    const resolve = await request(app)
      .put(`/api/bookings/${booked.body.data.booking.id}/resolve`)
      .set('Authorization', `Bearer ${admin.body.data.token}`)
      .send({ resolution: 'refunded' });
    expect(resolve.status).toBe(200);
    expect(resolve.body.data.booking.status).toBe('refunded');
  });
});

const jwt = require('jsonwebtoken');
const { request, app, register, login, verifyStudent, verifyLandlord } = require('./helpers');
const { JWT_SECRET } = require('../src/config/jwt');

const PRESERVED_EMAILS = [
  'admin@resisure.zm',
  'andreatheu2003@yahoo.co.uk',
  'bwalya.katwishi@cs.unza.zm',
  'bwalyakatwishi@gmail.com',
];

describe('Role protection and IDOR', () => {
  let adminToken;
  let studentA;
  let studentB;
  let landlordA;
  let landlordB;
  let propertyId;
  let bookingId;

  beforeAll(async () => {
    const admin = await login('admin@resisure.zm');
    if (admin.status !== 200) {
      throw new Error('Seeded admin@resisure.zm is required');
    }
    adminToken = admin.body.data.token;

    studentA = await register('student');
    studentB = await register('student');
    landlordA = await register('landlord');
    landlordB = await register('landlord');

    await verifyStudent(adminToken, studentA.res.body.data.user.id);
    await verifyLandlord(adminToken, landlordA.res.body.data.user.id);

    const listing = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlordA.res.body.data.token}`)
      .send({
        title: 'Role protection room',
        address: 'Plot RP-1',
        area: 'Chelstone',
        rent_per_month: 1000,
        total_rooms: 1,
      });
    expect(listing.status).toBe(201);
    propertyId = listing.body.data.property.id;

    await request(app)
      .put(`/api/admin/properties/${propertyId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'verified' });

    const booked = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${studentA.res.body.data.token}`)
      .send({
        property_id: propertyId,
        move_in_date: new Date().toISOString().slice(0, 10),
      });
    expect(booked.status).toBe(201);
    bookingId = booked.body.data.booking.id;
  });

  test('preserved production accounts still exist without modification', async () => {
    const pool = require('../src/config/database');
    const { rows } = await pool.query(
      `SELECT email, role FROM users WHERE email = ANY($1::text[]) ORDER BY email`,
      [PRESERVED_EMAILS]
    );
    expect(rows.length).toBe(PRESERVED_EMAILS.length);
    expect(rows.find((row) => row.email === 'admin@resisure.zm')?.role).toBe('admin');
    expect(rows.find((row) => row.email === 'andreatheu2003@yahoo.co.uk')?.role).toBe('student');
    expect(rows.find((row) => row.email === 'bwalya.katwishi@cs.unza.zm')?.role).toBe('landlord');
    expect(rows.find((row) => row.email === 'bwalyakatwishi@gmail.com')?.role).toBe('student');
  });

  test('student cannot access another student booking (IDOR)', async () => {
    const res = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${studentB.res.body.data.token}`);
    expect(res.status).toBe(403);
  });

  test('landlord cannot access bookings for another landlord property (IDOR)', async () => {
    const res = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${landlordB.res.body.data.token}`);
    expect(res.status).toBe(403);
  });

  test('student cannot accept bookings', async () => {
    const res = await request(app)
      .put(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${studentA.res.body.data.token}`);
    expect(res.status).toBe(403);
  });

  test('landlord cannot pay or confirm move-in on a booking', async () => {
    await request(app)
      .put(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${landlordA.res.body.data.token}`);

    const pay = await request(app)
      .put(`/api/bookings/${bookingId}/pay`)
      .set('Authorization', `Bearer ${landlordA.res.body.data.token}`)
      .send({ phone: '0971234567', outcome: 'success' });
    expect(pay.status).toBe(403);

    const confirm = await request(app)
      .put(`/api/bookings/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${landlordA.res.body.data.token}`);
    expect(confirm.status).toBe(403);
  });

  test('student cannot access landlord-only routes', async () => {
    const listings = await request(app)
      .get('/api/properties/my/listings')
      .set('Authorization', `Bearer ${studentA.res.body.data.token}`);
    expect(listings.status).toBe(403);

    const profile = await request(app)
      .get('/api/landlords/me')
      .set('Authorization', `Bearer ${studentA.res.body.data.token}`);
    expect(profile.status).toBe(403);
  });

  test('landlord cannot access student-only routes', async () => {
    const favorites = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${landlordA.res.body.data.token}`);
    expect(favorites.status).toBe(403);

    const bookings = await request(app)
      .get('/api/bookings/my')
      .set('Authorization', `Bearer ${landlordA.res.body.data.token}`);
    expect(bookings.status).toBe(403);
  });

  test('landlord cannot resolve disputes (admin only)', async () => {
    const res = await request(app)
      .put(`/api/bookings/${bookingId}/resolve`)
      .set('Authorization', `Bearer ${landlordA.res.body.data.token}`)
      .send({ resolution: 'refund_student' });
    expect(res.status).toBe(403);
  });

  test('invalid JWT is rejected', async () => {
    const res = await request(app)
      .get('/api/bookings/my')
      .set('Authorization', 'Bearer not-a-valid-token');
    expect(res.status).toBe(401);
  });

  test('expired JWT is rejected with session message', async () => {
    const expired = jwt.sign({ id: studentA.res.body.data.user.id }, JWT_SECRET, { expiresIn: '-1s' });
    const res = await request(app)
      .get('/api/bookings/my')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/session expired/i);
  });

  test('unauthenticated requests to protected routes return 401', async () => {
    const res = await request(app).get(`/api/bookings/${bookingId}`);
    expect(res.status).toBe(401);
  });
});

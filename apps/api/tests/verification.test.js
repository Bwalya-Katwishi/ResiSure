const { request, app, register, login, verifyStudent, verifyLandlord } = require('./helpers');

describe('Verification gates', () => {
  let adminToken;
  let student;
  let landlord;
  let propertyId;

  beforeAll(async () => {
    const admin = await login('admin@resisure.zm');
    if (admin.status !== 200) {
      throw new Error('Seeded admin@resisure.zm is required. From apps/api run: npm run migrate && npm run seed');
    }
    adminToken = admin.body.data.token;

    student = await register('student');
    landlord = await register('landlord');

    await verifyLandlord(adminToken, landlord.res.body.data.user.id);

    const created = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlord.res.body.data.token}`)
      .send({
        title: 'Gate test room',
        address: 'Plot 1 Gate',
        area: 'Chelstone',
        rent_per_month: 1200,
        total_rooms: 1,
      });
    expect(created.status).toBe(201);
    propertyId = created.body.data.property.id;

    await request(app)
      .put(`/api/admin/properties/${propertyId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'verified' });
  });

  test('unverified landlord cannot create listings', async () => {
    const freshLandlord = await register('landlord');
    const listing = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${freshLandlord.res.body.data.token}`)
      .send({
        title: 'Blocked approval room',
        address: 'Plot 2 Gate',
        area: 'Libala',
        rent_per_month: 900,
        total_rooms: 1,
      });

    expect(listing.status).toBe(403);
    expect(listing.body.code).toBe('LANDLORD_NOT_VERIFIED');
  });

  test('unverified student cannot book a verified listing', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({
        property_id: propertyId,
        move_in_date: new Date().toISOString().slice(0, 10),
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('STUDENT_NOT_VERIFIED');
  });

  test('verified student can book after admin approval', async () => {
    const freshStudent = await register('student');
    await verifyStudent(adminToken, freshStudent.res.body.data.user.id);

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${freshStudent.res.body.data.token}`)
      .send({
        property_id: propertyId,
        move_in_date: new Date().toISOString().slice(0, 10),
      });

    expect(res.status).toBe(201);
  });

  test('unverified landlord cannot accept bookings', async () => {
    const freshStudent = await register('student');
    const freshLandlord = await register('landlord');
    await verifyStudent(adminToken, freshStudent.res.body.data.user.id);
    await verifyLandlord(adminToken, freshLandlord.res.body.data.user.id);

    const listing = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${freshLandlord.res.body.data.token}`)
      .send({
        title: 'Accept gate room',
        address: 'Plot 3 Gate',
        area: 'Kalingalinga',
        rent_per_month: 1000,
        total_rooms: 1,
      });

    await request(app)
      .put(`/api/admin/properties/${listing.body.data.property.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'verified' });

    const booked = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${freshStudent.res.body.data.token}`)
      .send({
        property_id: listing.body.data.property.id,
        move_in_date: new Date().toISOString().slice(0, 10),
      });
    expect(booked.status).toBe(201);

    await request(app)
      .put(`/api/admin/landlords/${freshLandlord.res.body.data.user.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'rejected', rejection_reason: 'Documents could not be verified' });

    const accept = await request(app)
      .put(`/api/bookings/${booked.body.data.booking.id}/accept`)
      .set('Authorization', `Bearer ${freshLandlord.res.body.data.token}`);

    expect(accept.status).toBe(403);
    expect(accept.body.code).toBe('LANDLORD_NOT_VERIFIED');
  });

  test('password reset issues a token and allows reset', async () => {
    const forgot = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: student.payload.email });
    expect(forgot.status).toBe(200);

    const pool = require('../src/config/database');
    const row = await pool.query(
      `SELECT token_hash FROM password_reset_tokens
       WHERE user_id = $1 AND used_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [student.res.body.data.user.id]
    );
    expect(row.rows[0]).toBeTruthy();

    const crypto = require('crypto');
    const rawToken = 'test-reset-token-for-jest-only-12345678901234567890123456789012';
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await pool.query(
      'UPDATE password_reset_tokens SET token_hash = $1 WHERE user_id = $2 AND used_at IS NULL',
      [tokenHash, student.res.body.data.user.id]
    );

    const reset = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: 'newpassword123' });
    expect(reset.status).toBe(200);

    const loginOld = await login(student.payload.email, 'password123');
    expect(loginOld.status).toBe(401);

    const loginNew = await login(student.payload.email, 'newpassword123');
    expect(loginNew.status).toBe(200);
  });
});

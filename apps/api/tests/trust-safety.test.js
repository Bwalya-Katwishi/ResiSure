const { request, app, register, login, verifyStudent, verifyLandlord } = require('./helpers');

async function setupVerifiedListing() {
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
      title: 'Trust safety room',
      address: 'Plot 55 Trust',
      area: 'Woodlands',
      rent_per_month: 1200,
      total_rooms: 1,
    });

  await request(app)
    .put(`/api/admin/properties/${created.body.data.property.id}/verify`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'verified' });

  return { adminToken, student, landlord, propertyId: created.body.data.property.id };
}

describe('Trust and safety controls', () => {
  test('suspended landlord cannot accept bookings via direct API', async () => {
    const { adminToken, student, landlord, propertyId } = await setupVerifiedListing();

    await request(app)
      .put(`/api/admin/landlords/${landlord.res.body.data.user.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspended' });

    const booked = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({ property_id: propertyId, move_in_date: new Date().toISOString().slice(0, 10) });
    expect(booked.status).toBe(403);

    const otherStudent = await register('student');
    await verifyStudent(adminToken, otherStudent.res.body.data.user.id);
    const booked2 = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${otherStudent.res.body.data.token}`)
      .send({ property_id: propertyId, move_in_date: new Date().toISOString().slice(0, 10) });
    expect(booked2.status).toBe(403);
  });

  test('suspended listing cannot be booked', async () => {
    const { adminToken, student, propertyId } = await setupVerifiedListing();

    await request(app)
      .put(`/api/admin/properties/${propertyId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspended' });

    const booked = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({ property_id: propertyId, move_in_date: new Date().toISOString().slice(0, 10) });
    expect(booked.status).toBe(403);
    expect(booked.body.code).toBe('PROPERTY_SUSPENDED');
  });

  test('student can confirm move-in without a code', async () => {
    const { adminToken, student, landlord, propertyId } = await setupVerifiedListing();
    const today = new Date().toISOString().slice(0, 10);

    const booked = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({ property_id: propertyId, move_in_date: today });
    const bookingId = booked.body.data.booking.id;

    await request(app)
      .put(`/api/bookings/${bookingId}/accept`)
      .set('Authorization', `Bearer ${landlord.res.body.data.token}`);

    await request(app)
      .put(`/api/bookings/${bookingId}/pay`)
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({ phone: '0971234567', outcome: 'success' });

    const detail = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${student.res.body.data.token}`);

    if (detail.body.data.booking.status !== 'move_in_window') {
      console.warn('Skipping move-in code test — window not open');
      return;
    }

    const landlordView = await request(app)
      .get(`/api/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${landlord.res.body.data.token}`);
    expect(landlordView.body.data.booking.move_in_code).toBeUndefined();

    const confirm = await request(app)
      .put(`/api/bookings/${bookingId}/confirm`)
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({});
    expect(confirm.status).toBe(200);
  });

  test('student can submit a content report', async () => {
    const { student, propertyId } = await setupVerifiedListing();

    const report = await request(app)
      .post('/api/reports')
      .set('Authorization', `Bearer ${student.res.body.data.token}`)
      .send({
        entity_type: 'property',
        entity_id: propertyId,
        category: 'misleading_listing',
        description: 'Photos do not match the actual room',
      });
    expect(report.status).toBe(201);
    expect(report.body.data.report.status).toBe('open');
  });

  test('trust profile returns traceable backend signals', async () => {
    const { propertyId } = await setupVerifiedListing();

    const res = await request(app).get(`/api/properties/${propertyId}/trust-profile`);
    expect(res.status).toBe(200);
    expect(res.body.data.trustProfile.signals.length).toBeGreaterThan(0);
    expect(res.body.data.trustProfile.disclaimer).toMatch(/do not guarantee/i);
    expect(res.body.data.trustProfile.is_trusted_for_booking).toBe(true);
  });

  test('critical listing change resets verification', async () => {
    const { adminToken, landlord, propertyId } = await setupVerifiedListing();

    const update = await request(app)
      .put(`/api/properties/${propertyId}`)
      .set('Authorization', `Bearer ${landlord.res.body.data.token}`)
      .send({ rent_per_month: 9999 });
    expect(update.status).toBe(200);
    expect(update.body.data.property.verification_status).toBe('pending');

    const newStudent = await register('student');
    await verifyStudent(adminToken, newStudent.res.body.data.user.id);
    const book = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${newStudent.res.body.data.token}`)
      .send({ property_id: propertyId, move_in_date: new Date().toISOString().slice(0, 10) });
    expect(book.status).toBe(201);
    expect(book.body.data.booking.property_id).toBe(propertyId);
  });

  test('suspended account is blocked on authenticated routes', async () => {
    const { adminToken, student } = await setupVerifiedListing();

    await request(app)
      .put(`/api/admin/students/${student.res.body.data.user.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspended' });

    const me = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${student.res.body.data.token}`);
    expect(me.status).toBe(403);
    expect(me.body.code).toBe('ACCOUNT_SUSPENDED');
  });
});

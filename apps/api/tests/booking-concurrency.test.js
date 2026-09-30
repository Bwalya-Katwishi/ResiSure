const { request, app, register, login, verifyStudent, verifyLandlord } = require('./helpers');

async function setupSingleRoomListing() {
  const admin = await login('admin@resisure.zm');
  if (admin.status !== 200) {
    throw new Error('Seeded admin@resisure.zm is required.');
  }
  const adminToken = admin.body.data.token;
  const landlord = await register('landlord');
  await verifyLandlord(adminToken, landlord.res.body.data.user.id);

  const created = await request(app)
    .post('/api/properties')
    .set('Authorization', `Bearer ${landlord.res.body.data.token}`)
    .send({
      title: 'Concurrency test room',
      address: 'Plot 99 Concurrency',
      area: 'Chelstone',
      rent_per_month: 1500,
      total_rooms: 1,
    });
  expect(created.status).toBe(201);

  await request(app)
    .put(`/api/admin/properties/${created.body.data.property.id}/verify`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'verified' });

  return {
    adminToken,
    landlord,
    propertyId: created.body.data.property.id,
  };
}

describe('Booking concurrency protection', () => {
  test('two students racing for one room — only one succeeds', async () => {
    const { adminToken, propertyId } = await setupSingleRoomListing();
    const studentA = await register('student');
    const studentB = await register('student');
    await verifyStudent(adminToken, studentA.res.body.data.user.id);
    await verifyStudent(adminToken, studentB.res.body.data.user.id);

    const moveIn = new Date().toISOString().slice(0, 10);
    const payload = { property_id: propertyId, move_in_date: moveIn };

    const [first, second] = await Promise.all([
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentA.res.body.data.token}`)
        .send(payload),
      request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentB.res.body.data.token}`)
        .send(payload),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);

    const rejected = first.status === 409 ? first : second;
    expect(rejected.body.code).toBe('PROPERTY_FULLY_BOOKED');
    expect(rejected.body.message).toMatch(/no longer available/i);
  });

  test('same student double-submit — only one booking is created', async () => {
    const { adminToken, propertyId } = await setupSingleRoomListing();
    const student = await register('student');
    await verifyStudent(adminToken, student.res.body.data.user.id);

    const moveIn = new Date().toISOString().slice(0, 10);
    const payload = { property_id: propertyId, move_in_date: moveIn };
    const token = student.res.body.data.token;

    const [first, second] = await Promise.all([
      request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send(payload),
      request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send(payload),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);

    const rejected = first.status === 409 ? first : second;
    expect(rejected.body.code).toBe('BOOKING_ALREADY_EXISTS');
  });

  test('sequential retry after active booking returns friendly conflict', async () => {
    const { adminToken, propertyId } = await setupSingleRoomListing();
    const student = await register('student');
    await verifyStudent(adminToken, student.res.body.data.user.id);

    const moveIn = new Date().toISOString().slice(0, 10);
    const payload = { property_id: propertyId, move_in_date: moveIn };
    const token = student.res.body.data.token;

    const first = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(first.status).toBe(201);

    const retry = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(retry.status).toBe(409);
    expect(retry.body.code).toBe('BOOKING_ALREADY_EXISTS');
  });
});

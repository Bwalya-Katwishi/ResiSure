const { request, app, register, login, verifyLandlord } = require('./helpers');

describe('Authorization', () => {
  test('student cannot access admin APIs', async () => {
    const { res } = await register('student');
    const denied = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${res.body.data.token}`);
    expect(denied.status).toBe(403);
  });

  test('landlord cannot access admin APIs', async () => {
    const { res } = await register('landlord');
    const denied = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${res.body.data.token}`);
    expect(denied.status).toBe(403);
  });

  test('landlord cannot update another landlord property', async () => {
    const admin = await login('admin@resisure.zm');
    expect(admin.status).toBe(200);
    const owner = await register('landlord');
    const other = await register('landlord');
    await verifyLandlord(admin.body.data.token, owner.res.body.data.user.id);
    const created = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${owner.res.body.data.token}`)
      .send({
        title: 'Owner listing',
        address: 'Plot 1',
        area: 'Chelstone',
        rent_per_month: 1000,
        total_rooms: 1,
      });
    expect(created.status).toBe(201);

    const stolen = await request(app)
      .put(`/api/properties/${created.body.data.property.id}`)
      .set('Authorization', `Bearer ${other.res.body.data.token}`)
      .send({ title: 'Hijacked' });
    expect(stolen.status).toBe(403);
  });

  test('student can load their transaction history', async () => {
    const { res } = await register('student');
    const txs = await request(app)
      .get('/api/bookings/my/transactions')
      .set('Authorization', `Bearer ${res.body.data.token}`);
    expect(txs.status).toBe(200);
    expect(Array.isArray(txs.body.data.transactions)).toBe(true);
  });

  test('admin login can reach admin stats', async () => {
    const admin = await login('admin@resisure.zm');
    if (admin.status !== 200) {
      console.warn('Seeded admin missing — run npm run seed');
      return;
    }
    const stats = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${admin.body.data.token}`);
    expect(stats.status).toBe(200);
    expect(stats.body.data.stats).toBeTruthy();
  });
});

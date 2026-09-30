const { request, app, register, login, verifyLandlord } = require('./helpers');

async function createVerifiedListing(adminToken, landlordToken, landlordUserId, title = 'Favorite test room') {
  await verifyLandlord(adminToken, landlordUserId);

  const created = await request(app)
    .post('/api/properties')
    .set('Authorization', `Bearer ${landlordToken}`)
    .send({
      title,
      description: 'Saved-listings fixture',
      address: 'Plot 12 Favorites',
      area: 'Roma',
      rent_per_month: 1200,
      total_rooms: 1,
      property_type: 'room',
      amenities: ['wifi'],
    });
  expect(created.status).toBe(201);
  const propertyId = created.body.data.property.id;
  const verified = await request(app)
    .put(`/api/admin/properties/${propertyId}/verify`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'verified' });
  expect(verified.status).toBe(200);
  return propertyId;
}

describe('Favorites', () => {
  let adminToken;
  let studentToken;
  let landlordToken;
  let propertyId;

  beforeAll(async () => {
    const admin = await login('admin@resisure.zm');
    if (admin.status !== 200) {
      throw new Error('Seeded admin@resisure.zm is required. From apps/api run: npm run migrate && npm run seed');
    }
    adminToken = admin.body.data.token;
    const student = await register('student');
    const landlord = await register('landlord');
    studentToken = student.res.body.data.token;
    landlordToken = landlord.res.body.data.token;
    propertyId = await createVerifiedListing(
      adminToken,
      landlordToken,
      landlord.res.body.data.user.id
    );
  });

  test('unauthenticated users cannot save listings', async () => {
    const res = await request(app).post('/api/favorites').send({ property_id: propertyId });
    expect(res.status).toBe(401);
  });

  test('landlords cannot use favorites', async () => {
    const res = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ property_id: propertyId });
    expect(res.status).toBe(403);
  });

  test('student can add, list, and remove a favorite', async () => {
    const added = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ property_id: propertyId });
    expect(added.status).toBe(201);

    const again = await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ property_id: propertyId });
    expect(again.status).toBe(200);

    const list = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.properties.some((p) => p.id === propertyId)).toBe(true);
    expect(list.body.data.properties[0].is_favorite).toBe(true);

    const removed = await request(app)
      .delete(`/api/favorites/${propertyId}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(removed.status).toBe(200);

    const empty = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(empty.body.data.properties.find((p) => p.id === propertyId)).toBeUndefined();
  });

  test('authenticated browse marks is_favorite', async () => {
    await request(app)
      .post('/api/favorites')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ property_id: propertyId });

    const list = await request(app)
      .get('/api/properties')
      .query({ q: 'Favorite test room' })
      .set('Authorization', `Bearer ${studentToken}`);
    expect(list.status).toBe(200);
    const match = list.body.data.properties.find((p) => p.id === propertyId);
    expect(match).toBeTruthy();
    expect(match.is_favorite).toBe(true);

    const anon = await request(app).get('/api/properties').query({ q: 'Favorite test room' });
    const anonMatch = anon.body.data.properties.find((p) => p.id === propertyId);
    expect(anonMatch.is_favorite).toBe(false);
  });
});

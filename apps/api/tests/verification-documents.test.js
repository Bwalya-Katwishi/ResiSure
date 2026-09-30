const fs = require('fs');
const path = require('path');
const { request, app, register, login, verifyLandlord } = require('./helpers');
const { docsDir, LOCAL_PREFIX } = require('../src/config/verificationUpload');

const MINIMAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const MINIMAL_PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\nxref\n0 1\ntrailer\n<<>>\n%%EOF');

function attachVerificationDocs(req, nrcNumber) {
  return req
    .field('nrc_number', nrcNumber)
    .attach('nrc_document', MINIMAL_PNG, { filename: 'nrc.png', contentType: 'image/png' })
    .attach('land_document', MINIMAL_PDF, { filename: 'title.pdf', contentType: 'application/pdf' });
}

describe('Verification document security', () => {
  let adminToken;
  let landlordA;
  let landlordB;
  let student;

  beforeAll(async () => {
    const admin = await login('admin@resisure.zm');
    if (admin.status !== 200) {
      throw new Error('Seeded admin@resisure.zm is required');
    }
    adminToken = admin.body.data.token;

    landlordA = await register('landlord');
    landlordB = await register('landlord');
    student = await register('student');

    const submitA = await attachVerificationDocs(
      request(app)
        .post('/api/landlords/me/verification')
        .set('Authorization', `Bearer ${landlordA.res.body.data.token}`),
      '111111/11/1'
    );
    expect(submitA.status).toBe(200);

    const submitB = await attachVerificationDocs(
      request(app)
        .post('/api/landlords/me/verification')
        .set('Authorization', `Bearer ${landlordB.res.body.data.token}`),
      '222222/22/1'
    );
    expect(submitB.status).toBe(200);
  });

  test('landlord profile never exposes raw storage URLs', async () => {
    const res = await request(app)
      .get('/api/landlords/me')
      .set('Authorization', `Bearer ${landlordA.res.body.data.token}`);

    expect(res.status).toBe(200);
    const profile = res.body.data.profile;
    expect(profile.nrc_doc_url).toMatch(/^\/api\/landlords\/me\/verification\/document\?type=nrc$/);
    expect(profile.land_doc_url).toMatch(/^\/api\/landlords\/me\/verification\/document\?type=land$/);
    expect(profile.nrc_doc_url).not.toMatch(/^https?:\/\//);
    expect(profile.land_doc_url).not.toMatch(/^https?:\/\//);
    expect(profile.nrc_doc_url).not.toMatch(/uploads\/verification/);
    expect(profile.land_doc_url).not.toMatch(/uploads\/verification/);
  });

  test('property API does not expose landlord verification documents', async () => {
    await verifyLandlord(adminToken, landlordA.res.body.data.user.id);

    const listing = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${landlordA.res.body.data.token}`)
      .send({
        title: 'Doc security room',
        address: 'Plot 99 Secure',
        area: 'Chelstone',
        rent_per_month: 1100,
        total_rooms: 1,
      });
    expect(listing.status).toBe(201);

    const propertyRes = await request(app).get(`/api/properties/${listing.body.data.property.id}`);
    expect(propertyRes.status).toBe(200);
    const payload = JSON.stringify(propertyRes.body);
    expect(payload).not.toMatch(/nrc_doc/);
    expect(payload).not.toMatch(/land_doc/);
    expect(payload).not.toMatch(/verification_doc/);
    expect(payload).not.toMatch(/uploads\/verification/);
  });

  test('unauthenticated users cannot fetch verification documents', async () => {
    const res = await request(app).get('/api/landlords/me/verification/document?type=nrc');
    expect(res.status).toBe(401);
  });

  test('students cannot access landlord verification endpoints', async () => {
    const res = await request(app)
      .get('/api/landlords/me/verification/document?type=nrc')
      .set('Authorization', `Bearer ${student.res.body.data.token}`);
    expect(res.status).toBe(403);
  });

  test('landlord cannot access another landlord admin document route (IDOR)', async () => {
    const res = await request(app)
      .get(`/api/admin/landlords/${landlordB.res.body.data.user.id}/verification-document?type=nrc`)
      .set('Authorization', `Bearer ${landlordA.res.body.data.token}`);
    expect(res.status).toBe(403);
  });

  test('landlord can download only their own documents', async () => {
    const res = await request(app)
      .get('/api/landlords/me/verification/document?type=nrc')
      .set('Authorization', `Bearer ${landlordA.res.body.data.token}`);
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toMatch(/no-store/i);
  });

  test('admin can access landlord verification documents', async () => {
    const res = await request(app)
      .get(`/api/admin/landlords/${landlordA.res.body.data.user.id}/verification-document?type=nrc`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  test('direct /uploads/verification paths are blocked', async () => {
    const files = fs.readdirSync(docsDir).filter((name) => name.endsWith('.png') || name.endsWith('.pdf'));
    const guessed = files[0] || 'example.jpg';
    const res = await request(app).get(`/uploads/verification/${guessed}`);
    expect(res.status).toBe(404);
  });

  test('rejects invalid NRC format', async () => {
    const fake = await register('landlord');
    const res = await attachVerificationDocs(
      request(app)
        .post('/api/landlords/me/verification')
        .set('Authorization', `Bearer ${fake.res.body.data.token}`),
      '123456789'
    );

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/123456\/78\/1/i);
  });

  test('rejects invalid file content disguised as PDF', async () => {
    const fake = await register('landlord');
    const res = await request(app)
      .post('/api/landlords/me/verification')
      .set('Authorization', `Bearer ${fake.res.body.data.token}`)
      .field('nrc_number', '999999/99/9')
      .attach('nrc_document', Buffer.from('not-a-real-file'), {
        filename: 'fake.pdf',
        contentType: 'application/pdf',
      })
      .attach('land_document', MINIMAL_PDF, {
        filename: 'title.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/JPG, PNG, WebP or PDF/i);
  });

  test('legacy local refs remain readable only through authenticated routes', async () => {
    const legacyName = `legacy-${Date.now()}.png`;
    fs.writeFileSync(path.join(docsDir, legacyName), MINIMAL_PNG);
    const legacyRef = `${LOCAL_PREFIX}${legacyName}`;

    const pool = require('../src/config/database');
    await pool.query(
      `UPDATE landlord_profiles SET nrc_doc_url = $1 WHERE user_id = $2`,
      [legacyRef, landlordB.res.body.data.user.id]
    );

    const blocked = await request(app).get(`/uploads/verification/${legacyName}`);
    expect(blocked.status).toBe(404);

    const allowed = await request(app)
      .get('/api/landlords/me/verification/document?type=nrc')
      .set('Authorization', `Bearer ${landlordB.res.body.data.token}`);
    expect(allowed.status).toBe(200);
  });
});

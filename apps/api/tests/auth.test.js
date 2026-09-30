const { request, app, register, login } = require('./helpers');

describe('Authentication', () => {
  test('student can register and login', async () => {
    const { res, payload } = await register('student');
    expect(res.status).toBe(201);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('student');
    expect(res.body.data.user.password_hash).toBeUndefined();

    const loginRes = await login(payload.email, payload.password);
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.email).toBe(payload.email);
  });

  test('landlord register creates a pending profile', async () => {
    const { res } = await register('landlord');
    expect(res.status).toBe(201);
    expect(res.body.data.user.verification_status).toBe('pending');
  });

  test('cannot self-register as admin', async () => {
    const { res } = await register('admin');
    expect(res.status).toBe(400);
  });

  test('rejects invalid email and short password', async () => {
    const badEmail = await request(app).post('/api/auth/register').send({
      full_name: 'A',
      email: 'not-an-email',
      password: 'password123',
      role: 'student',
      accepted_terms: true,
    });
    expect(badEmail.status).toBe(400);

    const short = await request(app).post('/api/auth/register').send({
      full_name: 'A',
      email: 'ok@test.com',
      password: 'short',
      role: 'student',
      accepted_terms: true,
    });
    expect(short.status).toBe(400);
  });

  test('authenticated user can update their profile', async () => {
    const { res } = await register('student');
    const updated = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${res.body.data.token}`)
      .send({ full_name: 'Updated Student', phone: '0971234567' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.user.full_name).toBe('Updated Student');
    expect(updated.body.data.user.phone).toBe('0971234567');
  });

  test('wrong password is rejected', async () => {
    const { payload } = await register('student');
    const res = await login(payload.email, 'wrong-password');
    expect(res.status).toBe(401);
  });
});

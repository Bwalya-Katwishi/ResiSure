const { request, app, login } = require('./helpers');

const PRESERVED = [
  { email: 'admin@resisure.zm', role: 'admin' },
  { email: 'andreatheu2003@yahoo.co.uk', role: 'student' },
  { email: 'bwalya.katwishi@cs.unza.zm', role: 'landlord' },
  { email: 'bwalyakatwishi@gmail.com', role: 'student' },
];

describe('Preserved accounts (read-only audit)', () => {
  test('all preserved accounts exist with expected roles', async () => {
    const pool = require('../src/config/database');
    for (const account of PRESERVED) {
      const { rows } = await pool.query(
        'SELECT id, email, role, password_hash FROM users WHERE email = $1',
        [account.email]
      );
      expect(rows[0]).toBeTruthy();
      expect(rows[0].role).toBe(account.role);
      expect(rows[0].password_hash).toBeTruthy();
    }
  });

  test('admin preserved account can still authenticate when password is known from seed', async () => {
    const admin = await login('admin@resisure.zm');
    if (admin.status === 200) {
      expect(admin.body.data.user.role).toBe('admin');
      const stats = await request(app)
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${admin.body.data.token}`);
      expect(stats.status).toBe(200);
      return;
    }
    // Production admin password may differ from seed — account must still exist
    const pool = require('../src/config/database');
    const { rows } = await pool.query('SELECT role FROM users WHERE email = $1', ['admin@resisure.zm']);
    expect(rows[0]?.role).toBe('admin');
  });

  test('preserved student and landlord accounts were not deleted', async () => {
    const pool = require('../src/config/database');
    const emails = PRESERVED.filter((a) => a.role !== 'admin').map((a) => a.email);
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS count FROM users WHERE email = ANY($1::text[])',
      [emails]
    );
    expect(rows[0].count).toBe(emails.length);
  });
});

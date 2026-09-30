const path = require('path');
process.env.NODE_ENV = 'test';
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const request = require('supertest');
const app = require('../src/app');

function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@resisure.test`;
}

async function register(role, overrides = {}) {
  const payload = {
    full_name: overrides.full_name || `Test ${role}`,
    email: overrides.email || uniqueEmail(role),
    password: overrides.password || 'password123',
    role,
    phone: overrides.phone || '0971234567',
    accepted_terms: true,
  };
  const res = await request(app).post('/api/auth/register').send(payload);
  return { res, payload };
}

async function login(email, password = 'password123') {
  return request(app).post('/api/auth/login').send({ email, password });
}

function auth(token) {
  return (req) => req.set('Authorization', `Bearer ${token}`);
}

async function verifyStudent(adminToken, userId) {
  const res = await request(app)
    .put(`/api/admin/students/${userId}/verify`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'verified' });
  if (res.status !== 200) {
    throw new Error(`verifyStudent failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res;
}

async function verifyLandlord(adminToken, userId) {
  const res = await request(app)
    .put(`/api/admin/landlords/${userId}/verify`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'verified' });
  if (res.status !== 200) {
    throw new Error(`verifyLandlord failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res;
}

module.exports = { app, request, uniqueEmail, register, login, auth, verifyStudent, verifyLandlord };

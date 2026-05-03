const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');

jest.setTimeout(30000);

// Use a dedicated test DB
const TEST_DB = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/roomsathi_test';

beforeAll(async () => {
  await mongoose.connect(TEST_DB);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

// ─────────────────────────────────────────────
// Rooms
// ─────────────────────────────────────────────
describe('GET /api/v1/rooms', () => {
  test('returns 200 with rooms list', async () => {
    const res = await request(app).get('/api/v1/rooms');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────
describe('POST /api/v1/auth/signup', () => {
  test('creates a new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'testuser@example.com', password: 'password123' });
    expect(res.statusCode).toBe(201);
    expect(res.body.token).toBeDefined();
  });

  test('rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'testuser@example.com', password: 'password123' });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  test('logs in successfully with correct credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'testuser@example.com', password: 'password123' });
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('rejects wrong credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'testuser@example.com', password: 'wrongpassword' });
    expect(res.statusCode).toBe(401);
  });
});

// ─────────────────────────────────────────────
// Protected Routes
// ─────────────────────────────────────────────
describe('POST /api/v1/rooms', () => {
  let landlordToken;
  let userToken;

  beforeAll(async () => {
    // Create landlord
    const landlordRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'landlord@example.com', password: 'password123', role: 'landlord' });
    landlordToken = landlordRes.body.token;

    // Create user
    const userRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'user@example.com', password: 'password123', role: 'user' });
    userToken = userRes.body.token;
  });

  test('landlord can create room', async () => {
    const res = await request(app)
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${landlordToken}`)
      .send({ 
        title: 'Landlord Room', 
        price: 5000, 
        area: 'Sadar', 
        address: '123 Sadar', 
        whatsappNumber: '919876543210',
        images: [{ url: 'http://example.com/img.jpg', public_id: 'test' }]
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Landlord Room');
  });

  test('user cannot create room', async () => {
    const res = await request(app)
      .post('/api/v1/rooms')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'User Room', price: 5000, area: 'Sadar', address: '123 Sadar', whatsappNumber: '919876543210' });
    expect(res.statusCode).toBe(403);
  });
});

describe('GET /api/v1/rooms', () => {
  test('rooms are visible publicly', async () => {
    const res = await request(app).get('/api/v1/rooms');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('success');
  });
});

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
describe('GET /health', () => {
  test('returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
  });
});

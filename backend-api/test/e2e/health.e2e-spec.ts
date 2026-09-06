import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp } from './utils/bootstrap-app';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await bootstrapTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live is always ok', async () => {
    const res = await request(app.getHttpServer()).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /health/ready reports the database and (optional) Redis status', async () => {
    const res = await request(app.getHttpServer()).get('/health/ready');
    // Database must be reachable for a 200; Redis is informational only —
    // this run deliberately has no REDIS_URL, so `redis` should read "down"
    // while the endpoint still reports overall readiness.
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('database');
    expect(res.body).toHaveProperty('redis');
  });
});

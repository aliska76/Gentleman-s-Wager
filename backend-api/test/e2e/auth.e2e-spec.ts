import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootstrapTestApp } from './utils/bootstrap-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await bootstrapTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs a new username in and returns a usable token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: `edmund-${Date.now()}` });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('userId');
  });

  it('resolves the same identity on a second login with the same username', async () => {
    const username = `charlotte-${Date.now()}`;
    const first = await request(app.getHttpServer()).post('/auth/login').send({ username });
    const second = await request(app.getHttpServer()).post('/auth/login').send({ username });

    expect(second.body.userId).toBe(first.body.userId);
  });

  it('rejects a username that fails validation', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({ username: 'a' });
    expect(res.status).toBe(400);
  });

  it('rejects any protected route without a bearer token', async () => {
    const res = await request(app.getHttpServer()).get('/users/me');
    expect(res.status).toBe(401);
  });
});

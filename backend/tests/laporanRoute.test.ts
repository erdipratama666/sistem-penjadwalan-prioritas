import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = require('../dist/server').default;

let pemilikToken = '';
let adminToken = '';
let produksiToken = '';

beforeAll(async () => {
  const pemilikRes = await request(app).post('/api/auth/login').send({ username: 'pemilik', password: 'pemilik123' });
  const adminRes = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
  const produksiRes = await request(app).post('/api/auth/login').send({ username: 'produksi', password: 'produksi123' });
  pemilikToken = pemilikRes.body.data.token;
  adminToken = adminRes.body.data.token;
  produksiToken = produksiRes.body.data.token;
});

describe('Laporan API', () => {
  it('Pemilik dapat mengakses laporan dan response bersifat dinamis', async () => {
    const res = await request(app).get('/api/laporan').set('Authorization', `Bearer ${pemilikToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('summary');
    expect(res.body.data).toHaveProperty('status_produksi');
    expect(res.body.data).toHaveProperty('deadlines');
  });

  it('Admin tidak boleh mengakses laporan', async () => {
    const res = await request(app).get('/api/laporan').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });

  it('Pengelola Produksi tidak boleh mengakses laporan', async () => {
    const res = await request(app).get('/api/laporan').set('Authorization', `Bearer ${produksiToken}`);
    expect(res.status).toBe(403);
  });

  it('Tanpa token ditolak', async () => {
    const res = await request(app).get('/api/laporan');
    expect(res.status).toBe(401);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

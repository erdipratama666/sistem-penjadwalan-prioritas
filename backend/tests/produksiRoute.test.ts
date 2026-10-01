import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PrismaClient, Difficulty, StatusProduksi } from '@prisma/client';

const prisma = new PrismaClient();
const app = require('../dist/server').default;

let adminToken = '';
let produksiToken = '';
let pelangganId = 0;
const pesananIds: string[] = [];

const cleanup = async () => {
  await prisma.produksi.deleteMany({
    where: {
      pesanan: {
        id_pesanan: { in: pesananIds }
      }
    }
  });
  await prisma.prioritas.deleteMany({
    where: {
      pesanan: {
        id_pesanan: { in: pesananIds }
      }
    }
  });
  await prisma.pesanan.deleteMany({ where: { id_pesanan: { in: pesananIds } } });
  if (pelangganId) {
    await prisma.pelanggan.deleteMany({ where: { id: pelangganId } });
  }
};

describe('Produksi API', () => {
  beforeAll(async () => {
    const adminRes = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
    const produksiRes = await request(app).post('/api/auth/login').send({ username: 'produksi', password: 'produksi123' });
    adminToken = adminRes.body.data.token;
    produksiToken = produksiRes.body.data.token;
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it('Test 1: Tidak ada prioritas produksi tersedia', async () => {
    await cleanup();

    const res = await request(app).post('/api/produksi').set('Authorization', `Bearer ${produksiToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Tidak ada prioritas produksi/);
  });

  it('Test 2-4: Membuat produksi berdasarkan prioritas dan melihat daftar produksi', async () => {
    await cleanup();

    const pelanggan = await prisma.pelanggan.create({
      data: {
        id_pelanggan: 'PLGTEST',
        nama: 'Test Pelanggan',
        alamat: 'Jalan Test',
        no_hp: '081234567890'
      }
    });
    pelangganId = pelanggan.id;

    const pesanan1 = await prisma.pesanan.create({
      data: {
        id_pesanan: 'ORDTEST1',
        pelangganId,
        nama_produk: 'Produk A',
        tanggal_masuk: new Date('2026-01-01T08:00:00Z'),
        deadline: new Date('2026-01-05T08:00:00Z'),
        jumlah: 5,
        tingkat_kesulitan: Difficulty.SEDANG,
        status: StatusProduksi.MENUNGGU
      }
    });
    const pesanan2 = await prisma.pesanan.create({
      data: {
        id_pesanan: 'ORDTEST2',
        pelangganId,
        nama_produk: 'Produk B',
        tanggal_masuk: new Date('2026-01-02T08:00:00Z'),
        deadline: new Date('2026-01-10T08:00:00Z'),
        jumlah: 8,
        tingkat_kesulitan: Difficulty.MUDAH,
        status: StatusProduksi.MENUNGGU
      }
    });
    pesananIds.push(pesanan1.id_pesanan, pesanan2.id_pesanan);

    await prisma.prioritas.create({
      data: {
        id_prioritas: 'PRI0001',
        pesananId: pesanan1.id,
        urutan_prioritas: 1,
        tanggal_penjadwalan: new Date()
      }
    });
    await prisma.prioritas.create({
      data: {
        id_prioritas: 'PRI0002',
        pesananId: pesanan2.id,
        urutan_prioritas: 2,
        tanggal_penjadwalan: new Date()
      }
    });

    const createRes = await request(app).post('/api/produksi').set('Authorization', `Bearer ${produksiToken}`);
    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data).toHaveProperty('id_produksi');
    expect(createRes.body.data).toHaveProperty('pesanan.id_pesanan', 'ORDTEST1');
    expect(createRes.body.data).toHaveProperty('pesanan.prioritas.id_prioritas', 'PRI0001');

    const listRes = await request(app).get('/api/produksi').set('Authorization', `Bearer ${produksiToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body.data[0]).toHaveProperty('id_pesanan', 'ORDTEST1');
  });

  it('Test 4: Admin tidak boleh mengakses produksi', async () => {
    const res = await request(app).get('/api/produksi').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });

  it('Test 5-7: Pengelola Produksi dapat mulai dan menyelesaikan produksi, dan produksi selesai tidak boleh dimulai lagi', async () => {
    const listRes = await request(app).get('/api/produksi').set('Authorization', `Bearer ${produksiToken}`);
    expect(listRes.status).toBe(200);
    const produksiItem = listRes.body.data[0];
    expect(produksiItem).toBeDefined();

    const mulaiRes = await request(app).put(`/api/produksi/${produksiItem.id_produksi}/mulai`).set('Authorization', `Bearer ${produksiToken}`);
    expect(mulaiRes.status).toBe(200);
    expect(mulaiRes.body.data.status_produksi).toBe(StatusProduksi.DALAM_PRODUKSI);
    expect(mulaiRes.body.data.tanggal_mulai).toBeTruthy();

    const selesaiRes = await request(app).put(`/api/produksi/${produksiItem.id_produksi}/selesai`).set('Authorization', `Bearer ${produksiToken}`);
    expect(selesaiRes.status).toBe(200);
    expect(selesaiRes.body.data.status_produksi).toBe(StatusProduksi.SELESAI);
    expect(selesaiRes.body.data.tanggal_selesai).toBeTruthy();

    const startAgainRes = await request(app).put(`/api/produksi/${produksiItem.id_produksi}/mulai`).set('Authorization', `Bearer ${produksiToken}`);
    expect(startAgainRes.status).toBe(400);
  });
});

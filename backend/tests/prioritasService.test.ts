import { describe, it, expect } from 'vitest';
import { Difficulty, Pesanan, StatusProduksi } from '@prisma/client';
import { comparePesananByPriority, sortPesananForPrioritas, filterPendingPesanan, DIFFICULTY_ORDER } from '../src/services/prioritasService';

type MockPesanan = Omit<Pesanan, 'pelanggan' | 'prioritas' | 'produksi'>;

const createPesanan = (overrides: Partial<MockPesanan>): MockPesanan => ({
  id: overrides.id ?? 1,
  id_pesanan: overrides.id_pesanan ?? 'ORD001',
  pelangganId: overrides.pelangganId ?? 1,
  nama_produk: overrides.nama_produk ?? 'Produk A',
  tanggal_masuk: overrides.tanggal_masuk ?? new Date('2026-01-01T08:00:00Z'),
  deadline: overrides.deadline ?? new Date('2026-01-10T08:00:00Z'),
  jumlah: overrides.jumlah ?? 10,
  tingkat_kesulitan: overrides.tingkat_kesulitan ?? Difficulty.SEDANG,
  status: overrides.status ?? StatusProduksi.MENUNGGU,
});

describe('prioritasService', () => {
  it('Test 1: deadline lebih dekat diprioritaskan lebih tinggi', () => {
    const a = createPesanan({ id: 1, id_pesanan: 'ORD001', deadline: new Date('2026-01-05T08:00:00Z') });
    const b = createPesanan({ id: 2, id_pesanan: 'ORD002', deadline: new Date('2026-01-10T08:00:00Z') });
    expect(comparePesananByPriority(a as Pesanan, b as Pesanan)).toBeLessThan(0);
  });

  it('Test 2: jumlah lebih kecil diprioritaskan jika deadline sama', () => {
    const a = createPesanan({ id: 1, id_pesanan: 'ORD001', deadline: new Date('2026-01-10T08:00:00Z'), jumlah: 5 });
    const b = createPesanan({ id: 2, id_pesanan: 'ORD002', deadline: new Date('2026-01-10T08:00:00Z'), jumlah: 10 });
    expect(comparePesananByPriority(a as Pesanan, b as Pesanan)).toBeLessThan(0);
  });

  it('Test 3: tingkat kesulitan mengikuti urutan sistem jika deadline dan jumlah sama', () => {
    const a = createPesanan({ id: 1, id_pesanan: 'ORD001', deadline: new Date('2026-01-10T08:00:00Z'), jumlah: 10, tingkat_kesulitan: Difficulty.MUDAH });
    const b = createPesanan({ id: 2, id_pesanan: 'ORD002', deadline: new Date('2026-01-10T08:00:00Z'), jumlah: 10, tingkat_kesulitan: Difficulty.SULIT });
    expect(DIFFICULTY_ORDER.indexOf(a.tingkat_kesulitan)).toBeLessThan(DIFFICULTY_ORDER.indexOf(b.tingkat_kesulitan));
    expect(comparePesananByPriority(a as Pesanan, b as Pesanan)).toBeLessThan(0);
  });

  it('Test 4: tanggal masuk lebih awal diprioritaskan sebagai FCFS terakhir', () => {
    const a = createPesanan({ id: 1, id_pesanan: 'ORD001', deadline: new Date('2026-01-10T08:00:00Z'), jumlah: 10, tingkat_kesulitan: Difficulty.SEDANG, tanggal_masuk: new Date('2026-01-01T08:00:00Z') });
    const b = createPesanan({ id: 2, id_pesanan: 'ORD002', deadline: new Date('2026-01-10T08:00:00Z'), jumlah: 10, tingkat_kesulitan: Difficulty.SEDANG, tanggal_masuk: new Date('2026-01-02T08:00:00Z') });
    expect(comparePesananByPriority(a as Pesanan, b as Pesanan)).toBeLessThan(0);
  });

  it('Test 5: status selesai tidak ikut kandidat penjadwalan', () => {
    const a = createPesanan({ id: 1, id_pesanan: 'ORD001', status: StatusProduksi.SELESAI });
    const b = createPesanan({ id: 2, id_pesanan: 'ORD002', status: StatusProduksi.MENUNGGU });
    const filtered = filterPendingPesanan([a as Pesanan, b as Pesanan]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id_pesanan).toBe('ORD002');
  });

  it('Test 6: penjadwalan ulang tidak menghasilkan duplikasi dalam urutan yang sama', () => {
    const a = createPesanan({ id: 1, id_pesanan: 'ORD001', deadline: new Date('2026-01-05T08:00:00Z') });
    const b = createPesanan({ id: 2, id_pesanan: 'ORD002', deadline: new Date('2026-01-10T08:00:00Z') });
    const sorted1 = sortPesananForPrioritas([a as Pesanan, b as Pesanan]);
    const sorted2 = sortPesananForPrioritas([a as Pesanan, b as Pesanan]);
    expect(sorted1.map((p) => p.id_pesanan)).toEqual(sorted2.map((p) => p.id_pesanan));
  });
});

import { supabase } from '../middleware/auth';

// Definisi tipe lokal pengganti dari Prisma Client
export type StatusProduksi = 'MENUNGGU' | 'DALAM_PRODUKSI' | 'SELESAI';
export type Difficulty = 'SULIT' | 'SEDANG' | 'MUDAH';

export interface Prioritas {
  id: number;
  id_prioritas: string;
  pesananId: number;
  urutan_prioritas: number;
  tanggal_penjadwalan: string | Date;
  [key: string]: any;
}

export const PRODUCTION_STATUS_SEQUENCE = {
  MENUNGGU: 'MENUNGGU' as StatusProduksi,
  DALAM_PRODUKSI: 'DALAM_PRODUKSI' as StatusProduksi,
  SELESAI: 'SELESAI' as StatusProduksi
};

export const generateProduksiId = (sequence: number): string => `PRD${String(sequence).padStart(3, '0')}`;

export const parseProduksiIdNumber = (id: string): number => {
  const numeric = Number(id.replace(/^PRD/i, ''));
  return Number.isNaN(numeric) ? 0 : numeric;
};

export const getNextProduksiId = (lastId?: string): string => {
  const nextSequence = lastId ? parseProduksiIdNumber(lastId) + 1 : 1;
  return generateProduksiId(nextSequence);
};

export const canStartProduction = (status: StatusProduksi | string): boolean => status === 'MENUNGGU';

export const canFinishProduction = (status: StatusProduksi | string): boolean => status === 'DALAM_PRODUKSI';

export const getPrioritasWithoutProduksi = async () => {
  const { data, error } = await supabase
    .from('Prioritas')
    .select(`
      *,
      pesanan:Pesanan (
        *,
        produksi:Produksi(*)
      )
    `)
    .order('urutan_prioritas', { ascending: true });

  if (error) throw error;

  // Filter daftar prioritas yang pesanannya belum memiliki data produksi
  return (data || []).filter((item: any) => {
    const pesanan = Array.isArray(item.pesanan) ? item.pesanan[0] : item.pesanan;
    if (!pesanan) return false;

    const prod = pesanan.produksi;
    return !prod || (Array.isArray(prod) && prod.length === 0);
  });
};
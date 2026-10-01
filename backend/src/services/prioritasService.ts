// File: backend/src/services/prioritasservice.ts

export type Difficulty = 'SULIT' | 'SEDANG' | 'MUDAH';
export type StatusProduksi = 'MENUNGGU' | 'DALAM_PRODUKSI' | 'SELESAI';

export interface Pesanan {
  id: number;
  id_pesanan: string | number;
  pelangganId?: number;
  nama_produk?: string;
  tanggal_masuk: string | Date;
  deadline: string | Date;
  jumlah: number;
  tingkat_kesulitan: Difficulty | string;
  status: StatusProduksi | string;
  [key: string]: any;
}

// Helper Functions
export const parseNumericId = (val: any): number => {
  if (!val && val !== 0) return 0;
  const cleaned = String(val).replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
};

export const difficultyRank = (difficulty: string) => {
  switch ((difficulty || '').toUpperCase().trim()) {
    case 'SULIT': return 1;
    case 'SEDANG': return 2;
    case 'MUDAH': return 3;
    default: return 4;
  }
};

export const isFinished = (status: string) => {
  const cleanStatus = (status || '').toUpperCase().trim();
  return cleanStatus === 'SELESAI' || cleanStatus === 'COMPLETED';
};

// ==========================================
// LOGIKA INTI ALGORITMA GREEDY (Bisa di-Test)
// ==========================================
export const greedyPrioritySort = (pesananList: Pesanan[]): Pesanan[] => {
  return [...pesananList].sort((a, b) => {
    // Kriteria 1: Deadline Paling Dekat (Ascending)
    const timeA = new Date(a.deadline).getTime();
    const timeB = new Date(b.deadline).getTime();
    if (timeA !== timeB) return timeA - timeB;

    // Kriteria 2: Jumlah Pesanan Paling Sedikit (Ascending)
    const qtyA = Number(a.jumlah) || 0;
    const qtyB = Number(b.jumlah) || 0;
    if (qtyA !== qtyB) return qtyA - qtyB;

    // Kriteria 3: Tingkat Kesulitan Paling Sulit (SULIT = 1, dst)
    const diffA = difficultyRank(a.tingkat_kesulitan as string);
    const diffB = difficultyRank(b.tingkat_kesulitan as string);
    if (diffA !== diffB) return diffA - diffB;

    // Kriteria 4 (FCFS): Tanggal Masuk Pesanan Paling Awal (Ascending)
    const masukA = new Date(a.tanggal_masuk).getTime();
    const masukB = new Date(b.tanggal_masuk).getTime();
    return masukA - masukB;
  });
};

// ==========================================
// FUNGSI SERVICE UTAMA UNTUK CONTROLLER
// ==========================================
export const generateJadwalPrioritasService = async (semuaPesanan: Pesanan[]) => {
  // 1. Filter pesanan yang belum selesai
  const candidates = semuaPesanan.filter((order) => !isFinished(order.status));

  // 2. Terapkan algoritma Greedy
  const sortedCandidates = greedyPrioritySort(candidates);

  // 3. Format ke payload database
  const now = new Date().toISOString();
  const payload = sortedCandidates.map((order, index) => ({
    pesananId: parseNumericId(order.id || order.id_pesanan),
    urutan_prioritas: index + 1,
    tanggal_penjadwalan: now
  }));

  return payload;
};
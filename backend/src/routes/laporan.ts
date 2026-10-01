import express, { Request, Response } from 'express';
import { authenticate, authorizeRole, supabase } from '../middleware/auth';

const router = express.Router();

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// Helper untuk memastikan data relasi tunggal (jika Supabase mengembalikan array atau object)
const getRelasi = (data: any) => {
  if (!data) return null;
  return Array.isArray(data) ? data[0] : data;
};

const mapPesananSummary = (pesanan: any) => {
  const pelanggan = getRelasi(pesanan.pelanggan);
  const prioritas = getRelasi(pesanan.prioritas);
  const produksi = getRelasi(pesanan.produksi);

  return {
    id_pesanan: pesanan.id_pesanan,
    id_prioritas: prioritas?.id_prioritas ?? null,
    id_produksi: produksi?.id_produksi ?? null,
    nama_pelanggan: pelanggan?.nama ?? '',
    nama_produk: pesanan.nama_produk,
    jumlah: pesanan.jumlah,
    deadline: pesanan.deadline,
    status_pesanan: pesanan.status,
    status_produksi: produksi?.status_produksi ?? null,
    urutan_prioritas: prioritas?.urutan_prioritas ?? null,
    tanggal_penjadwalan: prioritas?.tanggal_penjadwalan ?? null
  };
};

router.get('/', authenticate, authorizeRole(['PEMILIK']), async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowStart = addDays(todayStart, 1);
    const dueSoonEnd = addDays(tomorrowStart, 3);

    // 1. Ambil data semua pesanan beserta relasi Pelanggan, Prioritas, dan Produksi
    const { data: pesananListRaw, error: pesananError } = await supabase
      .from('Pesanan')
      .select(`
        *,
        pelanggan:Pelanggan(*),
        prioritas:Prioritas(*),
        produksi:Produksi(*)
      `);

    if (pesananError) {
      throw pesananError;
    }

    const pesananList = pesananListRaw || [];

    // 2. Total Pesanan
    const totalPesanan = pesananList.length;

    // 3. Hitung Status Produksi dari tabel Produksi
    const { data: produksiList, error: produksiError } = await supabase
      .from('Produksi')
      .select('status_produksi');

    if (produksiError) {
      throw produksiError;
    }

    const produksiCounts: Record<string, number> = {
      MENUNGGU: 0,
      DALAM_PRODUKSI: 0,
      SELESAI: 0
    };

    produksiList?.forEach((item) => {
      if (item.status_produksi && item.status_produksi in produksiCounts) {
        produksiCounts[item.status_produksi]++;
      }
    });

    // 4. Hitung Pesanan Belum Diproduksi
    const pesananBelumDiproduksiCount = pesananList.filter((pesanan) => {
      const prod = getRelasi(pesanan.produksi);
      const isNotSelesai = pesanan.status !== 'SELESAI';
      const isProdMenunggu = !prod || prod.status_produksi === 'MENUNGGU';
      return isNotSelesai && isProdMenunggu;
    }).length;

    // 5. Helper Cek Status Selesai
    const isFinished = (pesanan: any) => {
      const prod = getRelasi(pesanan.produksi);
      return pesanan.status === 'SELESAI' || prod?.status_produksi === 'SELESAI';
    };

    // 6. Filter Deadline berdasarkan Tanggal (Konversi string ISO Supabase ke Date)
    const overdue = pesananList
      .filter((pesanan) => {
        const deadline = new Date(pesanan.deadline);
        return deadline < todayStart && !isFinished(pesanan);
      })
      .map(mapPesananSummary);

    const dueToday = pesananList
      .filter((pesanan) => {
        const deadline = new Date(pesanan.deadline);
        return deadline >= todayStart && deadline < tomorrowStart && !isFinished(pesanan);
      })
      .map(mapPesananSummary);

    const dueSoon = pesananList
      .filter((pesanan) => {
        const deadline = new Date(pesanan.deadline);
        return deadline >= tomorrowStart && deadline < dueSoonEnd && !isFinished(pesanan);
      })
      .map(mapPesananSummary);

    // 7. Response JSON
    return res.json({
      success: true,
      data: {
        summary: {
          total_pesanan: totalPesanan,
          pesanan_selesai: produksiCounts['SELESAI'] ?? 0,
          pesanan_dalam_produksi: produksiCounts['DALAM_PRODUKSI'] ?? 0,
          pesanan_belum_diproduksi: pesananBelumDiproduksiCount
        },
        status_produksi: produksiCounts,
        deadlines: {
          due_today: dueToday,
          overdue: overdue,
          due_soon: dueSoon
        }
      }
    });

  } catch (error) {
    console.error('Laporan Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data laporan ringkasan.'
    });
  }
});

export default router;
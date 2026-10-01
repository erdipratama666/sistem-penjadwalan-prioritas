import express, { Request, Response } from 'express';
import { authenticate, authorizeRole, supabase } from '../middleware/auth';
import { sortPesananForPrioritas, generatePrioritasId } from '../services/prioritasService';

const router = express.Router();

// GET /api/prioritas
router.get('/', authenticate, authorizeRole(['PEMILIK', 'PENGELOLA_PRODUKSI']), async (_req: Request, res: Response) => {
  try {
    const { data: list, error } = await supabase
      .from('Prioritas')
      .select('*, pesanan:Pesanan(*, pelanggan:Pelanggan(*))')
      .order('urutan_prioritas', { ascending: true });

    if (error) throw error;

    return res.json({ success: true, data: list || [] });
  } catch (error) {
    console.error('Get Prioritas Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data prioritas' });
  }
});

// POST /api/prioritas/jalankan
router.post('/jalankan', authenticate, authorizeRole(['PEMILIK']), async (_req: Request, res: Response) => {
  try {
    // 1. Ambil seluruh pesanan yang belum selesai
    const { data: pendingPesananRaw, error: fetchError } = await supabase
      .from('Pesanan')
      .select('*')
      .neq('status', 'SELESAI');

    if (fetchError) throw fetchError;

    const pendingPesanan = pendingPesananRaw || [];
    const sortedPesanan = sortPesananForPrioritas(pendingPesanan);
    const now = new Date().toISOString();

    // 2. Hapus seluruh data prioritas lama
    const { error: deleteError } = await supabase
      .from('Prioritas')
      .delete()
      .gte('id', 0); // Menghapus seluruh baris data pada tabel Prioritas

    if (deleteError) throw deleteError;

    // 3. Masukkan data prioritas baru hasil pengurutan secara bulk insert
    if (sortedPesanan.length > 0) {
      const recordsToInsert = sortedPesanan.map((pesanan: any, index: number) => ({
        id_prioritas: generatePrioritasId(index + 1),
        pesananId: pesanan.id,
        urutan_prioritas: index + 1,
        tanggal_penjadwalan: now
      }));

      const { error: insertError } = await supabase
        .from('Prioritas')
        .insert(recordsToInsert);

      if (insertError) throw insertError;
    }

    // 4. Ambil data hasil penjadwalan terbaru beserta relasi pesanan
    const { data: result, error: resultError } = await supabase
      .from('Prioritas')
      .select('*, pesanan:Pesanan(*)')
      .order('urutan_prioritas', { ascending: true });

    if (resultError) throw resultError;

    return res.json({
      success: true,
      message: 'Penjadwalan prioritas berhasil dijalankan',
      data: result || []
    });

  } catch (error) {
    console.error('Jalankan Prioritas Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menjalankan penjadwalan prioritas'
    });
  }
});

export default router;
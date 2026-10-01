import express, { Request, Response } from 'express';
import { authenticate, authorizeRole, supabase } from '../middleware/auth';
import { getNextProduksiId, canStartProduction, canFinishProduction } from '../services/produksiService';

const router = express.Router();

// Helper untuk memastikan data relasi tunggal (jika Supabase mengembalikan array atau object)
const getRelasi = (data: any) => {
  if (!data) return null;
  return Array.isArray(data) ? data[0] : data;
};

// GET /api/produksi
router.get('/', authenticate, authorizeRole(['PEMILIK', 'PENGELOLA_PRODUKSI']), async (_req: Request, res: Response) => {
  try {
    const { data: list, error } = await supabase
      .from('Produksi')
      .select(`
        *,
        pesanan:Pesanan (
          *,
          pelanggan:Pelanggan(*),
          prioritas:Prioritas(*)
        )
      `)
      .order('id', { ascending: true });

    if (error) throw error;

    const formatted = (list || []).map((item) => {
      const pesanan = getRelasi(item.pesanan) || {};
      const pelanggan = getRelasi(pesanan.pelanggan) || {};
      const prioritas = getRelasi(pesanan.prioritas) || {};

      return {
        id_produksi: item.id_produksi,
        id_pesanan: pesanan.id_pesanan ?? null,
        id_prioritas: prioritas.id_prioritas ?? null,
        nama_pelanggan: pelanggan.nama ?? '',
        nama_produk: pesanan.nama_produk ?? '',
        jumlah: pesanan.jumlah ?? 0,
        deadline: pesanan.deadline ?? null,
        urutan_prioritas: prioritas.urutan_prioritas ?? null,
        tingkat_kesulitan: pesanan.tingkat_kesulitan ?? null,
        status_produksi: item.status_produksi,
        tanggal_mulai: item.tanggal_mulai,
        tanggal_selesai: item.tanggal_selesai
      };
    });

    return res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Get Produksi Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data produksi' });
  }
});

// GET /api/produksi/:id
router.get('/:id', authenticate, authorizeRole(['PEMILIK', 'PENGELOLA_PRODUKSI']), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'ID produksi tidak valid' });

    const { data: found, error } = await supabase
      .from('Produksi')
      .select(`
        *,
        pesanan:Pesanan (
          *,
          pelanggan:Pelanggan(*),
          prioritas:Prioritas(*)
        )
      `)
      .eq('id_produksi', id)
      .maybeSingle();

    if (error || !found) {
      return res.status(404).json({ success: false, message: 'Data produksi tidak ditemukan' });
    }

    const pesanan = getRelasi(found.pesanan) || {};
    const pelanggan = getRelasi(pesanan.pelanggan) || {};
    const prioritas = getRelasi(pesanan.prioritas) || {};

    return res.json({
      success: true,
      data: {
        id_produksi: found.id_produksi,
        id_pesanan: pesanan.id_pesanan ?? null,
        id_prioritas: prioritas.id_prioritas ?? null,
        nama_pelanggan: pelanggan.nama ?? '',
        nama_produk: pesanan.nama_produk ?? '',
        jumlah: pesanan.jumlah ?? 0,
        deadline: pesanan.deadline ?? null,
        urutan_prioritas: prioritas.urutan_prioritas ?? null,
        tingkat_kesulitan: pesanan.tingkat_kesulitan ?? null,
        status_produksi: found.status_produksi,
        tanggal_mulai: found.tanggal_mulai,
        tanggal_selesai: found.tanggal_selesai
      }
    });
  } catch (error) {
    console.error('Get Produksi By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil detail produksi' });
  }
});

// POST /api/produksi
router.post('/', authenticate, authorizeRole(['PENGELOLA_PRODUKSI']), async (_req: Request, res: Response) => {
  try {
    // 1. Ambil ID produksi terakhir untuk membuat ID berikutnya
    const { data: latest } = await supabase
      .from('Produksi')
      .select('id_produksi')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextId = getNextProduksiId(latest?.id_produksi);

    // 2. Ambil daftar prioritas beserta data pesanan dan produksi terkait
    const { data: prioritasListRaw, error: prioritasError } = await supabase
      .from('Prioritas')
      .select(`
        *,
        pesanan:Pesanan (
          *,
          pelanggan:Pelanggan(*),
          prioritas:Prioritas(*),
          produksi:Produksi(*)
        )
      `)
      .order('urutan_prioritas', { ascending: true });

    if (prioritasError) throw prioritasError;

    // Filter prioritas yang pesanannya belum memiliki data produksi
    const prioritasList = (prioritasListRaw || []).filter((item) => {
      const pesanan = getRelasi(item.pesanan);
      if (!pesanan) return false;
      const prod = getRelasi(pesanan.produksi);
      return !prod || (Array.isArray(prod) && prod.length === 0);
    });

    if (prioritasList.length === 0) {
      return res.status(404).json({ success: false, message: 'Tidak ada prioritas produksi yang tersedia' });
    }

    const targetPesanan = getRelasi(prioritasList[0].pesanan);

    // 3. Buat data produksi baru
    const { data: nextProduksi, error: createError } = await supabase
      .from('Produksi')
      .insert([
        {
          id_produksi: nextId,
          pesananId: targetPesanan.id,
          status_produksi: 'MENUNGGU'
        }
      ])
      .select(`
        *,
        pesanan:Pesanan (
          *,
          pelanggan:Pelanggan(*),
          prioritas:Prioritas(*)
        )
      `)
      .single();

    if (createError) throw createError;

    return res.status(201).json({ success: true, data: nextProduksi });
  } catch (error) {
    console.error('Create Produksi Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat data produksi baru' });
  }
});

// PUT /api/produksi/:id/mulai
router.put('/:id/mulai', authenticate, authorizeRole(['PENGELOLA_PRODUKSI']), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'ID produksi tidak valid' });

    const { data: produksi, error: prodError } = await supabase
      .from('Produksi')
      .select('*')
      .eq('id_produksi', id)
      .maybeSingle();

    if (prodError || !produksi) {
      return res.status(404).json({ success: false, message: 'Produksi tidak ditemukan' });
    }

    if (!canStartProduction(produksi.status_produksi)) {
      return res.status(400).json({ success: false, message: 'Produksi tidak dapat dimulai' });
    }

    const now = new Date().toISOString();

    // 1. Update status produksi & tanggal_mulai
    const { data: updated, error: updateProdErr } = await supabase
      .from('Produksi')
      .update({
        status_produksi: 'DALAM_PRODUKSI',
        tanggal_mulai: now
      })
      .eq('id_produksi', id)
      .select()
      .single();

    if (updateProdErr) throw updateProdErr;

    // 2. Update status pesanan terkait
    const { error: updatePesananErr } = await supabase
      .from('Pesanan')
      .update({ status: 'DALAM_PRODUKSI' })
      .eq('id', produksi.pesananId);

    if (updatePesananErr) throw updatePesananErr;

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Start Produksi Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal memulai proses produksi' });
  }
});

// PUT /api/produksi/:id/selesai
router.put('/:id/selesai', authenticate, authorizeRole(['PENGELOLA_PRODUKSI']), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'ID produksi tidak valid' });

    const { data: produksi, error: prodError } = await supabase
      .from('Produksi')
      .select('*')
      .eq('id_produksi', id)
      .maybeSingle();

    if (prodError || !produksi) {
      return res.status(404).json({ success: false, message: 'Produksi tidak ditemukan' });
    }

    if (!canFinishProduction(produksi.status_produksi)) {
      return res.status(400).json({ success: false, message: 'Produksi tidak dapat diselesaikan' });
    }

    const now = new Date().toISOString();

    // 1. Update status produksi & tanggal_selesai
    const { data: updated, error: updateProdErr } = await supabase
      .from('Produksi')
      .update({
        status_produksi: 'SELESAI',
        tanggal_selesai: now
      })
      .eq('id_produksi', id)
      .select()
      .single();

    if (updateProdErr) throw updateProdErr;

    // 2. Update status pesanan terkait
    const { error: updatePesananErr } = await supabase
      .from('Pesanan')
      .update({ status: 'SELESAI' })
      .eq('id', produksi.pesananId);

    if (updatePesananErr) throw updatePesananErr;

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Finish Produksi Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menyelesaikan proses produksi' });
  }
});

export default router;
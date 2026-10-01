import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorizeRole, supabase } from '../middleware/auth';

const router = express.Router();

// Tipe Enums untuk Type Safety
type Difficulty = 'MUDAH' | 'SEDANG' | 'SULIT';
type StatusProduksi = 'MENUNGGU' | 'DALAM_PRODUKSI' | 'SELESAI';

const formatPesananId = (sequence: number) => `ORD${String(sequence).padStart(3, '0')}`;

const generateNextPesananId = async (): Promise<string> => {
  const { data: lastPesanan, error } = await supabase
    .from('Pesanan')
    .select('id, id_pesanan')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !lastPesanan) return formatPesananId(1);
  const suffix = Number(lastPesanan.id_pesanan.replace(/^ORD/i, ''));
  const nextNumber = Number.isNaN(suffix) ? 1 : suffix + 1;
  return formatPesananId(nextNumber);
};

const parseDifficulty = (value: string): Difficulty | null => {
  const normalized = String(value).trim().toUpperCase().replace(/\s+/g, '_');
  if (normalized === 'MUDAH') return 'MUDAH';
  if (normalized === 'SEDANG') return 'SEDANG';
  if (normalized === 'SULIT' || normalized === 'SANGAT_SULIT') return 'SULIT';
  return null;
};

const parseStatus = (value: string): StatusProduksi | null => {
  const normalized = String(value).trim().toUpperCase().replace(/\s+/g, '_');
  if (normalized === 'PENDING' || normalized === 'MENUNGGU') return 'MENUNGGU';
  if (normalized === 'DALAM_PRODUKSI' || normalized === 'DALAM PRODUKSI' || normalized === 'IN_PROGRESS') return 'DALAM_PRODUKSI';
  if (normalized === 'SELESAI' || normalized === 'COMPLETED') return 'SELESAI';
  return null;
};

const pesananValidationRules = [
  body('id_pelanggan').notEmpty().withMessage('ID pelanggan wajib diisi'),
  body('nama_produk').notEmpty().withMessage('Nama produk wajib diisi').isLength({ max: 30 }).withMessage('Nama produk maksimal 30 karakter'),
  body('tanggal_masuk').notEmpty().withMessage('Tanggal masuk wajib diisi').isISO8601().withMessage('Tanggal masuk harus format ISO 8601'),
  body('deadline').notEmpty().withMessage('Deadline wajib diisi').isISO8601().withMessage('Deadline harus format ISO 8601'),
  body('jumlah').notEmpty().withMessage('Jumlah wajib diisi').isInt({ gt: 0 }).withMessage('Jumlah harus lebih dari 0'),
  body('tingkat_kesulitan').notEmpty().withMessage('Tingkat kesulitan wajib diisi'),
  body('status').notEmpty().withMessage('Status wajib diisi')
];

const validationErrorResponse = (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Data tidak valid', errors: errors.array() });
  }
  return null;
};

const validateDates = (tanggal_masuk: string, deadline: string) => {
  const masuk = new Date(tanggal_masuk);
  const selesai = new Date(deadline);
  if (Number.isNaN(masuk.getTime()) || Number.isNaN(selesai.getTime())) {
    return 'Tanggal masuk dan deadline harus berupa tanggal valid';
  }
  if (masuk.getTime() > selesai.getTime()) {
    return 'Deadline tidak boleh lebih awal daripada tanggal masuk';
  }
  return null;
};

// GET /api/pesanan
router.get('/', authenticate, authorizeRole(['ADMIN', 'PEMILIK']), async (_req: Request, res: Response) => {
  try {
    const { data: list, error } = await supabase
      .from('Pesanan')
      .select('*, pelanggan:Pelanggan(*)')
      .order('id', { ascending: true });

    if (error) throw error;

    return res.json({ success: true, data: list || [] });
  } catch (error) {
    console.error('Get Pesanan Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data pesanan' });
  }
});

// GET /api/pesanan/:id
router.get('/:id', authenticate, authorizeRole(['ADMIN', 'PEMILIK']), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'ID pesanan tidak valid' });

    const { data: found, error } = await supabase
      .from('Pesanan')
      .select('*, pelanggan:Pelanggan(*)')
      .eq('id_pesanan', id)
      .maybeSingle();

    if (error || !found) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });

    return res.json({ success: true, data: found });
  } catch (error) {
    console.error('Get Pesanan By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil detail pesanan' });
  }
});

// POST /api/pesanan
router.post('/', authenticate, authorizeRole(['ADMIN']), pesananValidationRules, async (req: Request, res: Response) => {
  const validation = validationErrorResponse(req, res);
  if (validation) return validation;

  try {
    const { id_pelanggan, nama_produk, tanggal_masuk, deadline, jumlah, tingkat_kesulitan, status } = req.body;
    const difficulty = parseDifficulty(tingkat_kesulitan);
    const statusValue = parseStatus(status);

    const dateError = validateDates(tanggal_masuk, deadline);
    if (dateError) return res.status(400).json({ success: false, message: dateError });
    if (!difficulty) return res.status(400).json({ success: false, message: 'Tingkat kesulitan tidak valid' });
    if (!statusValue) return res.status(400).json({ success: false, message: 'Status tidak valid' });

    const { data: pelanggan } = await supabase
      .from('Pelanggan')
      .select('id, id_pelanggan')
      .eq('id_pelanggan', id_pelanggan)
      .maybeSingle();

    if (!pelanggan) return res.status(400).json({ success: false, message: 'ID pelanggan tidak ditemukan' });

    const idPesanan = await generateNextPesananId();

    const { data: created, error } = await supabase
      .from('Pesanan')
      .insert([
        {
          id_pesanan: idPesanan,
          pelangganId: pelanggan.id,
          nama_produk,
          tanggal_masuk: new Date(tanggal_masuk).toISOString(),
          deadline: new Date(deadline).toISOString(),
          jumlah: Number(jumlah),
          tingkat_kesulitan: difficulty,
          status: statusValue
        }
      ])
      .select('*, pelanggan:Pelanggan(*)')
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, message: 'Pesanan berhasil dibuat', data: created });
  } catch (error) {
    console.error('Create Pesanan Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat pesanan' });
  }
});

// PUT /api/pesanan/:id
router.put('/:id', authenticate, authorizeRole(['ADMIN']), pesananValidationRules, async (req: Request, res: Response) => {
  const validation = validationErrorResponse(req, res);
  if (validation) return validation;

  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'ID pesanan tidak valid' });

    const { data: existing } = await supabase
      .from('Pesanan')
      .select('id_pesanan')
      .eq('id_pesanan', id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });

    const { id_pelanggan, nama_produk, tanggal_masuk, deadline, jumlah, tingkat_kesulitan, status } = req.body;
    const difficulty = parseDifficulty(tingkat_kesulitan);
    const statusValue = parseStatus(status);

    const dateError = validateDates(tanggal_masuk, deadline);
    if (dateError) return res.status(400).json({ success: false, message: dateError });
    if (!difficulty) return res.status(400).json({ success: false, message: 'Tingkat kesulitan tidak valid' });
    if (!statusValue) return res.status(400).json({ success: false, message: 'Status tidak valid' });

    const { data: pelanggan } = await supabase
      .from('Pelanggan')
      .select('id, id_pelanggan')
      .eq('id_pelanggan', id_pelanggan)
      .maybeSingle();

    if (!pelanggan) return res.status(400).json({ success: false, message: 'ID pelanggan tidak ditemukan' });

    const { data: updated, error } = await supabase
      .from('Pesanan')
      .update({
        pelangganId: pelanggan.id,
        nama_produk,
        tanggal_masuk: new Date(tanggal_masuk).toISOString(),
        deadline: new Date(deadline).toISOString(),
        jumlah: Number(jumlah),
        tingkat_kesulitan: difficulty,
        status: statusValue
      })
      .eq('id_pesanan', id)
      .select('*, pelanggan:Pelanggan(*)')
      .single();

    if (error) throw error;

    return res.json({ success: true, message: 'Pesanan berhasil diubah', data: updated });
  } catch (error) {
    console.error('Update Pesanan Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengubah pesanan' });
  }
});

// DELETE /api/pesanan/:id
router.delete('/:id', authenticate, authorizeRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'ID pesanan tidak valid' });

    const { data: pesanan } = await supabase
      .from('Pesanan')
      .select('id, id_pesanan, prioritas:Prioritas(*), produksi:Produksi(*)')
      .eq('id_pesanan', id)
      .maybeSingle();

    if (!pesanan) return res.status(404).json({ success: false, message: 'Pesanan tidak ditemukan' });

    // Cek jika pesanan memiliki relasi ke Prioritas atau Produksi
    const hasPrioritas = Array.isArray(pesanan.prioritas) ? pesanan.prioritas.length > 0 : Boolean(pesanan.prioritas);
    const hasProduksi = Array.isArray(pesanan.produksi) ? pesanan.produksi.length > 0 : Boolean(pesanan.produksi);

    if (hasPrioritas || hasProduksi) {
      return res.status(400).json({ success: false, message: 'Pesanan memiliki data terkait Prioritas atau Produksi dan tidak dapat dihapus' });
    }

    const { error: deleteError } = await supabase
      .from('Pesanan')
      .delete()
      .eq('id_pesanan', id);

    if (deleteError) throw deleteError;

    return res.json({ success: true, message: 'Pesanan berhasil dihapus' });
  } catch (error) {
    console.error('Delete Pesanan Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus pesanan' });
  }
});

export default router;
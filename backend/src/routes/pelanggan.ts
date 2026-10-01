import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorizeRole, supabase } from '../middleware/auth';

const router = express.Router();

const formatPelangganId = (sequence: number) => `PLG${String(sequence).padStart(3, '0')}`;

const generateNextPelangganId = async (): Promise<string> => {
  const { data: lastPelanggan, error } = await supabase
    .from('Pelanggan')
    .select('id, id_pelanggan')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !lastPelanggan) return formatPelangganId(1);

  const existingSuffix = Number(lastPelanggan.id_pelanggan.replace(/^PLG/i, ''));
  const nextNumber = Number.isNaN(existingSuffix) ? 1 : existingSuffix + 1;
  return formatPelangganId(nextNumber);
};

const pelangganValidationRules = [
  body('nama').notEmpty().withMessage('Nama wajib diisi').isLength({ max: 100 }).withMessage('Nama maksimal 100 karakter'),
  body('alamat').notEmpty().withMessage('Alamat wajib diisi').isLength({ max: 255 }).withMessage('Alamat maksimal 255 karakter'),
  body('no_hp').notEmpty().withMessage('No HP wajib diisi').isLength({ max: 15 }).withMessage('No HP maksimal 15 karakter')
];

const validationErrorResponse = (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Data tidak valid', errors: errors.array() });
  }
  return null;
};

// GET /api/pelanggan
router.get('/', authenticate, authorizeRole(['ADMIN']), async (_req: Request, res: Response) => {
  try {
    const { data: list, error } = await supabase
      .from('Pelanggan')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    return res.json({ success: true, data: list || [] });
  } catch (error) {
    console.error('Get Pelanggan Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data pelanggan' });
  }
});

// GET /api/pelanggan/:id
router.get('/:id', authenticate, authorizeRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'ID pelanggan tidak valid' });

    const { data: found, error } = await supabase
      .from('Pelanggan')
      .select('*')
      .eq('id_pelanggan', id)
      .maybeSingle();

    if (error || !found) return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });

    return res.json({ success: true, data: found });
  } catch (error) {
    console.error('Get Pelanggan By ID Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil detail pelanggan' });
  }
});

// POST /api/pelanggan
router.post('/', authenticate, authorizeRole(['ADMIN']), pelangganValidationRules, async (req: Request, res: Response) => {
  const validation = validationErrorResponse(req, res);
  if (validation) return validation;

  try {
    const { nama, alamat, no_hp } = req.body;
    const id_pelanggan = await generateNextPelangganId();

    const { data: created, error } = await supabase
      .from('Pelanggan')
      .insert([{ id_pelanggan, nama, alamat, no_hp }])
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, message: 'Pelanggan berhasil dibuat', data: created });
  } catch (error) {
    console.error('Create Pelanggan Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menambahkan pelanggan' });
  }
});

// PUT /api/pelanggan/:id
router.put('/:id', authenticate, authorizeRole(['ADMIN']), pelangganValidationRules, async (req: Request, res: Response) => {
  const validation = validationErrorResponse(req, res);
  if (validation) return validation;

  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'ID pelanggan tidak valid' });

    const { data: existing } = await supabase
      .from('Pelanggan')
      .select('id_pelanggan')
      .eq('id_pelanggan', id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });

    const { nama, alamat, no_hp } = req.body;

    const { data: updated, error } = await supabase
      .from('Pelanggan')
      .update({ nama, alamat, no_hp })
      .eq('id_pelanggan', id)
      .select()
      .single();

    if (error) throw error;

    return res.json({ success: true, message: 'Pelanggan berhasil diubah', data: updated });
  } catch (error) {
    console.error('Update Pelanggan Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengubah data pelanggan' });
  }
});

// DELETE /api/pelanggan/:id
router.delete('/:id', authenticate, authorizeRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) return res.status(400).json({ success: false, message: 'ID pelanggan tidak valid' });

    const { data: pelanggan } = await supabase
      .from('Pelanggan')
      .select('id, id_pelanggan')
      .eq('id_pelanggan', id)
      .maybeSingle();

    if (!pelanggan) return res.status(404).json({ success: false, message: 'Pelanggan tidak ditemukan' });

    // Cek apakah pelanggan memiliki pesanan terkait (memeriksa FK id_pelanggan maupun pelangganId)
    const { count: pesananCount, error: countError } = await supabase
      .from('Pesanan')
      .select('*', { count: 'exact', head: true })
      .or(`id_pelanggan.eq.${pelanggan.id_pelanggan},pelangganId.eq.${pelanggan.id}`);

    if (countError) throw countError;

    if (pesananCount && pesananCount > 0) {
      return res.status(400).json({ success: false, message: 'Pelanggan memiliki pesanan dan tidak dapat dihapus' });
    }

    const { error: deleteError } = await supabase
      .from('Pelanggan')
      .delete()
      .eq('id_pelanggan', id);

    if (deleteError) throw deleteError;

    return res.json({ success: true, message: 'Pelanggan berhasil dihapus' });
  } catch (error) {
    console.error('Delete Pelanggan Error:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus pelanggan' });
  }
});

export default router;
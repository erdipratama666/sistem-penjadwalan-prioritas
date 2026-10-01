import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js'; // 👈 Import Supabase Client

// Import Rute Aplikasi
import authRoutes from './routes/auth';
import pelangganRoutes from './routes/pelanggan';
import pesananRoutes from './routes/pesanan';
import prioritasRoutes from './routes/prioritas';
import produksiRoutes from './routes/produksi';
import laporanRoutes from './routes/laporan';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ===================================================================
// 🔧 INISIALISASI SUPABASE CLIENT UNTUK BACKEND
// Gunakan Service Role Key agar backend memiliki akses penuh untuk update
// ===================================================================
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middleware Global
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8443',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Backend Zamal Collection berjalan dengan baik 🚀',
    timestamp: new Date().toISOString(),
  });
});

// ===================================================================
// 🔐 ENDPOINT BARU: RESET PASSWORD SINKRONISASI
// ===================================================================
app.post('/api/reset-password', async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    console.log(`[AUTH] Menerima request update password untuk email: ${email}`);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password baru wajib diisi',
      });
    }

    // Melakukan update ke tabel "User" di Supabase
    // Menggunakan .eq('email', email) untuk mencari baris yang tepat
    const { data, error } = await supabase
      .from('User') // Pastikan nama tabel sesuai dengan schema (huruf kapital 'U')
      .update({ password: password })
      .eq('email', email)
      .select(); // Tambahkan select() untuk memastikan data yang diupdate dikembalikan

    if (error) {
      throw error;
    }

    // Jika berhasil tapi tidak ada data yang terpengaruh (email tidak ditemukan di tabel User)
    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Email tidak ditemukan di database pengguna.',
      });
    }

    console.log(`[AUTH] Password untuk ${email} berhasil disinkronisasi di tabel User.`);

    return res.status(200).json({
      success: true,
      message: 'Password berhasil di-update di database Zamal Collection',
    });
  } catch (error: any) {
    console.error('🔥 Gagal reset password di backend:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Gagal update password di sistem backend',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Mount Routes Utama
app.use('/api/auth', authRoutes);
app.use('/api/pelanggan', pelangganRoutes);
app.use('/api/pesanan', pesananRoutes);
app.use('/api/prioritas', prioritasRoutes);
app.use('/api/produksi', produksiRoutes);
app.use('/api/laporan', laporanRoutes);

// 404 Handler untuk rute yang tidak ditemukan
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint API tidak ditemukan.',
  });
});

// Global Error Handler Middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('🔥 Server Error:', err.stack || err.message);
  res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal pada server.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Jalankan Server (Aman untuk Testing)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server Zamal Collection berjalan di http://localhost:${PORT}`);
  });
}

export default app;
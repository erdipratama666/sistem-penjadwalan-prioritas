import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

if (!supabaseUrl || !supabaseKey) {
  console.error("KRITIS: SUPABASE_URL atau SUPABASE_KEY belum diatur di file .env backend!");
}

// Inisialisasi Supabase Client untuk seluruh backend
export const supabase = createClient(supabaseUrl, supabaseKey);

// Interface custom agar TypeScript mengenali properti user di Request
export interface AuthRequest extends Request {
  user?: any;
}

/**
 * 1. Middleware untuk Verifikasi Token JWT
 */
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer <TOKEN>

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token akses tidak ditemukan. Silakan login kembali.' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: 'Token tidak valid atau sudah kadaluarsa.' 
      });
    }
    
    // Simpan payload token ke req.user agar bisa dibaca controller selanjutnya
    req.user = decoded;
    next();
  });
};

/**
 * 2. Middleware untuk Pembatasan Hak Akses Berdasarkan Role
 */
export const authorizeRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Unauthorized: Sesi pengguna tidak dikenali.' 
      });
    }

    // Normalisasi string role (menyamakan huruf besar/kecil agar aman)
    const userRole = String(req.user.role || '').trim().toUpperCase();
    const normalizedAllowed = allowedRoles.map(r => r.trim().toUpperCase());

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        message: `Akses ditolak. Role '${req.user.role}' tidak memiliki izin untuk halaman ini.` 
      });
    }

    next();
  };
};
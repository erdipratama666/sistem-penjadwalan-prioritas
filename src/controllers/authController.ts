import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRecord, LoginRequestBody } from '../types/auth';

export const login = async (
  req: Request<{}, {}, LoginRequestBody>,
  res: Response
): Promise<Response> => {
  try {
    const { email, username, password } = req.body;
    const identifier = email || username;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/Username dan Password wajib diisi.',
      });
    }

    // Query ke tabel "User" di Supabase
    const { data: user, error } = await supabase
      .from('User')
      .select('id, id_user, nama, username, email, password, role')
      .or(`email.eq.${identifier},username.eq.${identifier}`)
      .single<UserRecord>();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Email/Username atau Password salah.',
      });
    }

    // Verifikasi password hash menggunakan bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email/Username atau Password salah.',
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET tidak ditemukan pada environment variables.');
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: user.id,
        id_user: user.id_user,
        nama: user.nama,
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login berhasil!',
      token,
      user: {
        id_user: user.id_user,
        name: user.nama,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Error Login API:', err);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server.',
    });
  }
};
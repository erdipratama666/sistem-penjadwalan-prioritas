// src/api/api.ts

/**
 * Sakelar Mock API:
 * - Set `true`  : Menggunakan simulasi data tanpa butuh server backend.
 * - Set `false` : Mengirim request ke server backend / Supabase sungguhan.
 */
const USE_MOCK = false; // 👈 Ubah ke true jika ingin mode offline/mock penuh

// Konfigurasi URL dan Key Supabase dari file .env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// URL dasar untuk REST API Supabase (Backend Utama lama)
const SUPABASE_API_URL = SUPABASE_URL ? `${SUPABASE_URL}/rest/v1` : import.meta.env.VITE_API_URL || '';

// 🌐 URL dasar untuk Backend Kustom Express.js (Port 4000)
const EXPRESS_BACKEND_URL = 'http://localhost:4000';

interface MockUser {
  id: number;
  id_user: string;
  nama: string;
  username: string;
  email: string;
  role: 'admin' | 'pemilik' | 'produksi';
  expectedPw: string;
}

// 🔑 Data User Dummy (Cadangan jika USE_MOCK diubah ke true)
const MOCK_USERS: Record<string, MockUser> = {
  admin: {
    id: 1,
    id_user: 'USR-001',
    nama: 'Admin',
    username: 'admin',
    email: 'adminzamalcollection@gmail.com',
    role: 'admin',
    expectedPw: 'admin123',
  },
  pemilik: {
    id: 2,
    id_user: 'USR-002',
    nama: 'Zamal Collection',
    username: 'pemilik',
    email: 'pemilikzamalcollection@gmail.com',
    role: 'pemilik',
    expectedPw: 'pemilik123',
  },
  produksi: {
    id: 3,
    id_user: 'USR-003',
    nama: 'Produksi',
    username: 'produksi',
    email: 'produksizamalcollection@gmail.com',
    role: 'produksi',
    expectedPw: 'produksi123',
  },
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // =======================================================
  // 🧪 1. SIMULASI MOCK API (Jika USE_MOCK = true)
  // =======================================================
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));

    if (formattedEndpoint.includes('auth/login') && (options.method === 'POST' || !options.method)) {
      const bodyData = options.body ? JSON.parse(options.body as string) : {};
      const inputIdentifier = (bodyData.username || bodyData.email || '').toLowerCase().trim();
      const password = bodyData.password;

      const mockUserKey = Object.keys(MOCK_USERS).find(
        (key) => key === inputIdentifier || MOCK_USERS[key].email.toLowerCase() === inputIdentifier
      );
      const mockUser = mockUserKey ? MOCK_USERS[mockUserKey] : null;

      if (mockUser && password === mockUser.expectedPw) {
        return {
          token: `mock-jwt-token-${mockUser.role}-123456`,
          role: mockUser.role,
          user: {
            id: mockUser.id,
            id_user: mockUser.id_user,
            name: mockUser.nama,
            username: mockUser.username,
            email: mockUser.email,
            role: mockUser.role,
          },
          message: `Login berhasil sebagai ${mockUser.nama}`,
        } as T;
      } else {
        throw new Error('Username/Email atau password salah! Silakan periksa kembali kredensial Anda.');
      }
    }

    if (formattedEndpoint.includes('/pelanggan')) {
      return [
        { id: 1, id_pelanggan: 'PLG-001', nama: 'Siti Aminah', alamat: 'Jl. Merdeka No. 10', no_hp: '081234567890' },
      ] as unknown as T;
    }

    return [] as unknown as T;
  }

  // =======================================================
  // 🌐 2. INTERCEPT LOGIN KE TABEL "User" SUPABASE
  // =======================================================
  if (formattedEndpoint.includes('auth/login') && (options.method === 'POST' || !options.method)) {
    const bodyData = options.body ? JSON.parse(options.body as string) : {};
    const inputIdentifier = (bodyData.username || bodyData.email || '').trim();
    const password = bodyData.password;

    const queryUrl = `${SUPABASE_API_URL}/User?or=(username.eq.${encodeURIComponent(inputIdentifier)},email.eq.${encodeURIComponent(inputIdentifier)})&select=*`;

    const res = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });

    const users = await res.json().catch(() => []);

    if (res.ok && Array.isArray(users) && users.length > 0) {
      const user = users[0];
      if (user.password === password) {
        return {
          token: `supabase-jwt-token-${user.role}-${user.id}`,
          role: user.role,
          user: {
            id: user.id,
            id_user: user.id_user,
            name: user.name || user.nama,
            username: user.username,
            email: user.email,
            role: user.role,
          },
          message: `Login berhasil sebagai ${user.name || user.nama}`,
        } as T;
      }
    }

    throw new Error('Username/Email atau password salah! Silakan periksa kembali kredensial Anda.');
  }

  // =======================================================
  // 🌐 3. SMART ROUTING: EXPRESS.JS vs SUPABASE REST
  // =======================================================
  let targetUrl = '';
  let finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // 👇 Deteksi: Jika route berawalan '/api/', kirim ke Express.js
  if (formattedEndpoint.startsWith('/api/')) {
    targetUrl = `${EXPRESS_BACKEND_URL}${formattedEndpoint}`;
    // Catatan: Tidak perlu menambahkan apikey Supabase ke server kustom
  } 
  // 👇 Jika selain '/api/' (seperti ambil data tabel), kirim ke Supabase REST
  else {
    targetUrl = `${SUPABASE_API_URL}${formattedEndpoint}`;
    const userRole = localStorage.getItem('role') || '';
    
    // Tambahkan header khusus bawaan Supabase
    finalHeaders = {
      ...finalHeaders,
      'apikey': SUPABASE_ANON_KEY, 
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation',
      'Range': '0-999',
      'X-User-Role': userRole,
    };
  }

  // Lakukan request ke URL yang sudah ditentukan
  const response = await fetch(targetUrl, {
    ...options,
    headers: finalHeaders,
  });

  // Mengatasi respons kosong (seperti status 204 No Content)
  const textResult = await response.text();
  const data = textResult ? JSON.parse(textResult) : null;

  if (!response.ok) {
    // Penanganan Token Expired khusus untuk auth
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('user');
      localStorage.removeItem('activePage');

      if (!window.location.pathname.includes('/login')) {
        window.location.reload();
      }
    }

    const message = data?.message || data?.error || `Request gagal dengan status ${response.status}`;
    throw new Error(message);
  }

  return data;
}
import React from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('pemilik' | 'admin' | 'produksi' | 'PEMILIK' | 'ADMIN' | 'PENGELOLA_PRODUKSI')[];
  userRole: string | null;
}

export default function ProtectedRoute({ children, allowedRoles, userRole }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');

  // 1. Jika belum login (tidak ada token)
  if (!token) {
    window.location.href = '/';
    return null;
  }

  // Normalisasi role ke lowercase untuk pengecekan aman
  const currentRole = userRole?.toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase());

  // 2. Jika role user tidak ada di daftar allowedRoles
  if (currentRole && !normalizedAllowedRoles.includes(currentRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-['Inter',sans-serif]">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
          <p className="text-sm text-slate-500 mb-6">
            Akun Anda (<span className="font-semibold text-slate-700 capitalize">{currentRole}</span>) tidak memiliki hak akses ke halaman ini.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            Kembali ke Halaman Login
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
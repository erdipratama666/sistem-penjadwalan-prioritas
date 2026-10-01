import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { apiRequest } from '../api/api'; // 🔹 Import helper API backend kamu
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

interface ResetPasswordProps {
  onBackToLogin?: () => void;
}

export default function ResetPassword({ onBackToLogin }: ResetPasswordProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null); // 🔹 Simpan email dari sesi
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState(false);

  // 🔹 Cek dan dengarkan Sesi Pemulihan Supabase dari URL
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasSession(true);
          setUserEmail(session.user?.email || null);
        }
      } catch (err) {
        console.error('Gagal mengambil sesi:', err);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();

    // Listener otomatis ketika Supabase berhasil memproses token dari URL email
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(true);
        if (session?.user?.email) {
          setUserEmail(session.user.email);
        }
        setCheckingSession(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!hasSession) {
      setErrorMsg('Sesi reset password tidak ditemukan/kadaluarsa. Silakan minta tautan baru.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password minimal harus 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);

    try {
      // 1. Update password user di Supabase Auth
      const { error: supabaseError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (supabaseError) {
        throw supabaseError;
      }

      // 2. 🔹 Sync / Update password ke Backend API Utama kamu (Opsi B)
      if (userEmail) {
        await apiRequest('/api/reset-password', {
          method: 'POST',
          body: JSON.stringify({
            email: userEmail,
            password: newPassword,
          }),
        });
      }

      setSuccessMsg(true);

      // Sign out agar sesi sementara pemulihan dibersihkan
      await supabase.auth.signOut();
    } catch (err: any) {
      console.error('Update Password Error:', err);
      setErrorMsg(err.message || 'Gagal memperbarui password.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Tampilan saat sedang membaca token/sesi dari URL
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-slate-400 text-sm">Memverifikasi tautan reset password...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-['Inter',sans-serif]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden p-8">
        
        {/* Tombol Kembali */}
        {onBackToLogin && (
          <button
            onClick={onBackToLogin}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Login
          </button>
        )}

        {/* 2. Tampilan Berhasil Reset Password */}
        {successMsg ? (
          <div className="text-center py-4 animate-in fade-in">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Password Diperbarui!</h2>
            <p className="text-sm text-slate-600 mb-6">
              Password Anda berhasil diubah. Silakan login kembali menggunakan password baru Anda.
            </p>
            {onBackToLogin && (
              <button
                onClick={onBackToLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-blue-500/20"
              >
                Login Sekarang
              </button>
            )}
          </div>
        ) : (
          /* 3. Form Reset Password */
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Password Baru</h2>
              <p className="text-sm text-slate-500 mt-1">
                Masukkan password baru untuk akun {userEmail ? <span className="font-semibold text-slate-700">({userEmail})</span> : 'Anda'}.
              </p>
            </div>

            {/* Warning jika Sesi Tidak Ditemukan */}
            {!hasSession && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Sesi pemulihan tidak terdeteksi. Pastikan Anda membuka halaman ini melalui tautan di email.
                </span>
              </div>
            )}

            {/* Error Banner */}
            {errorMsg && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              {/* Password Baru */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password Baru
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Tombol Simpan */}
              <button
                type="submit"
                disabled={loading || !hasSession}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Password Baru'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
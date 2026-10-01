// src/components/ForgotPasswordModal.tsx
import React, { useState } from 'react';
import { Mail, AlertCircle, Loader2, CheckCircle2, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient'; // 👈 Import client Supabase kamu

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  if (!isOpen) return null;

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!resetEmail.trim() || !emailPattern.test(resetEmail)) {
      setResetError('Masukkan alamat email yang valid.');
      return;
    }

    setIsSendingReset(true);

    try {
      // 🔑 Mengirim request reset password via Supabase Auth
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setResetSuccess(true);
    } catch (err: any) {
      console.error('Forgot Password Error:', err);
      setResetError(
        err?.message || 'Gagal mengirim email reset. Pastikan email Anda terdaftar.'
      );
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleClose = () => {
    setResetEmail('');
    setResetSuccess(false);
    setResetError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in duration-200">
        
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {!resetSuccess ? (
          <form onSubmit={handleSendResetLink} className="space-y-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">Reset Password</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Masukkan alamat email resmi akun Anda. Kami akan mengirimkan tautan verifikasi untuk menyetel ulang password.
              </p>
            </div>

            {resetError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium border border-red-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <div className="space-y-1 text-left">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => { setResetEmail(e.target.value); setResetError(''); }}
                  placeholder="contoh: zamalcollection@gmail.com"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm text-slate-900 transition-colors focus:bg-white outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSendingReset}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSendingReset || !resetEmail.trim()}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:bg-blue-400 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                {isSendingReset ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  'Kirim Verifikasi'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center space-y-4 py-2">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Email Terkirim!</h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-1">
                Instruksi reset password telah dikirimkan ke <span className="font-semibold text-slate-800">{resetEmail}</span>. Silakan periksa inbox atau folder spam Anda.
              </p>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors mt-2"
            >
              Kembali ke Login
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
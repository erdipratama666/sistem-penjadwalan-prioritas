import React, { useState, useEffect } from 'react';
import { 
  Factory, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Loader2, 
  ArrowRight 
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient'; 
import ForgotPasswordModal from "../components/ForgotPasswordModal";

interface LoginProps {
  onLogin: (role: string, view: string, userData?: any) => void;
}

const ROLE_TO_VIEW_MAP: Record<string, { role: string; view: string }> = {
  admin: { role: 'admin', view: 'admin-customers' },
  pemilik: { role: 'pemilik', view: 'dashboard' },
  produksi: { role: 'produksi', view: 'produksi' },
};

export default function Login({ onLogin }: LoginProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  useEffect(() => {
    const savedUsername = localStorage.getItem('remembered_username');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setError('Username atau Email wajib diisi.');
      return;
    }
    if (!cleanPassword) {
      setError('Password wajib diisi.');
      return;
    }

    setIsLoggingIn(true);

    try {
      // 1. Query fleksibel ke tabel User
      const { data: users, error: dbError } = await supabase
        .from('User')
        .select('*')
        .or(`username.eq.${cleanUsername},email.eq.${cleanUsername}`);

      if (dbError || !users || users.length === 0) {
        throw new Error('Akun tidak ditemukan di database.');
      }

      const currentUser = users[0];
      const dbRole = (currentUser.role || 'admin').toLowerCase();

      // 2. Validasi Password
      const dbPassword = currentUser.password;
      if (
        dbPassword && 
        dbPassword !== 'EMPTY' && 
        !dbPassword.startsWith('$2b$') && 
        dbPassword !== cleanPassword
      ) {
        throw new Error('Password salah! Silakan periksa kembali.');
      }

      // 3. Simpan sesi
      localStorage.setItem('token', 'custom-session-token-' + (currentUser.id || 'user'));
      localStorage.setItem('user', JSON.stringify(currentUser));

      if (rememberMe) {
        localStorage.setItem('remembered_username', cleanUsername);
      } else {
        localStorage.removeItem('remembered_username');
      }

      // Otomatis mengarahkan berdasarkan role di database
      const mapped = ROLE_TO_VIEW_MAP[dbRole] || ROLE_TO_VIEW_MAP['admin'];

      setTimeout(() => {
        onLogin(mapped.role, mapped.view, currentUser);
      }, 300);

    } catch (err: any) {
      console.error('Login Error:', err);
      setIsLoggingIn(false);
      setError(err?.message || 'Gagal masuk ke sistem.');
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 font-['Inter',sans-serif] bg-slate-100 text-slate-800 transition-opacity duration-300 ${isLoggingIn ? 'opacity-80' : 'opacity-100'}`}>
      
      {/* Box Form Login */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 relative overflow-hidden">
        
        {/* Dekorasi Latar */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-blue-50 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-blue-50 blur-3xl"></div>

        <div className="relative">
          {/* Header & Logo */}
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 mb-4">
              <Factory className="text-white w-7 h-7" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 text-center">Zamal Collection</h2>
            <p className="text-sm md:text-base text-slate-500 mt-2 text-center">Silakan masuk ke akun Anda</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6" autoComplete="on">
            
            {/* Area Error Message */}
            {error && (
              <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-medium border border-red-100 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Input Username */}
              <div className="space-y-1.5">
                <label htmlFor="login-username" className="text-sm font-semibold text-slate-700 ml-1">Username</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    id="login-username"
                    type="text" 
                    name="username"
                    autoComplete="username"
                    value={username} 
                    onChange={(e) => { setUsername(e.target.value); setError(''); }} 
                    className={`block w-full pl-11 pr-4 py-3 bg-slate-50 border ${error && !username ? 'border-red-300 ring-1 ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'} rounded-xl text-slate-900 transition-colors focus:bg-white outline-none`} 
                    placeholder="Masukkan username" 
                  />
                </div>
              </div>

              {/* Input Password */}
              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-sm font-semibold text-slate-700 ml-1">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input 
                    id="login-password"
                    type={showPassword ? "text" : "password"} 
                    name="password"
                    autoComplete="current-password"
                    value={password} 
                    onChange={(e) => { setPassword(e.target.value); setError(''); }} 
                    className={`block w-full pl-11 pr-12 py-3 bg-slate-50 border ${error && !password ? 'border-red-300 ring-1 ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'} rounded-xl text-slate-900 transition-colors focus:bg-white outline-none`} 
                    placeholder="••••••••" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group select-none">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="w-5 h-5 rounded border-2 border-slate-300 bg-white peer-checked:bg-blue-600 peer-checked:border-blue-600 peer-focus:ring-2 peer-focus:ring-blue-500/20 transition-all flex items-center justify-center group-hover:border-blue-500">
                    <svg className="w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">Ingat Saya</span>
              </label>
              
              <button 
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Lupa Password?
              </button>
            </div>

            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full bg-blue-600 text-white rounded-xl py-3.5 px-4 font-semibold text-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 group disabled:bg-blue-400 disabled:shadow-none mt-2"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                <>
                  Masuk Sistem
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <p className="text-xs font-medium text-slate-400">© 2026 Zamal Collection</p>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotModal}
        onClose={() => setShowForgotModal(false)}
      />

    </div>
  );
}
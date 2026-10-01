import React, { useState, useEffect } from 'react';

// Layout & Components
import AppHeader from './components/Header';
import { OwnerSidebar, AdminSidebar, ProduksiSidebar } from './components/Sidebar';

// Pages
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import DataPelanggan from './pages/admin/DataPelanggan';
import DataPesananAdmin from './pages/admin/DataPesanan';

import Dashboard from './pages/pemilik/Dashboard';
import DataPesananPemilik from './pages/pemilik/DataPesanan';
import PenjadwalanPrioritas from './pages/pemilik/PenjadwalanPrioritas';
import HasilPrioritas from './pages/pemilik/HasilPrioritas';
import Laporan from './pages/pemilik/Laporan';

import PrioritasProduksi from './pages/produksi/PrioritasProduksi';
import MengelolaProduksi from './pages/produksi/MengelolaProduksi';

// Helper API & Auth Utility
import { apiRequest } from './api/api';
import { getCurrentUser } from './utils/auth';
import { Loader2 } from 'lucide-react';

export default function App() {
  // State melacak rute URL browser (Path, Search Params, & Hash Fragment Supabase)
  const [pathname, setPathname] = useState<string>(window.location.pathname);
  const [searchParams, setSearchParams] = useState<string>(window.location.search);
  const [hash, setHash] = useState<string>(window.location.hash);

  // Status Role & Page (Persistensi dari localStorage)
  const [currentRole, setCurrentRole] = useState<string>(() => {
    const savedToken = localStorage.getItem('token');
    const savedRole = localStorage.getItem('role');
    return savedToken && savedRole ? savedRole : 'guest';
  });

  const [activePage, setActivePage] = useState<string>(() => {
    const savedToken = localStorage.getItem('token');
    const savedPage = localStorage.getItem('activePage');
    return savedToken && savedPage ? savedPage : 'login';
  });

  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Merekam perubahan URL browser (Navigasi Back/Forward & Hash Change dari Supabase Email Redirect)
  useEffect(() => {
    const handleLocationChange = () => {
      setPathname(window.location.pathname);
      setSearchParams(window.location.search);
      setHash(window.location.hash);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Ambil data user aktif (mendukung Supabase Auth atau Custom LocalStorage User)
  const authUser = getCurrentUser();
  const localUserStr = localStorage.getItem('user');
  const localUser = localUserStr ? JSON.parse(localUserStr) : null;
  const user = authUser || localUser;

  // Format Display Role untuk Header (misal: "admin" -> "Admin")
  const displayRole = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : currentRole !== 'guest' 
      ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1) 
      : 'Tamu';

  // Deteksi Tautan Reset Password dari URL
  const isResetPasswordRoute =
    pathname.startsWith('/reset-password') ||
    searchParams.includes('token') ||
    searchParams.includes('type=recovery') ||
    hash.includes('type=recovery') ||
    hash.includes('access_token');

  // Fetch Data Global dari API jika user telah terautentikasi
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const [resCustomers, resOrders] = await Promise.all([
          apiRequest<any[]>('/Pelanggan?select=*').catch(() => []),
          apiRequest<any[]>('/Pesanan?select=*,pelanggan:Pelanggan(*)').catch(() => [])
        ]);

        const listCustomers = Array.isArray(resCustomers)
          ? resCustomers
          : (resCustomers?.data || []);

        const listOrders = Array.isArray(resOrders)
          ? resOrders
          : (resOrders?.data || []);

        setCustomers(listCustomers);
        setOrders(listOrders);
      } catch (err) {
        console.error('Gagal mengambil data dari server:', err);
      } finally {
        setLoading(false);
      }
    };

    if (currentRole !== 'guest' && activePage !== 'login' && !isResetPasswordRoute) {
      fetchAllData();
    }
  }, [currentRole, activePage, isResetPasswordRoute]);

  // Handler Login Sukses
  const handleLogin = (role: string, defaultView: string, userData?: any) => {
    setCurrentRole(role);
    setActivePage(defaultView);
    localStorage.setItem('role', role);
    localStorage.setItem('activePage', defaultView);
    
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    }
  };

  // Handler Navigasi & Logout
  const handleNavigate = (page: string) => {
    if (page === 'login') {
      setCurrentRole('guest');
      setActivePage('login');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('activePage');
      localStorage.removeItem('user');

      if (window.location.pathname !== '/' || window.location.search !== '' || window.location.hash !== '') {
        window.history.pushState({}, '', '/');
        setPathname('/');
        setSearchParams('');
        setHash('');
      }
      return;
    }
    setActivePage(page);
    localStorage.setItem('activePage', page);
  };

  // 1. TAMPILKAN HALAMAN RESET PASSWORD
  if (isResetPasswordRoute) {
    return (
      <ResetPassword
        onBackToLogin={() => {
          window.history.pushState({}, '', '/');
          setPathname('/');
          setSearchParams('');
          setHash('');
          handleNavigate('login');
        }}
      />
    );
  }

  // 2. TAMPILKAN HALAMAN LOGIN
  if (currentRole === 'guest' || activePage === 'login') {
    return <Login onLogin={handleLogin} />;
  }

  // Information Mapper Judul & Subtitle Halaman
  const getPageInfo = () => {
    switch (activePage) {
      case 'dashboard':
        return { title: 'Dashboard', subtitle: 'Ringkasan performa produksi' };
      case 'orders':
        return { title: 'Data Pesanan', subtitle: 'Kelola data pesanan masuk' };
      case 'scheduling':
        return { title: 'Penjadwalan Prioritas', subtitle: 'Greedy Algorithm' };
      case 'priority-result':
        return { title: 'Hasil Prioritas', subtitle: 'Urutan jadwal produksi' };
      case 'reports':
        return { title: 'Laporan', subtitle: 'Ringkasan & riwayat laporan' };
      case 'admin-customers':
        return { title: 'Data Pelanggan', subtitle: 'Kelola data pelanggan' };
      case 'admin-orders':
        return { title: 'Data Pesanan', subtitle: 'Kelola data pesanan' };
      case 'produksi':
        return { title: 'Prioritas Produksi', subtitle: 'Daftar antrian produksi' };
      case 'manage-produksi':
        return { title: 'Mengelola Produksi', subtitle: 'Progres pekerjaan & status' };
      default:
        return { title: 'Sistem Penjadwalan', subtitle: 'Zamal Collection' };
    }
  };

  const pageInfo = getPageInfo();

  return (
    <div className="flex h-screen bg-slate-50 font-['Inter',sans-serif] overflow-hidden">
      {/* Sidebar Berdasarkan Role */}
      {currentRole === 'pemilik' && (
        <OwnerSidebar activePage={activePage} onNavigate={handleNavigate} />
      )}
      {currentRole === 'admin' && (
        <AdminSidebar activePage={activePage} onNavigate={handleNavigate} />
      )}
      {currentRole === 'produksi' && (
        <ProduksiSidebar activePage={activePage} onNavigate={handleNavigate} />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Utama App */}
        <AppHeader
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          userName={user?.name || user?.username || 'Pengguna'}
          userRole={displayRole}
          userInitial={
            user?.name 
              ? user.name.charAt(0).toUpperCase() 
              : user?.username 
                ? user.username.charAt(0).toUpperCase() 
                : 'U'
          }
          onLogout={() => handleNavigate('login')}
        />

        {/* Konten Halaman Dinamis */}
        <main className="flex-1 overflow-auto flex flex-col relative">
          {loading && (
            <div className="absolute top-4 right-4 z-50 bg-white/90 backdrop-blur-sm border border-slate-200 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 text-xs font-semibold text-blue-600 animate-in fade-in">
              <Loader2 className="w-4 h-4 animate-spin" /> Memuat data...
            </div>
          )}

          {/* HALAMAN ROLE PEMILIK */}
          {currentRole === 'pemilik' && (
            <>
              {activePage === 'dashboard' && <Dashboard orders={orders} />}
              {activePage === 'orders' && (
                <DataPesananPemilik
                  onNavigate={handleNavigate}
                  customers={customers}
                  orders={orders}
                  setOrders={setOrders}
                />
              )}
              {activePage === 'scheduling' && (
                <PenjadwalanPrioritas 
                  orders={orders}   
                  onNavigate={handleNavigate} 
                />
              )}
              {activePage === 'priority-result' && <HasilPrioritas />}
              {activePage === 'reports' && <Laporan orders={orders} />}
            </>
          )}

          {/* HALAMAN ROLE ADMIN */}
          {currentRole === 'admin' && (
            <>
              {activePage === 'admin-customers' && (
                <DataPelanggan
                  onNavigate={handleNavigate}
                  customers={customers}
                  setCustomers={setCustomers}
                />
              )}
              {activePage === 'admin-orders' && (
                <DataPesananAdmin
                  onNavigate={handleNavigate}
                  customers={customers}
                  orders={orders}
                  setOrders={setOrders}
                />
              )}
            </>
          )}

          {/* HALAMAN ROLE PRODUKSI */}
{currentRole === 'produksi' && (
  <>
    {activePage === 'produksi' && <PrioritasProduksi onNavigate={handleNavigate} />}
    {activePage === 'manage-produksi' && <MengelolaProduksi />}
  </>
)}
        </main>
      </div>
    </div>
  );
}
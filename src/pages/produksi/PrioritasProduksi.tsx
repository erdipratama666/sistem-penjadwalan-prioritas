import React, { useEffect, useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { apiRequest } from '../../api/api';

const statusLabel: Record<string, string> = {
  MENUNGGU: 'Menunggu',
  DALAM_PRODUKSI: 'Dalam Produksi',
  SELESAI: 'Selesai',
};

const statusBadgeClass: Record<string, string> = {
  MENUNGGU: 'bg-orange-100 text-orange-700 border border-orange-200/50',
  DALAM_PRODUKSI: 'bg-blue-100 text-blue-700 border border-blue-200/50',
  SELESAI: 'bg-emerald-100 text-emerald-700 border border-emerald-200/50',
};

const difficultyLabel: Record<string, string> = {
  MUDAH: 'Mudah',
  SEDANG: 'Sedang',
  SULIT: 'Sulit',
};

const difficultyBadgeClass: Record<string, string> = {
  MUDAH: 'bg-emerald-100 text-emerald-700',
  SEDANG: 'bg-orange-100 text-orange-700',
  SULIT: 'bg-red-100 text-red-700',
};

const formatDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID');
};

const parseNumericId = (val: any): number => {
  if (!val && val !== 0) return 0;
  const cleaned = String(val).replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
};

const formatIdPesanan = (val: any) => {
  const num = parseNumericId(val);
  if (!num) return '-';
  return `PSN-${String(num).padStart(3, '0')}`;
};

export default function PrioritasProduksi({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<any[]>(
        '/Prioritas?select=*,Pesanan(*,pelanggan:Pelanggan(*))&order=urutan_prioritas.asc',
        { method: 'GET' }
      );
      
      // PERBAIKAN 1: Filter agar hanya menampilkan pesanan yang statusnya masih MENUNGGU
      const filtered = (Array.isArray(result) ? result : []).filter((item) => {
        const orderRaw = item.Pesanan || item.pesanan;
        const order = Array.isArray(orderRaw) ? orderRaw[0] : (orderRaw || {});
        return (order?.status || 'MENUNGGU').toUpperCase() === 'MENUNGGU';
      });

      setResults(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengambil data prioritas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (active) loadData();
    return () => { active = false; };
  }, []);

  const handlePullNext = async () => {
    setPulling(true);
    setPullError(null);
    try {
      // Cari item prioritas teratas yang status pesanannya masih "MENUNGGU"
      const nextItem = results.find((item) => {
        const orderRaw = item.Pesanan || item.pesanan;
        const orderObj = Array.isArray(orderRaw) ? orderRaw[0] : orderRaw;
        const status = (orderObj?.status || '').toUpperCase();
        return status === 'MENUNGGU' || !orderObj?.status;
      });
      
      if (!nextItem) throw new Error('Tidak ada pesanan dengan status "Menunggu" dalam antrean.');

      const orderRaw = nextItem.Pesanan || nextItem.pesanan;
      const orderObj = Array.isArray(orderRaw) ? orderRaw[0] : orderRaw;
      const orderId = parseNumericId(orderObj.id || orderObj.id_pesanan);
      
      if (!orderId) throw new Error('ID utama Pesanan (id integer) tidak ditemukan.');

      // PERBAIKAN 2: Hanya memblokir jika ada proses produksi aktif (bukan yang sudah SELESAI)
      const cekProduksi = await apiRequest<any[]>(
        `/Produksi?pesananId=eq.${orderId}&status_produksi=neq.SELESAI`, 
        { method: 'GET' }
      );

      if (cekProduksi && cekProduksi.length > 0) {
        throw new Error('Gagal: Pesanan ini masih memiliki proses produksi yang belum selesai.');
      }

      // 1. Update status Pesanan menjadi DALAM_PRODUKSI
      await apiRequest(`/Pesanan?id=eq.${orderId}`, {
        method: 'PATCH',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({ status: 'DALAM_PRODUKSI' })
      });

      // 2. Buat record Produksi dengan status DALAM_PRODUKSI dan langsung catat tanggal_mulai
      await apiRequest('/Produksi', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({
          pesananId: orderId,
          status_produksi: 'DALAM_PRODUKSI',
          tanggal_mulai: new Date().toISOString()
        })
      });

      // 3. Pindah ke halaman manage-produksi
      onNavigate('manage-produksi');
    } catch (err) {
      setPullError(err instanceof Error ? err.message : 'Gagal menarik pesanan prioritas berikutnya.');
    } finally {
      setPulling(false);
    }
  };

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col p-8">
      <div className="flex-1 flex flex-col gap-6 min-h-0 max-w-7xl w-full mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 shrink-0">
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handlePullNext}
              disabled={pulling || results.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-6 font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 disabled:bg-blue-400 cursor-pointer"
            >
              <PlayCircle className="w-5 h-5" />
              {pulling ? 'Memproses...' : 'Mulai Produksi Prioritas Berikutnya'}
            </button>
            {pullError && <p className="text-xs text-red-600 font-medium max-w-sm text-right">{pullError}</p>}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
          {loading ? (
            <div className="px-6 py-16 text-center text-slate-500 font-medium">Memuat data prioritas...</div>
          ) : error ? (
            <div className="px-6 py-16 text-center">
              <p className="text-red-600 font-medium mb-1">Gagal mengambil data prioritas.</p>
              <p className="text-sm text-slate-500">{error}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-500">
              <p className="font-semibold">Tidak ada antrean pesanan yang menunggu.</p>
              <p className="text-sm mt-2">Semua prioritas saat ini sudah masuk ke tahap produksi atau belum dijadwalkan.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto w-full">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap text-center bg-slate-50">Peringkat</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">ID Pesanan</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Pelanggan</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Nama Produk</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Tanggal Masuk</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Deadline</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Jumlah</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Tingkat Kesulitan</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Status Pesanan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {results.map((item) => {
                    const orderRaw = item.Pesanan || item.pesanan;
                    const order = Array.isArray(orderRaw) ? orderRaw[0] : (orderRaw || {});
                    const pelangganRaw = order.pelanggan;
                    const pelanggan = Array.isArray(pelangganRaw) ? pelangganRaw[0] : (pelangganRaw || {});
                    const statusKey = (order.status || 'MENUNGGU').toUpperCase();
                    const diffKey = (order.tingkat_kesulitan || 'MUDAH').toUpperCase();
                    
                    return (
                      <tr key={item.id_prioritas || item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-blue-600 text-center whitespace-nowrap">#{item.urutan_prioritas}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900 whitespace-nowrap">{formatIdPesanan(order.id_pesanan || order.id)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700 whitespace-nowrap">{pelanggan.nama || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{order.nama_produk || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-900 font-medium whitespace-nowrap">{formatDate(order.tanggal_masuk)}</td>
                        <td className="px-6 py-4 text-sm text-slate-900 font-medium whitespace-nowrap">{formatDate(order.deadline)}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{order.jumlah ?? '-'} pcs</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${difficultyBadgeClass[diffKey] || 'bg-slate-100 text-slate-700'}`}>{difficultyLabel[diffKey] || order.tingkat_kesulitan || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass[statusKey] || 'bg-slate-100 text-slate-700'}`}>{statusLabel[statusKey] || order.status || '-'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
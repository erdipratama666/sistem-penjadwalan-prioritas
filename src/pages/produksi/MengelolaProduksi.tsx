import React, { useEffect, useState } from 'react';
import { PlayCircle, Check, Filter } from 'lucide-react';
import { apiRequest } from '../../api/api';

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

const parseNumericId = (val: any): number => {
  if (!val && val !== 0) return 0;
  const cleaned = String(val).replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
};

const formatDate = (value: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  // Menggunakan toLocaleString agar tanggal dan jam (waktu) terlihat jelas
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('id-ID');
};

const formatIdPesanan = (val: any) => {
  const num = parseNumericId(val);
  if (!num) return '-';
  return `PSN-${String(num).padStart(3, '0')}`;
};

const formatIdProduksi = (val: any) => {
  const num = parseNumericId(val);
  if (!num) return '-';
  return `PRD-${String(num).padStart(3, '0')}`;
};

export default function MengelolaProduksi({ showToast }: { showToast: (msg: string) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | number | null>(null);
  
  const [filterStatus, setFilterStatus] = useState<string>('SEMUA');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const prodResult = await apiRequest<any[]>('/Produksi?select=*,Pesanan(*,pelanggan:Pelanggan(*))', { method: 'GET' });
      const priorityResult = await apiRequest<any[]>('/Prioritas?select=*', { method: 'GET' }).catch(() => []);
      
      const priorityMap = new Map();
      if (Array.isArray(priorityResult)) {
        priorityResult.forEach((p) => {
          const pid = parseNumericId(p.pesananId);
          if (pid) priorityMap.set(pid, p.urutan_prioritas);
        });
      }

      const formattedItems = (Array.isArray(prodResult) ? prodResult : []).map((item) => {
        const orderObj = item.Pesanan || item.pesanan || {};
        const order = Array.isArray(orderObj) ? orderObj[0] : orderObj;
        const pelangganObj = order.pelanggan || {};
        const pelanggan = Array.isArray(pelangganObj) ? pelangganObj[0] : pelangganObj;
        const orderDbId = parseNumericId(item.pesananId || order.id);
        
        return {
          id: item.id,
          id_produksi: item.id_produksi || item.id,
          pesananId: orderDbId,
          id_pesanan: order.id_pesanan || order.id || '-',
          nama_pelanggan: pelanggan.nama || '-',
          nama_produk: order.nama_produk || '-',
          jumlah: order.jumlah || 0,
          deadline: order.deadline,
          tingkat_kesulitan: order.tingkat_kesulitan || 'MUDAH',
          status_produksi: item.status_produksi || 'MENUNGGU',
          tanggal_mulai: item.tanggal_mulai,
          tanggal_selesai: item.tanggal_selesai,
          urutan_prioritas: priorityMap.get(orderDbId) ?? '-'
        };
      });

      formattedItems.sort((a, b) => {
        const isNumA = !isNaN(Number(a.urutan_prioritas));
        const isNumB = !isNaN(Number(b.urutan_prioritas));
        if (isNumA && !isNumB) return -1;
        if (!isNumA && isNumB) return 1;
        if (!isNumA && !isNumB) return 0;
        return Number(a.urutan_prioritas) - Number(b.urutan_prioritas);
      });

      setItems(formattedItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengambil data produksi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fungsi handleMulai tetap dibiarkan untuk jaga-jaga jika ada data berstatus MENUNGGU
  const handleMulai = async (item: any) => {
    setActingId(item.id_produksi);
    try {
      const now = new Date().toISOString();
      await apiRequest(`/Produksi?id=eq.${item.id || item.id_produksi}`, {
        method: 'PATCH',
        body: JSON.stringify({ status_produksi: 'DALAM_PRODUKSI', tanggal_mulai: now })
      });
      await apiRequest(`/Pesanan?id=eq.${item.pesananId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'DALAM_PRODUKSI' })
      });
      showToast('Produksi dimulai.');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memulai produksi.');
    } finally {
      setActingId(null);
    }
  };

  const handleSelesai = async (item: any) => {
    setActingId(item.id_produksi);
    try {
      const now = new Date().toISOString();
      // 1. Update status dan tanggal selesai di tabel Produksi
      await apiRequest(`/Produksi?id=eq.${item.id || item.id_produksi}`, {
        method: 'PATCH',
        body: JSON.stringify({ status_produksi: 'SELESAI', tanggal_selesai: now })
      });
      // 2. Update status di tabel Pesanan (Typo pespesananId sudah diperbaiki di sini)
      await apiRequest(`/Pesanan?id=eq.${item.pesananId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'SELESAI' })
      });
      showToast('Produksi selesai.');
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyelesaikan produksi.');
    } finally {
      setActingId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    if (filterStatus === 'SEMUA') return true;
    return item.status_produksi === filterStatus;
  });

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col p-8">
      <div className="flex-1 flex flex-col gap-6 min-h-0 max-w-7xl w-full mx-auto">
        
        <div className="shrink-0 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Tabel Mengelola Produksi</h2>
            <p className="text-slate-500">Kelola pesanan dan riwayat pesanan.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
            <Filter className="w-4 h-4 text-slate-500" />
            <label htmlFor="statusFilter" className="text-sm font-medium text-slate-700 whitespace-nowrap">
              Filter:
            </label>
            <select
              id="statusFilter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-slate-900 text-sm focus:ring-0 outline-none cursor-pointer font-medium"
            >
              <option value="SEMUA">Semua Status</option>
              <option value="DALAM_PRODUKSI">Dalam Produksi</option>
              <option value="SELESAI">Selesai</option>
            </select>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
          {loading ? (
            <div className="px-6 py-16 text-center text-slate-500 font-medium">Memuat data produksi...</div>
          ) : error ? (
            <div className="px-6 py-16 text-center">
              <p className="text-red-600 font-medium mb-1">Gagal mengambil data produksi.</p>
              <p className="text-sm text-slate-500">{error}</p>
            </div>
          ) : items.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-500">
              Belum ada pesanan dalam antrean produksi. Tarik pesanan berikutnya dari halaman Prioritas Produksi.
            </div>
          ) : (
            <div className="flex-1 overflow-auto w-full relative">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap text-center bg-slate-50">Peringkat</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">ID Produksi</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">ID Pesanan</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Pelanggan</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Produk</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Jumlah</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Deadline</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Kesulitan</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Status</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Mulai</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Selesai</th>
                    <th className="px-6 py-4 text-right whitespace-nowrap bg-slate-50">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredItems.map((item) => (
                    <tr key={item.id_produksi || item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-blue-600 text-center whitespace-nowrap">
                        {item.urutan_prioritas !== '-' ? `#${item.urutan_prioritas}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 whitespace-nowrap">{formatIdProduksi(item.id_produksi)}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 whitespace-nowrap">{formatIdPesanan(item.id_pesanan)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700 whitespace-nowrap">{item.nama_pelanggan}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{item.nama_produk}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{item.jumlah} pcs</td>
                      <td className="px-6 py-4 text-sm text-slate-900 font-medium whitespace-nowrap">{formatDate(item.deadline)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${difficultyBadgeClass[item.tingkat_kesulitan] || 'bg-slate-100 text-slate-700'}`}>{difficultyLabel[item.tingkat_kesulitan] || item.tingkat_kesulitan}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass[item.status_produksi] || 'bg-slate-100 text-slate-700'}`}>{statusLabel[item.status_produksi] || item.status_produksi}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">{formatDate(item.tanggal_mulai)}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">{formatDate(item.tanggal_selesai)}</td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {item.status_produksi === 'MENUNGGU' && (
                            <button
                              onClick={() => handleMulai(item)}
                              disabled={actingId === item.id_produksi}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                              title="Mulai Produksi"
                            >
                              <PlayCircle className="w-4 h-4" />
                              <span className="text-xs font-semibold">Mulai</span>
                            </button>
                          )}
                          {/* Tombol Selesai dibuat lebih jelas */}
                          {item.status_produksi === 'DALAM_PRODUKSI' && (
                            <button
                              onClick={() => handleSelesai(item)}
                              disabled={actingId === item.id_produksi}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                              title="Selesaikan Produksi"
                            >
                              <Check className="w-4 h-4" />
                              <span className="text-xs font-semibold">Selesai</span>
                            </button>
                          )}
                          {item.status_produksi === 'SELESAI' && (
                            <span className="text-xs text-slate-400 font-medium">Telah Selesai</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredItems.length === 0 && (
                <div className="py-12 text-center text-slate-500 w-full absolute mt-10">
                  Tidak ada pesanan dengan status "{filterStatus === 'DALAM_PRODUKSI' ? 'Dalam Produksi' : filterStatus === 'SELESAI' ? 'Selesai' : 'tersebut'}".
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
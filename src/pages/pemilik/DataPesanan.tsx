import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Eye } from 'lucide-react';
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

const parseNumericId = (val: any): number => {
  if (!val && val !== 0) return 0;
  const cleaned = String(val).replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
};

const toDateDisplay = (value: string) => {
  if (!value) return '-';
  return String(value).slice(0, 10);
};

const formatIdPesanan = (val: any) => {
  const num = parseNumericId(val);
  if (!num) return '-';
  return `PSN-${String(num).padStart(3, '0')}`;
};

const formatIdPelanggan = (val: any) => {
  const num = parseNumericId(val);
  if (!num) return '-';
  return `PLG-${String(num).padStart(3, '0')}`;
};

export default function DataPesananPemilik({
  onNavigate,
  orders,
  loading: externalLoading,
  error: externalError,
}: {
  onNavigate: (page: string) => void;
  orders: any[];
  customers?: any[];
  setOrders?: any;
  loading?: boolean;
  error?: string | null;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [localOrders, setLocalOrders] = useState<any[]>(Array.isArray(orders) ? orders : []);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiRequest<any[]>('/Pesanan?select=*,pelanggan:Pelanggan(*)&order=id_pesanan.asc', {
        method: 'GET',
      });
      if (Array.isArray(result)) {
        setLocalOrders(result);
      }
    } catch (err: any) {
      console.error('Gagal mengambil data pesanan:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat data pesanan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const sourceOrders = localOrders.length > 0 ? localOrders : (Array.isArray(orders) ? orders : []);

  const filteredOrders = sourceOrders.filter((order: any) => {
    const orderId = order?.id_pesanan || order?.id;
    const formattedId = formatIdPesanan(orderId).toLowerCase();
    const rawId = String(orderId || '').toLowerCase();
    const nameMatch = String(order?.pelanggan?.nama || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    return formattedId.includes(query) || rawId.includes(query) || nameMatch.includes(query);
  });

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col p-8">
      <div className="flex-1 flex flex-col gap-6 min-h-0 max-w-7xl w-full mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Tabel Data Pesanan</h2>
            <p className="text-slate-500">Lihat dan pantau semua pesanan pelanggan.</p>
          </div>
        </div>

        <div className="relative max-w-sm shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama pelanggan atau ID pesanan"
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Kontainer kartu tabel flex-1 dengan min-h-0 agar mengizinkan scroll vertikal */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
          {loading && localOrders.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-500 font-medium">Memuat data pesanan...</div>
          ) : error ? (
            <div className="px-6 py-16 text-center">
              <p className="text-red-600 font-medium mb-1">Gagal mengambil data pesanan.</p>
              <p className="text-sm text-slate-500">{error}</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">{searchQuery ? 'Data pesanan tidak ditemukan.' : 'Belum ada data pesanan.'}</p>
            </div>
          ) : (
            // Area pembungkus yang bisa di-scroll ke bawah dan ke samping secara bersamaan
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">ID Pesanan</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">ID Pelanggan</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Pelanggan</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Nama Produk</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Tanggal Masuk</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Deadline</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Jumlah</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Tingkat Kesulitan</th>
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Status</th>
                    <th className="px-6 py-4 text-right whitespace-nowrap bg-slate-50">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredOrders.map((order: any) => (
                    <tr key={order.id_pesanan || order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {formatIdPesanan(order.id_pesanan || order.id)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">
                        {formatIdPelanggan(order.pelanggan?.id_pelanggan || order.pelangganId || order.id_pelanggan)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700 whitespace-nowrap">{order.pelanggan?.nama || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{order.nama_produk || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-900 font-medium whitespace-nowrap">{toDateDisplay(order.tanggal_masuk)}</td>
                      <td className="px-6 py-4 text-sm text-slate-900 font-medium whitespace-nowrap">{toDateDisplay(order.deadline)}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{order.jumlah ?? '-'} pcs</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${difficultyBadgeClass[order.tingkat_kesulitan] || 'bg-slate-100 text-slate-700'}`}>
                          {difficultyLabel[order.tingkat_kesulitan] || order.tingkat_kesulitan || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass[order.status] || 'bg-slate-100 text-slate-700'}`}>
                          {statusLabel[order.status] || order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-1.5 text-slate-400 cursor-default rounded-lg transition-colors" title="Hanya Lihat" disabled>
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
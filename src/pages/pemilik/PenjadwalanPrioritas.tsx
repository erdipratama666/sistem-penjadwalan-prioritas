import React, { useState } from 'react';
import { Play, Search } from 'lucide-react';
import { apiRequest } from '../../api/api';

const difficultyRank = (difficulty: string) => {
  switch ((difficulty || '').toUpperCase().trim()) {
    case 'SULIT': return 1;
    case 'SEDANG': return 2;
    case 'MUDAH': return 3;
    default: return 4;
  }
};

const parseDate = (value: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value: string) => {
  const date = parseDate(value);
  return date ? date.toLocaleDateString('id-ID') : value || '-';
};

const normalizeStatus = (status: string) => (status || '').toUpperCase().trim();

const isWaiting = (status: string) => {
  const cleanStatus = normalizeStatus(status);
  return cleanStatus === 'MENUNGGU' || cleanStatus === '';
};

const parseNumericId = (val: any): number => {
  if (!val && val !== 0) return 0;
  const cleaned = String(val).replace(/[^0-9]/g, '');
  return parseInt(cleaned, 10) || 0;
};

// Helper untuk mengidentifikasi Pelanggan secara unik
const getCustomerId = (order: any) => {
  return order.id_pelanggan || order.pelanggan?.id || order.pelanggan?.nama || order.nama_pelanggan || null;
};

// Label & Badge Styles
const statusBadgeClass: Record<string, string> = {
  MENUNGGU: 'bg-orange-100 text-orange-700 border border-orange-200/50',
  DALAM_PRODUKSI: 'bg-blue-100 text-blue-700 border border-blue-200/50',
  SELESAI: 'bg-emerald-100 text-emerald-700 border border-emerald-200/50',
};
const statusLabel: Record<string, string> = {
  MENUNGGU: 'Menunggu',
  DALAM_PRODUKSI: 'Dalam Produksi',
  SELESAI: 'Selesai',
};
const difficultyBadgeClass: Record<string, string> = {
  MUDAH: 'bg-emerald-100 text-emerald-700',
  SEDANG: 'bg-orange-100 text-orange-700',
  SULIT: 'bg-red-100 text-red-700',
};
const difficultyLabel: Record<string, string> = {
  MUDAH: 'Mudah',
  SEDANG: 'Sedang',
  SULIT: 'Sulit',
};

export default function PenjadwalanPrioritas({
  orders,
  onNavigate,
}: {
  orders: any[];
  onNavigate: (page: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  const safeOrders = Array.isArray(orders) ? orders : [];

  // =========================================================================
  // LOGIKA BARU: SELEKSI KANDIDAT (1 PESANAN PER PELANGGAN & CEK DALAM_PRODUKSI)
  // =========================================================================

  // 1. Cari pelanggan yang saat ini sudah memiliki pesanan berstatus 'DALAM_PRODUKSI'
  const activeCustomerIds = new Set(
    safeOrders
      .filter((order) => normalizeStatus(order.status) === 'DALAM_PRODUKSI')
      .map((order) => getCustomerId(order))
      .filter(Boolean)
  );

  // 2. Filter pesanan MENUNGGU, serta lewati pelanggan yang sedang punya pesanan DALAM_PRODUKSI
  const eligibleWaitingOrders = safeOrders.filter((order) => {
    if (!isWaiting(order.status)) return false;

    const custId = getCustomerId(order);
    // Jika pelanggan ini sedang memiliki pesanan DALAM_PRODUKSI, pesanan ini harus menunggu
    if (custId && activeCustomerIds.has(custId)) {
      return false;
    }
    return true;
  });

  // 3. Urutkan seluruh pesanan MENUNGGU berdasarkan kriteria mendesak (Greedy/Prioritas)
  //    (Deadline terdekat -> Jumlah tersedikit -> Tingkat Kesulitan -> Tanggal Masuk -> ID)
  const sortedWaitingOrders = [...eligibleWaitingOrders].sort((a, b) => {
    const timeA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const timeB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    if (timeA !== timeB) return timeA - timeB;

    const qtyA = Number(a.jumlah) || 0;
    const qtyB = Number(b.jumlah) || 0;
    if (qtyA !== qtyB) return qtyA - qtyB;

    const diffA = difficultyRank(a.tingkat_kesulitan);
    const diffB = difficultyRank(b.tingkat_kesulitan);
    if (diffA !== diffB) return diffA - diffB;

    const masukA = a.tanggal_masuk ? new Date(a.tanggal_masuk).getTime() : Infinity;
    const masukB = b.tanggal_masuk ? new Date(b.tanggal_masuk).getTime() : Infinity;
    if (masukA !== masukB) return masukA - masukB;

    return parseNumericId(a.id_pesanan || a.id) - parseNumericId(b.id_pesanan || b.id);
  });

  // 4. Ambil HANYA 1 PESANAN TERBAIK (paling prioritas) untuk setiap pelanggan
  const customerBestOrderMap = new Map<any, any>();
  sortedWaitingOrders.forEach((order) => {
    const custId = getCustomerId(order);
    if (custId) {
      if (!customerBestOrderMap.has(custId)) {
        customerBestOrderMap.set(custId, order);
      }
    } else {
      customerBestOrderMap.set(Symbol(), order);
    }
  });

  // 5. Hasil kandidat akhir yang akan ditampilkan di tabel kandidat
  const candidates = Array.from(customerBestOrderMap.values()).sort((a, b) => {
    const idA = parseNumericId(a.id_pesanan || a.id);
    const idB = parseNumericId(b.id_pesanan || b.id);
    return idA - idB;
  });

  // =========================================================================

  // LOGIKA PENCARIAN: Filter kandidat berdasarkan input pencarian
  const filteredCandidates = candidates.filter((order) => {
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    const idMatch = String(order.id_pesanan || order.id).toLowerCase().includes(term);
    const produkMatch = String(order.nama_produk || '').toLowerCase().includes(term);
    const pelangganMatch = String(order.pelanggan?.nama || '').toLowerCase().includes(term);

    return idMatch || produkMatch || pelangganMatch;
  });

  // Statistik kandidat
  const deadlineToday = candidates.filter((order) => {
    const parsed = parseDate(order.deadline);
    if (!parsed) return false;
    const today = new Date();
    return parsed.toDateString() === today.toDateString();
  }).length;

  const highDifficulty = candidates.filter((order) => difficultyRank(order.tingkat_kesulitan) === 1).length;
  const ready = candidates.length;

  const handleStartScheduling = async () => {
    setSubmitting(true);
    setError(null);

    const startTime = performance.now();

    try {
      await apiRequest('/api/generate-prioritas', {
        method: 'POST',
        body: JSON.stringify({ pesanan: candidates })
      });

      const endTime = performance.now();
      localStorage.setItem('greedy_time', (endTime - startTime).toFixed(2));

      onNavigate('priority-result');
    } catch (err) {
      console.error(err);

      try {
        const sortedCandidates = [...candidates].sort((a, b) => {
          const timeA = new Date(a.deadline).getTime();
          const timeB = new Date(b.deadline).getTime();
          if (timeA !== timeB) return timeA - timeB;

          const qtyA = Number(a.jumlah) || 0;
          const qtyB = Number(b.jumlah) || 0;
          if (qtyA !== qtyB) return qtyA - qtyB;

          const diffA = difficultyRank(a.tingkat_kesulitan);
          const diffB = difficultyRank(b.tingkat_kesulitan);
          if (diffA !== diffB) return diffA - diffB;

          const masukA = new Date(a.tanggal_masuk).getTime();
          const masukB = new Date(b.tanggal_masuk).getTime();
          return masukA - masukB;
        });

        const now = new Date().toISOString();
        const payload = sortedCandidates.map((order, index) => ({
          pesananId: parseNumericId(order.id || order.id_pesanan),
          urutan_prioritas: index + 1,
          tanggal_penjadwalan: now
        }));

        if (payload.length > 0) {
          await apiRequest('/Prioritas?id=gt.0', { method: 'DELETE' }).catch(() => console.log('Tabel prioritas kosong'));
          await apiRequest('/Prioritas', { method: 'POST', body: JSON.stringify(payload) });
        }

        const endTime = performance.now();
        localStorage.setItem('greedy_time', (endTime - startTime).toFixed(2));

        onNavigate('priority-result');
      } catch (fallbackErr) {
        setError(fallbackErr instanceof Error ? fallbackErr.message : 'Gagal menyimpan hasil penjadwalan prioritas.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto flex relative p-8">
      <div className="flex-1 flex flex-col gap-8 min-w-0 max-w-7xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-center justify-end w-full gap-4">
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={handleStartScheduling}
              disabled={submitting || candidates.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-6 font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 disabled:bg-blue-400"
            >
              <Play className="w-5 h-5" />
              {submitting ? 'Menjalankan Algoritma...' : 'Mulai Penjadwalan'}
            </button>
            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {[
            { title: 'Kandidat Pesanan', value: candidates.length },
            { title: 'Deadline Hari Ini', value: deadlineToday },
            { title: 'Kesulitan Tinggi', value: highDifficulty },
            { title: 'Siap Dijadwalkan', value: ready },
          ].map((card, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <p className="text-sm font-medium text-slate-500 mb-2">{card.title}</p>
              <h3 className="text-3xl font-bold text-slate-900">{card.value}</h3>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-visible flex flex-col min-h-[400px]">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tabel Kandidat</h3>
                <p className="text-sm text-slate-500">
                  Menampilkan 1 pesanan paling prioritas per pelanggan (status Menunggu).
                </p>
              </div>
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari ID, Pelanggan, atau Produk..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto w-full flex-1">
            <table className="w-full min-w-max text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">ID Pesanan</th>
                  <th className="px-6 py-4">Pelanggan</th>
                  <th className="px-6 py-4">Nama Produk</th>
                  <th className="px-6 py-4">Tanggal Masuk</th>
                  <th className="px-6 py-4">Deadline</th>
                  <th className="px-6 py-4">Jumlah</th>
                  <th className="px-6 py-4">Tingkat Kesulitan</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-sm text-slate-500 font-medium">
                      {candidates.length === 0
                        ? 'Belum ada pesanan berstatus Menunggu yang bisa dijadwalkan.'
                        : 'Tidak ada kandidat yang cocok dengan kata kunci pencarian Anda.'}
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((order) => {
                    const statusKey = normalizeStatus(order.status) || 'MENUNGGU';
                    const diffKey = (order.tingkat_kesulitan || 'MUDAH').toUpperCase();
                    return (
                      <tr key={order.id_pesanan || order.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          PSN-{String(parseNumericId(order.id_pesanan || order.id)).padStart(3, '0')}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700">{order.pelanggan?.nama || order.nama_pelanggan || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{order.nama_produk || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-900 font-medium">{formatDate(order.tanggal_masuk)}</td>
                        <td className="px-6 py-4 text-sm text-slate-900 font-medium">{formatDate(order.deadline)}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{order.jumlah ?? '-'} pcs</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${difficultyBadgeClass[diffKey] || 'bg-slate-100 text-slate-700'}`}>
                            {difficultyLabel[diffKey] || order.tingkat_kesulitan || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass[statusKey] || 'bg-slate-100 text-slate-700'}`}>
                            {statusLabel[statusKey] || order.status || 'Menunggu'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
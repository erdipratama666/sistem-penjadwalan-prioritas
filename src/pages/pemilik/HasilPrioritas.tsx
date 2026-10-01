import React, { useEffect, useState } from 'react';
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

const formatIdPesanan = (val: any) => {
  if (!val && val !== 0) return '-';
  const cleaned = String(val).replace(/[^0-9]/g, '');
  const num = parseInt(cleaned, 10) || 0;
  if (!num) return '-';
  return `PSN-${String(num).padStart(3, '0')}`;
};

export default function HasilPrioritas() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await apiRequest<any[]>(
          '/Prioritas?select=*,Pesanan(*,pelanggan:Pelanggan(*))&order=urutan_prioritas.asc',
          { method: 'GET' }
        );
        
        if (active) {
          const fetchedResults = Array.isArray(result) ? result : [];
          setResults(fetchedResults);

          // === BUKTI PERHITUNGAN DAN PERFORMA ALGORITMA GREEDY ===
          // Log hanya akan dicetak JIKA data ada dan timer performance ditemukan di localStorage
          const execTime = localStorage.getItem('greedy_time');
          
          if (fetchedResults.length > 0 && execTime) {
            console.log("%c=== BUKTI PERHITUNGAN ALGORITMA PENJADWALAN GREEDY ===", "color: #2563eb; font-weight: bold; font-size: 14px;");
            console.log(`%c[PERFORMA] Waktu Eksekusi Algoritma: ${execTime} ms`, "color: #059669; font-weight: bold; font-size: 13px;");
            console.log("Urutan Prioritas: 1. Deadline Terdekat -> 2. Jumlah Terdikit -> 3. Kesulitan Tersulit -> 4. Tanggal Masuk Awal");
            
            console.table(
              fetchedResults.map((item) => {
                const order = item.Pesanan || item.pesanan || {};
                return {
                  "Peringkat": `#${item.urutan_prioritas}`,
                  "ID Pesanan": formatIdPesanan(order.id_pesanan || order.id),
                  "[1] Deadline": formatDate(order.deadline),
                  "[2] Jumlah": `${order.jumlah || 0} pcs`,
                  "[3] Kesulitan": order.tingkat_kesulitan || '-',
                  "[4] Tgl Masuk": formatDate(order.tanggal_masuk)
                };
              })
            );
            console.log("%c===============================================================", "color: #2563eb; font-weight: bold;");
            
            // Hapus data dari localStorage setelah ditampilkan agar log tidak muncul dua kali
            // saat halaman di-refresh secara manual.
            localStorage.removeItem('greedy_time');
          }
          // =======================================================
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Gagal mengambil hasil prioritas.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    load();
    return () => { active = false; };
  }, []);

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col p-8">
      <div className="flex-1 flex flex-col gap-6 min-h-0 max-w-7xl w-full mx-auto">
        <div className="shrink-0">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Tabel Hasil Prioritas</h2>
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-0 overflow-hidden">
          {loading ? (
            <div className="px-6 py-16 text-center text-slate-500 font-medium">
              Memuat hasil prioritas...
            </div>
          ) : error ? (
            <div className="px-6 py-16 text-center">
              <p className="text-red-600 font-medium mb-1">Gagal mengambil hasil prioritas.</p>
              <p className="text-sm text-slate-500">{error}</p>
            </div>
          ) : results.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-500 font-medium">
              Belum ada hasil penjadwalan. Silakan jalankan penjadwalan terlebih dahulu.
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
                    <th className="px-6 py-4 whitespace-nowrap bg-slate-50">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {results.map((item) => {
                    const order = item.Pesanan || item.pesanan || {};
                    const statusKey = (order.status || '').toUpperCase();
                    const diffKey = (order.tingkat_kesulitan || '').toUpperCase();

                    return (
                      <tr key={item.id_prioritas || item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-blue-600 text-center whitespace-nowrap">
                          #{item.urutan_prioritas}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900 whitespace-nowrap">
                          {formatIdPesanan(order.id_pesanan || order.id)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-700 whitespace-nowrap">
                          {order.pelanggan?.nama || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">
                          {order.nama_produk || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 font-medium whitespace-nowrap">
                          {formatDate(order.tanggal_masuk)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 font-medium whitespace-nowrap">
                          {formatDate(order.deadline)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">
                          {order.jumlah ?? '-'} pcs
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${difficultyBadgeClass[diffKey] || 'bg-slate-100 text-slate-700'}`}>
                            {difficultyLabel[diffKey] || order.tingkat_kesulitan || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadgeClass[statusKey] || 'bg-slate-100 text-slate-700'}`}>
                            {statusLabel[statusKey] || order.status || '-'}
                          </span>
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
import React, { useState, useMemo } from 'react';
import { Download, Filter, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const normalizeStatus = (status: string) => {
  if (!status) return '';
  const upper = status.toUpperCase();
  if (upper === 'SELESAI') return 'Selesai';
  if (upper === 'DALAM_PRODUKSI') return 'Dalam Produksi';
  if (upper === 'MENUNGGU') return 'Menunggu';
  return status;
};

const parseDate = (value: any) => {
  if (!value) return null;
  if (typeof value === 'string' && value.includes('/')) {
    const [day, month, year] = value.split('/');
    const parsed = new Date(`${year}-${month}-${day}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateDisplay = (value: any) => {
  const date = parseDate(value);
  if (!date) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

// Ambil tanggal pesan dari schema Prisma (tanggal_masuk), dengan cadangan nama field lain
const getTanggalPesan = (order: any) =>
  order.tanggal_masuk || order.tanggal_pesan || order.created_at || null;

const getNamaPelanggan = (order: any) =>
  order.nama_pelanggan ||
  order.pelanggan?.nama ||
  (typeof order.pelanggan === 'string' ? order.pelanggan : '-');

// "YYYY-MM" -> "Agustus 2026"
const formatMonthDisplay = (yyyyMM: string) => {
  if (!yyyyMM) return 'Semua Waktu';
  const [year, month] = yyyyMM.split('-'); // perbaikan: sebelumnya salah ketik "yyyMM"
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const toMonthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export default function Laporan({ orders = [] }: { orders?: any[] }) {
  const safeOrders = Array.isArray(orders) ? orders : [];

  const [selectedMonth, setSelectedMonth] = useState(''); // "YYYY-MM"
  const [statusFilter, setStatusFilter] = useState('Semua');

  // Filter + urutkan berdasarkan tanggal pesan
  const filteredOrders = useMemo(() => {
    return safeOrders
      .filter((order) => {
        const orderDate = parseDate(getTanggalPesan(order));

        if (selectedMonth) {
          if (!orderDate || toMonthKey(orderDate) !== selectedMonth) return false;
        }
        if (statusFilter !== 'Semua' && normalizeStatus(order.status) !== statusFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const da = parseDate(getTanggalPesan(a))?.getTime() ?? 0;
        const db = parseDate(getTanggalPesan(b))?.getTime() ?? 0;
        return da - db;
      });
  }, [safeOrders, selectedMonth, statusFilter]);

  // Kelompokkan per bulan (tiap bulan = 1 bagian/halaman baru di PDF)
  const groupedByMonth = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredOrders.forEach((order) => {
      const d = parseDate(getTanggalPesan(order));
      const key = d ? toMonthKey(d) : 'tanpa-tanggal';
      if (!groups[key]) groups[key] = [];
      groups[key].push(order);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredOrders]);

  const handleDownloadPdf = () => {
    if (filteredOrders.length === 0) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();

    groupedByMonth.forEach(([monthKey, monthOrders], groupIndex) => {
      if (groupIndex > 0) doc.addPage();

      const periode = monthKey === 'tanpa-tanggal' ? 'Tanggal tidak tercatat' : formatMonthDisplay(monthKey);

      // Kop surat
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('ZAMAL COLLECTION', pageWidth / 2, 18, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text('Laporan Rincian Transaksi Pesanan', pageWidth / 2, 25, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Periode: ${periode}`, pageWidth / 2, 31, { align: 'center' });
      doc.setLineWidth(0.6);
      doc.line(14, 35, pageWidth - 14, 35);

      // Ringkasan status
      const count = (s: string) => monthOrders.filter((o) => normalizeStatus(o.status) === s).length;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(
        `Total pesanan: ${monthOrders.length}   |   Menunggu: ${count('Menunggu')}   |   Dalam Produksi: ${count(
          'Dalam Produksi'
        )}   |   Selesai: ${count('Selesai')}`,
        14,
        41
      );

      autoTable(doc, {
        startY: 45,
        head: [['No.', 'ID Pesanan', 'Nama Pelanggan', 'Tanggal Pesan', 'Deadline', 'Status']],
        body: monthOrders.map((order, i) => [
          i + 1,
          order.id_pesanan || '-',
          getNamaPelanggan(order),
          formatDateDisplay(getTanggalPesan(order)),
          formatDateDisplay(order.deadline),
          normalizeStatus(order.status),
        ]),
        styles: { fontSize: 9, cellPadding: 2.5 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        columnStyles: { 0: { halign: 'center', cellWidth: 12 } },
        margin: { left: 14, right: 14 },
      });
    });

    // Nomor halaman + tanggal cetak
    const totalPages = doc.getNumberOfPages();
    const printedAt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date());
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Dicetak: ${printedAt}`, 14, 289);
      doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - 14, 289, { align: 'right' });
    }

    const namaFile = selectedMonth ? `Laporan-Pesanan-${selectedMonth}.pdf` : 'Laporan-Pesanan-Semua-Bulan.pdf';
    doc.save(namaFile);
  };

  return (
    <div className="flex-1 overflow-auto flex relative p-8 bg-slate-50">
      <div className="flex-1 flex flex-col gap-6 min-w-0 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Laporan Pesanan</h2>
            <p className="text-slate-500">Filter dan unduh rincian data transaksi pesanan pelanggan dalam bentuk PDF.</p>
          </div>
          <button
            onClick={handleDownloadPdf}
            disabled={filteredOrders.length === 0}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-2.5 px-5 font-semibold flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <Download className="w-5 h-5" />
            Unduh PDF
          </button>
        </div>

        {/* Filter */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Pilih Bulan
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
              <Filter className="w-3 h-3" /> Status Pesanan
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
            >
              <option value="Semua">Semua Status</option>
              <option value="Menunggu">Menunggu</option>
              <option value="Dalam Produksi">Dalam Produksi</option>
              <option value="Selesai">Selesai</option>
            </select>
          </div>

          <button
            onClick={() => {
              setSelectedMonth('');
              setStatusFilter('Semua');
            }}
            className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Reset Filter
          </button>
        </div>

        {/* Pratinjau data */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col mt-2">
          <div className="px-6 py-3 border-b border-slate-200 text-sm font-semibold text-slate-700">
            Periode: {formatMonthDisplay(selectedMonth)} &middot; {filteredOrders.length} pesanan
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="px-6 py-4 w-16 text-center">No.</th>
                  <th className="px-6 py-4">ID Pesanan</th>
                  <th className="px-6 py-4">Nama Pelanggan</th>
                  <th className="px-6 py-4">Tanggal Pesan</th>
                  <th className="px-6 py-4">Deadline</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order, index) => (
                    <tr key={order.id_pesanan ?? index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-500 text-center">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{order.id_pesanan || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{getNamaPelanggan(order)}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{formatDateDisplay(getTanggalPesan(order))}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{formatDateDisplay(order.deadline)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            normalizeStatus(order.status) === 'Selesai'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : normalizeStatus(order.status) === 'Dalam Produksi'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {normalizeStatus(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">
                      Tidak ada data pesanan pada periode / filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
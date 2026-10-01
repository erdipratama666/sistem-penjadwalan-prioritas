import React from 'react';
import { ShoppingCart, Factory } from 'lucide-react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line } from 'recharts';

const parseOrderDate = (value: string) => {
  if (!value) return null;
  const parts = value.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return new Date(`${year}-${month}-${day}`);
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatChartLabel = (date: Date) => {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
};

const normalizeStatus = (status: string) => {
  if (!status) return '';
  const upper = status.toUpperCase();
  if (upper === 'SELESAI') return 'Selesai';
  if (upper === 'DALAM_PRODUKSI') return 'Dalam Produksi';
  if (upper === 'MENUNGGU') return 'Menunggu';
  return status;
};

export default function Dashboard({ orders = [] }: { orders?: any[] }) {
  const total = orders.length;
  const selesai = orders.filter((o) => normalizeStatus(o.status) === 'Selesai').length;

  // Menggunakan kolom tanggal_masuk yang sesuai dengan skema Supabase Pesanan
  const chartSource = orders
    .map((order) => ({ date: parseOrderDate(order.tanggal_masuk || order.deadline) }))
    .filter((item) => item.date && !Number.isNaN(item.date.getTime())) as { date: Date }[];

  // Urutkan data secara kronologis berdasarkan waktu
  chartSource.sort((a, b) => a.date.getTime() - b.date.getTime());

  const grouped: Record<string, { count: number; rawDate: Date }> = {};
  chartSource.forEach((item) => {
    const label = formatChartLabel(item.date);
    if (!grouped[label]) {
      grouped[label] = { count: 0, rawDate: item.date };
    }
    grouped[label].count += 1;
  });

  const chartData = Object.entries(grouped)
    .map(([name, data]) => ({
      name,
      orders: data.count,
      rawDate: data.rawDate,
    }))
    .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

  return (
    <div className="flex-1 overflow-auto flex">
      <div className="flex-1 p-8 flex flex-col gap-8 min-w-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: 'Total Pesanan', value: total, icon: <ShoppingCart className="text-blue-600 w-6 h-6" />, bg: 'bg-blue-50' },
            { title: 'Pesanan Selesai', value: selesai, icon: <Factory className="text-emerald-600 w-6 h-6" />, bg: 'bg-emerald-50' },
          ].map((card, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${card.bg}`}>
                {card.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{card.title}</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-2xl font-bold text-slate-900">{card.value}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Grafik Pesanan Masuk</h3>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="orders" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500">Belum ada data pesanan untuk ditampilkan pada grafik.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
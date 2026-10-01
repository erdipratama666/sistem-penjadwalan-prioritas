import React, { useState, useEffect } from 'react';
import { Search, Plus, ShoppingCart, Pencil, Trash2, X, AlertCircle, ChevronDown, CheckCircle } from 'lucide-react';
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

// Helper untuk mengekstrak angka murni dari string
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

type FormState = {
  id_pelanggan: string;
  nama_produk: string;
  tanggal_masuk: string;
  deadline: string;
  jumlah: string;
  tingkat_kesulitan: string;
  status: string;
};

const emptyForm: FormState = {
  id_pelanggan: '',
  nama_produk: '',
  tanggal_masuk: '',
  deadline: '',
  jumlah: '',
  tingkat_kesulitan: 'MUDAH',
  status: 'MENUNGGU',
};

export default function DataPesanan({
  onNavigate,
  customers,
  orders,
  setOrders,
}: {
  onNavigate: (page: string) => void;
  customers: any[];
  orders: any[];
  setOrders: any;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<FormState>>({});
  const [toastMessage, setToastMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // State Pelanggan
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  
  // === STATE BARU: Dropdown Produk ===
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  // State lokal mandiri agar data bisa direfresh otomatis
  const [localOrders, setLocalOrders] = useState<any[]>(Array.isArray(orders) ? orders : []);
  const [loading, setLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const result = await apiRequest<any[]>('/Pesanan?select=*,pelanggan:Pelanggan(*)&order=id.asc', {
        method: 'GET',
      });
      if (Array.isArray(result)) {
        setLocalOrders(result);
        if (setOrders) setOrders(result);
      }
    } catch (error) {
      console.error('Gagal mengambil data pesanan terbaru:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const sourceOrders = localOrders.length > 0 ? localOrders : (Array.isArray(orders) ? orders : []);

  // Urutkan data pesanan
  const sortedOrders = [...sourceOrders].sort((a, b) => {
    const idA = parseNumericId(a.id || a.id_pesanan);
    const idB = parseNumericId(b.id || b.id_pesanan);
    return idA - idB;
  });

  // Urutkan pelanggan
  const sortedCustomers = [...customers].sort((a, b) => {
    const idA = parseNumericId(a.id_pelanggan || a.id);
    const idB = parseNumericId(b.id_pelanggan || b.id);
    return idA - idB;
  });

  const filteredOrders = sortedOrders.filter((order: any) => {
    const query = searchQuery.toLowerCase();
    const orderId = order?.id_pesanan || order?.id;
    const formattedId = formatIdPesanan(orderId).toLowerCase();
    const rawId = String(orderId || '').toLowerCase();
    const nameMatch = String(order?.pelanggan?.nama || '').toLowerCase();
    return formattedId.includes(query) || rawId.includes(query) || nameMatch.includes(query);
  });

  const filteredDropdownCustomers = sortedCustomers.filter((c) => {
    const query = customerSearch.toLowerCase();
    const nameMatch = (c.nama || '').toLowerCase().includes(query);
    const idMatch = formatIdPelanggan(c.id_pelanggan || c.id).toLowerCase().includes(query);
    return nameMatch || idMatch;
  });

  const selectedCustomer = sortedCustomers.find(c => String(c.id_pelanggan || c.id) === formData.id_pelanggan);
  const selectedCustomerLabel = selectedCustomer 
    ? `${formatIdPelanggan(selectedCustomer.id_pelanggan || selectedCustomer.id)} - ${selectedCustomer.nama}`
    : 'Pilih Pelanggan';

  // === LOGIKA FILTER PRODUK ===
  // Mengambil daftar nama produk unik dari semua pesanan yang ada
  const existingProducts = Array.from(
    new Set(
      sourceOrders
        .map((o: any) => o.nama_produk)
        .filter((name) => typeof name === 'string' && name.trim() !== '')
    )
  ).sort();

  // Menyaring produk berdasarkan input teks yang diketik di formData
  const filteredProducts = existingProducts.filter((p) =>
    p.toLowerCase().includes(formData.nama_produk.toLowerCase())
  );
  // ============================

  const openAddModal = () => {
    setModalMode('add');
    setFormData(emptyForm);
    setFormErrors({});
    setCustomerSearch(''); 
    setIsCustomerDropdownOpen(false); 
    setIsProductDropdownOpen(false);
    setIsModalOpen(true);
  };

  const openEditModal = (order: any) => {
    setModalMode('edit');
    setSelectedOrder(order);
    const custId = order.pelanggan?.id_pelanggan || order.pelangganId || order.id_pelanggan || '';
    setFormData({
      id_pelanggan: String(custId),
      nama_produk: order.nama_produk || '',
      tanggal_masuk: toDateDisplay(order.tanggal_masuk),
      deadline: toDateDisplay(order.deadline),
      jumlah: String(order.jumlah ?? ''),
      tingkat_kesulitan: order.tingkat_kesulitan || 'MUDAH',
      status: order.status || 'MENUNGGU',
    });
    setFormErrors({});
    setCustomerSearch(''); 
    setIsCustomerDropdownOpen(false);
    setIsProductDropdownOpen(false);
    setIsModalOpen(true);
  };

  const openDeleteModal = (order: any) => {
    setSelectedOrder(order);
    setIsDeleteModalOpen(true);
  };

  const validate = () => {
    const errors: Partial<FormState> = {};
    const custIdNum = parseNumericId(formData.id_pelanggan);
    if (!custIdNum) errors.id_pelanggan = 'Pelanggan wajib dipilih.';
    if (!formData.nama_produk.trim()) errors.nama_produk = 'Nama produk wajib diisi.';
    if (!formData.tanggal_masuk) errors.tanggal_masuk = 'Tanggal masuk wajib diisi.';
    if (!formData.deadline) errors.deadline = 'Deadline wajib diisi.';
    if (!formData.jumlah || Number(formData.jumlah) <= 0) errors.jumlah = 'Jumlah pesanan wajib diisi.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const targetPelangganId = parseNumericId(formData.id_pelanggan);

      const payload = {
        pelangganId: targetPelangganId,
        nama_produk: formData.nama_produk.trim(),
        tanggal_masuk: new Date(formData.tanggal_masuk).toISOString(),
        deadline: new Date(formData.deadline).toISOString(),
        jumlah: parseInt(String(formData.jumlah), 10) || 1,
        tingkat_kesulitan: formData.tingkat_kesulitan,
        status: formData.status,
      };

      if (modalMode === 'add') {
        await apiRequest('/Pesanan', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast('Data pesanan berhasil disimpan.');
      } else {
        const orderIdNum = parseNumericId(selectedOrder?.id || selectedOrder?.id_pesanan);
        await apiRequest(`/Pesanan?id=eq.${orderIdNum}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        showToast('Data pesanan berhasil diperbarui.');
      }

      await fetchOrders(); 
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Gagal menyimpan pesanan:', error);
      showToast(error instanceof Error ? error.message : 'Gagal menyimpan data pesanan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const orderIdNum = parseNumericId(selectedOrder?.id || selectedOrder?.id_pesanan);
      await apiRequest(`/Pesanan?id=eq.${orderIdNum}`, { method: 'DELETE' });
      await fetchOrders(); 
      setIsDeleteModalOpen(false);
      showToast('Data pesanan berhasil dihapus.');
    } catch (error: any) {
      console.error('Gagal menghapus pesanan:', error);
      showToast(error instanceof Error ? error.message : 'Gagal menghapus data pesanan.');
    }
  };

  return (
    <div className="flex-1 overflow-auto flex relative p-8">
      <div className="flex-1 flex flex-col gap-6 min-w-0 max-w-7xl mx-auto">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Tabel Data Pesanan</h2>
            <p className="text-slate-500">Lihat dan kelola semua pesanan pelanggan.</p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 px-5 font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20"
          >
            <Plus className="w-5 h-5" />
            Tambah Pesanan
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-white">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama pelanggan"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading && localOrders.length === 0 ? (
              <div className="px-6 py-16 text-center text-slate-500 font-medium">Memuat data pesanan...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">{searchQuery ? 'Data pesanan tidak ditemukan.' : 'Belum ada data pesanan.'}</p>
                {!searchQuery && (
                  <button onClick={openAddModal} className="mt-4 text-blue-600 font-semibold hover:underline text-sm">
                    + Tambah Pesanan
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4 whitespace-nowrap">ID Pesanan</th>
                    <th className="px-6 py-4 whitespace-nowrap">ID Pelanggan</th>
                    <th className="px-6 py-4 whitespace-nowrap">Pelanggan</th>
                    <th className="px-6 py-4 whitespace-nowrap">Nama Produk</th>
                    <th className="px-6 py-4 whitespace-nowrap">Tanggal Masuk</th>
                    <th className="px-6 py-4 whitespace-nowrap">Deadline</th>
                    <th className="px-6 py-4 whitespace-nowrap">Jumlah</th>
                    <th className="px-6 py-4 whitespace-nowrap">Tingkat Kesulitan</th>
                    <th className="px-6 py-4 whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">Aksi</th>
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
                          <button onClick={() => openEditModal(order)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Pesanan">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => openDeleteModal(order)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus Pesanan">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal Tambah/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900">{modalMode === 'add' ? 'Tambah Pesanan' : 'Edit Pesanan'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              
              <div className="space-y-1 relative">
                <label className="text-sm font-semibold text-slate-700">Pelanggan</label>
                
                <div 
                  className={`w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 border ${formErrors.id_pelanggan ? 'border-red-300 ring-1 ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'} rounded-lg text-sm cursor-pointer`}
                  onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                >
                  <span className={formData.id_pelanggan ? 'text-slate-900' : 'text-slate-900'}>
                    {selectedCustomerLabel}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>

                {isCustomerDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden top-full left-0">
                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          autoFocus
                          placeholder="Cari nama pelanggan"
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                          onClick={(e) => e.stopPropagation()} 
                        />
                      </div>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto">
                      {filteredDropdownCustomers.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center">Pelanggan tidak ditemukan.</div>
                      ) : (
                        filteredDropdownCustomers.map((c) => {
                          const cid = String(c.id_pelanggan || c.id);
                          return (
                            <div
                              key={cid}
                              className="px-4 py-2 text-sm cursor-pointer hover:bg-slate-50 hover:text-blue-600 text-slate-700 transition-colors"
                              onClick={() => {
                                setFormData({ ...formData, id_pelanggan: cid });
                                setIsCustomerDropdownOpen(false);
                                setCustomerSearch('');
                              }}
                            >
                              {formatIdPelanggan(cid)} - {c.nama}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
                {isCustomerDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setIsCustomerDropdownOpen(false)}></div>}
                {formErrors.id_pelanggan && <p className="text-xs text-red-500 font-medium relative z-0">{formErrors.id_pelanggan}</p>}
              </div>

              {/* === MULAI PERUBAHAN NAMA PRODUK === */}
              <div className="space-y-1 relative">
                <label className="text-sm font-semibold text-slate-700">Nama Produk</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ketik atau pilih produk"
                    value={formData.nama_produk}
                    onChange={(e) => {
                      setFormData({ ...formData, nama_produk: e.target.value });
                      setIsProductDropdownOpen(true);
                    }}
                    onFocus={() => setIsProductDropdownOpen(true)}
                    className={`w-full px-4 py-2.5 pr-10 bg-slate-50 border ${formErrors.nama_produk ? 'border-red-300 ring-1 ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'} rounded-lg text-sm outline-none transition-all`}
                  />
                  <ChevronDown 
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors"
                    onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                  />
                </div>

                {isProductDropdownOpen && filteredProducts.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden top-full left-0 max-h-48 overflow-y-auto">
                    {filteredProducts.map((p, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 text-sm cursor-pointer hover:bg-slate-50 hover:text-blue-600 text-slate-700 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault(); 
                          setFormData({ ...formData, nama_produk: p });
                          setIsProductDropdownOpen(false);
                        }}
                      >
                        {p}
                      </div>
                    ))}
                  </div>
                )}
                {isProductDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setIsProductDropdownOpen(false)}></div>}
                {formErrors.nama_produk && <p className="text-xs text-red-500 font-medium relative z-0">{formErrors.nama_produk}</p>}
              </div>
              {/* === AKHIR PERUBAHAN NAMA PRODUK === */}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Tanggal Masuk</label>
                  <input
                    type="date"
                    value={formData.tanggal_masuk}
                    onChange={(e) => setFormData({ ...formData, tanggal_masuk: e.target.value })}
                    className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.tanggal_masuk ? 'border-red-300 ring-1 ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'} rounded-lg text-sm outline-none`}
                  />
                  {formErrors.tanggal_masuk && <p className="text-xs text-red-500 font-medium">{formErrors.tanggal_masuk}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Deadline</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.deadline ? 'border-red-300 ring-1 ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'} rounded-lg text-sm outline-none`}
                  />
                  {formErrors.deadline && <p className="text-xs text-red-500 font-medium">{formErrors.deadline}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Jumlah Pesanan</label>
                <input
                  type="number"
                  min={1}
                  value={formData.jumlah}
                  onChange={(e) => setFormData({ ...formData, jumlah: e.target.value })}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.jumlah ? 'border-red-300 ring-1 ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'} rounded-lg text-sm outline-none`}
                />
                {formErrors.jumlah && <p className="text-xs text-red-500 font-medium">{formErrors.jumlah}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Tingkat Kesulitan</label>
                  <div className="relative">
                    <select
                      value={formData.tingkat_kesulitan}
                      onChange={(e) => setFormData({ ...formData, tingkat_kesulitan: e.target.value })}
                      className="w-full appearance-none px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg text-sm outline-none cursor-pointer"
                    >
                      <option value="MUDAH">Mudah</option>
                      <option value="SEDANG">Sedang</option>
                      <option value="SULIT">Sulit</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Status</label>
                  <div className="relative">
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full appearance-none px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg text-sm outline-none cursor-pointer"
                    >
                      <option value="MENUNGGU">Menunggu</option>
                      <option value="DALAM_PRODUKSI">Dalam Produksi</option>
                      <option value="SELESAI">Selesai</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 disabled:bg-blue-400">
                {saving ? 'Menyimpan...' : modalMode === 'add' ? 'Simpan' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hapus */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Data Pesanan?</h3>
            <p className="text-sm text-slate-500 mb-6">Apakah Anda yakin ingin menghapus pesanan {formatIdPesanan(selectedOrder?.id_pesanan || selectedOrder?.id)}?</p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                Batal
              </button>
              <button onClick={handleDelete} className="flex-1 px-5 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm shadow-red-600/20">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <div className={`fixed bottom-8 right-8 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 transition-all duration-300 transform z-50 ${toastMessage ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        <CheckCircle className="w-5 h-5" />
        <span className="font-semibold text-sm">{toastMessage}</span>
      </div>
    </div>
  );
}
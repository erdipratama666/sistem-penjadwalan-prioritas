import React, { useState } from 'react';
import { Search, Plus, Pencil, Trash2, X, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { apiRequest } from '../../api/api';

const formatIdPelanggan = (val: any) => {
  if (!val && val !== 0) return '-';
  const cleanId = String(val).replace(/^PLG-/, '');
  return `PLG-${cleanId.padStart(3, '0')}`;
};

export default function DataPelanggan({ onNavigate, customers, setCustomers }: { onNavigate: (page: string) => void, customers: any[], setCustomers: any }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [formData, setFormData] = useState({ nama: '', alamat: '', no_hp: '' });
  const [formErrors, setFormErrors] = useState({ nama: '', alamat: '', no_hp: '' });
  
  // State untuk Toast Notification yang dinamis
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const sortedCustomers = [...customers].sort((a, b) => {
    return Number(a.id_pelanggan || 0) - Number(b.id_pelanggan || 0);
  });

  const filteredCustomers = sortedCustomers.filter(c => {
    const query = searchQuery.toLowerCase();
    const formattedId = formatIdPelanggan(c.id_pelanggan).toLowerCase();
    const rawId = String(c.id_pelanggan || '').toLowerCase();
    const name = String(c.nama || '').toLowerCase();

    return name.includes(query) || formattedId.includes(query) || rawId.includes(query);
  });

  const openAddModal = () => {
    setModalMode('add');
    setFormData({ nama: '', alamat: '', no_hp: '' });
    setFormErrors({ nama: '', alamat: '', no_hp: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (customer: any) => {
    setModalMode('edit');
    setSelectedCustomer(customer);
    setFormData({ nama: customer.nama || '', alamat: customer.alamat || '', no_hp: customer.no_hp ? String(customer.no_hp) : '' });
    setFormErrors({ nama: '', alamat: '', no_hp: '' });
    setIsModalOpen(true);
  };

  const openDeleteModal = (customer: any) => {
    setSelectedCustomer(customer);
    setIsDeleteModalOpen(true);
  };

  const fetchCustomers = async () => {
    try {
      const result = await apiRequest<any[]>('/Pelanggan?select=*&order=id_pelanggan.asc', {
        method: 'GET'
      });
      if (Array.isArray(result)) {
        setCustomers(result);
      }
    } catch (error) {
      console.error('Gagal mengambil data terbaru:', error);
    }
  };

  const handleSave = async () => {
    const cleanedNama = formData.nama.trim();
    const cleanedAlamat = formData.alamat.trim();
    
    // Membersihkan string no_hp agar murni angka
    const rawDigits = formData.no_hp.replace(/\D/g, '');
    const cleanedHp = rawDigits ? Number(rawDigits) : null;

    const errors = {
      nama: cleanedNama ? '' : 'Nama pelanggan wajib diisi.',
      alamat: cleanedAlamat ? '' : 'Alamat wajib diisi.',
      no_hp: (cleanedHp !== null && !isNaN(cleanedHp)) ? '' : 'Nomor HP wajib diisi dengan angka valid.'
    };

    setFormErrors(errors);

    const isValid = !errors.nama && !errors.alamat && !errors.no_hp;

    if (isValid) {
      
      // === LOGIKA PENGECEKAN DUPLIKASI DATA ===
      const isDuplicate = customers.some(customer => {
        // Jika mode edit, lewati pengecekan dengan data dirinya sendiri
        if (modalMode === 'edit' && customer.id_pelanggan === selectedCustomer.id_pelanggan) {
          return false; 
        }
        
        const existingNama = (customer.nama || '').trim().toLowerCase();
        const existingAlamat = (customer.alamat || '').trim().toLowerCase();
        const existingHp = customer.no_hp ? Number(customer.no_hp) : null;

        return (
          existingNama === cleanedNama.toLowerCase() &&
          existingAlamat === cleanedAlamat.toLowerCase() &&
          existingHp === cleanedHp
        );
      });

      // Hentikan proses simpan jika data sudah ada
      if (isDuplicate) {
        showToast('Data pelanggan dengan Nama, Alamat, dan No. HP yang sama sudah terdaftar!', 'error');
        return; 
      }
      // ==========================================

      try {
        if (modalMode === 'add') {
          const payload = {
            nama: cleanedNama,
            alamat: cleanedAlamat,
            no_hp: cleanedHp
          };

          await apiRequest('/Pelanggan', {
            method: 'POST',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify(payload),
          });

          showToast('Data pelanggan berhasil disimpan.', 'success');
        } else {
          await apiRequest(`/Pelanggan?id_pelanggan=eq.${selectedCustomer.id_pelanggan}`, {
            method: 'PATCH',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify({
              nama: cleanedNama,
              alamat: cleanedAlamat,
              no_hp: cleanedHp
            }),
          });

          showToast('Data pelanggan berhasil diperbarui.', 'success');
        }

        await fetchCustomers();
        setIsModalOpen(false);
      } catch (error) {
        console.error('Gagal menyimpan data pelanggan:', error);
        showToast(error instanceof Error ? error.message : 'Gagal menyimpan data pelanggan.', 'error');
      }
    }
  };

  const handleDelete = async () => {
    try {
      await apiRequest(`/Pelanggan?id_pelanggan=eq.${selectedCustomer.id_pelanggan}`, {
        method: 'DELETE',
      });

      await fetchCustomers();

      setIsDeleteModalOpen(false);
      showToast('Data pelanggan berhasil dihapus.', 'success');
    } catch (error) {
      console.error('Gagal menghapus data pelanggan:', error);
      showToast(error instanceof Error ? error.message : 'Gagal menghapus data pelanggan.', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-auto flex relative p-8">
      <div className="flex-1 flex flex-col gap-6 min-w-0 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Tabel Data Pelanggan</h2>
            <p className="text-slate-500">Menampilkan dan mengelola data pelanggan yang melakukan pemesanan produk di Zamal Collection.</p>
          </div>
          <button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 px-5 font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20">
            <Plus className="w-5 h-5" />
            Tambah Pelanggan
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
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4 w-16 text-center">No.</th>
                  <th className="px-6 py-4">ID Pelanggan</th>
                  <th className="px-6 py-4">Nama Pelanggan</th>
                  <th className="px-6 py-4">Alamat</th>
                  <th className="px-6 py-4">No. HP</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer, index) => (
                    <tr key={customer.id_pelanggan} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-500 text-center">{index + 1}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        {formatIdPelanggan(customer.id_pelanggan)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">{customer.nama}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 truncate max-w-[250px]">{customer.alamat}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{customer.no_hp ? `0${customer.no_hp}` : '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditModal(customer)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Pelanggan">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => openDeleteModal(customer)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">{searchQuery ? 'Data pelanggan tidak ditemukan.' : 'Belum ada data pelanggan.'}</p>
                      {!searchQuery && (
                        <button onClick={openAddModal} className="mt-4 text-blue-600 font-semibold hover:underline text-sm">
                          + Tambah Pelanggan
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Form Modal (Add/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xl font-bold text-slate-900">
                {modalMode === 'add' ? 'Tambah Pelanggan' : 'Edit Pelanggan'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Nama Pelanggan</label>
                <input 
                  type="text" 
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.nama ? 'border-red-300 ring-1 ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'} rounded-lg text-sm transition-all outline-none`} 
                />
                {formErrors.nama && <p className="text-xs text-red-500 font-medium">{formErrors.nama}</p>}
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">Alamat</label>
                <textarea 
                  rows={3}
                  value={formData.alamat}
                  onChange={(e) => setFormData({...formData, alamat: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.alamat ? 'border-red-300 ring-1 ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'} rounded-lg text-sm transition-all outline-none resize-none`} 
                ></textarea>
                {formErrors.alamat && <p className="text-xs text-red-500 font-medium">{formErrors.alamat}</p>}
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-700">No. HP</label>
                <input 
                  type="tel" 
                  value={formData.no_hp}
                  onChange={(e) => setFormData({...formData, no_hp: e.target.value})}
                  className={`w-full px-4 py-2.5 bg-slate-50 border ${formErrors.no_hp ? 'border-red-300 ring-1 ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'} rounded-lg text-sm transition-all outline-none`} 
                />
                {formErrors.no_hp && <p className="text-xs text-red-500 font-medium">{formErrors.no_hp}</p>}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                Batal
              </button>
              <button onClick={handleSave} className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20">
                {modalMode === 'add' ? 'Simpan' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Data Pelanggan?</h3>
            <p className="text-sm text-slate-500 mb-6">Apakah Anda yakin ingin menghapus data pelanggan ini? <br/><br/><span className="text-red-500 font-semibold">Peringatan:</span> Jika pelanggan ini memiliki data pesanan, maka pesanan tersebut juga akan ikut terhapus.</p>
            
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
      <div className={`fixed bottom-8 right-8 text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 transition-all duration-300 transform z-50 ${toastType === 'success' ? 'bg-emerald-600' : 'bg-red-600'} ${toastMessage ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
        {toastType === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        <span className="font-semibold text-sm">{toastMessage}</span>
      </div>

    </div>
  );
}
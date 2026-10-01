// src/utils/auth.ts

export const getCurrentUser = () => {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    try {
      return JSON.parse(savedUser);
    } catch (e) {
      console.error('Gagal memparsing data user dari localStorage:', e);
    }
  }
  
  // Fallback netral jika data user dari database belum tersimpan di localStorage
  const role = localStorage.getItem('role') || 'guest';
  return {
    name: role !== 'guest' ? role.charAt(0).toUpperCase() + role.slice(1) : 'Pengguna',
    username: `${role}_user`,
    role: role,
    email: '',
  };
};
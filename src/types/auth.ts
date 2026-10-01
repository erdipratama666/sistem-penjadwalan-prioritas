export type UserRole = 'admin' | 'pemilik' | 'produksi';

export interface UserRecord {
  id: number;
  id_user: string;
  nama: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginRequestBody {
  email?: string;
  username?: string;
  password?: string;
}
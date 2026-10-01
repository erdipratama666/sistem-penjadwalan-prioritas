// src/services/authService.ts

const API_BASE_URL = 'http://localhost:4000/api';

export interface UserData {
  id_user: string;
  name: string;
  email: string;
  role: 'admin' | 'pemilik' | 'produksi';
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: UserData;
}

export const loginApi = async (identifier: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Mengirim identifier (bisa berupa email atau username)
      body: JSON.stringify({
        email: identifier,
        password: password,
      }),
    });

    const data: LoginResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Gagal melakukan login.');
    }

    return data;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Tidak dapat terhubung ke server backend.',
    };
  }
};
import { apiClient, ApiResponse } from './client';

export interface AuthResponseData {
  user: {
    id: string | number;
    name: string;
    email: string;
    phone?: string;
    avatar?: string;
    restaurant_id?: string | number;
    role: string;
    permissions: string[];
  };
  token: string;
}

export const authApi = {
  login: async (email: string, password: string): Promise<ApiResponse<AuthResponseData>> => {
    const res = await apiClient.post<AuthResponseData>('/auth/login', { email, password });
    if (res.data?.token) {
      apiClient.setToken(res.data.token);
    }
    return res;
  },

  register: async (userData: {
    name: string;
    email: string;
    password: string;
    phone: string;
    role?: string;
  }): Promise<ApiResponse<AuthResponseData>> => {
    const res = await apiClient.post<AuthResponseData>('/auth/register', userData);
    if (res.data?.token) {
      apiClient.setToken(res.data.token);
    }
    return res;
  },

  me: async (): Promise<ApiResponse<AuthResponseData['user']>> => {
    return apiClient.get<AuthResponseData['user']>('/auth/me');
  },

  logout: async (): Promise<ApiResponse<null>> => {
    try {
      return await apiClient.post<null>('/auth/logout');
    } finally {
      apiClient.clearToken();
    }
  },
};

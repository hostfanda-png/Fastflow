import { apiClient, ApiResponse } from './client';
import { ProductCategory } from '../../types';

export const categoryApi = {
  getAll: async (): Promise<ApiResponse<ProductCategory[]>> => {
    return apiClient.get<ProductCategory[]>('/categories');
  },
};

import { apiClient, ApiResponse } from './client';
import { Product } from '../../types';

export const productApi = {
  create: async (restaurantId: string | number, productData: Partial<Product>): Promise<ApiResponse<Product>> => {
    return apiClient.post<Product>(`/owner/restaurants/${restaurantId}/products`, productData);
  },

  update: async (
    restaurantId: string | number,
    productId: string | number,
    productData: Partial<Product>
  ): Promise<ApiResponse<Product>> => {
    return apiClient.put<Product>(`/owner/restaurants/${restaurantId}/products/${productId}`, productData);
  },

  delete: async (restaurantId: string | number, productId: string | number): Promise<ApiResponse<null>> => {
    return apiClient.delete<null>(`/owner/restaurants/${restaurantId}/products/${productId}`);
  },

  toggleAvailability: async (restaurantId: string | number, productId: string | number): Promise<ApiResponse<{ is_available: boolean }>> => {
    return apiClient.patch<{ is_available: boolean }>(`/owner/restaurants/${restaurantId}/products/${productId}/toggle`);
  },
};

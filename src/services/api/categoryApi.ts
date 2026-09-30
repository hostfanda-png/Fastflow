import { apiClient, ApiResponse } from './client';
import { ProductCategory } from '../../types';

export const categoryApi = {
  // Public
  getAll: async (restaurantId?: string | number): Promise<ApiResponse<ProductCategory[]>> => {
    return apiClient.get<ProductCategory[]>('/categories', restaurantId ? { restaurant_id: restaurantId } : undefined);
  },

  // Owner endpoints
  getOwnerCategories: async (restaurantId: string | number): Promise<ApiResponse<ProductCategory[]>> => {
    return apiClient.get<ProductCategory[]>(`/owner/restaurants/${restaurantId}/categories`);
  },

  create: async (restaurantId: string | number, data: Partial<ProductCategory>): Promise<ApiResponse<ProductCategory>> => {
    return apiClient.post<ProductCategory>(`/owner/restaurants/${restaurantId}/categories`, data);
  },

  getById: async (restaurantId: string | number, categoryId: string | number): Promise<ApiResponse<ProductCategory>> => {
    return apiClient.get<ProductCategory>(`/owner/restaurants/${restaurantId}/categories/${categoryId}`);
  },

  update: async (
    restaurantId: string | number,
    categoryId: string | number,
    data: Partial<ProductCategory>
  ): Promise<ApiResponse<ProductCategory>> => {
    return apiClient.put<ProductCategory>(`/owner/restaurants/${restaurantId}/categories/${categoryId}`, data);
  },

  delete: async (restaurantId: string | number, categoryId: string | number): Promise<ApiResponse<null>> => {
    return apiClient.delete<null>(`/owner/restaurants/${restaurantId}/categories/${categoryId}`);
  },

  reorder: async (
    restaurantId: string | number,
    orders: Array<{ id: number | string; sort_order: number }>
  ): Promise<ApiResponse<null>> => {
    return apiClient.post<null>(`/owner/restaurants/${restaurantId}/categories/reorder`, { orders });
  },
};

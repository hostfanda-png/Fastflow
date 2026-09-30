import { apiClient, ApiResponse } from './client';
import { ProductAddon } from '../../types';

export const addonApi = {
  // Owner Addons
  getAll: async (restaurantId: string | number): Promise<ApiResponse<ProductAddon[]>> => {
    return apiClient.get<ProductAddon[]>(`/owner/restaurants/${restaurantId}/addons`);
  },

  create: async (restaurantId: string | number, data: Partial<ProductAddon>): Promise<ApiResponse<ProductAddon>> => {
    return apiClient.post<ProductAddon>(`/owner/restaurants/${restaurantId}/addons`, data);
  },

  update: async (
    restaurantId: string | number,
    addonId: string | number,
    data: Partial<ProductAddon>
  ): Promise<ApiResponse<ProductAddon>> => {
    return apiClient.put<ProductAddon>(`/owner/restaurants/${restaurantId}/addons/${addonId}`, data);
  },

  delete: async (restaurantId: string | number, addonId: string | number): Promise<ApiResponse<null>> => {
    return apiClient.delete<null>(`/owner/restaurants/${restaurantId}/addons/${addonId}`);
  },

  syncForProduct: async (
    restaurantId: string | number,
    productId: string | number,
    addonIds: Array<number | string>
  ): Promise<ApiResponse<ProductAddon[]>> => {
    return apiClient.post<ProductAddon[]>(`/owner/restaurants/${restaurantId}/products/${productId}/addons/sync`, {
      addon_ids: addonIds,
    });
  },
};

import { apiClient, ApiResponse } from './client';
import { Product, ProductVariant } from '../../types';

export const productApi = {
  // Public
  getPublicProducts: async (params?: {
    restaurant_id?: string | number;
    category_id?: string | number;
    search?: string;
  }): Promise<ApiResponse<{ data: Product[] } | Product[]>> => {
    return apiClient.get('/products', params);
  },

  // Owner Products
  getOwnerProducts: async (
    restaurantId: string | number,
    params?: { category_id?: string | number; is_available?: boolean; search?: string }
  ): Promise<ApiResponse<Product[]>> => {
    return apiClient.get<Product[]>(`/owner/restaurants/${restaurantId}/products`, params);
  },

  getById: async (restaurantId: string | number, productId: string | number): Promise<ApiResponse<Product>> => {
    return apiClient.get<Product>(`/owner/restaurants/${restaurantId}/products/${productId}`);
  },

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

  toggleAvailability: async (
    restaurantId: string | number,
    productId: string | number
  ): Promise<ApiResponse<{ is_available: boolean; id?: string | number }>> => {
    return apiClient.patch<{ is_available: boolean; id?: string | number }>(
      `/owner/restaurants/${restaurantId}/products/${productId}/toggle`
    );
  },

  uploadImage: async (
    restaurantId: string | number,
    productId: string | number,
    payload: { image_url?: string } | FormData
  ): Promise<ApiResponse<{ id: string | number; image: string }>> => {
    return apiClient.post<{ id: string | number; image: string }>(
      `/owner/restaurants/${restaurantId}/products/${productId}/image`,
      payload
    );
  },

  reorder: async (
    restaurantId: string | number,
    orders: Array<{ id: number | string; sort_order: number }>
  ): Promise<ApiResponse<null>> => {
    return apiClient.post<null>(`/owner/restaurants/${restaurantId}/products/reorder`, { orders });
  },

  // Variants
  getVariants: async (
    restaurantId: string | number,
    productId: string | number
  ): Promise<ApiResponse<ProductVariant[]>> => {
    return apiClient.get<ProductVariant[]>(`/owner/restaurants/${restaurantId}/products/${productId}/variants`);
  },

  createVariant: async (
    restaurantId: string | number,
    productId: string | number,
    data: Partial<ProductVariant>
  ): Promise<ApiResponse<ProductVariant>> => {
    return apiClient.post<ProductVariant>(`/owner/restaurants/${restaurantId}/products/${productId}/variants`, data);
  },

  updateVariant: async (
    restaurantId: string | number,
    productId: string | number,
    variantId: string | number,
    data: Partial<ProductVariant>
  ): Promise<ApiResponse<ProductVariant>> => {
    return apiClient.put<ProductVariant>(
      `/owner/restaurants/${restaurantId}/products/${productId}/variants/${variantId}`,
      data
    );
  },

  deleteVariant: async (
    restaurantId: string | number,
    productId: string | number,
    variantId: string | number
  ): Promise<ApiResponse<null>> => {
    return apiClient.delete<null>(
      `/owner/restaurants/${restaurantId}/products/${productId}/variants/${variantId}`
    );
  },
};

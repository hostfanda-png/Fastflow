import { apiClient, ApiResponse } from './client';
import { Restaurant } from '../../types';

export interface RestaurantFilterParams {
  search?: string;
  category?: string;
  cuisine?: string;
  city?: string;
  area?: string;
  open_now?: boolean;
  has_offers?: boolean;
  sort?: 'rating' | 'delivery_time' | 'delivery_fee';
}

export const restaurantApi = {
  getAll: async (params?: RestaurantFilterParams): Promise<ApiResponse<Restaurant[]>> => {
    return apiClient.get<Restaurant[]>('/restaurants', params);
  },

  getById: async (idOrSlug: string | number): Promise<ApiResponse<Restaurant>> => {
    return apiClient.get<Restaurant>(`/restaurants/${idOrSlug}`);
  },

  // Owner endpoints
  getOwnerRestaurants: async (): Promise<ApiResponse<Restaurant[]>> => {
    return apiClient.get<Restaurant[]>('/owner/restaurants');
  },

  getOwnerRestaurantDetails: async (restaurantId: string | number): Promise<ApiResponse<Restaurant>> => {
    return apiClient.get<Restaurant>(`/owner/restaurants/${restaurantId}`);
  },

  getOwnerOrders: async (restaurantId: string | number, status?: string): Promise<ApiResponse<any[]>> => {
    return apiClient.get<any[]>(`/owner/restaurants/${restaurantId}/orders`, { status: status || 'all' });
  },

  updateOrderStatus: async (
    restaurantId: string | number,
    orderId: string | number,
    status: string,
    note?: string
  ): Promise<ApiResponse<any>> => {
    return apiClient.put<any>(`/owner/restaurants/${restaurantId}/orders/${orderId}/status`, { status, note });
  },
};

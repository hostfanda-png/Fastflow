import { apiClient, ApiResponse } from './client';
import { Address, Order, AppNotification, FavoriteItem, Review } from '../../types';

export interface CustomerProfile {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  addresses?: Address[];
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unread_count: number;
  pagination: {
    current_page: number;
    total: number;
    per_page: number;
  };
}

export interface FavoritesResponse {
  restaurants: FavoriteItem[];
  products: FavoriteItem[];
}

export const customerApi = {
  getProfile: async (): Promise<ApiResponse<CustomerProfile>> => {
    return apiClient.get<CustomerProfile>('/auth/me');
  },

  updateProfile: async (data: Partial<CustomerProfile>): Promise<ApiResponse<CustomerProfile>> => {
    return apiClient.put<CustomerProfile>('/customer/profile', data);
  },

  changePassword: async (data: { current_password: string; password: string; password_confirmation: string }): Promise<ApiResponse<null>> => {
    return apiClient.post<null>('/customer/change-password', data);
  },

  deactivateAccount: async (password: string): Promise<ApiResponse<null>> => {
    return apiClient.post<null>('/customer/deactivate', { password });
  },

  getOrders: async (params?: { status?: string; per_page?: number; page?: number }): Promise<ApiResponse<{ orders: Order[]; pagination: any }>> => {
    return apiClient.get<{ orders: Order[]; pagination: any }>('/orders', params);
  },

  getOrderById: async (orderId: string | number): Promise<ApiResponse<Order>> => {
    return apiClient.get<Order>(`/orders/${orderId}`);
  },

  cancelOrder: async (orderId: string | number, reason: string): Promise<ApiResponse<Order>> => {
    return apiClient.post<Order>(`/orders/${orderId}/cancel`, { reason });
  },

  getAddresses: async (): Promise<ApiResponse<Address[]>> => {
    return apiClient.get<Address[]>('/customer/addresses');
  },

  addAddress: async (address: Omit<Address, 'id'>): Promise<ApiResponse<Address>> => {
    return apiClient.post<Address>('/customer/addresses', address);
  },

  updateAddress: async (addressId: string | number, address: Partial<Address>): Promise<ApiResponse<Address>> => {
    return apiClient.put<Address>(`/customer/addresses/${addressId}`, address);
  },

  deleteAddress: async (addressId: string | number): Promise<ApiResponse<null>> => {
    return apiClient.delete<null>(`/customer/addresses/${addressId}`);
  },

  setDefaultAddress: async (addressId: string | number): Promise<ApiResponse<Address>> => {
    return apiClient.put<Address>(`/customer/addresses/${addressId}/default`, {});
  },

  getFavorites: async (): Promise<ApiResponse<FavoritesResponse>> => {
    return apiClient.get<FavoritesResponse>('/customer/favorites');
  },

  toggleRestaurantFavorite: async (restaurantId: string | number): Promise<ApiResponse<{ is_favorite: boolean; restaurant_id?: number; favorite?: FavoriteItem }>> => {
    return apiClient.post<{ is_favorite: boolean; restaurant_id?: number; favorite?: FavoriteItem }>(`/customer/favorites/restaurants/${restaurantId}`, {});
  },

  toggleProductFavorite: async (productId: string | number): Promise<ApiResponse<{ is_favorite: boolean; product_id?: number; favorite?: FavoriteItem }>> => {
    return apiClient.post<{ is_favorite: boolean; product_id?: number; favorite?: FavoriteItem }>(`/customer/favorites/products/${productId}`, {});
  },

  getNotifications: async (params?: { per_page?: number; page?: number }): Promise<ApiResponse<NotificationsResponse>> => {
    return apiClient.get<NotificationsResponse>('/customer/notifications', params);
  },

  markNotificationRead: async (id: string): Promise<ApiResponse<AppNotification>> => {
    return apiClient.put<AppNotification>(`/customer/notifications/${id}/read`, {});
  },

  markAllNotificationsRead: async (): Promise<ApiResponse<null>> => {
    return apiClient.put<null>('/customer/notifications/read-all', {});
  },

  deleteNotification: async (id: string): Promise<ApiResponse<null>> => {
    return apiClient.delete<null>(`/customer/notifications/${id}`);
  },

  getReviews: async (): Promise<ApiResponse<Review[]>> => {
    return apiClient.get<Review[]>('/customer/reviews');
  },
};

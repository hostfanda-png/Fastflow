import { apiClient, ApiResponse } from './client';
import { Order } from '../../types';

export interface CheckoutPayload {
  restaurant_id: string | number;
  address_id?: string | number;
  idempotency_key?: string;
  delivery_address?: {
    street: string;
    area: string;
    city: string;
    lat?: number;
    lng?: number;
  };
  delivery_instructions?: string;
  payment_method: 'cod' | 'stripe' | 'wallet';
  coupon_code?: string;
  tip?: number;
  items?: Array<{
    product_id: string | number;
    quantity: number;
    variant_id?: string | number;
    addons?: any[];
    special_instructions?: string;
  }>;
}

export const orderApi = {
  checkout: async (payload: CheckoutPayload): Promise<ApiResponse<Order>> => {
    return apiClient.post<Order>('/orders/checkout', payload);
  },

  getAll: async (params?: { status?: string; per_page?: number; page?: number }): Promise<ApiResponse<{ orders: Order[]; pagination?: any } | Order[]>> => {
    return apiClient.get<{ orders: Order[]; pagination?: any } | Order[]>('/orders', params);
  },

  getById: async (idOrNumber: string | number): Promise<ApiResponse<Order>> => {
    return apiClient.get<Order>(`/orders/${idOrNumber}`);
  },

  cancel: async (orderId: string | number, reason?: string): Promise<ApiResponse<Order>> => {
    return apiClient.post<Order>(`/orders/${orderId}/cancel`, { reason });
  },
};

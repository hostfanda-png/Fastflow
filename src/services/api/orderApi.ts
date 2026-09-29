import { apiClient, ApiResponse } from './client';
import { Order } from '../../types';

export interface CheckoutPayload {
  restaurant_id: string | number;
  delivery_address: {
    street: string;
    area: string;
    city: string;
  };
  delivery_instructions?: string;
  payment_method: 'cod' | 'stripe' | 'wallet';
  coupon_code?: string;
  tip?: number;
  items: Array<{
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

  getAll: async (): Promise<ApiResponse<Order[]>> => {
    return apiClient.get<Order[]>('/orders');
  },

  getById: async (idOrNumber: string | number): Promise<ApiResponse<Order>> => {
    return apiClient.get<Order>(`/orders/${idOrNumber}`);
  },

  cancel: async (orderId: string | number, reason?: string): Promise<ApiResponse<Order>> => {
    return apiClient.post<Order>(`/orders/${orderId}/cancel`, { reason });
  },
};

import { apiClient, ApiResponse } from './client';
import { Coupon } from '../../types';

export const couponApi = {
  getAll: async (): Promise<ApiResponse<Coupon[]>> => {
    return apiClient.get<Coupon[]>('/coupons');
  },

  validate: async (code: string, subtotal: number, restaurantId?: string | number): Promise<ApiResponse<{ coupon: Coupon; discount: number; message: string }>> => {
    return apiClient.post('/coupons/validate', { code, subtotal, restaurant_id: restaurantId });
  },
};

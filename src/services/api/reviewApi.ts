import { apiClient, ApiResponse } from './client';
import { Review } from '../../types';

export const reviewApi = {
  getAll: async (params?: any): Promise<ApiResponse<Review[]>> => {
    return apiClient.get<Review[]>('/reviews', params);
  },

  submit: async (reviewData: {
    order_id: string | number;
    rating: number;
    food_rating: number;
    comment: string;
  }): Promise<ApiResponse<Review>> => {
    return apiClient.post<Review>('/reviews', reviewData);
  },
};

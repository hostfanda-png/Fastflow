import { apiClient, ApiResponse } from './client';

export interface CartPayload {
  product_id: string | number;
  quantity: number;
  variant_id?: string | number;
  selected_addons?: any[];
  special_instructions?: string;
  replace_cart?: boolean;
}

export const cartApi = {
  getCart: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/cart');
  },

  addItem: async (itemData: CartPayload): Promise<ApiResponse<any>> => {
    return apiClient.post('/cart/items', itemData);
  },

  updateQuantity: async (itemId: string | number, quantity: number): Promise<ApiResponse<any>> => {
    return apiClient.put(`/cart/items/${itemId}`, { quantity });
  },

  clearCart: async (): Promise<ApiResponse<null>> => {
    return apiClient.delete('/cart/clear');
  },
};

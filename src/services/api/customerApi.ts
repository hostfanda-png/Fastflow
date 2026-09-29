import { apiClient, ApiResponse } from './client';
import { Address, Order } from '../../types';

export interface CustomerProfile {
  id: string | number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  addresses?: Address[];
}

export const customerApi = {
  getProfile: async (): Promise<ApiResponse<CustomerProfile>> => {
    return apiClient.get<CustomerProfile>('/auth/me');
  },

  updateProfile: async (data: Partial<CustomerProfile>): Promise<ApiResponse<CustomerProfile>> => {
    return apiClient.put<CustomerProfile>('/customer/profile', data);
  },

  getOrders: async (): Promise<ApiResponse<Order[]>> => {
    return apiClient.get<Order[]>('/orders');
  },

  getOrderById: async (orderId: string | number): Promise<ApiResponse<Order>> => {
    return apiClient.get<Order>(`/orders/${orderId}`);
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
};

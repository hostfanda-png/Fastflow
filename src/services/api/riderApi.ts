import { apiClient, ApiResponse } from './client';

export const riderApi = {
  getAssignedOrders: async (): Promise<ApiResponse<{ rider: any; orders: any[] }>> => {
    return apiClient.get('/rider/orders');
  },

  updateStatus: async (status: 'available' | 'busy' | 'offline'): Promise<ApiResponse<any>> => {
    return apiClient.put('/rider/status', { status });
  },

  pickupOrder: async (orderId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.post(`/rider/orders/${orderId}/pickup`);
  },

  startDelivery: async (orderId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.post(`/rider/orders/${orderId}/start-delivery`);
  },

  deliverOrder: async (orderId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.post(`/rider/orders/${orderId}/deliver`);
  },
};

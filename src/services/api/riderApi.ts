import { apiClient, ApiResponse } from './client';

export interface RiderDashboardData {
  rider: {
    id: number | string;
    name: string;
    email?: string;
    phone?: string;
    vehicle_type: string;
    vehicle_number: string;
    status: 'available' | 'busy' | 'offline' | 'on_delivery' | 'suspended' | 'inactive';
    is_active: boolean;
    rating: number;
    commission_per_delivery: number;
    today_earnings: number;
    total_earnings: number;
    assigned_order_count: number;
    total_deliveries: number;
  };
  metrics: {
    today_deliveries: number;
    active_deliveries: number;
    today_earnings: number;
    total_earnings: number;
  };
  current_order: any | null;
}

export const riderApi = {
  getDashboard: async (): Promise<ApiResponse<RiderDashboardData>> => {
    return apiClient.get('/rider/dashboard');
  },

  getCurrentOrder: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/rider/orders/current');
  },

  getOrders: async (params?: { status?: string; page?: number; per_page?: number }): Promise<ApiResponse<any>> => {
    return apiClient.get('/rider/orders', params);
  },

  getAssignedOrders: async (): Promise<ApiResponse<{ rider: any; orders: any }>> => {
    return apiClient.get('/rider/orders');
  },

  updateStatus: async (status: 'available' | 'busy' | 'offline'): Promise<ApiResponse<any>> => {
    return apiClient.put('/rider/status', { status });
  },

  acceptOrder: async (orderId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.post(`/rider/orders/${orderId}/accept`);
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

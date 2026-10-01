import { apiClient, ApiResponse } from './client';

export interface CreateRiderPayload {
  name: string;
  email: string;
  phone: string;
  password?: string;
  vehicle_type: 'Motorcycle' | 'Bicycle' | 'Scooter' | 'Car';
  vehicle_number: string;
  commission_per_delivery?: number;
  status?: string;
}

export const adminApi = {
  getDashboardMetrics: async (): Promise<ApiResponse<{ metrics: Record<string, number> }>> => {
    return apiClient.get('/admin/dashboard');
  },

  getRestaurants: async (): Promise<ApiResponse<any[]>> => {
    return apiClient.get('/admin/restaurants');
  },

  setRestaurantStatus: async (restaurantId: string | number, status: string): Promise<ApiResponse<any>> => {
    return apiClient.put(`/admin/restaurants/${restaurantId}/status`, { status });
  },

  updateCommission: async (
    restaurantId: string | number,
    commissionRate: number,
    commissionType: 'percentage' | 'fixed' = 'percentage'
  ): Promise<ApiResponse<any>> => {
    return apiClient.put(`/admin/restaurants/${restaurantId}/commission`, {
      commission_rate: commissionRate,
      commission_type: commissionType,
    });
  },

  getRiders: async (params?: { status?: string; search?: string }): Promise<ApiResponse<any[]>> => {
    return apiClient.get('/admin/riders', params);
  },

  createRider: async (payload: CreateRiderPayload): Promise<ApiResponse<any>> => {
    return apiClient.post('/admin/riders', payload);
  },

  getRider: async (riderId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.get(`/admin/riders/${riderId}`);
  },

  updateRider: async (riderId: string | number, payload: Partial<CreateRiderPayload> & { is_active?: boolean; status?: string }): Promise<ApiResponse<any>> => {
    return apiClient.put(`/admin/riders/${riderId}`, payload);
  },

  deleteRider: async (riderId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.delete(`/admin/riders/${riderId}`);
  },

  assignRider: async (orderId: string | number, riderId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.post(`/admin/orders/${orderId}/assign-rider`, { rider_id: riderId });
  },

  unassignRider: async (orderId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.post(`/admin/orders/${orderId}/unassign-rider`);
  },

  autoDispatch: async (orderId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.post(`/admin/orders/${orderId}/auto-dispatch`);
  },

  getFinancials: async (): Promise<ApiResponse<any[]>> => {
    return apiClient.get('/admin/financials');
  },

  getAuditLogs: async (): Promise<ApiResponse<any[]>> => {
    return apiClient.get('/admin/audit-logs');
  },
};

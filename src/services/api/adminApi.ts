import { apiClient, ApiResponse } from './client';

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

  getRiders: async (): Promise<ApiResponse<any[]>> => {
    return apiClient.get('/admin/riders');
  },

  assignRider: async (orderId: string | number, riderId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.post(`/admin/orders/${orderId}/assign-rider`, { rider_id: riderId });
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

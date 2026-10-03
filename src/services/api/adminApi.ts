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

export interface AdminDashboardMetrics {
  total_gmv: number;
  today_gmv: number;
  total_commission: number;
  today_commission: number;
  total_orders: number;
  today_orders: number;
  cancelled_orders: number;
  delivered_orders: number;
  active_deliveries: number;
  total_restaurants: number;
  approved_restaurants: number;
  pending_restaurant_approvals: number;
  suspended_restaurants: number;
  rejected_restaurants: number;
  total_riders: number;
  active_riders: number;
  total_customers: number;
  active_customers: number;
  total_refunds: number;
  pending_settlements: number;
  pending_settlements_amount: number;
  completed_settlements: number;
  completed_settlements_amount: number;
  failed_payments: number;
}

export interface AdminCustomer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive' | 'suspended';
  orders_count: number;
  total_spent: number;
  created_at: string;
}

export interface DeliveryZonePayload {
  name: string;
  city: string;
  radius_km: number;
  base_fee: number;
  per_km_fee: number;
  is_active?: boolean;
}

export const adminApi = {
  getDashboardMetrics: async (): Promise<ApiResponse<{ metrics: AdminDashboardMetrics }>> => {
    return apiClient.get('/admin/dashboard');
  },

  getRestaurants: async (params?: { status?: string; search?: string; per_page?: number }): Promise<ApiResponse<any>> => {
    return apiClient.get('/admin/restaurants', params);
  },

  getRestaurant: async (restaurantId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.get(`/admin/restaurants/${restaurantId}`);
  },

  approveRestaurant: async (restaurantId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.post(`/admin/restaurants/${restaurantId}/approve`);
  },

  rejectRestaurant: async (restaurantId: string | number, reason?: string): Promise<ApiResponse<any>> => {
    return apiClient.post(`/admin/restaurants/${restaurantId}/reject`, { reason });
  },

  suspendRestaurant: async (restaurantId: string | number, reason?: string): Promise<ApiResponse<any>> => {
    return apiClient.post(`/admin/restaurants/${restaurantId}/suspend`, { reason });
  },

  reactivateRestaurant: async (restaurantId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.post(`/admin/restaurants/${restaurantId}/reactivate`);
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

  getOrders: async (params?: {
    search?: string;
    order_status?: string;
    payment_status?: string;
    restaurant_id?: string | number;
    customer_id?: string | number;
    rider_id?: string | number;
    date_from?: string;
    date_to?: string;
    per_page?: number;
    page?: number;
  }): Promise<ApiResponse<any>> => {
    return apiClient.get('/admin/orders', params);
  },

  getOrder: async (orderId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.get(`/admin/orders/${orderId}`);
  },

  getCustomers: async (params?: {
    search?: string;
    status?: string;
    per_page?: number;
    page?: number;
  }): Promise<ApiResponse<{ data: AdminCustomer[]; total: number; current_page: number }>> => {
    return apiClient.get('/admin/customers', params);
  },

  getCustomer: async (customerId: string | number): Promise<ApiResponse<any>> => {
    return apiClient.get(`/admin/customers/${customerId}`);
  },

  setCustomerStatus: async (customerId: string | number, status: 'active' | 'inactive' | 'suspended'): Promise<ApiResponse<any>> => {
    return apiClient.put(`/admin/customers/${customerId}/status`, { status });
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

  refundOrder: async (orderId: string | number, payload: { amount: number; reason: string }): Promise<ApiResponse<any>> => {
    return apiClient.post(`/admin/orders/${orderId}/refund`, payload);
  },

  collectCod: async (orderId: string | number, payload?: { reference?: string }): Promise<ApiResponse<any>> => {
    return apiClient.post(`/admin/orders/${orderId}/collect-cod`, payload || {});
  },

  getFinancials: async (): Promise<ApiResponse<any[]>> => {
    return apiClient.get('/admin/financials');
  },

  getSettlements: async (params?: { restaurant_id?: number | string; status?: string }): Promise<ApiResponse<any>> => {
    return apiClient.get('/admin/settlements', params);
  },

  createSettlement: async (payload: { restaurant_id: number | string; period_start: string; period_end: string; notes?: string }): Promise<ApiResponse<any>> => {
    return apiClient.post('/admin/settlements', payload);
  },

  markSettlementPaid: async (settlementId: number | string, payment_reference: string): Promise<ApiResponse<any>> => {
    return apiClient.put(`/admin/settlements/${settlementId}/pay`, { payment_reference });
  },

  getRefunds: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/admin/refunds');
  },

  getSettings: async (): Promise<ApiResponse<Record<string, string>>> => {
    return apiClient.get('/admin/settings');
  },

  updateSettings: async (settings: Record<string, any>): Promise<ApiResponse<Record<string, string>>> => {
    return apiClient.put('/admin/settings', { settings });
  },

  getDeliveryZones: async (): Promise<ApiResponse<any[]>> => {
    return apiClient.get('/admin/delivery-zones');
  },

  createDeliveryZone: async (zone: DeliveryZonePayload): Promise<ApiResponse<any>> => {
    return apiClient.post('/admin/delivery-zones', zone);
  },

  updateDeliveryZone: async (zoneId: number | string, zone: Partial<DeliveryZonePayload>): Promise<ApiResponse<any>> => {
    return apiClient.put(`/admin/delivery-zones/${zoneId}`, zone);
  },

  deleteDeliveryZone: async (zoneId: number | string): Promise<ApiResponse<any>> => {
    return apiClient.delete(`/admin/delivery-zones/${zoneId}`);
  },

  getAuditLogs: async (): Promise<ApiResponse<any[]>> => {
    return apiClient.get('/admin/audit-logs');
  },
};

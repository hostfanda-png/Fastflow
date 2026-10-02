import { apiClient, ApiResponse } from './client';

export interface PaymentIntentResponse {
  order_id: number;
  order_number: string;
  amount: number;
  currency: string;
  client_secret: string;
  publishable_key: string;
  intent_id: string;
}

export interface CustomerPaymentItem {
  id: number;
  order_id: number;
  order_number: string;
  payment_method: string;
  amount: number;
  refunded_amount: number;
  currency: string;
  status: string;
  transaction_id: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface FinancialMetrics {
  total_gross_volume: number;
  total_platform_commission: number;
  total_restaurant_payouts: number;
  total_delivery_fees: number;
  total_rider_payouts: number;
  total_refunded_amount: number;
  total_settled_amount: number;
  total_pending_settlement_amount: number;
  total_paid_orders: number;
  total_pending_cod_orders: number;
  total_refunded_orders: number;
  currency: string;
}

export interface RestaurantFinancialSummary {
  restaurant: {
    id: number;
    name: string;
    commission_rate: number;
  };
  metrics: {
    gross_sales: number;
    commission_deducted: number;
    net_earnings: number;
    pending_settlement: number;
    settled_payout: number;
    currency: string;
  };
  settlements: any[];
  recent_transactions: any[];
}

export const paymentApi = {
  createStripeIntent: async (orderId: string | number): Promise<ApiResponse<PaymentIntentResponse>> => {
    return apiClient.post<PaymentIntentResponse>('/payments/stripe/create-intent', { order_id: orderId });
  },

  getCustomerPaymentHistory: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/payments/history');
  },

  markCodCollected: async (orderId: string | number, reference?: string): Promise<ApiResponse<any>> => {
    return apiClient.post(`/orders/${orderId}/collect-cod`, { reference });
  },

  refundOrder: async (orderId: string | number, amount: number, reason: string): Promise<ApiResponse<any>> => {
    return apiClient.post(`/orders/${orderId}/refund`, { amount, reason });
  },

  getRestaurantFinancials: async (restaurantId: string | number, params?: any): Promise<ApiResponse<RestaurantFinancialSummary>> => {
    return apiClient.get(`/owner/restaurants/${restaurantId}/financials`, params);
  },

  getAdminFinancialAnalytics: async (params?: any): Promise<ApiResponse<{ metrics: FinancialMetrics; transactions: any }>> => {
    return apiClient.get('/admin/financials', params);
  },

  getSettlements: async (params?: any): Promise<ApiResponse<any>> => {
    return apiClient.get('/admin/settlements', params);
  },

  createSettlement: async (data: { restaurant_id: string | number; period_start: string; period_end: string; notes?: string }): Promise<ApiResponse<any>> => {
    return apiClient.post('/admin/settlements', data);
  },

  markSettlementPaid: async (settlementId: string | number, payment_reference: string): Promise<ApiResponse<any>> => {
    return apiClient.put(`/admin/settlements/${settlementId}/pay`, { payment_reference });
  },

  getRefunds: async (params?: any): Promise<ApiResponse<any>> => {
    return apiClient.get('/admin/refunds', params);
  },
};

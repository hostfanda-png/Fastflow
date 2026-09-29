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

export const paymentApi = {
  createStripeIntent: async (orderId: string | number): Promise<ApiResponse<PaymentIntentResponse>> => {
    return apiClient.post<PaymentIntentResponse>('/payments/stripe/create-intent', { order_id: orderId });
  },
};

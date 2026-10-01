import { apiClient, ApiResponse } from './client';
import { 
  Restaurant, 
  RestaurantDeliveryZone, 
  RestaurantHourSlot, 
  RestaurantDashboardMetrics,
  Cuisine,
  Product,
  ProductCategory
} from '../../types';

export interface RestaurantFilterParams {
  search?: string;
  category?: string;
  cuisine?: string;
  city?: string;
  area?: string;
  open_now?: boolean;
  has_offers?: boolean;
  sort?: 'rating' | 'delivery_time' | 'delivery_fee';
}

export interface OwnerRestaurantDashboardData {
  restaurant: {
    id: number | string;
    name: string;
    status: string;
    is_open: boolean;
    is_active: boolean;
    delivery_enabled: boolean;
    is_currently_open: boolean;
    rating: number;
    review_count: number;
  };
  metrics: RestaurantDashboardMetrics;
  recent_orders: Array<{
    id: number;
    order_number: string;
    customer_name: string;
    order_status: string;
    payment_status: string;
    items_count: number;
    grand_total: number;
    created_at: string;
  }>;
}

export const restaurantApi = {
  getAll: async (params?: RestaurantFilterParams): Promise<ApiResponse<Restaurant[]>> => {
    return apiClient.get<Restaurant[]>('/restaurants', params);
  },

  getById: async (idOrSlug: string | number): Promise<ApiResponse<Restaurant>> => {
    return apiClient.get<Restaurant>(`/restaurants/${idOrSlug}`);
  },

  getMenu: async (idOrSlug: string | number): Promise<ApiResponse<{ restaurant: any; categories: ProductCategory[]; products: Product[] }>> => {
    return apiClient.get<{ restaurant: any; categories: ProductCategory[]; products: Product[] }>(`/restaurants/${idOrSlug}/menu`);
  },

  // Central Cuisines
  getCuisines: async (): Promise<ApiResponse<Cuisine[]>> => {
    return apiClient.get<Cuisine[]>('/cuisines');
  },

  // Owner endpoints
  getOwnerRestaurants: async (): Promise<ApiResponse<Restaurant[]>> => {
    return apiClient.get<Restaurant[]>('/owner/restaurants');
  },

  apply: async (data: Record<string, any>): Promise<ApiResponse<Restaurant>> => {
    return apiClient.post<Restaurant>('/restaurant/apply', data);
  },

  getOwnerRestaurantDetails: async (restaurantId: string | number): Promise<ApiResponse<Restaurant>> => {
    return apiClient.get<Restaurant>(`/owner/restaurants/${restaurantId}`);
  },

  updateProfile: async (restaurantId: string | number, data: Record<string, any>): Promise<ApiResponse<Restaurant>> => {
    return apiClient.put<Restaurant>(`/owner/restaurants/${restaurantId}`, data);
  },

  getDashboard: async (restaurantId: string | number): Promise<ApiResponse<OwnerRestaurantDashboardData>> => {
    return apiClient.get<OwnerRestaurantDashboardData>(`/owner/restaurants/${restaurantId}/dashboard`);
  },

  uploadMedia: async (restaurantId: string | number, payload: { type: string; image_url?: string } | FormData): Promise<ApiResponse<any>> => {
    return apiClient.post<any>(`/owner/restaurants/${restaurantId}/media`, payload);
  },

  getHours: async (restaurantId: string | number): Promise<ApiResponse<{ hours: RestaurantHourSlot[]; is_currently_open: boolean }>> => {
    return apiClient.get<{ hours: RestaurantHourSlot[]; is_currently_open: boolean }>(`/owner/restaurants/${restaurantId}/hours`);
  },

  updateHours: async (restaurantId: string | number, hours: RestaurantHourSlot[]): Promise<ApiResponse<{ hours: RestaurantHourSlot[]; is_currently_open: boolean }>> => {
    return apiClient.put<{ hours: RestaurantHourSlot[]; is_currently_open: boolean }>(`/owner/restaurants/${restaurantId}/hours`, { hours });
  },

  getDeliveryZones: async (restaurantId: string | number): Promise<ApiResponse<RestaurantDeliveryZone[]>> => {
    return apiClient.get<RestaurantDeliveryZone[]>(`/owner/restaurants/${restaurantId}/delivery-zones`);
  },

  createDeliveryZone: async (restaurantId: string | number, data: Partial<RestaurantDeliveryZone>): Promise<ApiResponse<RestaurantDeliveryZone>> => {
    return apiClient.post<RestaurantDeliveryZone>(`/owner/restaurants/${restaurantId}/delivery-zones`, data);
  },

  updateDeliveryZone: async (restaurantId: string | number, zoneId: string | number, data: Partial<RestaurantDeliveryZone>): Promise<ApiResponse<RestaurantDeliveryZone>> => {
    return apiClient.put<RestaurantDeliveryZone>(`/owner/restaurants/${restaurantId}/delivery-zones/${zoneId}`, data);
  },

  deleteDeliveryZone: async (restaurantId: string | number, zoneId: string | number): Promise<ApiResponse<null>> => {
    return apiClient.delete<null>(`/owner/restaurants/${restaurantId}/delivery-zones/${zoneId}`);
  },

  getOwnerOrders: async (restaurantId: string | number, status?: string): Promise<ApiResponse<any[]>> => {
    return apiClient.get<any[]>(`/owner/restaurants/${restaurantId}/orders`, { status: status || 'all' });
  },

  updateOrderStatus: async (
    restaurantId: string | number,
    orderId: string | number,
    status: string,
    note?: string
  ): Promise<ApiResponse<any>> => {
    return apiClient.put<any>(`/owner/restaurants/${restaurantId}/orders/${orderId}/status`, { status, note });
  },

  getEligibleRiders: async (restaurantId: string | number): Promise<ApiResponse<any[]>> => {
    return apiClient.get<any[]>(`/owner/restaurants/${restaurantId}/eligible-riders`);
  },

  assignRider: async (
    restaurantId: string | number,
    orderId: string | number,
    riderId: string | number
  ): Promise<ApiResponse<any>> => {
    return apiClient.post<any>(`/owner/restaurants/${restaurantId}/orders/${orderId}/assign-rider`, { rider_id: riderId });
  },

  unassignRider: async (
    restaurantId: string | number,
    orderId: string | number
  ): Promise<ApiResponse<any>> => {
    return apiClient.post<any>(`/owner/restaurants/${restaurantId}/orders/${orderId}/unassign-rider`);
  },
};

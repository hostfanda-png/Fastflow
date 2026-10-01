export type UserRole = 
  | 'customer'
  | 'restaurant_owner'
  | 'restaurant_staff'
  | 'delivery_rider'
  | 'super_admin'
  | 'support_agent';

export type Permission =
  | 'admin.view'
  | 'admin.manage'
  | 'restaurant.view'
  | 'restaurant.create'
  | 'restaurant.update'
  | 'restaurant.delete'
  | 'restaurant.approve'
  | 'menu.view'
  | 'menu.create'
  | 'menu.update'
  | 'menu.delete'
  | 'order.view'
  | 'order.create'
  | 'order.update'
  | 'order.cancel'
  | 'rider.view'
  | 'rider.assign'
  | 'rider.manage'
  | 'customer.view'
  | 'customer.manage'
  | 'coupon.manage'
  | 'payment.manage'
  | 'report.view'
  | 'settings.manage';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar?: string;
  restaurantId?: string; // For restaurant owners and staff
  permissions: Permission[];
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready_for_pickup'
  | 'assigned_to_rider'
  | 'picked_up'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentMethod = 'cod' | 'stripe' | 'wallet';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface ProductVariant {
  id: string | number;
  product_id?: string | number;
  productId?: string;
  name: string;
  priceModifier?: number; // camelCase
  price_modifier?: number; // snake_case from backend
  is_active?: boolean;
  isActive?: boolean;
  sort_order?: number;
}

export interface ProductAddon {
  id: string | number;
  restaurant_id?: string | number;
  restaurantId?: string;
  name: string;
  price: number;
  is_available?: boolean;
  isAvailable?: boolean;
  is_active?: boolean;
  sort_order?: number;
  products_count?: number;
}

export interface Product {
  id: string;
  restaurantId?: string;
  restaurant_id?: string | number;
  categoryId?: string;
  category_id?: string | number;
  name: string;
  slug?: string;
  description: string;
  image: string;
  price: number;
  discountPrice?: number;
  discount_price?: number;
  compareAtPrice?: number;
  compare_at_price?: number;
  isAvailable: boolean;
  is_available?: boolean;
  sort_order?: number;
  preparationTime: number; // in minutes
  preparation_time?: number;
  taxRate?: number; // percentage
  tax_rate?: number;
  category?: ProductCategory;
  variants?: ProductVariant[];
  addons?: ProductAddon[];
}

export interface ProductCategory {
  id: string;
  restaurantId?: string;
  restaurant_id?: string | number | null;
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  image?: string;
  is_active?: boolean;
  sort_order?: number;
  products_count?: number;
  products?: Product[];
}

export interface RestaurantOpeningHours {
  open: string;
  close: string;
}

export interface RestaurantDeliveryZone {
  id: number | string;
  restaurant_id?: number | string;
  zone_name: string;
  delivery_fee: number;
  min_order: number;
  is_active?: boolean;
}

export interface RestaurantHourSlot {
  id?: number | string;
  restaurant_id?: number | string;
  day_of_week: string;
  open_time?: string;
  close_time?: string;
  open_time_2?: string | null;
  close_time_2?: string | null;
  is_closed: boolean;
}

export interface RestaurantDashboardMetrics {
  today_orders: number;
  today_revenue: number;
  pending_orders: number;
  preparing_orders: number;
  ready_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  average_order_value: number;
  active_menu_items: number;
}

export interface Cuisine {
  id: number;
  name: string;
  slug: string;
}

export type RestaurantStatus = 'approved' | 'pending' | 'suspended' | 'rejected';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo: string;
  coverImage: string;
  cover_image?: string;
  description: string;
  address: string;
  city: string;
  area: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  review_count?: number;
  deliveryFee: number;
  delivery_fee?: number;
  minimumOrder: number;
  minimum_order?: number;
  estimatedDeliveryTime: string;
  estimated_delivery_time?: string;
  isOpen: boolean;
  is_open?: boolean;
  is_active?: boolean;
  delivery_enabled?: boolean;
  isFeatured?: boolean;
  is_featured?: boolean;
  discountBadge?: string;
  discount_badge?: string;
  commissionRate: number;
  commission_rate?: number;
  commissionType: 'percentage' | 'fixed';
  commission_type?: 'percentage' | 'fixed';
  fixedCommissionAmount?: number;
  fixed_commission_amount?: number;
  status: RestaurantStatus;
  cuisines: any[];
  phone: string;
  email: string;
  openingHours?: Record<string, RestaurantOpeningHours>;
  serviceRadiusKm?: number;
  service_radius_km?: number;
  products?: Product[];
  hours?: RestaurantHourSlot[];
  deliveryZones?: RestaurantDeliveryZone[];
}

export interface CartItemAddon {
  addonId: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string; // Unique cart line item ID
  productId: string;
  productName: string;
  productImage: string;
  restaurantId: string;
  restaurantName: string;
  unitPrice: number;
  quantity: number;
  selectedVariant?: ProductVariant;
  selectedAddons: CartItemAddon[];
  specialInstructions?: string;
  itemTotal: number;
}

export interface Address {
  id: string;
  label: 'Home' | 'Work' | 'Other';
  street: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
  deliveryInstructions?: string;
  isDefault?: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variantName?: string;
  addons?: { name: string; price: number }[];
  instructions?: string;
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  actor?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "FD-20260929-00124"
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: Address;
  deliveryInstructions?: string;
  restaurantId: string;
  restaurantName: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode?: string;
  deliveryFee: number;
  tax: number;
  serviceFee: number;
  tip: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  estimatedDeliveryTime: string;
  cancellationReason?: string;
  hasBeenReviewed?: boolean;
}

export type RiderStatus = 'available' | 'busy' | 'offline' | 'on_delivery' | 'suspended' | 'inactive';

export interface Rider {
  id: string;
  userId: string;
  name: string;
  phone: string;
  photo?: string;
  vehicle: 'Motorcycle' | 'Bicycle' | 'Scooter' | 'Car';
  vehicleNumber: string;
  status: RiderStatus;
  isActive?: boolean;
  is_active?: boolean;
  currentLat?: number;
  currentLng?: number;
  assignedOrderCount: number;
  totalDeliveries: number;
  rating: number;
  todayEarnings: number;
  totalEarnings: number;
  commissionPerDelivery: number;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrder: number;
  maxDiscount?: number;
  restaurantId?: string; // Optional: specific to a restaurant
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  timesUsed: number;
  isActive: boolean;
  description: string;
}

export interface Review {
  id: string;
  orderId: string;
  restaurantId: string;
  customerName: string;
  rating: number; // 1-5
  foodRating: number; // 1-5
  comment: string;
  createdAt: string;
  isApproved: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  module: string;
  recordId?: string;
  ip: string;
  timestamp: string;
  details?: string;
}

export interface FinancialTransaction {
  id: string;
  orderId: string;
  orderNumber: string;
  restaurantId: string;
  restaurantName: string;
  grossAmount: number;
  platformCommission: number;
  restaurantPayout: number;
  deliveryFee: number;
  riderPayout: number;
  paymentGatewayFee: number;
  status: 'settled' | 'pending' | 'refunded';
  createdAt: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  city: string;
  radiusKm: number;
  baseFee: number;
  perKmFee: number;
  isActive: boolean;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  imageUrl: string;
  buttonText: string;
  buttonUrl?: string;
  isActive: boolean;
}

export interface CMSPage {
  slug: string;
  title: string;
  content: string;
  lastUpdated: string;
}

export interface SystemSettings {
  appName: string;
  currencyCode: string;
  currencySymbol: string;
  decimalPlaces: number;
  thousandSeparator: string;
  decimalSeparator: string;
  taxPercentage: number;
  serviceFee: number;
  baseDeliveryFee: number;
  defaultCommissionRate: number;
  activeLanguage: 'en' | 'ur' | 'ar';
}

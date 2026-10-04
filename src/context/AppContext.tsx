import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Restaurant, 
  Product, 
  ProductCategory, 
  CartItem, 
  Order, 
  Rider, 
  Coupon, 
  Review, 
  AuditLog, 
  FinancialTransaction, 
  DeliveryZone, 
  Banner, 
  CMSPage, 
  SystemSettings, 
  Permission, 
  OrderStatus, 
  Address,
  PaymentMethod,
  StatusHistoryEntry,
  OrderItem,
  FavoriteItem,
  AppNotification
} from '../types';
import { authApi } from '../services/api/authApi';
import { restaurantApi } from '../services/api/restaurantApi';
import { categoryApi } from '../services/api/categoryApi';
import { productApi } from '../services/api/productApi';
import { cartApi } from '../services/api/cartApi';
import { orderApi } from '../services/api/orderApi';
import { riderApi } from '../services/api/riderApi';
import { reviewApi } from '../services/api/reviewApi';
import { couponApi } from '../services/api/couponApi';
import { adminApi } from '../services/api/adminApi';
import { customerApi } from '../services/api/customerApi';
import { paymentApi } from '../services/api/paymentApi';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ReplaceCartModalState {
  isOpen: boolean;
  pendingItem: CartItem | null;
  currentRestaurantName: string;
  newRestaurantName: string;
}

interface AppContextType {
  // Loading & Error States
  isLoading: boolean;
  apiError: string | null;
  refreshData: () => Promise<void>;

  // Current user & authentication
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { name: string; email: string; password: string; phone: string; role?: string }) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;

  // Auth Modal State
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;

  // Restaurants & Menu
  restaurants: Restaurant[];
  categories: ProductCategory[];
  products: Product[];
  updateRestaurant: (restaurant: Restaurant) => void;
  setRestaurantStatus: (id: string, status: Restaurant['status']) => void;
  updateCommission: (id: string, rate: number, type: 'percentage' | 'fixed') => void;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  toggleProductAvailability: (productId: string) => Promise<void>;

  // Location & Addresses
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedArea: string;
  setSelectedArea: (area: string) => void;
  savedAddresses: Address[];
  currentAddress: Address | null;
  setCurrentAddress: (addr: Address | null) => void;
  addSavedAddress: (addr: Omit<Address, 'id'> | Address) => Promise<void>;
  deleteSavedAddress: (addressId: string) => Promise<void>;
  setDefaultSavedAddress: (addressId: string) => Promise<void>;

  // Favorites
  favorites: { restaurants: FavoriteItem[]; products: FavoriteItem[] };
  toggleFavoriteRestaurant: (restaurantId: string | number) => Promise<boolean>;
  toggleFavoriteProduct: (productId: string | number) => Promise<boolean>;

  // Notifications
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;

  // Cart
  cart: CartItem[];
  cartRestaurant: Restaurant | null;
  addToCart: (item: CartItem) => Promise<void>;
  updateCartQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  replaceCartModal: ReplaceCartModalState;
  confirmReplaceCart: () => Promise<void>;
  cancelReplaceCart: () => void;

  // Checkout & Pricing
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  riderTip: number;
  setRiderTip: (tip: number) => void;
  cartTotals: {
    subtotal: number;
    discount: number;
    deliveryFee: number;
    tax: number;
    serviceFee: number;
    tip: number;
    grandTotal: number;
  };
  placeOrder: (paymentMethod: PaymentMethod, instructions?: string) => Promise<Order>;

  // Orders
  orders: Order[];
  activeOrder: Order | null;
  setActiveOrder: (order: Order | null) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => Promise<void>;
  cancelOrder: (orderId: string, reason: string) => Promise<void>;
  refreshOrderStatus: (orderId: string) => Promise<void>;
  simulateOrderStep: (orderId: string) => Promise<void>;
  assignRiderToOrder: (orderId: string, riderId: string) => Promise<void>;
  unassignRiderFromOrder: (orderId: string) => Promise<void>;
  autoDispatchRider: (orderId: string) => Promise<boolean>;
  refundOrder: (orderId: string, amount: number, reason: string) => Promise<boolean>;
  collectCodPayment: (orderId: string, reference?: string) => Promise<boolean>;

  // Riders
  riders: Rider[];
  currentRider: Rider | null;
  updateRiderStatus: (riderId: string, status: Rider['status']) => Promise<void>;

  // Reviews
  reviews: Review[];
  addReview: (orderId: string, restaurantId: string, rating: number, foodRating: number, comment: string) => Promise<void>;
  toggleReviewApproval: (reviewId: string) => void;

  // Admin & Financials
  financials: FinancialTransaction[];
  coupons: Coupon[];
  addCoupon: (coupon: Coupon) => void;
  toggleCoupon: (couponId: string) => void;
  deliveryZones: DeliveryZone[];
  updateDeliveryZone: (zone: DeliveryZone) => void;
  auditLogs: AuditLog[];
  logAuditAction: (action: string, module: string, recordId?: string, details?: string) => void;
  banners: Banner[];
  cmsPages: CMSPage[];
  updateCMSPage: (slug: string, content: string) => void;

  // Settings & Localization
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  formatCurrency: (amount: number) => string;
  t: (key: string) => string;

  // Toast notifications
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  appName: 'Fastflow',
  currencyCode: 'PKR',
  currencySymbol: 'Rs.',
  decimalPlaces: 0,
  thousandSeparator: ',',
  decimalSeparator: '.',
  taxPercentage: 5,
  serviceFee: 25,
  baseDeliveryFee: 150,
  defaultCommissionRate: 15,
  activeLanguage: 'en',
};

export const mapServerAddress = (data: any): Address => {
  if (!data) throw new Error('Cannot map empty address');
  return {
    id: String(data.id || ''),
    label: data.label || 'Home',
    recipientName: data.recipient_name || data.recipientName,
    phone: data.phone || '',
    street: data.street || '',
    area: data.area || '',
    city: data.city || '',
    lat: Number(data.lat || 0),
    lng: Number(data.lng || 0),
    deliveryInstructions: data.delivery_instructions || data.deliveryInstructions || '',
    isDefault: Boolean(data.is_default ?? data.isDefault),
  };
};

export const mapServerOrder = (data: any): Order => {
  if (!data) throw new Error('Cannot map empty server order');

  const address = typeof data.delivery_address_json === 'string'
    ? (() => {
        try { return JSON.parse(data.delivery_address_json); }
        catch { return { street: data.delivery_address_json, area: '', city: '' }; }
      })()
    : data.delivery_address || data.deliveryAddress || {
        street: typeof data.delivery_address_json === 'object' ? data.delivery_address_json?.street || '' : '',
        area: typeof data.delivery_address_json === 'object' ? data.delivery_address_json?.area || '' : '',
        city: typeof data.delivery_address_json === 'object' ? data.delivery_address_json?.city || '' : '',
      };

  const rawHistory = data.status_histories || data.statusHistories || data.status_history || data.statusHistory || [];
  const mappedHistory: StatusHistoryEntry[] = Array.isArray(rawHistory)
    ? rawHistory.map((h: any) => ({
        status: h.status,
        timestamp: h.created_at || h.timestamp || '',
        note: h.note || undefined,
        actor: h.actor || undefined,
      }))
    : [];

  const rawItems = data.items || [];
  const mappedItems: OrderItem[] = Array.isArray(rawItems)
    ? rawItems.map((it: any) => ({
        id: String(it.id || ''),
        productId: String(it.product_id || it.productId || ''),
        productName: it.product_name || it.productName || it.name || '',
        quantity: Number(it.quantity || 1),
        unitPrice: Number(it.unit_price ?? it.unitPrice ?? 0),
        totalPrice: Number(it.subtotal ?? it.totalPrice ?? (Number(it.unit_price ?? it.unitPrice ?? 0) * Number(it.quantity || 1))),
        variantName: it.variant_name || it.variantName || undefined,
        addons: Array.isArray(it.addons)
          ? it.addons.map((a: any) => ({
              name: a.addon_name || a.name || '',
              price: Number(a.price || 0),
            }))
          : [],
        instructions: it.special_instructions || it.instructions || undefined,
      }))
    : [];

  const riderObj = data.rider;
  const riderName = riderObj?.user?.name || riderObj?.name || data.rider_name || data.riderName;
  const riderPhone = riderObj?.user?.phone || riderObj?.phone || data.rider_phone || data.riderPhone;

  return {
    id: String(data.id),
    orderNumber: data.order_number || data.orderNumber || '',
    customerId: String(data.customer_id || data.customerId || ''),
    customerName: data.customer_name || data.customerName || data.user?.name || '',
    customerPhone: data.customer_phone || data.customerPhone || '',
    deliveryAddress: {
      id: address.id || '',
      label: address.label || '',
      street: address.street || '',
      area: address.area || '',
      city: address.city || '',
      lat: Number(address.lat || 0),
      lng: Number(address.lng || 0),
      deliveryInstructions: data.delivery_instructions || data.deliveryInstructions || '',
    },
    deliveryInstructions: data.delivery_instructions || data.deliveryInstructions,
    restaurantId: String(data.restaurant_id || data.restaurantId || data.restaurant?.id || ''),
    restaurantName: data.restaurant?.name || data.restaurant_name || data.restaurantName || '',
    items: mappedItems,
    subtotal: Number(data.subtotal || 0),
    discount: Number(data.discount || 0),
    couponCode: data.coupon_code || data.couponCode,
    deliveryFee: Number(data.delivery_fee ?? data.deliveryFee ?? 0),
    tax: Number(data.tax || 0),
    serviceFee: Number(data.service_fee ?? data.serviceFee ?? 0),
    tip: Number(data.tip || 0),
    grandTotal: Number(data.grand_total ?? data.grandTotal ?? 0),
    paymentMethod: data.payment_method || data.paymentMethod || 'cod',
    paymentStatus: data.payment_status || data.paymentStatus || 'pending',
    orderStatus: data.order_status || data.orderStatus || 'pending',
    riderId: data.rider_id ? String(data.rider_id) : (data.riderId ? String(data.riderId) : undefined),
    riderName: data.rider_id ? riderName : undefined,
    riderPhone: data.rider_id ? riderPhone : undefined,
    statusHistory: mappedHistory,
    createdAt: data.created_at || data.createdAt || '',
    estimatedDeliveryTime: data.estimated_delivery_time || data.estimatedDeliveryTime || '',
    cancellationReason: data.cancellation_reason || data.cancellationReason,
    hasBeenReviewed: Boolean(data.has_been_reviewed ?? data.hasBeenReviewed),
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Loading & error state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Current active user & Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return typeof window !== 'undefined' && Boolean(localStorage.getItem('fastflow_auth_token'));
  });

  // Auth modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const openAuthModal = (mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  // Real Sanctum Auth Methods
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await authApi.login(email, password);
      if (!res.data?.token) {
        throw new Error(res.message || 'Authentication failed: No Sanctum token returned from server.');
      }

      // Verify token against GET /api/v1/auth/me and hydrate authoritative user/role/permissions
      let u = res.data.user;
      try {
        const meRes = await authApi.me();
        if (meRes.data) {
          u = meRes.data;
        }
      } catch {
        // Fallback to user payload returned from /auth/login if /auth/me fails transiently
      }

      if (u) {
        const mappedUser: User = {
          id: String(u.id),
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          avatar: u.avatar || '',
          role: u.role as any,
          permissions: (u.permissions || []) as any[],
          restaurantId: u.restaurant_id ? String(u.restaurant_id) : undefined,
        };
        setCurrentUser(mappedUser);
        setIsLoggedIn(true);
        showToast(`Welcome back, ${u.name}!`, 'success');
        await refreshData();
      }
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please check credentials.';
      showToast(msg, 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: { name: string; email: string; password: string; phone: string; role?: string }) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await authApi.register(userData);
      if (!res.data?.token) {
        throw new Error(res.message || 'Registration failed: No Sanctum token returned from server.');
      }

      let u = res.data.user;
      try {
        const meRes = await authApi.me();
        if (meRes.data) {
          u = meRes.data;
        }
      } catch {
        // Fallback to user payload returned from /auth/register
      }

      if (u) {
        const mappedUser: User = {
          id: String(u.id),
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          avatar: u.avatar || '',
          role: u.role as any,
          permissions: (u.permissions || []) as any[],
          restaurantId: u.restaurant_id ? String(u.restaurant_id) : undefined,
        };
        setCurrentUser(mappedUser);
        setIsLoggedIn(true);
        await refreshData();
      }
    } catch (err: any) {
      const msg = err.message || 'Registration failed.';
      showToast(msg, 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('fastflow_auth_token');
      setIsLoggedIn(false);
      setCurrentUser(null);
      showToast('Logged out successfully', 'info');
    }
  };

  // Check auth session on startup
  useEffect(() => {
    const token = localStorage.getItem('fastflow_auth_token');
    if (token) {
      authApi.me()
        .then((res) => {
          if (res.data) {
            const u = res.data;
            setCurrentUser({
              id: String(u.id),
              name: u.name,
              email: u.email,
              phone: u.phone || '',
              avatar: u.avatar || '',
              role: u.role as any,
              permissions: (u.permissions || []) as any[],
              restaurantId: u.restaurant_id ? String(u.restaurant_id) : undefined,
            });
            setIsLoggedIn(true);
          }
        })
        .catch(() => {
          localStorage.removeItem('fastflow_auth_token');
          setIsLoggedIn(false);
          setCurrentUser(null);
        });
    }

    const handleUnauthorized = () => {
      localStorage.removeItem('fastflow_auth_token');
      setIsLoggedIn(false);
      setCurrentUser(null);
      showToast('Session expired. Please sign in again.', 'error');
    };

    window.addEventListener('fastflow:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('fastflow:unauthorized', handleUnauthorized);
  }, []);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [financials, setFinancials] = useState<FinancialTransaction[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [cmsPages, setCmsPages] = useState<CMSPage[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);

  const logAuditAction = async (_action: string, _moduleName: string, _recordId?: string, _details?: string) => {
    if (currentUser?.role === 'super_admin') {
      try {
        const res = await adminApi.getAuditLogs();
        if (res.success && res.data) {
          setAuditLogs(Array.isArray(res.data) ? res.data : []);
        }
      } catch {
        // Handled gracefully
      }
    }
  };

  // Location & Addresses
  const [selectedCity, setSelectedCity] = useState('Lahore');
  const [selectedArea, setSelectedArea] = useState('Gulberg III');
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [currentAddress, setCurrentAddress] = useState<Address | null>(null);

  // Favorites & Notifications
  const [favorites, setFavorites] = useState<{ restaurants: FavoriteItem[]; products: FavoriteItem[] }>({
    restaurants: [],
    products: []
  });
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // Cart & Pricing
  const [cart, setCart] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [riderTip, setRiderTip] = useState<number>(0);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Replace cart modal state for single restaurant enforcement
  const [replaceCartModal, setReplaceCartModal] = useState<ReplaceCartModalState>({
    isOpen: false,
    pendingItem: null,
    currentRestaurantName: '',
    newRestaurantName: ''
  });

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper: check RBAC permission
  const hasPermission = (permission: Permission): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') return true;
    return currentUser.permissions.includes(permission);
  };

  // Fetch data from real Laravel API
  const refreshData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const hasToken = Boolean(localStorage.getItem('fastflow_auth_token'));
      const [restRes, catRes, coupRes, revRes] = await Promise.allSettled([
        restaurantApi.getAll({ city: selectedCity }),
        categoryApi.getAll(),
        couponApi.getAll(),
        reviewApi.getAll(),
      ]);

      if (restRes.status === 'rejected') {
        setApiError(
          restRes.reason?.message ||
            'Unable to connect to the Fastflow Laravel API. Ensure the backend server is running and VITE_API_URL is configured.'
        );
      } else if (restRes.value.data) {
        setRestaurants(Array.isArray(restRes.value.data) ? restRes.value.data : []);
      }

      if (catRes.status === 'fulfilled' && catRes.value.data) {
        setCategories(Array.isArray(catRes.value.data) ? catRes.value.data : []);
      }
      if (coupRes.status === 'fulfilled' && coupRes.value.data) {
        setCoupons(Array.isArray(coupRes.value.data) ? coupRes.value.data : []);
      }
      if (revRes.status === 'fulfilled' && revRes.value.data) {
        setReviews(Array.isArray(revRes.value.data) ? revRes.value.data : []);
      }

      // Synchronize authenticated user resources
      if (hasToken) {
        try {
          const [cartRes, ordRes, profRes, favRes, notifRes, addrRes] = await Promise.allSettled([
            cartApi.getCart(),
            orderApi.getAll(),
            customerApi.getProfile(),
            customerApi.getFavorites(),
            customerApi.getNotifications(),
            customerApi.getAddresses(),
          ]);

          if (cartRes.status === 'fulfilled' && cartRes.value.data) {
            syncCartState(cartRes.value.data);
          }

          if (ordRes.status === 'fulfilled' && ordRes.value.data) {
            const ordPayload: any = ordRes.value.data;
            const rawOrders = Array.isArray(ordPayload)
              ? ordPayload
              : Array.isArray(ordPayload.orders)
              ? ordPayload.orders
              : Array.isArray(ordPayload.data)
              ? ordPayload.data
              : [];
            setOrders(rawOrders.map(mapServerOrder));
          }

          if (addrRes.status === 'fulfilled' && addrRes.value.data) {
            const rawAddrs = Array.isArray(addrRes.value.data) ? addrRes.value.data : [];
            const mapped = rawAddrs.map(mapServerAddress);
            setSavedAddresses(mapped);
            const def = mapped.find((a) => a.isDefault) || mapped[0] || null;
            if (def) setCurrentAddress(def);
          } else if (profRes.status === 'fulfilled' && profRes.value.data?.addresses) {
            const rawAddrs = Array.isArray(profRes.value.data.addresses) ? profRes.value.data.addresses : [];
            const mapped = rawAddrs.map(mapServerAddress);
            setSavedAddresses(mapped);
            if (mapped.length > 0 && !currentAddress) {
              setCurrentAddress(mapped[0]);
            }
          }

          if (favRes.status === 'fulfilled' && favRes.value.data) {
            setFavorites({
              restaurants: favRes.value.data.restaurants || [],
              products: favRes.value.data.products || []
            });
          }

          if (notifRes.status === 'fulfilled' && notifRes.value.data) {
            setNotifications(notifRes.value.data.notifications || []);
            setUnreadNotificationsCount(notifRes.value.data.unread_count || 0);
          }
        } catch {
          // Handled gracefully
        }
      }
    } catch (err: any) {
      setApiError(err.message || 'Error fetching data from Fastflow API');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [selectedCity]);

  // Server Cart State Synchronizer
  const [serverCart, setServerCart] = useState<any>(null);

  const syncCartState = (serverCartData: any) => {
    if (!serverCartData) {
      setCart([]);
      setServerCart(null);
      return;
    }
    setServerCart(serverCartData);
    if (serverCartData.items && Array.isArray(serverCartData.items)) {
      const mappedItems: CartItem[] = serverCartData.items.map((it: any) => ({
        id: String(it.id),
        productId: String(it.product_id),
        restaurantId: String(serverCartData.restaurant?.id || ''),
        productName: it.product_name,
        productImage: it.product_image || '',
        unitPrice: it.unit_price,
        quantity: it.quantity,
        itemTotal: it.item_total,
        selectedVariant: it.variant ? { id: String(it.variant.id), name: it.variant.name, priceModifier: 0 } : undefined,
        selectedAddons: (it.addons || []).map((ad: any) => ({ addonId: String(ad.addon_id), name: ad.name, price: ad.price })),
        specialInstructions: it.special_instructions,
      }));
      setCart(mappedItems);
    } else {
      setCart([]);
    }
  };

  // Cart restaurant detection
  const cartRestaurant: Restaurant | null = useMemo(() => {
    if (serverCart?.restaurant && serverCart.restaurant.id) {
      const found = restaurants.find((r) => String(r.id) === String(serverCart.restaurant.id));
      if (found) return found;
      return {
        id: String(serverCart.restaurant.id),
        name: serverCart.restaurant.name || 'Restaurant',
        slug: '',
        logo: '',
        coverImage: '',
        description: '',
        address: '',
        city: selectedCity,
        area: '',
        lat: 0,
        lng: 0,
        rating: 0,
        reviewCount: 0,
        deliveryFee: Number(serverCart.restaurant.delivery_fee ?? settings.baseDeliveryFee),
        minimumOrder: Number(serverCart.restaurant.minimum_order ?? 0),
        estimatedDeliveryTime: '25-35 min',
        isOpen: true,
        status: 'approved' as const,
        isFeatured: false,
        commissionRate: 15,
        commissionType: 'percentage' as const,
        cuisines: [],
        phone: '',
        email: '',
        openingHours: {},
        serviceRadiusKm: 10,
      };
    }
    return cart.length > 0 ? restaurants.find((r) => String(r.id) === String(cart[0].restaurantId)) || null : null;
  }, [serverCart, restaurants, selectedCity, settings.baseDeliveryFee, cart]);

  // Add to cart with server authority and single restaurant enforcement
  const addToCart = async (newItem: CartItem) => {
    try {
      const res = await cartApi.addItem({
        product_id: newItem.productId,
        quantity: newItem.quantity,
        variant_id: newItem.selectedVariant?.id,
        selected_addons: newItem.selectedAddons.map(a => a.addonId),
        special_instructions: newItem.specialInstructions,
      });

      if (res.data) {
        syncCartState(res.data);
        showToast(`Added ${newItem.quantity}x ${newItem.productName} to bag`, 'success');
      }
    } catch (e: any) {
      if (e?.conflict) {
        setReplaceCartModal({
          isOpen: true,
          pendingItem: newItem,
          currentRestaurantName: e.current_restaurant?.name || 'Previous Restaurant',
          newRestaurantName: e.new_restaurant?.name || 'New Restaurant'
        });
        return;
      }
      showToast(e?.message || 'Failed to add dish to bag.', 'error');
    }
  };

  const confirmReplaceCart = async () => {
    if (replaceCartModal.pendingItem) {
      try {
        const res = await cartApi.addItem({
          product_id: replaceCartModal.pendingItem.productId,
          quantity: replaceCartModal.pendingItem.quantity,
          variant_id: replaceCartModal.pendingItem.selectedVariant?.id,
          selected_addons: replaceCartModal.pendingItem.selectedAddons.map(a => a.addonId),
          special_instructions: replaceCartModal.pendingItem.specialInstructions,
          replace_cart: true,
        });

        if (res.data) {
          syncCartState(res.data);
          setAppliedCoupon(null);
          showToast(`Bag replaced with items from ${replaceCartModal.newRestaurantName}`, 'info');
        }
      } catch (e: any) {
        showToast(e?.message || 'Failed to replace bag.', 'error');
      }
    }
    setReplaceCartModal({ isOpen: false, pendingItem: null, currentRestaurantName: '', newRestaurantName: '' });
  };

  const cancelReplaceCart = () => {
    setReplaceCartModal({ isOpen: false, pendingItem: null, currentRestaurantName: '', newRestaurantName: '' });
  };

  const updateCartQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }

    try {
      const res = await cartApi.updateQuantity(itemId, quantity);
      if (res.data) {
        syncCartState(res.data);
      }
    } catch (e: any) {
      showToast(e?.message || 'Failed to update item quantity.', 'error');
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      const res = await cartApi.updateQuantity(itemId, 0);
      if (res.data) {
        syncCartState(res.data);
      }
      showToast('Item removed from bag', 'info');
    } catch (e: any) {
      showToast(e?.message || 'Failed to remove item from bag.', 'error');
    }
  };

  const clearCart = async () => {
    try {
      await cartApi.clearCart();
      syncCartState(null);
      setAppliedCoupon(null);
      setRiderTip(0);
    } catch (e: any) {
      showToast(e?.message || 'Failed to clear bag.', 'error');
    }
  };

  // Authoritative server cart totals
  const cartTotals = serverCart ? {
    subtotal: (serverCart.subtotal || 0),
    discount: (serverCart.discount || 0),
    deliveryFee: (serverCart.delivery_fee || 0),
    tax: (serverCart.tax || 0),
    serviceFee: (serverCart.service_fee || 0),
    tip: (serverCart.tip || riderTip),
    grandTotal: (serverCart.grand_total || 0),
  } : {
    subtotal: cart.reduce((sum, item) => sum + item.itemTotal, 0),
    discount: 0,
    deliveryFee: cartRestaurant ? (cartRestaurant.deliveryFee ?? 120) : settings.baseDeliveryFee,
    tax: Math.round((cart.reduce((sum, item) => sum + item.itemTotal, 0) * settings.taxPercentage) / 100),
    serviceFee: cart.length > 0 ? settings.serviceFee : 0,
    tip: riderTip,
    grandTotal: Math.max(0, cart.reduce((sum, item) => sum + item.itemTotal, 0) + (cartRestaurant ? (cartRestaurant.deliveryFee ?? 120) : settings.baseDeliveryFee) + Math.round((cart.reduce((sum, item) => sum + item.itemTotal, 0) * settings.taxPercentage) / 100) + (cart.length > 0 ? settings.serviceFee : 0) + riderTip)
  };

  // Authoritative Server Coupon Application
  const applyCoupon = async (code: string) => {
    const cleanCode = code.trim().toUpperCase();

    try {
      const res = await cartApi.applyCoupon(cleanCode);
      if (res.data) {
        syncCartState(res.data);
        const applied = coupons.find(c => c.code.toUpperCase() === cleanCode) || {
          id: `coup-${cleanCode}`,
          code: cleanCode,
          discountType: 'percentage' as const,
          discountValue: 0,
          minOrder: 0,
          validFrom: '',
          validUntil: '',
          usageLimit: 100,
          timesUsed: 0,
          isActive: true,
          description: 'Applied Voucher'
        };
        setAppliedCoupon(applied);
        return { success: true, message: `Voucher '${cleanCode}' applied successfully!` };
      }
    } catch (e: any) {
      return { success: false, message: e.message || 'Invalid or expired promotional voucher code.' };
    }

    return { success: false, message: 'Invalid or expired promotional voucher code.' };
  };

  const removeCoupon = async () => {
    try {
      const res = await cartApi.removeCoupon();
      if (res.data) {
        syncCartState(res.data);
      }
      setAppliedCoupon(null);
      showToast('Voucher removed', 'info');
    } catch (e: any) {
      showToast(e?.message || 'Failed to remove voucher.', 'error');
    }
  };

  // Order placement via Server Authoritative OrderService / API
  const placeOrder = async (paymentMethod: PaymentMethod, instructions?: string): Promise<Order> => {
    if (cart.length === 0 || !cartRestaurant) {
      throw new Error('Bag is empty. Please add items before checking out.');
    }

    if (!currentUser) {
      openAuthModal('login');
      throw new Error('Please sign in to complete your order.');
    }

    if (!currentAddress) {
      throw new Error('Please select or add a delivery address to proceed.');
    }

    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `chk-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const payload = {
      restaurant_id: cartRestaurant.id,
      address_id: currentAddress.id && !currentAddress.id.startsWith('temp') ? currentAddress.id : undefined,
      idempotency_key: idempotencyKey,
      delivery_address: {
        street: currentAddress.street,
        area: currentAddress.area,
        city: currentAddress.city,
        lat: currentAddress.lat,
        lng: currentAddress.lng,
      },
      delivery_instructions: instructions || currentAddress.deliveryInstructions || currentAddress.delivery_instructions || '',
      payment_method: paymentMethod,
      coupon_code: appliedCoupon?.code,
      tip: cartTotals.tip,
    };

    const apiRes = await orderApi.checkout(payload as any);
    if (!apiRes || !apiRes.data) {
      throw new Error(apiRes?.message || 'Failed to place order on Fastflow server.');
    }
    const createdOrder: Order = mapServerOrder(apiRes.data);

    setOrders((prev) => [createdOrder, ...prev]);
    setActiveOrder(createdOrder);

    // Synchronize cleared server cart
    syncCartState(null);
    setAppliedCoupon(null);
    setRiderTip(0);

    return createdOrder;
  };

  // Update order status with server authority
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, note?: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    try {
      const res = await restaurantApi.updateOrderStatus(order.restaurantId, orderId, newStatus, note);
      if (res.success && res.data) {
        const authoritativeOrder = mapServerOrder(res.data);
        setOrders((prev) =>
          prev.map((ord) => (ord.id === orderId ? authoritativeOrder : ord))
        );
        if (activeOrder?.id === orderId) {
          setActiveOrder(authoritativeOrder);
        }
      } else {
        showToast(res.message || 'Failed to update order status on server', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to update order status on server', 'error');
    }
  };

  // Refresh live order status from backend
  const refreshOrderStatus = async (orderId: string) => {
    try {
      const res = await orderApi.getById(orderId);
      if (res.success && res.data) {
        const authoritativeOrder = mapServerOrder(res.data);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? authoritativeOrder : o))
        );
        if (activeOrder?.id === orderId) {
          setActiveOrder(authoritativeOrder);
        }
        showToast(`Refreshed order #${authoritativeOrder.orderNumber} status: ${authoritativeOrder.orderStatus.replace(/_/g, ' ')}`, 'info');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to refresh order status', 'error');
    }
  };

  const simulateOrderStep = async (orderId: string) => {
    await refreshOrderStatus(orderId);
  };

  const cancelOrder = async (orderId: string, reason: string) => {
    const ord = orders.find((o) => o.id === orderId);
    if (!ord) return;

    if (['picked_up', 'on_the_way', 'delivered'].includes(ord.orderStatus)) {
      showToast('Cannot cancel an order that has already been dispatched.', 'error');
      return;
    }

    try {
      const res = await orderApi.cancel(orderId, reason);
      if (res.success && res.data) {
        const authoritativeOrder = mapServerOrder(res.data);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? authoritativeOrder : o))
        );
        if (activeOrder?.id === orderId) setActiveOrder(authoritativeOrder);
        showToast(`Order ${ord.orderNumber} cancelled.`, 'info');
      } else if (res.success) {
        const ordRes = await orderApi.getById(orderId);
        if (ordRes.success && ordRes.data) {
          const authoritativeOrder = mapServerOrder(ordRes.data);
          setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? authoritativeOrder : o))
          );
          if (activeOrder?.id === orderId) setActiveOrder(authoritativeOrder);
        }
        showToast(`Order ${ord.orderNumber} cancelled.`, 'info');
      } else {
        showToast(res.message || 'Failed to cancel order on server', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to cancel order on server', 'error');
    }
  };

  // Assign courier with server authority
  const assignRiderToOrder = async (orderId: string, riderId: string) => {
    try {
      const res = await adminApi.assignRider(orderId, riderId);
      if (res.success && res.data) {
        const authoritativeOrder = mapServerOrder(res.data);
        setOrders((prev) =>
          prev.map((ord) => (ord.id === orderId ? authoritativeOrder : ord))
        );
        if (activeOrder?.id === orderId) {
          setActiveOrder(authoritativeOrder);
        }

        // Authoritatively re-fetch riders so server workloads are synchronized
        const riderRes = await adminApi.getRiders();
        if (riderRes.success && riderRes.data) {
          setRiders(Array.isArray(riderRes.data) ? riderRes.data : []);
        }

        showToast(res.message || 'Courier assigned to order successfully.', 'success');
      } else {
        showToast(res.message || 'Failed to assign courier on server', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to assign courier on server', 'error');
    }
  };

  const autoDispatchRider = async (orderId: string): Promise<boolean> => {
    try {
      const res = await adminApi.autoDispatch(orderId);
      if (res.success && res.data) {
        const authoritativeOrder = mapServerOrder(res.data);
        setOrders((prev) =>
          prev.map((ord) => (ord.id === orderId ? authoritativeOrder : ord))
        );
        if (activeOrder?.id === orderId) {
          setActiveOrder(authoritativeOrder);
        }

        const riderRes = await adminApi.getRiders();
        if (riderRes.success && riderRes.data) {
          setRiders(Array.isArray(riderRes.data) ? riderRes.data : []);
        }

        showToast(res.message || 'Courier auto-dispatched successfully.', 'success');
        return true;
      } else {
        showToast(res.message || 'Auto-dispatch failed on server', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Auto-dispatch failed on server', 'error');
    }
    return false;
  };

  const unassignRiderFromOrder = async (orderId: string) => {
    try {
      const res = await adminApi.unassignRider(orderId);
      if (res.success && res.data) {
        const authoritativeOrder = mapServerOrder(res.data);
        setOrders((prev) =>
          prev.map((ord) => (ord.id === orderId ? authoritativeOrder : ord))
        );
        if (activeOrder?.id === orderId) {
          setActiveOrder(authoritativeOrder);
        }

        // Authoritatively re-fetch riders so persistent server workloads are synced
        const riderRes = await adminApi.getRiders();
        if (riderRes.success && riderRes.data) {
          setRiders(Array.isArray(riderRes.data) ? riderRes.data : []);
        }

        showToast(res.message || 'Courier unassigned from order successfully.', 'info');
      } else {
        showToast(res.message || 'Failed to unassign courier on server', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to unassign courier on server', 'error');
    }
  };

  const refundOrder = async (orderId: string, amount: number, reason: string): Promise<boolean> => {
    try {
      const res = await paymentApi.refundOrder(orderId, amount, reason);
      if (res.success) {
        showToast(`Refund of PKR ${amount} processed successfully.`, 'success');
        const ordRes = await orderApi.getById(orderId);
        if (ordRes.success && ordRes.data) {
          const authoritativeOrder = mapServerOrder(ordRes.data);
          setOrders((prev) => prev.map((o) => (o.id === orderId ? authoritativeOrder : o)));
          if (activeOrder?.id === orderId) setActiveOrder(authoritativeOrder);
        }
        return true;
      } else {
        showToast(res.message || 'Refund failed on server', 'error');
        return false;
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Refund failed on server', 'error');
      return false;
    }
  };

  const collectCodPayment = async (orderId: string, reference?: string): Promise<boolean> => {
    try {
      const res = await paymentApi.markCodCollected(orderId, reference);
      if (res.success) {
        showToast('Cash on Delivery payment recorded as collected.', 'success');
        const ordRes = await orderApi.getById(orderId);
        if (ordRes.success && ordRes.data) {
          const authoritativeOrder = mapServerOrder(ordRes.data);
          setOrders((prev) => prev.map((o) => (o.id === orderId ? authoritativeOrder : o)));
          if (activeOrder?.id === orderId) setActiveOrder(authoritativeOrder);
        }
        return true;
      } else {
        showToast(res.message || 'Failed to record cash collection', 'error');
        return false;
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to record cash collection', 'error');
      return false;
    }
  };

  const currentRider = currentUser && currentUser.role === 'delivery_rider'
    ? riders.find((r) => r.userId === currentUser.id) || null
    : null;

  const updateRiderStatus = async (riderId: string, status: Rider['status']) => {
    try {
      const res = await riderApi.updateStatus(status as any);
      if (res.success && res.data) {
        // Authoritatively re-fetch riders from backend to update state without calculating
        const riderRes = await adminApi.getRiders();
        if (riderRes.success && riderRes.data) {
          setRiders(Array.isArray(riderRes.data) ? riderRes.data : []);
        }
        showToast(`Courier status set to ${res.data.status || status}`, 'info');
      } else {
        showToast(res.message || 'Failed to update status on server', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to update status on server', 'error');
    }
  };

  // Restaurant management
  const updateRestaurant = (updated: Restaurant) => {
    setRestaurants((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    logAuditAction('restaurant.update', 'Restaurants', String(updated.id), `Updated details for ${updated.name}`);
    showToast('Restaurant details updated successfully', 'success');
  };

  const setRestaurantStatus = async (id: string, status: Restaurant['status']) => {
    try {
      const res = await adminApi.setRestaurantStatus(id, status);
      if (res.success) {
        setRestaurants((prev) =>
          prev.map((r) => (String(r.id) === String(id) ? { ...r, status } : r))
        );
        logAuditAction(`restaurant.${status}`, 'Restaurants', id, `Changed partner status to ${status}`);
        showToast(`Restaurant status changed to ${status}`, 'info');
      } else {
        showToast(res.message || 'Failed to update restaurant status', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to update restaurant status', 'error');
    }
  };

  const updateCommission = async (id: string, rate: number, type: 'percentage' | 'fixed') => {
    try {
      const res = await adminApi.updateCommission(id, rate, type);
      if (res.success) {
        setRestaurants((prev) =>
          prev.map((r) => (String(r.id) === String(id) ? { ...r, commissionRate: rate, commissionType: type } : r))
        );
        logAuditAction('commission.update', 'Restaurants', id, `Updated commission to ${rate}${type === 'percentage' ? '%' : ' flat'}`);
        showToast('Commission rate updated', 'success');
      } else {
        showToast(res.message || 'Failed to update commission rate', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to update commission rate', 'error');
    }
  };

  // Product management (Strict Single Source of Truth)
  const addProduct = async (p: Omit<Product, 'id'>) => {
    const restId = p.restaurant_id || p.restaurantId || '';
    try {
      const res = await productApi.create(restId, p);
      if (res.success && res.data) {
        setProducts((prev) => [res.data, ...prev]);
        logAuditAction('menu.create', 'Menu', String(res.data.id), `Created dish ${res.data.name}`);
        showToast(`Added ${res.data.name} to menu`, 'success');
      } else {
        showToast(res.message || 'Failed to create dish on server', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to create dish on server', 'error');
    }
  };

  const updateProduct = async (updated: Product) => {
    const restId = updated.restaurant_id || updated.restaurantId || '';
    try {
      const res = await productApi.update(restId, updated.id, updated);
      if (res.success && res.data) {
        setProducts((prev) => prev.map((p) => (String(p.id) === String(updated.id) ? res.data : p)));
        logAuditAction('menu.update', 'Menu', String(updated.id), `Updated dish ${updated.name}`);
        showToast(`Updated ${updated.name}`, 'success');
      } else {
        showToast(res.message || 'Failed to update dish on server', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to update dish on server', 'error');
    }
  };

  const deleteProduct = async (productId: string) => {
    const prod = products.find((p) => String(p.id) === String(productId));
    if (!prod) return;
    const restId = prod.restaurant_id || prod.restaurantId || '';
    try {
      const res = await productApi.delete(restId, productId);
      if (res.success) {
        setProducts((prev) => prev.filter((p) => String(p.id) !== String(productId)));
        logAuditAction('menu.delete', 'Menu', productId, 'Deleted dish from catalog');
        showToast('Dish removed from menu', 'info');
      } else {
        showToast(res.message || 'Failed to delete dish on server', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to delete dish on server', 'error');
    }
  };

  const toggleProductAvailability = async (productId: string) => {
    const prod = products.find((p) => String(p.id) === String(productId));
    if (!prod) return;
    const restId = prod.restaurant_id || prod.restaurantId || '';
    try {
      const res = await productApi.toggleAvailability(restId, productId);
      if (res.success) {
        const isAvail = res.data?.is_available ?? !prod.isAvailable;
        setProducts((prev) =>
          prev.map((p) => (String(p.id) === String(productId) ? { ...p, isAvailable: isAvail, is_available: isAvail } : p))
        );
        showToast(`Dish marked as ${isAvail ? 'In Stock' : 'Sold Out'}`, 'info');
      } else {
        showToast(res.message || 'Failed to toggle availability on server', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to toggle availability on server', 'error');
    }
  };

  // Reviews
  const addReview = async (orderId: string, restaurantId: string, rating: number, foodRating: number, comment: string) => {
    try {
      const res = await reviewApi.submit({
        order_id: orderId,
        rating,
        food_rating: foodRating,
        comment,
      });
      if (res.success && res.data) {
        setReviews((prev) => [res.data, ...prev]);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, hasBeenReviewed: true } : o))
        );
        showToast('Thank you for rating your culinary experience!', 'success');
      } else {
        showToast(res.message || 'Failed to submit review', 'error');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to submit review', 'error');
    }
  };

  const toggleReviewApproval = (reviewId: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, isApproved: !r.isApproved } : r))
    );
    showToast('Review visibility updated', 'info');
  };

  // Coupons
  const addCoupon = (c: Coupon) => {
    setCoupons((prev) => [c, ...prev]);
    logAuditAction('coupon.create', 'Coupons', c.id, `Created promo code ${c.code}`);
    showToast(`Voucher ${c.code} created`, 'success');
  };

  const toggleCoupon = (couponId: string) => {
    setCoupons((prev) =>
      prev.map((c) => (c.id === couponId ? { ...c, isActive: !c.isActive } : c))
    );
  };

  // Delivery zones
  const updateDeliveryZone = (zone: DeliveryZone) => {
    setDeliveryZones((prev) => prev.map((z) => (z.id === zone.id ? zone : z)));
    showToast(`Delivery zone ${zone.name} updated`, 'success');
  };

  // CMS
  const updateCMSPage = (slug: string, content: string) => {
    setCmsPages((prev) =>
      prev.map((p) => (p.slug === slug ? { ...p, content, lastUpdated: new Date().toISOString().slice(0, 10) } : p))
    );
    showToast('CMS page content saved', 'success');
  };

  // Addresses
  const addSavedAddress = async (addr: Omit<Address, 'id'> | Address) => {
    try {
      const res = await customerApi.addAddress(addr as any);
      if (res.success && res.data) {
        const saved = mapServerAddress(res.data);
        setSavedAddresses((prev) => [saved, ...prev.filter((a) => a.id !== saved.id)]);
        setCurrentAddress(saved);
        showToast('New delivery address saved', 'success');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save address', 'error');
      throw err;
    }
  };

  const deleteSavedAddress = async (addressId: string) => {
    try {
      const res = await customerApi.deleteAddress(addressId);
      if (res.success) {
        setSavedAddresses((prev) => prev.filter((a) => a.id !== addressId));
        if (currentAddress?.id === addressId) {
          setCurrentAddress(savedAddresses.find((a) => a.id !== addressId) || null);
        }
        showToast('Address removed', 'info');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete address', 'error');
    }
  };

  const setDefaultSavedAddress = async (addressId: string) => {
    try {
      const res = await customerApi.setDefaultAddress(addressId);
      if (res.success && res.data) {
        const updated = mapServerAddress(res.data);
        setSavedAddresses((prev) =>
          prev.map((a) => ({ ...a, isDefault: a.id === addressId }))
        );
        setCurrentAddress(updated);
        showToast('Default delivery address updated', 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to set default address', 'error');
    }
  };

  // Favorites
  const toggleFavoriteRestaurant = async (restaurantId: string | number): Promise<boolean> => {
    if (!currentUser) {
      openAuthModal('login');
      return false;
    }
    try {
      const res = await customerApi.toggleRestaurantFavorite(restaurantId);
      if (res.success && res.data) {
        const isFav = res.data.is_favorite;
        const favRecord = res.data.favorite;
        if (isFav && favRecord) {
          setFavorites((prev) => ({
            ...prev,
            restaurants: [favRecord, ...prev.restaurants.filter((f) => String(f.restaurant?.id) !== String(restaurantId))]
          }));
          showToast('Added to favorites', 'success');
        } else {
          setFavorites((prev) => ({
            ...prev,
            restaurants: prev.restaurants.filter((f) => String(f.restaurant?.id) !== String(restaurantId))
          }));
          showToast('Removed from favorites', 'info');
        }
        // Background synchronization with authoritative server list
        customerApi.getFavorites().then((favRes) => {
          if (favRes.success && favRes.data) {
            setFavorites({
              restaurants: favRes.data.restaurants || [],
              products: favRes.data.products || []
            });
          }
        }).catch(() => {});
        return isFav;
      }
      return false;
    } catch (err: any) {
      showToast(err?.message || 'Failed to update favorite', 'error');
      return false;
    }
  };

  const toggleFavoriteProduct = async (productId: string | number): Promise<boolean> => {
    if (!currentUser) {
      openAuthModal('login');
      return false;
    }
    try {
      const res = await customerApi.toggleProductFavorite(productId);
      if (res.success && res.data) {
        const isFav = res.data.is_favorite;
        const favRecord = res.data.favorite;
        if (isFav && favRecord) {
          setFavorites((prev) => ({
            ...prev,
            products: [favRecord, ...prev.products.filter((f) => String(f.product?.id) !== String(productId))]
          }));
          showToast('Saved to favorite dishes', 'success');
        } else {
          setFavorites((prev) => ({
            ...prev,
            products: prev.products.filter((f) => String(f.product?.id) !== String(productId))
          }));
          showToast('Removed from favorites', 'info');
        }
        // Background synchronization with authoritative server list
        customerApi.getFavorites().then((favRes) => {
          if (favRes.success && favRes.data) {
            setFavorites({
              restaurants: favRes.data.restaurants || [],
              products: favRes.data.products || []
            });
          }
        }).catch(() => {});
        return isFav;
      }
      return false;
    } catch (err: any) {
      showToast(err?.message || 'Failed to update favorite', 'error');
      return false;
    }
  };

  // Notifications
  const markNotificationAsRead = async (id: string) => {
    try {
      const res = await customerApi.markNotificationRead(id);
      if (res.success && res.data) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: res.data.read_at ?? null } : n))
        );
      } else {
        // Sync authoritatively from backend without inventing timestamps
        const notifRes = await customerApi.getNotifications();
        if (notifRes.success && notifRes.data) {
          setNotifications(notifRes.data.notifications || []);
          setUnreadNotificationsCount(notifRes.data.unread_count || 0);
          return;
        }
      }
      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Ignored
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await customerApi.markAllNotificationsRead();
      const notifRes = await customerApi.getNotifications();
      if (notifRes.success && notifRes.data) {
        setNotifications(notifRes.data.notifications || []);
        setUnreadNotificationsCount(notifRes.data.unread_count || 0);
      }
      showToast('All notifications marked as read', 'info');
    } catch {
      // Ignored
    }
  };

  // Settings
  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    logAuditAction('settings.update', 'Settings', undefined, 'Modified global platform parameters');
    showToast('Platform settings saved', 'success');
  };

  // Currency formatter
  const formatCurrency = (amount: number): string => {
    const formattedNum = (amount || 0).toLocaleString('en-US', {
      minimumFractionDigits: settings.decimalPlaces,
      maximumFractionDigits: settings.decimalPlaces
    });
    return `${settings.currencySymbol} ${formattedNum}`;
  };

  // Translations
  const translations: Record<string, Record<string, string>> = {
    ur: {
      'Restaurants': 'ریستوران',
      'Cart': 'کارٹ',
      'Checkout': 'چیک آؤٹ',
      'Order Tracking': 'آرڈر ٹریکنگ',
      'Deliver to': 'ڈیلیور کریں:',
      'Total': 'کل رقم',
    },
    ar: {
      'Restaurants': 'المطاعم',
      'Cart': 'السلة',
      'Checkout': 'الدفع',
      'Order Tracking': 'تتبع الطلب',
      'Deliver to': 'التوصيل إلى:',
      'Total': 'الإجمالي',
    }
  };

  const t = (key: string): string => {
    if (settings.activeLanguage === 'en') return key;
    return translations[settings.activeLanguage]?.[key] || key;
  };

  return (
    <AppContext.Provider
      value={{
        isLoading,
        apiError,
        refreshData,

        currentUser,
        setCurrentUser,
        isLoggedIn,
        login,
        register,
        logout,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        hasPermission,

        restaurants,
        categories,
        products,
        updateRestaurant,
        setRestaurantStatus,
        updateCommission,
        addProduct,
        updateProduct,
        deleteProduct,
        toggleProductAvailability,

        selectedCity,
        setSelectedCity,
        selectedArea,
        setSelectedArea,
        savedAddresses,
        currentAddress,
        setCurrentAddress,
        addSavedAddress,
        deleteSavedAddress,
        setDefaultSavedAddress,

        favorites,
        toggleFavoriteRestaurant,
        toggleFavoriteProduct,

        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,

        cart,
        cartRestaurant,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        replaceCartModal,
        confirmReplaceCart,
        cancelReplaceCart,

        appliedCoupon,
        applyCoupon,
        removeCoupon,
        riderTip,
        setRiderTip,
        cartTotals,
        placeOrder,

        orders,
        activeOrder,
        setActiveOrder,
        updateOrderStatus,
        cancelOrder,
        refreshOrderStatus,
        simulateOrderStep,
        assignRiderToOrder,
        unassignRiderFromOrder,
        autoDispatchRider,
        refundOrder,
        collectCodPayment,

        riders,
        currentRider,
        updateRiderStatus,

        reviews,
        addReview,
        toggleReviewApproval,

        financials,
        coupons,
        addCoupon,
        toggleCoupon,
        deliveryZones,
        updateDeliveryZone,
        auditLogs,
        logAuditAction,
        banners,
        cmsPages,
        updateCMSPage,

        settings,
        updateSettings,
        formatCurrency,
        t,

        toasts,
        showToast,
        removeToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

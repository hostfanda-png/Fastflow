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
  PaymentMethod 
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

  // Location
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedArea: string;
  setSelectedArea: (area: string) => void;
  savedAddresses: Address[];
  currentAddress: Address | null;
  setCurrentAddress: (addr: Address | null) => void;
  addSavedAddress: (addr: Address) => void;

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
  simulateOrderStep: (orderId: string) => Promise<void>;
  assignRiderToOrder: (orderId: string, riderId: string) => Promise<void>;
  autoDispatchRider: (orderId: string) => Promise<boolean>;

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
      if (res.data?.user) {
        const u = res.data.user;
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
      if (res.data?.user) {
        const u = res.data.user;
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

  const logAuditAction = (action: string, moduleName: string, recordId?: string, details?: string) => {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action,
      module: moduleName,
      recordId: recordId || '',
      userId: currentUser?.id || 'sys',
      userName: currentUser?.name || 'System User',
      role: currentUser?.role || 'customer',
      timestamp: new Date().toISOString(),
      details: details || '',
      ip: '127.0.0.1'
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  };

  // Location
  const [selectedCity, setSelectedCity] = useState('Lahore');
  const [selectedArea, setSelectedArea] = useState('Gulberg III');
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [currentAddress, setCurrentAddress] = useState<Address | null>(null);

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
      const [restRes, catRes, coupRes, revRes, riderRes] = await Promise.allSettled([
        restaurantApi.getAll({ city: selectedCity }),
        categoryApi.getAll(),
        couponApi.getAll(),
        reviewApi.getAll(),
        riderApi.getAll(),
      ]);

      if (restRes.status === 'fulfilled' && restRes.value.data) {
        setRestaurants(restRes.value.data);
      }
      if (catRes.status === 'fulfilled' && catRes.value.data) {
        setCategories(catRes.value.data);
      }
      if (coupRes.status === 'fulfilled' && coupRes.value.data) {
        setCoupons(coupRes.value.data);
      }
      if (revRes.status === 'fulfilled' && revRes.value.data) {
        setReviews(revRes.value.data);
      }
      if (riderRes.status === 'fulfilled' && riderRes.value.data) {
        setRiders(riderRes.value.data);
      }

      // Synchronize authenticated user resources
      if (localStorage.getItem('fastflow_auth_token')) {
        try {
          const [cartRes, ordRes, profRes] = await Promise.allSettled([
            cartApi.getCart(),
            orderApi.getAll(),
            customerApi.getProfile(),
          ]);

          if (cartRes.status === 'fulfilled' && cartRes.value.data) {
            syncCartState(cartRes.value.data);
          }

          if (ordRes.status === 'fulfilled' && ordRes.value.data) {
            setOrders(ordRes.value.data);
          }

          if (profRes.status === 'fulfilled' && profRes.value.data?.addresses) {
            setSavedAddresses(profRes.value.data.addresses);
            if (profRes.value.data.addresses.length > 0 && !currentAddress) {
              setCurrentAddress(profRes.value.data.addresses[0]);
            }
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
        slug: 'kitchen',
        logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=120',
        coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600',
        description: 'Fresh and authentic cuisine prepared by our top culinary partners.',
        address: 'Downtown Food Hub',
        city: selectedCity,
        area: 'Central',
        lat: 31.5204,
        lng: 74.3587,
        rating: 4.8,
        reviewCount: 120,
        deliveryFee: serverCart.restaurant.delivery_fee || settings.baseDeliveryFee,
        minimumOrder: serverCart.restaurant.minimum_order || 0,
        estimatedDeliveryTime: '25-35 min',
        isOpen: true,
        status: 'approved' as const,
        isFeatured: false,
        commissionRate: 15,
        commissionType: 'percentage' as const,
        cuisines: ['All'],
        phone: '+92 300 1234567',
        email: 'kitchen@fastflow.com',
        openingHours: {
          all: { open: '09:00', close: '23:00' }
        },
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
    deliveryFee: cartRestaurant ? cartRestaurant.deliveryFee : settings.baseDeliveryFee,
    tax: Math.round((cart.reduce((sum, item) => sum + item.itemTotal, 0) * settings.taxPercentage) / 100),
    serviceFee: cart.length > 0 ? settings.serviceFee : 0,
    tip: riderTip,
    grandTotal: Math.max(0, cart.reduce((sum, item) => sum + item.itemTotal, 0) + (cartRestaurant ? cartRestaurant.deliveryFee : settings.baseDeliveryFee) + Math.round((cart.reduce((sum, item) => sum + item.itemTotal, 0) * settings.taxPercentage) / 100) + (cart.length > 0 ? settings.serviceFee : 0) + riderTip)
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

    const payload = {
      restaurant_id: cartRestaurant.id,
      delivery_address: {
        street: currentAddress.street,
        area: currentAddress.area,
        city: currentAddress.city,
      },
      delivery_instructions: instructions || currentAddress.deliveryInstructions || '',
      payment_method: paymentMethod,
      coupon_code: appliedCoupon?.code,
      tip: cartTotals.tip,
    };

    const apiRes = await orderApi.checkout(payload as any);
    if (!apiRes || !apiRes.data) {
      throw new Error(apiRes?.message || 'Failed to place order on Fastflow server.');
    }
    const createdOrder: Order = apiRes.data;

    setOrders((prev) => [createdOrder, ...prev]);
    setActiveOrder(createdOrder);

    // Synchronize cleared server cart
    syncCartState(null);
    setAppliedCoupon(null);
    setRiderTip(0);

    return createdOrder;
  };

  // Update order status with immutable history
  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus, note?: string) => {
    const now = new Date().toISOString();

    try {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        await restaurantApi.updateOrderStatus(order.restaurantId, orderId, newStatus, note);
      }
    } catch (e) {}

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const updatedHistory = [
            ...ord.statusHistory,
            { status: newStatus, timestamp: now, note, actor: currentUser?.name || 'Staff' }
          ];

          const updated: Order = {
            ...ord,
            orderStatus: newStatus,
            statusHistory: updatedHistory,
            paymentStatus: newStatus === 'delivered' ? 'paid' : ord.paymentStatus
          };

          if (activeOrder?.id === orderId) {
            setActiveOrder(updated);
          }
          return updated;
        }
        return ord;
      })
    );

    logAuditAction(`order.${newStatus}`, 'Orders', orderId, note || `Status transitioned to ${newStatus}`);
    showToast(`Order status updated to ${newStatus.replace(/_/g, ' ')}`, 'info');
  };

  // Simulate order step for easy walkthrough
  const simulateOrderStep = async (orderId: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    const statusFlow: OrderStatus[] = [
      'pending',
      'confirmed',
      'preparing',
      'ready_for_pickup',
      'assigned_to_rider',
      'picked_up',
      'on_the_way',
      'delivered'
    ];

    const currentIndex = statusFlow.indexOf(targetOrder.orderStatus);
    if (currentIndex >= 0 && currentIndex < statusFlow.length - 1) {
      const nextStatus = statusFlow[currentIndex + 1];

      if (nextStatus === 'assigned_to_rider' && !targetOrder.riderId) {
        await autoDispatchRider(orderId);
      }

      await updateOrderStatus(orderId, nextStatus, `Automatic progression simulation to ${nextStatus}`);
    } else {
      showToast('Order is already in final completed state.', 'info');
    }
  };

  const cancelOrder = async (orderId: string, reason: string) => {
    const ord = orders.find((o) => o.id === orderId);
    if (!ord) return;

    if (['picked_up', 'on_the_way', 'delivered'].includes(ord.orderStatus)) {
      showToast('Cannot cancel an order that has already been dispatched.', 'error');
      return;
    }

    try {
      await orderApi.cancel(orderId, reason);
    } catch (e) {}

    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const updated: Order = {
            ...o,
            orderStatus: 'cancelled',
            cancellationReason: reason,
            statusHistory: [
              ...o.statusHistory,
              { status: 'cancelled', timestamp: now, note: `Cancelled: ${reason}`, actor: currentUser?.name || 'Customer' }
            ]
          };
          if (activeOrder?.id === orderId) setActiveOrder(updated);
          return updated;
        }
        return o;
      })
    );
    showToast(`Order ${ord.orderNumber} cancelled.`, 'info');
    logAuditAction('order.cancel', 'Orders', orderId, `Cancelled reason: ${reason}`);
  };

  // Assign rider
  const assignRiderToOrder = async (orderId: string, riderId: string) => {
    const rider = riders.find((r) => r.id === riderId);
    if (!rider) return;

    try {
      await adminApi.assignRider(orderId, riderId);
    } catch (e) {}

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const updated: Order = {
            ...ord,
            riderId: rider.id,
            riderName: rider.name,
            riderPhone: rider.phone,
            orderStatus: ord.orderStatus === 'pending' || ord.orderStatus === 'confirmed' || ord.orderStatus === 'ready_for_pickup' 
              ? 'assigned_to_rider' 
              : ord.orderStatus,
            statusHistory: [
              ...ord.statusHistory,
              {
                status: 'assigned_to_rider',
                timestamp: new Date().toISOString(),
                note: `Courier ${rider.name} assigned to delivery`,
                actor: currentUser?.name || 'System Dispatcher'
              }
            ]
          };
          if (activeOrder?.id === orderId) setActiveOrder(updated);
          return updated;
        }
        return ord;
      })
    );

    setRiders((prev) =>
      prev.map((r) => (r.id === riderId ? { ...r, assignedOrderCount: r.assignedOrderCount + 1 } : r))
    );

    showToast(`Courier ${rider.name} assigned to order.`, 'success');
  };

  const autoDispatchRider = async (orderId: string): Promise<boolean> => {
    try {
      const res = await adminApi.autoDispatch(orderId);
      if (res.success) return true;
    } catch (e) {}

    const availableRiders = riders.filter((r) => r.status === 'available');
    if (availableRiders.length === 0) return false;

    const bestRider = [...availableRiders].sort((a, b) => a.assignedOrderCount - b.assignedOrderCount)[0];
    await assignRiderToOrder(orderId, bestRider.id);
    return true;
  };

  const currentRider = currentUser && currentUser.role === 'delivery_rider'
    ? riders.find((r) => r.userId === currentUser.id) || null
    : null;

  const updateRiderStatus = async (riderId: string, status: Rider['status']) => {
    try {
      await riderApi.updateStatus(status as any);
    } catch (e) {}

    setRiders((prev) =>
      prev.map((r) => (r.id === riderId ? { ...r, status } : r))
    );
    showToast(`Courier status set to ${status}`, 'info');
  };

  // Restaurant management
  const updateRestaurant = (updated: Restaurant) => {
    setRestaurants((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    logAuditAction('restaurant.update', 'Restaurants', String(updated.id), `Updated details for ${updated.name}`);
    showToast('Restaurant details updated successfully', 'success');
  };

  const setRestaurantStatus = async (id: string, status: Restaurant['status']) => {
    try {
      await adminApi.setRestaurantStatus(id, status);
    } catch (e) {}

    setRestaurants((prev) =>
      prev.map((r) => (String(r.id) === String(id) ? { ...r, status } : r))
    );
    logAuditAction(`restaurant.${status}`, 'Restaurants', id, `Changed partner status to ${status}`);
    showToast(`Restaurant status changed to ${status}`, 'info');
  };

  const updateCommission = async (id: string, rate: number, type: 'percentage' | 'fixed') => {
    try {
      await adminApi.updateCommission(id, rate, type);
    } catch (e) {}

    setRestaurants((prev) =>
      prev.map((r) => (String(r.id) === String(id) ? { ...r, commissionRate: rate, commissionType: type } : r))
    );
    logAuditAction('commission.update', 'Restaurants', id, `Updated commission to ${rate}${type === 'percentage' ? '%' : ' flat'}`);
    showToast('Commission rate updated', 'success');
  };

  // Product management
  const addProduct = async (p: Omit<Product, 'id'>) => {
    let newProduct: Product;
    try {
      const res = await productApi.create(p.restaurantId, p);
      newProduct = res.data;
    } catch (e) {
      newProduct = { ...p, id: `prod-${Date.now()}` };
    }

    setProducts((prev) => [newProduct, ...prev]);
    logAuditAction('menu.create', 'Menu', String(newProduct.id), `Created dish ${newProduct.name}`);
    showToast(`Added ${newProduct.name} to menu`, 'success');
  };

  const updateProduct = async (updated: Product) => {
    try {
      await productApi.update(updated.restaurantId, updated.id, updated);
    } catch (e) {}

    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    logAuditAction('menu.update', 'Menu', String(updated.id), `Updated dish ${updated.name}`);
    showToast(`Updated ${updated.name}`, 'success');
  };

  const deleteProduct = async (productId: string) => {
    try {
      const prod = products.find(p => p.id === productId);
      if (prod) {
        await productApi.delete(prod.restaurantId, productId);
      }
    } catch (e) {}

    setProducts((prev) => prev.filter((p) => p.id !== productId));
    logAuditAction('menu.delete', 'Menu', productId, 'Deleted dish from catalog');
    showToast('Dish removed from menu', 'info');
  };

  const toggleProductAvailability = async (productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (prod) {
      try {
        await productApi.toggleAvailability(prod.restaurantId, productId);
      } catch (e) {}
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isAvailable: !p.isAvailable } : p))
    );
  };

  // Reviews
  const addReview = async (orderId: string, restaurantId: string, rating: number, foodRating: number, comment: string) => {
    try {
      await reviewApi.submit({
        order_id: orderId,
        rating,
        food_rating: foodRating,
        comment,
      });
    } catch (e) {}

    const newRev: Review = {
      id: `rev-${Date.now()}`,
      orderId,
      restaurantId,
      customerName: currentUser?.name || 'Customer',
      rating,
      foodRating,
      comment,
      createdAt: new Date().toISOString(),
      isApproved: true
    };

    setReviews((prev) => [newRev, ...prev]);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, hasBeenReviewed: true } : o))
    );

    setRestaurants((prev) =>
      prev.map((r) => {
        if (String(r.id) === String(restaurantId)) {
          const restaurantReviews = [...reviews.filter((rev) => String(rev.restaurantId) === String(restaurantId)), newRev];
          const avg = restaurantReviews.reduce((sum, rev) => sum + rev.rating, 0) / restaurantReviews.length;
          return {
            ...r,
            rating: Math.round(avg * 10) / 10,
            reviewCount: restaurantReviews.length
          };
        }
        return r;
      })
    );

    showToast('Thank you for rating your culinary experience!', 'success');
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
  const addSavedAddress = (addr: Address) => {
    setSavedAddresses((prev) => [...prev, addr]);
    setCurrentAddress(addr);
    showToast('New delivery address saved', 'success');
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
        simulateOrderStep,
        assignRiderToOrder,
        autoDispatchRider,

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

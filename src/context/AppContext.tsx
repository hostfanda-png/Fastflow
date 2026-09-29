import React, { createContext, useContext, useState, useEffect } from 'react';
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
import { 
  DEMO_USERS, 
  SEED_RESTAURANTS, 
  SEED_PRODUCTS, 
  SEED_CATEGORIES, 
  SEED_RIDERS, 
  SEED_ORDERS, 
  SEED_COUPONS, 
  SEED_REVIEWS, 
  SEED_AUDIT_LOGS, 
  SEED_FINANCIALS, 
  SEED_DELIVERY_ZONES, 
  SEED_BANNERS, 
  SEED_CMS_PAGES, 
  SEED_SETTINGS 
} from '../data/seedData';

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
  // Current user & authentication
  currentUser: User;
  setCurrentUser: (user: User) => void;
  switchRole: (roleName: string) => void;
  hasPermission: (permission: Permission) => boolean;
  demoUsers: User[];

  // Restaurants & Menu
  restaurants: Restaurant[];
  categories: ProductCategory[];
  products: Product[];
  updateRestaurant: (restaurant: Restaurant) => void;
  setRestaurantStatus: (id: string, status: Restaurant['status']) => void;
  updateCommission: (id: string, rate: number, type: 'percentage' | 'fixed') => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (productId: string) => void;
  toggleProductAvailability: (productId: string) => void;

  // Location
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  selectedArea: string;
  setSelectedArea: (area: string) => void;
  savedAddresses: Address[];
  currentAddress: Address;
  setCurrentAddress: (addr: Address) => void;
  addSavedAddress: (addr: Address) => void;

  // Cart
  cart: CartItem[];
  cartRestaurant: Restaurant | null;
  addToCart: (item: CartItem) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  replaceCartModal: ReplaceCartModalState;
  confirmReplaceCart: () => void;
  cancelReplaceCart: () => void;

  // Checkout & Pricing
  appliedCoupon: Coupon | null;
  applyCoupon: (code: string) => { success: boolean; message: string };
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
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => void;
  cancelOrder: (orderId: string, reason: string) => void;
  simulateOrderStep: (orderId: string) => void;
  assignRiderToOrder: (orderId: string, riderId: string) => void;
  autoDispatchRider: (orderId: string) => boolean;

  // Riders
  riders: Rider[];
  currentRider: Rider | null;
  updateRiderStatus: (riderId: string, status: Rider['status']) => void;

  // Reviews
  reviews: Review[];
  addReview: (orderId: string, restaurantId: string, rating: number, foodRating: number, comment: string) => void;
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load persisted state or seeds
  const [currentUser, setCurrentUser] = useState<User>(() => {
    return DEMO_USERS[4]; // Default to Customer (Sarah Jenkins) for storefront discovery
  });

  const [restaurants, setRestaurants] = useState<Restaurant[]>(SEED_RESTAURANTS);
  const [products, setProducts] = useState<Product[]>(SEED_PRODUCTS);
  const [categories] = useState<ProductCategory[]>(SEED_CATEGORIES);
  const [riders, setRiders] = useState<Rider[]>(SEED_RIDERS);
  const [orders, setOrders] = useState<Order[]>(SEED_ORDERS);
  const [coupons, setCoupons] = useState<Coupon[]>(SEED_COUPONS);
  const [reviews, setReviews] = useState<Review[]>(SEED_REVIEWS);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(SEED_AUDIT_LOGS);
  const [financials, setFinancials] = useState<FinancialTransaction[]>(SEED_FINANCIALS);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>(SEED_DELIVERY_ZONES);
  const [banners] = useState<Banner[]>(SEED_BANNERS);
  const [cmsPages, setCmsPages] = useState<CMSPage[]>(SEED_CMS_PAGES);
  const [settings, setSettings] = useState<SystemSettings>(SEED_SETTINGS);

  // Location
  const [selectedCity, setSelectedCity] = useState('Lahore');
  const [selectedArea, setSelectedArea] = useState('Gulberg III');
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([
    {
      id: 'addr-1',
      label: 'Home',
      street: 'House 44-B, Street 12, Sector Y',
      area: 'DHA Phase 3',
      city: 'Lahore',
      lat: 31.4812,
      lng: 74.3821,
      deliveryInstructions: 'Ring doorbell, leave with gate security if unanswered.',
      isDefault: true
    },
    {
      id: 'addr-2',
      label: 'Work',
      street: 'Software Tech Park, 4th Floor, Ferozepur Rd',
      area: 'Gulberg III',
      city: 'Lahore',
      lat: 31.5204,
      lng: 74.3587,
      deliveryInstructions: 'Call upon arrival at main lobby turnstiles.',
      isDefault: false
    }
  ]);
  const [currentAddress, setCurrentAddress] = useState<Address>(savedAddresses[0]);

  // Cart & Pricing
  const [cart, setCart] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [riderTip, setRiderTip] = useState<number>(0);
  const [activeOrder, setActiveOrder] = useState<Order | null>(orders[0]); // Initial view on Order 1001

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
    if (currentUser.role === 'super_admin') return true;
    return currentUser.permissions.includes(permission);
  };

  // Role Switcher
  const switchRole = (roleName: string) => {
    const foundUser = DEMO_USERS.find((u) => u.role === roleName) || DEMO_USERS[0];
    setCurrentUser(foundUser);
    showToast(`Switched active view to ${foundUser.name} (${foundUser.role})`, 'info');
  };

  // Audit Logger
  const logAuditAction = (action: string, module: string, recordId?: string, details?: string) => {
    const entry: AuditLog = {
      id: `log-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      action,
      module,
      recordId,
      ip: '192.168.1.10',
      timestamp: new Date().toISOString(),
      details
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  // Cart restaurant detection
  const cartRestaurant = cart.length > 0 
    ? restaurants.find((r) => r.id === cart[0].restaurantId) || null 
    : null;

  // Add to cart with single restaurant enforcement
  const addToCart = (newItem: CartItem) => {
    if (cart.length > 0 && cart[0].restaurantId !== newItem.restaurantId) {
      // Prompt modal
      const currentRest = restaurants.find((r) => r.id === cart[0].restaurantId);
      const newRest = restaurants.find((r) => r.id === newItem.restaurantId);
      setReplaceCartModal({
        isOpen: true,
        pendingItem: newItem,
        currentRestaurantName: currentRest?.name || 'Previous Restaurant',
        newRestaurantName: newRest?.name || 'New Restaurant'
      });
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => {
        // Compare same product, same variant, same addons
        const sameProduct = item.productId === newItem.productId;
        const sameVariant = item.selectedVariant?.id === newItem.selectedVariant?.id;
        const sameAddons = JSON.stringify(item.selectedAddons.map(a => a.addonId).sort()) === 
                           JSON.stringify(newItem.selectedAddons.map(a => a.addonId).sort());
        return sameProduct && sameVariant && sameAddons;
      });

      if (existingIndex > -1) {
        const updated = [...prev];
        const existing = updated[existingIndex];
        const newQty = existing.quantity + newItem.quantity;
        const unitCost = existing.itemTotal / existing.quantity;
        updated[existingIndex] = {
          ...existing,
          quantity: newQty,
          itemTotal: unitCost * newQty
        };
        return updated;
      }

      return [...prev, newItem];
    });

    showToast(`Added ${newItem.quantity}x ${newItem.productName} to cart`, 'success');
  };

  const confirmReplaceCart = () => {
    if (replaceCartModal.pendingItem) {
      setCart([replaceCartModal.pendingItem]);
      setAppliedCoupon(null);
      showToast(`Cart replaced with items from ${replaceCartModal.newRestaurantName}`, 'info');
    }
    setReplaceCartModal({ isOpen: false, pendingItem: null, currentRestaurantName: '', newRestaurantName: '' });
  };

  const cancelReplaceCart = () => {
    setReplaceCartModal({ isOpen: false, pendingItem: null, currentRestaurantName: '', newRestaurantName: '' });
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const unitCost = item.itemTotal / item.quantity;
          return {
            ...item,
            quantity,
            itemTotal: unitCost * quantity
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const remaining = prev.filter((i) => i.id !== itemId);
      if (remaining.length === 0) {
        setAppliedCoupon(null);
      }
      return remaining;
    });
    showToast('Item removed from cart', 'info');
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
    setRiderTip(0);
  };

  // Cart calculations
  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.itemTotal, 0);
    const deliveryFee = cartRestaurant ? cartRestaurant.deliveryFee : settings.baseDeliveryFee;
    const tax = Math.round((subtotal * settings.taxPercentage) / 100);
    const serviceFee = subtotal > 0 ? settings.serviceFee : 0;

    let discount = 0;
    if (appliedCoupon && subtotal >= appliedCoupon.minOrder) {
      if (appliedCoupon.discountType === 'percentage') {
        const calculated = Math.round((subtotal * appliedCoupon.discountValue) / 100);
        discount = appliedCoupon.maxDiscount ? Math.min(calculated, appliedCoupon.maxDiscount) : calculated;
      } else {
        discount = appliedCoupon.discountValue;
      }
    }

    const grandTotal = Math.max(0, subtotal - discount + deliveryFee + tax + serviceFee + riderTip);

    return {
      subtotal,
      discount,
      deliveryFee,
      tax,
      serviceFee,
      tip: riderTip,
      grandTotal
    };
  };

  const cartTotals = calculateTotals();

  // Coupon logic
  const applyCoupon = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const found = coupons.find((c) => c.code.toUpperCase() === cleanCode && c.isActive);

    if (!found) {
      return { success: false, message: 'Invalid or expired promotional coupon code.' };
    }

    if (cartTotals.subtotal < found.minOrder) {
      return { 
        success: false, 
        message: `Order subtotal must be at least ${settings.currencySymbol} ${found.minOrder.toLocaleString()} for this coupon.` 
      };
    }

    if (found.restaurantId && cartRestaurant && found.restaurantId !== cartRestaurant.id) {
      return { success: false, message: 'This coupon is not valid for this restaurant.' };
    }

    setAppliedCoupon(found);
    return { success: true, message: `Coupon ${found.code} applied successfully!` };
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast('Coupon removed', 'info');
  };

  // Order placement
  const placeOrder = async (paymentMethod: PaymentMethod, instructions?: string): Promise<Order> => {
    if (cart.length === 0 || !cartRestaurant) {
      throw new Error('Cart is empty');
    }

    const orderNumber = `FD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber,
      customerId: currentUser.id,
      customerName: currentUser.name,
      customerPhone: currentUser.phone,
      deliveryAddress: currentAddress,
      deliveryInstructions: instructions || currentAddress.deliveryInstructions,
      restaurantId: cartRestaurant.id,
      restaurantName: cartRestaurant.name,
      items: cart.map((ci) => ({
        id: `oi-${Date.now()}-${ci.id}`,
        productId: ci.productId,
        productName: ci.productName,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        totalPrice: ci.itemTotal,
        variantName: ci.selectedVariant?.name,
        addons: ci.selectedAddons.map(a => ({ name: a.name, price: a.price })),
        instructions: ci.specialInstructions
      })),
      subtotal: cartTotals.subtotal,
      discount: cartTotals.discount,
      couponCode: appliedCoupon?.code,
      deliveryFee: cartTotals.deliveryFee,
      tax: cartTotals.tax,
      serviceFee: cartTotals.serviceFee,
      tip: cartTotals.tip,
      grandTotal: cartTotals.grandTotal,
      paymentMethod,
      paymentStatus: paymentMethod === 'stripe' ? 'paid' : 'pending',
      orderStatus: 'pending',
      statusHistory: [
        {
          status: 'pending',
          timestamp: now,
          note: `Order placed via ${paymentMethod.toUpperCase()}`,
          actor: currentUser.name
        }
      ],
      createdAt: now,
      estimatedDeliveryTime: '30-40 min',
      hasBeenReviewed: false
    };

    // Calculate commission
    const commissionRate = cartRestaurant.commissionRate || settings.defaultCommissionRate;
    const platformCommission = Math.round((newOrder.subtotal * commissionRate) / 100);
    const restaurantPayout = Math.max(0, newOrder.subtotal - platformCommission);
    const riderPayout = 100 + newOrder.tip;

    const newTransaction: FinancialTransaction = {
      id: `fin-${Date.now()}`,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      restaurantId: cartRestaurant.id,
      restaurantName: cartRestaurant.name,
      grossAmount: newOrder.grandTotal,
      platformCommission,
      restaurantPayout,
      deliveryFee: newOrder.deliveryFee,
      riderPayout,
      paymentGatewayFee: paymentMethod === 'stripe' ? Math.round(newOrder.grandTotal * 0.025) : 0,
      status: paymentMethod === 'stripe' ? 'settled' : 'pending',
      createdAt: now
    };

    setOrders((prev) => [newOrder, ...prev]);
    setFinancials((prev) => [newTransaction, ...prev]);
    setActiveOrder(newOrder);
    logAuditAction('order.create', 'Orders', newOrder.id, `Created order ${newOrder.orderNumber} for ${cartRestaurant.name}`);

    // Auto-dispatch rider in background if available
    setTimeout(() => {
      autoDispatchRider(newOrder.id);
    }, 1500);

    clearCart();
    return newOrder;
  };

  // Update order status with immutable history
  const updateOrderStatus = (orderId: string, newStatus: OrderStatus, note?: string) => {
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const updatedHistory = [
            ...ord.statusHistory,
            { status: newStatus, timestamp: now, note, actor: currentUser.name }
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
  const simulateOrderStep = (orderId: string) => {
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

      // Assign rider if entering assigned_to_rider
      if (nextStatus === 'assigned_to_rider' && !targetOrder.riderId) {
        autoDispatchRider(orderId);
      }

      updateOrderStatus(orderId, nextStatus, `Automatic progression simulation to ${nextStatus}`);
    } else {
      showToast('Order is already in final completed state.', 'info');
    }
  };

  const cancelOrder = (orderId: string, reason: string) => {
    const ord = orders.find((o) => o.id === orderId);
    if (!ord) return;

    if (['picked_up', 'on_the_way', 'delivered'].includes(ord.orderStatus)) {
      showToast('Cannot cancel an order that has already been dispatched.', 'error');
      return;
    }

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
              { status: 'cancelled', timestamp: now, note: `Cancelled: ${reason}`, actor: currentUser.name }
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
  const assignRiderToOrder = (orderId: string, riderId: string) => {
    const rider = riders.find((r) => r.id === riderId);
    if (!rider) return;

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
                actor: currentUser.name
              }
            ]
          };
          if (activeOrder?.id === orderId) setActiveOrder(updated);
          return updated;
        }
        return ord;
      })
    );

    // Update rider workload
    setRiders((prev) =>
      prev.map((r) => (r.id === riderId ? { ...r, assignedOrderCount: r.assignedOrderCount + 1 } : r))
    );

    showToast(`Rider ${rider.name} assigned to order.`, 'success');
  };

  // Smart automated dispatch
  const autoDispatchRider = (orderId: string): boolean => {
    const availableRiders = riders.filter((r) => r.status === 'available');
    if (availableRiders.length === 0) return false;

    // Pick available rider with lowest current active assignments
    const bestRider = [...availableRiders].sort((a, b) => a.assignedOrderCount - b.assignedOrderCount)[0];
    assignRiderToOrder(orderId, bestRider.id);
    return true;
  };

  // Rider state
  const currentRider = currentUser.role === 'delivery_rider'
    ? riders.find((r) => r.userId === currentUser.id) || riders[0]
    : null;

  const updateRiderStatus = (riderId: string, status: Rider['status']) => {
    setRiders((prev) =>
      prev.map((r) => (r.id === riderId ? { ...r, status } : r))
    );
    showToast(`Rider status set to ${status}`, 'info');
  };

  // Restaurant management
  const updateRestaurant = (updated: Restaurant) => {
    setRestaurants((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    logAuditAction('restaurant.update', 'Restaurants', updated.id, `Updated details for ${updated.name}`);
    showToast('Restaurant details updated successfully', 'success');
  };

  const setRestaurantStatus = (id: string, status: Restaurant['status']) => {
    setRestaurants((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
    logAuditAction(`restaurant.${status}`, 'Restaurants', id, `Changed partner status to ${status}`);
    showToast(`Restaurant status changed to ${status}`, 'info');
  };

  const updateCommission = (id: string, rate: number, type: 'percentage' | 'fixed') => {
    setRestaurants((prev) =>
      prev.map((r) => (r.id === id ? { ...r, commissionRate: rate, commissionType: type } : r))
    );
    logAuditAction('commission.update', 'Restaurants', id, `Updated commission to ${rate}${type === 'percentage' ? '%' : ' flat'}`);
    showToast('Commission rate updated', 'success');
  };

  // Product management
  const addProduct = (p: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...p,
      id: `prod-${Date.now()}`
    };
    setProducts((prev) => [newProduct, ...prev]);
    logAuditAction('menu.create', 'Menu', newProduct.id, `Created dish ${newProduct.name}`);
    showToast(`Added ${newProduct.name} to menu`, 'success');
  };

  const updateProduct = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    logAuditAction('menu.update', 'Menu', updated.id, `Updated dish ${updated.name}`);
    showToast(`Updated ${updated.name}`, 'success');
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    logAuditAction('menu.delete', 'Menu', productId, 'Deleted dish from catalog');
    showToast('Dish removed from menu', 'info');
  };

  const toggleProductAvailability = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isAvailable: !p.isAvailable } : p))
    );
  };

  // Reviews
  const addReview = (orderId: string, restaurantId: string, rating: number, foodRating: number, comment: string) => {
    const newRev: Review = {
      id: `rev-${Date.now()}`,
      orderId,
      restaurantId,
      customerName: currentUser.name,
      rating,
      foodRating,
      comment,
      createdAt: new Date().toISOString(),
      isApproved: true
    };

    setReviews((prev) => [newRev, ...prev]);

    // Mark order as reviewed
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, hasBeenReviewed: true } : o))
    );

    // Recalculate restaurant rating
    setRestaurants((prev) =>
      prev.map((r) => {
        if (r.id === restaurantId) {
          const restaurantReviews = [...reviews.filter((rev) => rev.restaurantId === restaurantId), newRev];
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
    showToast(`Coupon ${c.code} created`, 'success');
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

  // Minimal multi-language translation dictionary for key strings
  const translations: Record<string, Record<string, string>> = {
    ur: {
      'Home': 'ہوم',
      'Restaurants': 'ریستوران',
      'Cart': 'کارٹ',
      'Checkout': 'چیک آؤٹ',
      'Order Tracking': 'آرڈر ٹریکنگ',
      'Search dishes or restaurants': 'کھانے یا ریستوران تلاش کریں...',
      'Deliver to': 'ڈیلیور کریں:',
      'Add to Cart': 'کارٹ میں شامل کریں',
      'Total': 'کل رقم',
      'Free Delivery': 'مفت ڈیلیوری'
    },
    ar: {
      'Home': 'الرئيسية',
      'Restaurants': 'المطاعم',
      'Cart': 'السلة',
      'Checkout': 'الدفع',
      'Order Tracking': 'تتبع الطلب',
      'Search dishes or restaurants': 'ابحث عن أطباق أو مطاعم...',
      'Deliver to': 'التوصيل إلى:',
      'Add to Cart': 'أضف إلى السلة',
      'Total': 'الإجمالي',
      'Free Delivery': 'توصيل مجاني'
    }
  };

  const t = (key: string): string => {
    if (settings.activeLanguage === 'en') return key;
    return translations[settings.activeLanguage]?.[key] || key;
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        switchRole,
        hasPermission,
        demoUsers: DEMO_USERS,

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

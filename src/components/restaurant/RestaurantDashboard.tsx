import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Product, 
  RestaurantDeliveryZone, 
  RestaurantHourSlot, 
  RestaurantDashboardMetrics,
  Cuisine 
} from '../../types';
import { 
  restaurantApi, 
  OwnerRestaurantDashboardData 
} from '../../services/api/restaurantApi';
import { MenuManagement } from './MenuManagement';
import { 
  Store, 
  ShoppingBag, 
  ChefHat, 
  DollarSign, 
  Clock, 
  Star, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Edit3, 
  Trash2, 
  Users, 
  Settings, 
  Filter,
  MapPin,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  Check,
  Bike
} from 'lucide-react';

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const RestaurantDashboard: React.FC = () => {
  const { 
    currentUser, 
    categories,
    formatCurrency, 
    openAuthModal
  } = useApp();

  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'settings' | 'staff'>('orders');
  const [settingsSubTab, setSettingsSubTab] = useState<'profile' | 'hours' | 'delivery' | 'media' | 'cuisines'>('profile');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // Server state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Managed Restaurant
  const [ownerRestaurants, setOwnerRestaurants] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<any | null>(null);
  const [dashboardData, setDashboardData] = useState<OwnerRestaurantDashboardData | null>(null);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [hoursList, setHoursList] = useState<RestaurantHourSlot[]>([]);
  const [deliveryZonesList, setDeliveryZonesList] = useState<RestaurantDeliveryZone[]>([]);
  const [allCuisines, setAllCuisines] = useState<Cuisine[]>([]);
  const [eligibleRiders, setEligibleRiders] = useState<any[]>([]);
  const [selectedRiderMap, setSelectedRiderMap] = useState<Record<string | number, string | number>>({});
  const [orderActionLoading, setOrderActionLoading] = useState<Record<string | number, boolean>>({});

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    area: '',
    lat: 31.5204,
    lng: 74.3587,
    minimum_order: 500,
    delivery_fee: 120,
    estimated_delivery_time: '25-35 min',
    service_radius_km: 10,
    is_open: true,
    delivery_enabled: true,
  });

  // Media Form State
  const [mediaLogoUrl, setMediaLogoUrl] = useState('');
  const [mediaCoverUrl, setMediaCoverUrl] = useState('');

  // Delivery Zone Modal State
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | number | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneFee, setZoneFee] = useState('120');
  const [zoneMinOrder, setZoneMinOrder] = useState('500');

  // Application Form State (when no restaurant exists)
  const [appForm, setAppForm] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
    city: 'Lahore',
    area: 'Gulberg III',
    lat: 31.5204,
    lng: 74.3587,
    minimum_order: 500,
    delivery_fee: 120,
    estimated_delivery_time: '25-35 min',
    cuisines: [] as number[],
  });
  const [submittingApp, setSubmittingApp] = useState(false);

  // Clear notifications
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Load Initial Data
  const loadRestaurantData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch owner restaurants
      const restRes = await restaurantApi.getOwnerRestaurants();
      if (!restRes.success || !restRes.data || restRes.data.length === 0) {
        setOwnerRestaurants([]);
        setSelectedRestaurant(null);
        // Load cuisines for application form
        const cuisineRes = await restaurantApi.getCuisines();
        if (cuisineRes.success && cuisineRes.data) {
          setAllCuisines(cuisineRes.data);
        }
        setLoading(false);
        return;
      }

      setOwnerRestaurants(restRes.data);
      const current = restRes.data[0];
      setSelectedRestaurant(current);

      // Populate profile form
      setProfileForm({
        name: current.name || '',
        description: current.description || '',
        phone: current.phone || '',
        email: current.email || '',
        address: current.address || '',
        city: current.city || '',
        area: current.area || '',
        lat: Number(current.lat) || 31.5204,
        lng: Number(current.lng) || 74.3587,
        minimum_order: Number(current.minimum_order ?? current.minimumOrder) || 500,
        delivery_fee: Number(current.delivery_fee ?? current.deliveryFee) || 120,
        estimated_delivery_time: current.estimated_delivery_time || current.estimatedDeliveryTime || '25-35 min',
        service_radius_km: Number(current.service_radius_km ?? current.serviceRadiusKm) || 10,
        is_open: Boolean(current.is_open ?? current.isOpen),
        delivery_enabled: Boolean(current.delivery_enabled ?? true),
      });

      setMediaLogoUrl(current.logo || '');
      setMediaCoverUrl(current.cover_image || current.coverImage || '');

      // 2. Fetch Authoritative Dashboard Stats
      const [dashRes, ordersRes, hoursRes, zonesRes, cuisinesRes, ridersRes] = await Promise.all([
        restaurantApi.getDashboard(current.id),
        restaurantApi.getOwnerOrders(current.id, 'all'),
        restaurantApi.getHours(current.id),
        restaurantApi.getDeliveryZones(current.id),
        restaurantApi.getCuisines(),
        restaurantApi.getEligibleRiders(current.id),
      ]);

      if (dashRes.success && dashRes.data) {
        setDashboardData(dashRes.data);
      }
      if (ordersRes.success && ordersRes.data) {
        setOrdersList(ordersRes.data);
      }
      if (hoursRes.success && hoursRes.data) {
        setHoursList(hoursRes.data.hours || []);
      }
      if (zonesRes.success && zonesRes.data) {
        setDeliveryZonesList(zonesRes.data);
      }
      if (cuisinesRes.success && cuisinesRes.data) {
        setAllCuisines(cuisinesRes.data);
      }
      if (ridersRes.success && ridersRes.data) {
        setEligibleRiders(ridersRes.data);
      }

      // Products from restaurant details
      if (current.products) {
        setProductsList(current.products);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load restaurant details from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadRestaurantData();
  }, [loadRestaurantData]);

  // Order status transition handler
  const handleUpdateOrderStatus = async (orderId: number | string, newStatus: string, note?: string) => {
    if (!selectedRestaurant) return;
    try {
      const res = await restaurantApi.updateOrderStatus(selectedRestaurant.id, orderId, newStatus, note);
      if (res.success) {
        setSuccessMessage(`Order #${orderId} marked as ${newStatus}`);
        // Refresh orders and dashboard metrics from backend
        const [ordersRes, dashRes] = await Promise.all([
          restaurantApi.getOwnerOrders(selectedRestaurant.id, orderStatusFilter),
          restaurantApi.getDashboard(selectedRestaurant.id),
        ]);
        if (ordersRes.success && ordersRes.data) setOrdersList(ordersRes.data);
        if (dashRes.success && dashRes.data) setDashboardData(dashRes.data);
      } else {
        setError(res.message || 'Failed to update order status');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error updating order status');
    }
  };

  // Courier Assignment & Unassignment Handlers
  const handleAssignRider = async (orderId: number | string) => {
    if (!selectedRestaurant) return;
    const riderId = selectedRiderMap[orderId];
    if (!riderId) {
      setError('Please select an eligible courier first.');
      return;
    }
    setError(null);
    setOrderActionLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await restaurantApi.assignRider(selectedRestaurant.id, orderId, riderId);
      if (res.success && res.data) {
        setSuccessMessage('Courier successfully assigned to order.');
        setOrdersList((prev) => prev.map((o) => (o.id === orderId ? res.data : o)));
        const ridersRes = await restaurantApi.getEligibleRiders(selectedRestaurant.id);
        if (ridersRes.success && ridersRes.data) setEligibleRiders(ridersRes.data);
      } else {
        setError(res.message || 'Failed to assign courier');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to assign courier');
    } finally {
      setOrderActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleUnassignRider = async (orderId: number | string) => {
    if (!selectedRestaurant) return;
    setError(null);
    setOrderActionLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await restaurantApi.unassignRider(selectedRestaurant.id, orderId);
      if (res.success && res.data) {
        setSuccessMessage('Courier unassigned from order successfully.');
        setOrdersList((prev) => prev.map((o) => (o.id === orderId ? res.data : o)));
        const ridersRes = await restaurantApi.getEligibleRiders(selectedRestaurant.id);
        if (ridersRes.success && ridersRes.data) setEligibleRiders(ridersRes.data);
      } else {
        setError(res.message || 'Failed to unassign courier');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to unassign courier');
    } finally {
      setOrderActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Profile Save Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;
    setError(null);

    try {
      const res = await restaurantApi.updateProfile(selectedRestaurant.id, profileForm);
      if (res.success && res.data) {
        setSelectedRestaurant(res.data);
        setSuccessMessage('Restaurant profile settings updated successfully.');
      } else {
        setError(res.message || 'Failed to update profile settings.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error saving profile.');
    }
  };

  // Hours Update Handler
  const handleSaveHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;
    setError(null);

    try {
      const res = await restaurantApi.updateHours(selectedRestaurant.id, hoursList);
      if (res.success && res.data) {
        setHoursList(res.data.hours);
        setSuccessMessage('Operating hours schedule saved successfully.');
      } else {
        setError(res.message || 'Failed to update opening hours schedule.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error saving hours.');
    }
  };

  // Delivery Zone Save Handler
  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;
    setError(null);

    const payload = {
      zone_name: zoneName,
      delivery_fee: parseFloat(zoneFee) || 0,
      min_order: parseFloat(zoneMinOrder) || 0,
      is_active: true,
    };

    try {
      if (editingZoneId) {
        const res = await restaurantApi.updateDeliveryZone(selectedRestaurant.id, editingZoneId, payload);
        if (res.success) {
          setSuccessMessage('Delivery zone updated successfully.');
          setShowZoneModal(false);
          const updatedZones = await restaurantApi.getDeliveryZones(selectedRestaurant.id);
          if (updatedZones.success && updatedZones.data) setDeliveryZonesList(updatedZones.data);
        } else {
          setError(res.message || 'Failed to update delivery zone.');
        }
      } else {
        const res = await restaurantApi.createDeliveryZone(selectedRestaurant.id, payload);
        if (res.success) {
          setSuccessMessage('New delivery zone created successfully.');
          setShowZoneModal(false);
          const updatedZones = await restaurantApi.getDeliveryZones(selectedRestaurant.id);
          if (updatedZones.success && updatedZones.data) setDeliveryZonesList(updatedZones.data);
        } else {
          setError(res.message || 'Failed to create delivery zone.');
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error processing delivery zone.');
    }
  };

  // Delivery Zone Delete Handler
  const handleDeleteZone = async (zoneId: string | number) => {
    if (!selectedRestaurant) return;
    if (!confirm('Are you sure you want to remove this delivery zone?')) return;

    try {
      const res = await restaurantApi.deleteDeliveryZone(selectedRestaurant.id, zoneId);
      if (res.success) {
        setSuccessMessage('Delivery zone removed.');
        setDeliveryZonesList(prev => prev.filter(z => String(z.id) !== String(zoneId)));
      } else {
        setError(res.message || 'Failed to remove delivery zone.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error deleting zone.');
    }
  };

  // Media Save Handler
  const handleSaveMedia = async (type: 'logo' | 'cover_image') => {
    if (!selectedRestaurant) return;
    setError(null);

    const url = type === 'logo' ? mediaLogoUrl : mediaCoverUrl;
    if (!url) {
      setError(`Please provide a valid image URL for ${type.replace('_', ' ')}.`);
      return;
    }

    try {
      const res = await restaurantApi.uploadMedia(selectedRestaurant.id, {
        type,
        image_url: url,
      });

      if (res.success) {
        setSuccessMessage(`${type === 'logo' ? 'Logo' : 'Cover image'} updated successfully.`);
      } else {
        setError(res.message || `Failed to update ${type}.`);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || `Error saving ${type}.`);
    }
  };

  // Cuisines Update Handler
  const handleToggleCuisine = async (cuisineId: number) => {
    if (!selectedRestaurant) return;
    const currentCuisineIds = (selectedRestaurant.cuisines || []).map((c: any) => typeof c === 'object' ? c.id : c);
    const exists = currentCuisineIds.includes(cuisineId);
    const updatedCuisineIds = exists 
      ? currentCuisineIds.filter((id: number) => id !== cuisineId)
      : [...currentCuisineIds, cuisineId];

    try {
      const res = await restaurantApi.updateProfile(selectedRestaurant.id, {
        cuisines: updatedCuisineIds,
      });

      if (res.success && res.data) {
        setSelectedRestaurant(res.data);
        setSuccessMessage('Cuisine tags updated.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to update cuisines.');
    }
  };

  // Application Submission Handler
  const handleApplyRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingApp(true);
    setError(null);

    try {
      const res = await restaurantApi.apply(appForm);
      if (res.success && res.data) {
        setSuccessMessage('Your restaurant application has been submitted successfully and is pending administrative approval.');
        loadRestaurantData();
      } else {
        setError(res.message || 'Application failed to submit. Please check your form data.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error submitting application.');
    } finally {
      setSubmittingApp(false);
    }
  };

  // 1. Unauthenticated State
  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto pb-24 px-4 pt-8">
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
          <Store className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">Merchant Portal Sign In</h3>
          <p className="text-xs text-stone-500 mt-1 mb-6 max-w-sm mx-auto">
            Sign in with your verified restaurant partner account to manage incoming kitchen orders, menu items, delivery zones, and operating schedules.
          </p>
          <button
            onClick={() => openAuthModal('login')}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Sign In to Merchant Portal
          </button>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto pb-24 px-4 pt-12 text-center">
        <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-3" />
        <h3 className="text-sm font-bold text-stone-800">Connecting to Fastflow Merchant Gateway...</h3>
        <p className="text-xs text-stone-500 mt-1">Retrieving authoritative branch permissions, live kitchen tickets, and operating state.</p>
      </div>
    );
  }

  // 3. No Restaurant Assigned -> Partner Application Form
  if (!selectedRestaurant) {
    return (
      <div className="max-w-3xl mx-auto pb-24 px-4 pt-6">
        <div className="bg-white rounded-3xl border border-stone-200 p-8 shadow-xs">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-stone-100">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Register Your Restaurant on Fastflow</h2>
              <p className="text-xs text-stone-500">
                Join our multi-vendor marketplace. Applications are securely reviewed and verified by platform administrators.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3 text-emerald-700 text-xs">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleApplyRestaurant} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Restaurant / Brand Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Damascus Grill & Bakery"
                  value={appForm.name}
                  onChange={(e) => setAppForm({ ...appForm, name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Business Contact Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="+92 300 1234567"
                  value={appForm.phone}
                  onChange={(e) => setAppForm({ ...appForm, phone: e.target.value })}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Business Email Address *</label>
              <input
                type="email"
                required
                placeholder="partner@yourrestaurant.com"
                value={appForm.email}
                onChange={(e) => setAppForm({ ...appForm, email: e.target.value })}
                className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">Culinary Description</label>
              <textarea
                rows={2}
                placeholder="Specialties, signature cooking style, sourcing, and history..."
                value={appForm.description}
                onChange={(e) => setAppForm({ ...appForm, description: e.target.value })}
                className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 15 Commercial Area, Block B"
                  value={appForm.address}
                  onChange={(e) => setAppForm({ ...appForm, address: e.target.value })}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">City *</label>
                <input
                  type="text"
                  required
                  placeholder="Lahore"
                  value={appForm.city}
                  onChange={(e) => setAppForm({ ...appForm, city: e.target.value })}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Neighborhood / Area *</label>
                <input
                  type="text"
                  required
                  placeholder="Gulberg III"
                  value={appForm.area}
                  onChange={(e) => setAppForm({ ...appForm, area: e.target.value })}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Est. Delivery Minutes</label>
                <input
                  type="text"
                  placeholder="25-35 min"
                  value={appForm.estimated_delivery_time}
                  onChange={(e) => setAppForm({ ...appForm, estimated_delivery_time: e.target.value })}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Delivery Fee (PKR)</label>
                <input
                  type="number"
                  min="0"
                  value={appForm.delivery_fee}
                  onChange={(e) => setAppForm({ ...appForm, delivery_fee: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">Minimum Order (PKR)</label>
                <input
                  type="number"
                  min="0"
                  value={appForm.minimum_order}
                  onChange={(e) => setAppForm({ ...appForm, minimum_order: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                />
              </div>
            </div>

            {/* Cuisines Checklist */}
            {allCuisines.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2">Select Cuisine Categories</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {allCuisines.map((c) => {
                    const selected = appForm.cuisines.includes(c.id);
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => {
                          const updated = selected 
                            ? appForm.cuisines.filter(id => id !== c.id)
                            : [...appForm.cuisines, c.id];
                          setAppForm({ ...appForm, cuisines: updated });
                        }}
                        className={`p-2 rounded-xl text-xs font-semibold border text-left transition-colors ${
                          selected 
                            ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold' 
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '}{c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={submittingApp}
                className="px-6 py-3 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {submittingApp ? 'Submitting Application...' : 'Submit Restaurant Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Authoritative Stats from Backend
  const metrics: RestaurantDashboardMetrics = dashboardData?.metrics || {
    today_orders: 0,
    today_revenue: 0,
    pending_orders: 0,
    preparing_orders: 0,
    ready_orders: 0,
    completed_orders: 0,
    cancelled_orders: 0,
    average_order_value: 0,
    active_menu_items: productsList.filter(p => p.isAvailable).length,
  };

  const isCurrentlyOpen = dashboardData?.restaurant?.is_currently_open ?? selectedRestaurant.isOpen;

  // Filtered Orders
  const filteredOrders = ordersList.filter((o) => {
    if (orderStatusFilter === 'all') return true;
    if (orderStatusFilter === 'active') return ['pending', 'confirmed', 'preparing', 'ready_for_pickup'].includes(o.order_status);
    return o.order_status === orderStatusFilter;
  });

  return (
    <div className="max-w-6xl mx-auto pb-24 px-4 pt-4">
      {/* Toast Feedback */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-red-700 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 font-bold">×</button>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-700 text-xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 font-bold">×</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 mb-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 overflow-hidden border border-stone-200 shrink-0">
            {selectedRestaurant.logo ? (
              <img src={selectedRestaurant.logo} alt={selectedRestaurant.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400">
                <Store className="w-8 h-8" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-extrabold text-stone-900">{selectedRestaurant.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                selectedRestaurant.status === 'approved' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : selectedRestaurant.status === 'pending'
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {selectedRestaurant.status}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                isCurrentlyOpen 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-stone-200 text-stone-700'
              }`}>
                {isCurrentlyOpen ? '● Kitchen Open' : '○ Closed (Hours/Schedule)'}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>{selectedRestaurant.area}, {selectedRestaurant.city}</span>
              <span>•</span>
              <span>Min: {formatCurrency(selectedRestaurant.minimum_order ?? selectedRestaurant.minimumOrder)}</span>
              <span>•</span>
              <span>Fee: {formatCurrency(selectedRestaurant.delivery_fee ?? selectedRestaurant.deliveryFee)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setRefreshing(true);
              loadRestaurantData();
            }}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-semibold text-stone-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Backend Authoritative) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>Today's Orders</span>
            <ShoppingBag className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-stone-900 tabular-nums">
            {metrics.today_orders}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Authoritative today tickets</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>Today's Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-stone-900 tabular-nums">
            {formatCurrency(metrics.today_revenue)}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Non-cancelled GMV</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>Average Order Value</span>
            <Star className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold font-mono text-stone-900 tabular-nums">
            {formatCurrency(metrics.average_order_value)}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Lifetime completed AOV</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-semibold mb-1">
            <span>Live Kitchen Status</span>
            <ChefHat className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xs font-bold text-stone-900 mt-1 flex items-center gap-2">
            <span className="text-amber-600">{metrics.pending_orders} Pending</span>
            <span>•</span>
            <span className="text-indigo-600">{metrics.preparing_orders} In Prep</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-1">{metrics.ready_orders} Ready for Courier</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'orders' 
              ? 'bg-stone-900 text-white shadow-xs' 
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Orders ({ordersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'menu' 
              ? 'bg-stone-900 text-white shadow-xs' 
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          <span>Menu Catalog ({productsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'settings' 
              ? 'bg-stone-900 text-white shadow-xs' 
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Restaurant Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'staff' 
              ? 'bg-stone-900 text-white shadow-xs' 
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Accounts</span>
        </button>
      </div>

      {/* TAB 1: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {['all', 'active', 'pending', 'confirmed', 'preparing', 'ready_for_pickup', 'delivered', 'cancelled'].map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    orderStatusFilter === st 
                      ? 'bg-stone-900 text-white font-bold' 
                      : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
              <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-stone-800">No Orders in this View</h3>
              <p className="text-xs text-stone-500 mt-1">Live customer orders matching your selected status filter will show here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => {
                const isPending = order.order_status === 'pending';
                const isConfirmed = order.order_status === 'confirmed';
                const isPreparing = order.order_status === 'preparing';
                const isReady = order.order_status === 'ready_for_pickup';

                return (
                  <div key={order.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-stone-100 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-stone-900">
                            #{order.order_number}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-stone-100 text-stone-700">
                            {order.order_status}
                          </span>
                          <span className="text-xs text-stone-500">
                            · {order.customer_display_name || order.customer_name || 'Customer'}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                          {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {order.delivery_address}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-mono font-bold text-stone-900">
                          {formatCurrency(order.grand_total)}
                        </div>
                        <div className="text-[11px] text-stone-400 uppercase font-mono">
                          {order.payment_method} · {order.payment_status}
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="py-3 text-xs divide-y divide-stone-50">
                      {(order.items || []).map((item: any) => (
                        <div key={item.id} className="py-1 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 text-center font-bold text-stone-700 bg-stone-100 rounded text-[11px]">
                              {item.quantity}×
                            </span>
                            <span className="text-stone-900 font-semibold">{item.product_name}</span>
                            {item.variant_name && (
                              <span className="text-stone-500 text-[11px]">({item.variant_name})</span>
                            )}
                          </div>
                          <span className="font-mono text-stone-700">{formatCurrency(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Courier Assignment & Unassignment Block */}
                    <div className="py-2.5 px-3 my-2 bg-stone-50 rounded-xl border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      {order.rider || order.rider_id ? (
                        <>
                          <div className="flex items-center gap-2 text-stone-700">
                            <Bike className="w-4 h-4 text-amber-600" />
                            <span>
                              Assigned Courier: <strong className="text-stone-900">{order.rider?.user?.name || order.rider_name || 'Courier'}</strong>
                              {order.rider?.vehicle_number ? ` (${order.rider.vehicle_number})` : ''}
                            </span>
                          </div>

                          {!['on_the_way', 'delivered', 'cancelled'].includes(order.order_status) ? (
                            <button
                              disabled={Boolean(orderActionLoading[order.id])}
                              onClick={() => handleUnassignRider(order.id)}
                              className="px-3 py-1 bg-stone-200 hover:bg-red-100 disabled:opacity-50 text-red-700 font-bold rounded-lg text-[11px] transition-colors self-start sm:self-auto cursor-pointer"
                            >
                              {orderActionLoading[order.id] ? 'Unassigning...' : 'Unassign Courier'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-stone-400 font-medium">In Transit</span>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-stone-500">
                            <Bike className="w-4 h-4 text-stone-400" />
                            <span>No Courier Assigned</span>
                          </div>

                          {!['delivered', 'cancelled'].includes(order.order_status) && (
                            <div className="flex items-center gap-2">
                              <select
                                value={selectedRiderMap[order.id] || ''}
                                onChange={(e) => setSelectedRiderMap(prev => ({ ...prev, [order.id]: e.target.value }))}
                                className="text-xs p-1.5 bg-white border border-stone-200 rounded-lg text-stone-700"
                              >
                                <option value="">Select Eligible Courier...</option>
                                {eligibleRiders.map((r: any) => (
                                  <option key={r.id} value={r.id}>
                                    {r.user?.name || r.name} ({r.vehicle_type} - {r.status})
                                  </option>
                                ))}
                              </select>

                              <button
                                disabled={Boolean(orderActionLoading[order.id])}
                                onClick={() => handleAssignRider(order.id)}
                                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                              >
                                {orderActionLoading[order.id] ? 'Assigning...' : 'Assign Courier'}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Transition actions */}
                    <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'confirmed', 'Kitchen accepted order')}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            Accept Ticket
                          </button>
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, 'cancelled', 'Kitchen rejected: items sold out')}
                            className="px-3.5 py-1.5 bg-stone-100 hover:bg-red-50 text-red-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {isConfirmed && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'preparing', 'Chef started preparation')}
                          className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          Mark as Preparing
                        </button>
                      )}

                      {isPreparing && (
                        <button
                          onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_pickup', 'Boxed and heat-sealed')}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                        >
                          Mark Ready for Courier
                        </button>
                      )}

                      {isReady && (
                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Awaiting Courier Pickup</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Menu Catalog */}
      {activeTab === 'menu' && (
        <MenuManagement restaurantId={selectedRestaurant.id} />
      )}

      {/* TAB 3: Settings (Phase 2A Foundation) */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden">
          {/* Sub-nav */}
          <div className="border-b border-stone-200 bg-stone-50/50 px-6 py-3 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setSettingsSubTab('profile')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                settingsSubTab === 'profile' 
                  ? 'bg-stone-900 text-white' 
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Store Profile & Location
            </button>

            <button
              onClick={() => setSettingsSubTab('delivery')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                settingsSubTab === 'delivery' 
                  ? 'bg-stone-900 text-white' 
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Delivery & Zones
            </button>

            <button
              onClick={() => setSettingsSubTab('hours')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                settingsSubTab === 'hours' 
                  ? 'bg-stone-900 text-white' 
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Operating Hours (7 Days)
            </button>

            <button
              onClick={() => setSettingsSubTab('media')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                settingsSubTab === 'media' 
                  ? 'bg-stone-900 text-white' 
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Brand Media
            </button>

            <button
              onClick={() => setSettingsSubTab('cuisines')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                settingsSubTab === 'cuisines' 
                  ? 'bg-stone-900 text-white' 
                  : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              Cuisine Categories
            </button>
          </div>

          <div className="p-6">
            {/* SUBTAB 1: Profile & Location */}
            {settingsSubTab === 'profile' && (
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Restaurant Name</label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Business Phone</label>
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Business Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Est. Delivery Time</label>
                    <input
                      type="text"
                      value={profileForm.estimated_delivery_time}
                      onChange={(e) => setProfileForm({ ...profileForm, estimated_delivery_time: e.target.value })}
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">About / Culinary Description</label>
                  <textarea
                    rows={3}
                    value={profileForm.description}
                    onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">City</label>
                    <input
                      type="text"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Area / Neighborhood</label>
                    <input
                      type="text"
                      value={profileForm.area}
                      onChange={(e) => setProfileForm({ ...profileForm, area: e.target.value })}
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={profileForm.lat}
                      onChange={(e) => setProfileForm({ ...profileForm, lat: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={profileForm.lng}
                      onChange={(e) => setProfileForm({ ...profileForm, lng: parseFloat(e.target.value) || 0 })}
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-stone-900">Manual Store Open Status</div>
                    <div className="text-[11px] text-stone-500">Instantly pause incoming orders without altering scheduled hours</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileForm({ ...profileForm, is_open: !profileForm.is_open })}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                      profileForm.is_open 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-stone-300 text-stone-700'
                    }`}
                  >
                    {profileForm.is_open ? 'Accepting Orders' : 'Store Paused'}
                  </button>
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Save Profile Settings
                  </button>
                </div>
              </form>
            )}

            {/* SUBTAB 2: Delivery & Zones */}
            {settingsSubTab === 'delivery' && (
              <div className="space-y-6 max-w-4xl">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">Configured Delivery Zones</h3>
                    <p className="text-xs text-stone-500">Define customer delivery fees and minimum order amounts per coverage zone</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingZoneId(null);
                      setZoneName('');
                      setZoneFee('120');
                      setZoneMinOrder('500');
                      setShowZoneModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Delivery Zone</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {deliveryZonesList.map((zone) => (
                    <div key={zone.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50/50 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-stone-900">{zone.zone_name}</div>
                        <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-3">
                          <span>Fee: <strong className="text-stone-900">{formatCurrency(zone.delivery_fee)}</strong></span>
                          <span>•</span>
                          <span>Min: <strong className="text-stone-900">{formatCurrency(zone.min_order)}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingZoneId(zone.id);
                            setZoneName(zone.zone_name);
                            setZoneFee(String(zone.delivery_fee));
                            setZoneMinOrder(String(zone.min_order));
                            setShowZoneModal(true);
                          }}
                          className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200 rounded-lg"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteZone(zone.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Modal for Add / Edit Delivery Zone */}
                {showZoneModal && (
                  <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
                      <h3 className="text-sm font-bold text-stone-900 mb-1">
                        {editingZoneId ? 'Edit Delivery Zone' : 'Create Delivery Zone'}
                      </h3>
                      <p className="text-xs text-stone-500 mb-4">
                        Set delivery fee and minimum spend thresholds.
                      </p>

                      <form onSubmit={handleSaveZone} className="space-y-3">
                        <div>
                          <label className="block text-xs font-semibold text-stone-700 mb-1">Zone Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. North Sector (0-5 km)"
                            value={zoneName}
                            onChange={(e) => setZoneName(e.target.value)}
                            className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-stone-700 mb-1">Delivery Fee (PKR)</label>
                            <input
                              type="number"
                              required
                              min="0"
                              value={zoneFee}
                              onChange={(e) => setZoneFee(e.target.value)}
                              className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-stone-700 mb-1">Min Order (PKR)</label>
                            <input
                              type="number"
                              required
                              min="0"
                              value={zoneMinOrder}
                              onChange={(e) => setZoneMinOrder(e.target.value)}
                              className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3">
                          <button
                            type="button"
                            onClick={() => setShowZoneModal(false)}
                            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold"
                          >
                            Save Zone
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 3: Operating Hours */}
            {settingsSubTab === 'hours' && (
              <form onSubmit={handleSaveHours} className="space-y-4 max-w-4xl">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">7-Day Kitchen Operating Schedule</h3>
                  <p className="text-xs text-stone-500">Configure opening hours and split shifts. Customers can only place orders when your kitchen is open.</p>
                </div>

                <div className="space-y-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const slot = hoursList.find(h => h.day_of_week === day) || {
                      day_of_week: day,
                      open_time: '10:00:00',
                      close_time: '23:00:00',
                      open_time_2: null,
                      close_time_2: null,
                      is_closed: false,
                    };

                    const isClosed = Boolean(slot.is_closed);

                    const updateSlot = (updates: Partial<RestaurantHourSlot>) => {
                      setHoursList(prev => {
                        const exists = prev.some(h => h.day_of_week === day);
                        if (exists) {
                          return prev.map(h => h.day_of_week === day ? { ...h, ...updates } : h);
                        } else {
                          return [...prev, { ...slot, ...updates }];
                        }
                      });
                    };

                    return (
                      <div key={day} className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="w-28 capitalize font-bold text-xs text-stone-900">
                          {day}
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          <label className="flex items-center gap-1.5 text-xs text-stone-600 font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isClosed}
                              onChange={(e) => updateSlot({ is_closed: e.target.checked })}
                              className="rounded border-stone-300 text-stone-900 focus:ring-0"
                            />
                            <span>Closed</span>
                          </label>

                          {!isClosed && (
                            <>
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-[11px] text-stone-500">Shift 1:</span>
                                <input
                                  type="time"
                                  value={(slot.open_time || '10:00:00').substring(0, 5)}
                                  onChange={(e) => updateSlot({ open_time: `${e.target.value}:00` })}
                                  className="text-xs p-1.5 bg-white border border-stone-200 rounded-lg font-mono"
                                />
                                <span className="text-stone-400">to</span>
                                <input
                                  type="time"
                                  value={(slot.close_time || '22:00:00').substring(0, 5)}
                                  onChange={(e) => updateSlot({ close_time: `${e.target.value}:00` })}
                                  className="text-xs p-1.5 bg-white border border-stone-200 rounded-lg font-mono"
                                />
                              </div>

                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-[11px] text-stone-500">Shift 2 (Split):</span>
                                <input
                                  type="time"
                                  value={slot.open_time_2 ? slot.open_time_2.substring(0, 5) : ''}
                                  onChange={(e) => updateSlot({ open_time_2: e.target.value ? `${e.target.value}:00` : null })}
                                  placeholder="--:--"
                                  className="text-xs p-1.5 bg-white border border-stone-200 rounded-lg font-mono"
                                />
                                <span className="text-stone-400">to</span>
                                <input
                                  type="time"
                                  value={slot.close_time_2 ? slot.close_time_2.substring(0, 5) : ''}
                                  onChange={(e) => updateSlot({ close_time_2: e.target.value ? `${e.target.value}:00` : null })}
                                  placeholder="--:--"
                                  className="text-xs p-1.5 bg-white border border-stone-200 rounded-lg font-mono"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Save Operating Schedule
                  </button>
                </div>
              </form>
            )}

            {/* SUBTAB 4: Brand Media */}
            {settingsSubTab === 'media' && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Brand Media Assets</h3>
                  <p className="text-xs text-stone-500">Provide high-resolution image URLs or uploads for your restaurant storefront</p>
                </div>

                {/* Logo */}
                <div className="p-4 bg-stone-50/50 rounded-2xl border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-stone-900">Restaurant Logo</div>
                      <div className="text-[11px] text-stone-500">Square aspect ratio (1:1), PNG or JPG</div>
                    </div>
                    {mediaLogoUrl && (
                      <img src={mediaLogoUrl} alt="Logo Preview" className="w-12 h-12 object-cover rounded-xl border border-stone-200" />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="https://.../logo.png"
                      value={mediaLogoUrl}
                      onChange={(e) => setMediaLogoUrl(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveMedia('logo')}
                      className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Update Logo
                    </button>
                  </div>
                </div>

                {/* Cover Image */}
                <div className="p-4 bg-stone-50/50 rounded-2xl border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-stone-900">Storefront Cover Banner</div>
                      <div className="text-[11px] text-stone-500">Landscape 16:9 banner for restaurant page header</div>
                    </div>
                    {mediaCoverUrl && (
                      <img src={mediaCoverUrl} alt="Cover Preview" className="w-20 h-12 object-cover rounded-xl border border-stone-200" />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="https://.../cover.jpg"
                      value={mediaCoverUrl}
                      onChange={(e) => setMediaCoverUrl(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveMedia('cover_image')}
                      className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                    >
                      Update Cover
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 5: Cuisines */}
            {settingsSubTab === 'cuisines' && (
              <div className="space-y-4 max-w-3xl">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Assign Cuisines</h3>
                  <p className="text-xs text-stone-500">Select which cuisine categories your kitchen serves to help customers discover you</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {allCuisines.map((c) => {
                    const currentCuisines = (selectedRestaurant.cuisines || []);
                    const isSelected = currentCuisines.some((existing: any) => 
                      (typeof existing === 'object' && existing.id === c.id) ||
                      existing === c.name ||
                      existing === c.slug
                    );

                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => handleToggleCuisine(c.id)}
                        className={`p-2.5 rounded-xl text-xs font-semibold border text-left transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold' 
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}{c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Staff Accounts */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <div className="mb-6">
            <h2 className="text-base font-bold text-stone-900">Kitchen Staff Accounts</h2>
            <p className="text-xs text-stone-500">Staff accounts can transition order stages and view kitchen tickets without access to financial commission settings.</p>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600">
            Kitchen staff permissions are assigned per restaurant branch. Staff users log in with their credential tokens and access authoritative tickets filtered by their branch identity.
          </div>
        </div>
      )}
    </div>
  );
};

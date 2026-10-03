import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Restaurant, Rider, Coupon, OrderStatus } from '../../types';
import { adminApi, AdminDashboardMetrics, AdminCustomer } from '../../services/api/adminApi';
import { 
  ShieldCheck, 
  Store, 
  Bike, 
  ShoppingBag, 
  DollarSign, 
  Tag, 
  FileText, 
  Settings as SettingsIcon, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Download, 
  Plus, 
  MapPin, 
  Star, 
  Search,
  Sliders,
  Sparkles,
  Users
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { 
    currentUser, 
    restaurants, 
    setRestaurantStatus, 
    updateCommission, 
    orders, 
    updateOrderStatus, 
    riders, 
    assignRiderToOrder, 
    unassignRiderFromOrder,
    autoDispatchRider, 
    financials, 
    coupons, 
    addCoupon, 
    toggleCoupon, 
    reviews, 
    toggleReviewApproval, 
    auditLogs, 
    settings, 
    updateSettings, 
    deliveryZones, 
    updateDeliveryZone, 
    cmsPages, 
    updateCMSPage, 
    formatCurrency,
    showToast,
    refreshData,
    openAuthModal
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'analytics' | 'restaurants' | 'riders' | 'orders' | 'customers' | 'coupons' | 'financials' | 'reviews' | 'zones' | 'cms' | 'audit' | 'settings'
  >('analytics');

  // Backend-authoritative Dashboard Metrics
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Customer Management States
  const [customersList, setCustomersList] = useState<AdminCustomer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState('all');
  const [customersLoading, setCustomersLoading] = useState(false);

  // Restaurant Management States (Phase 6 Authoritative)
  const [adminRestaurants, setAdminRestaurants] = useState<any[]>([]);
  const [adminRestStatusFilter, setAdminRestStatusFilter] = useState('all');
  const [adminRestSearch, setAdminRestSearch] = useState('');
  const [adminRestLoading, setAdminRestLoading] = useState(false);
  const [statusReasonModal, setStatusReasonModal] = useState<{ id: number | string; action: 'reject' | 'suspend'; name: string } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [inspectingRestaurant, setInspectingRestaurant] = useState<any | null>(null);
  const [inspectingRestLoading, setInspectingRestLoading] = useState(false);

  // Delivery Zones States (Phase 6 Authoritative)
  const [adminZones, setAdminZones] = useState<any[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [zoneForm, setZoneForm] = useState({ name: '', city: 'Lahore', radius_km: 10, base_fee: 100, per_km_fee: 15 });
  const [zoneSaving, setZoneSaving] = useState(false);

  // Platform Settings States (Phase 6 Authoritative)
  const [settingsForm, setSettingsForm] = useState({
    app_name: 'Fastflow',
    currency_code: 'PKR',
    currency_symbol: 'Rs.',
    default_tax_percentage: '5',
    default_commission_rate: '15',
    default_base_delivery_fee: '120',
    default_service_fee: '30',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Orders Management States (Phase 6 Authoritative)
  const [adminOrders, setAdminOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [inspectingOrder, setInspectingOrder] = useState<any | null>(null);

  // Rider Management Modal States
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [riderFormLoading, setRiderFormLoading] = useState(false);
  const [newRiderName, setNewRiderName] = useState('');
  const [newRiderEmail, setNewRiderEmail] = useState('');
  const [newRiderPhone, setNewRiderPhone] = useState('');
  const [newRiderPassword, setNewRiderPassword] = useState('');
  const [newRiderVehicleType, setNewRiderVehicleType] = useState<'Motorcycle' | 'Bicycle' | 'Scooter' | 'Car'>('Motorcycle');
  const [newRiderVehicleNumber, setNewRiderVehicleNumber] = useState('');
  const [newRiderCommission, setNewRiderCommission] = useState('100');
  const [selectedRiderForOrder, setSelectedRiderForOrder] = useState<Record<string, string>>({});

  const fetchDashboardMetrics = async () => {
    setMetricsLoading(true);
    try {
      const res = await adminApi.getDashboardMetrics();
      if (res.success && res.data?.metrics) {
        setMetrics(res.data.metrics);
      }
    } catch {
      // Ignored
    } finally {
      setMetricsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    setCustomersLoading(true);
    try {
      const res = await adminApi.getCustomers({
        search: customerSearch.trim() || undefined,
        status: customerStatusFilter !== 'all' ? customerStatusFilter : undefined,
      });
      if (res.success && res.data) {
        setCustomersList(res.data.data || []);
      }
    } catch {
      // Ignored
    } finally {
      setCustomersLoading(false);
    }
  };

  const fetchAdminRestaurants = async () => {
    setAdminRestLoading(true);
    try {
      const res = await adminApi.getRestaurants({
        status: adminRestStatusFilter !== 'all' ? adminRestStatusFilter : undefined,
        search: adminRestSearch.trim() || undefined,
      });
      if (res.success && res.data) {
        setAdminRestaurants(Array.isArray(res.data) ? res.data : (res.data.data || []));
      }
    } catch {
      // Ignored
    } finally {
      setAdminRestLoading(false);
    }
  };

  const fetchAdminZones = async () => {
    setZonesLoading(true);
    try {
      const res = await adminApi.getDeliveryZones();
      if (res.success && res.data) {
        setAdminZones(res.data);
      }
    } catch {
      // Ignored
    } finally {
      setZonesLoading(false);
    }
  };

  const fetchAdminSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await adminApi.getSettings();
      if (res.success && res.data) {
        setSettingsForm({
          app_name: res.data.app_name || 'Fastflow',
          currency_code: res.data.currency_code || 'PKR',
          currency_symbol: res.data.currency_symbol || 'Rs.',
          default_tax_percentage: res.data.default_tax_percentage || '5',
          default_commission_rate: res.data.default_commission_rate || '15',
          default_base_delivery_fee: res.data.default_base_delivery_fee || '120',
          default_service_fee: res.data.default_service_fee || '30',
        });
      }
    } catch {
      // Ignored
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchAdminOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await adminApi.getOrders({
        search: orderSearch.trim() || undefined,
        order_status: orderStatusFilter !== 'all' ? orderStatusFilter : undefined,
      });
      if (res.success && res.data) {
        setAdminOrders(Array.isArray(res.data) ? res.data : (res.data.data || []));
      }
    } catch {
      // Ignored
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
    fetchAdminSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'customers') {
      fetchCustomers();
    } else if (activeTab === 'restaurants') {
      fetchAdminRestaurants();
    } else if (activeTab === 'zones') {
      fetchAdminZones();
    } else if (activeTab === 'settings') {
      fetchAdminSettings();
    } else if (activeTab === 'orders') {
      fetchAdminOrders();
    }
  }, [activeTab, customerStatusFilter, adminRestStatusFilter, orderStatusFilter]);

  const handleApproveRestaurant = async (id: number | string) => {
    try {
      const res = await adminApi.approveRestaurant(id);
      if (res.success) {
        showToast('Restaurant approved and activated successfully', 'success');
        fetchAdminRestaurants();
        fetchDashboardMetrics();
      } else {
        showToast(res.message || 'Approval failed', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Approval failed', 'error');
    }
  };

  const handleReactivateRestaurant = async (id: number | string) => {
    try {
      const res = await adminApi.reactivateRestaurant(id);
      if (res.success) {
        showToast('Restaurant reactivated successfully', 'success');
        fetchAdminRestaurants();
        fetchDashboardMetrics();
      } else {
        showToast(res.message || 'Reactivation failed', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Reactivation failed', 'error');
    }
  };

  const handleConfirmStatusReason = async () => {
    if (!statusReasonModal) return;
    const { id, action, name } = statusReasonModal;
    try {
      const res = action === 'reject' 
        ? await adminApi.rejectRestaurant(id, actionReason || 'Compliance failure')
        : await adminApi.suspendRestaurant(id, actionReason || 'Operational suspension');
      if (res.success) {
        showToast(`Restaurant ${name} ${action === 'reject' ? 'rejected' : 'suspended'} successfully`, 'info');
        setStatusReasonModal(null);
        setActionReason('');
        fetchAdminRestaurants();
        fetchDashboardMetrics();
      } else {
        showToast(res.message || `Failed to ${action} restaurant`, 'error');
      }
    } catch (err: any) {
      showToast(err?.message || `Failed to ${action} restaurant`, 'error');
    }
  };

  const handleInspectRestaurant = async (id: number | string) => {
    setInspectingRestLoading(true);
    try {
      const res = await adminApi.getRestaurant(id);
      if (res.success && res.data) {
        setInspectingRestaurant(res.data);
      }
    } catch {
      showToast('Failed to load restaurant details', 'error');
    } finally {
      setInspectingRestLoading(false);
    }
  };

  const handleInspectOrder = async (orderId: number | string) => {
    try {
      const res = await adminApi.getOrder(orderId);
      if (res.success && res.data) {
        setInspectingOrder(res.data);
      }
    } catch {
      showToast('Failed to load order snapshot', 'error');
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      const res = await adminApi.updateSettings(settingsForm);
      if (res.success) {
        showToast('Platform settings saved successfully to server', 'success');
        updateSettings({
          appName: settingsForm.app_name,
          currencyCode: settingsForm.currency_code,
          currencySymbol: settingsForm.currency_symbol,
          taxPercentage: parseFloat(settingsForm.default_tax_percentage) || 5,
          defaultCommissionRate: parseFloat(settingsForm.default_commission_rate) || 15,
        });
      } else {
        showToast(res.message || 'Failed to save settings', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to save settings', 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    setZoneSaving(true);
    try {
      const res = await adminApi.createDeliveryZone({
        name: zoneForm.name,
        city: zoneForm.city,
        radius_km: Number(zoneForm.radius_km),
        base_fee: Number(zoneForm.base_fee),
        per_km_fee: Number(zoneForm.per_km_fee),
        is_active: true,
      });
      if (res.success) {
        showToast(`Delivery zone ${zoneForm.name} created`, 'success');
        setShowZoneModal(false);
        setZoneForm({ name: '', city: 'Lahore', radius_km: 10, base_fee: 100, per_km_fee: 15 });
        fetchAdminZones();
      } else {
        showToast(res.message || 'Failed to create zone', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to create zone', 'error');
    } finally {
      setZoneSaving(false);
    }
  };

  const handleDeleteZone = async (zoneId: number, zoneName: string) => {
    try {
      const res = await adminApi.deleteDeliveryZone(zoneId);
      if (res.success) {
        showToast(`Delivery zone ${zoneName} deleted`, 'info');
        fetchAdminZones();
      } else {
        showToast(res.message || 'Failed to delete zone', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete zone', 'error');
    }
  };

  // Restaurant commission modal
  const [editingCommissionRest, setEditingCommissionRest] = useState<Restaurant | null>(null);
  const [newCommissionRate, setNewCommissionRate] = useState<number>(15);

  // New coupon modal
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'percentage' | 'fixed'>('percentage');
  const [newCouponValue, setNewCouponValue] = useState('20');
  const [newCouponMinOrder, setNewCouponMinOrder] = useState('1000');
  const [newCouponDesc, setNewCouponDesc] = useState('');

  // CMS edit state
  const [selectedCMSPage, setSelectedCMSPage] = useState(cmsPages[0]);
  const [cmsContentEdit, setCmsContentEdit] = useState(cmsPages[0].content);

  const handleCreateRiderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRiderName || !newRiderEmail || !newRiderPhone || !newRiderPassword || !newRiderVehicleNumber) {
      showToast('Please fill out all required courier fields.', 'error');
      return;
    }

    setRiderFormLoading(true);
    try {
      const res = await adminApi.createRider({
        name: newRiderName,
        email: newRiderEmail,
        phone: newRiderPhone,
        password: newRiderPassword,
        vehicle_type: newRiderVehicleType,
        vehicle_number: newRiderVehicleNumber,
        commission_per_delivery: parseFloat(newRiderCommission) || 100,
      });

      if (res.success) {
        showToast(`Courier ${newRiderName} registered successfully!`, 'success');
        setShowRiderModal(false);
        setNewRiderName('');
        setNewRiderEmail('');
        setNewRiderPhone('');
        setNewRiderPassword('');
        setNewRiderVehicleNumber('');
        await refreshData();
      } else {
        showToast(res.message || 'Failed to register courier', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to register courier', 'error');
    } finally {
      setRiderFormLoading(false);
    }
  };

  const handleUpdateRiderStatus = async (riderId: string, status: string) => {
    try {
      const res = await adminApi.updateRider(riderId, { status });
      if (res.success) {
        showToast(`Courier status updated to ${status}`, 'info');
        await refreshData();
      } else {
        showToast(res.message || 'Failed to update courier status', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to update courier status', 'error');
    }
  };

  const handleDeactivateRider = async (riderId: string) => {
    try {
      const res = await adminApi.deleteRider(riderId);
      if (res.success) {
        showToast('Courier safely deactivated/archived', 'info');
        await refreshData();
      } else {
        showToast(res.message || 'Failed to deactivate courier', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to deactivate courier', 'error');
    }
  };

  const [orderActionLoading, setOrderActionLoading] = useState<Record<string, boolean>>({});

  const handleManualAssign = async (orderId: string) => {
    const targetRiderId = selectedRiderForOrder[orderId];
    if (!targetRiderId) {
      showToast('Please select a courier from the dropdown first.', 'error');
      return;
    }
    setOrderActionLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      await assignRiderToOrder(orderId, targetRiderId);
    } finally {
      setOrderActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleAutoDispatch = async (orderId: string) => {
    setOrderActionLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      await autoDispatchRider(orderId);
    } finally {
      setOrderActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleUnassignCourier = async (orderId: string) => {
    setOrderActionLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      await unassignRiderFromOrder(orderId);
    } finally {
      setOrderActionLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleSaveCommission = () => {
    if (editingCommissionRest) {
      updateCommission(editingCommissionRest.id, newCommissionRate, 'percentage');
      setEditingCommissionRest(null);
    }
  };

  const handleCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode) return;

    const c: Coupon = {
      id: `c-${Date.now()}`,
      code: newCouponCode.trim().toUpperCase(),
      discountType: newCouponType,
      discountValue: parseFloat(newCouponValue) || 10,
      minOrder: parseFloat(newCouponMinOrder) || 0,
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      usageLimit: 1000,
      timesUsed: 0,
      isActive: true,
      description: newCouponDesc || `${newCouponValue}${newCouponType === 'percentage' ? '%' : ' flat'} discount`
    };

    addCoupon(c);
    setShowCouponModal(false);
    setNewCouponCode('');
  };

  const exportFinancialsCSV = () => {
    const headers = ['Order Number,Restaurant,Gross Amount,Platform Commission,Restaurant Payout,Delivery Fee,Rider Payout,Date\n'];
    const rows = financials.map(f => 
      `"${f.orderNumber}","${f.restaurantName}",${f.grossAmount},${f.platformCommission},${f.restaurantPayout},${f.deliveryFee},${f.riderPayout},"${f.createdAt}"\n`
    );
    const blob = new Blob([headers.concat(rows).join('')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dineflow_financial_ledger.csv';
    a.click();
  };

  if (!currentUser || currentUser.role !== 'super_admin') {
    return (
      <div className="max-w-4xl mx-auto pb-24 px-4">
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
          <ShieldCheck className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">Super Administrator Access Required</h3>
          <p className="text-xs text-stone-500 mt-1 mb-6 max-w-sm mx-auto">
            This governance hub requires authenticated Sanctum credentials with the `super_admin` role.
          </p>
          <button
            onClick={() => openAuthModal('login')}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Sign In as Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8">
      
      {/* Super Admin Top Header */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Master Governance Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Super Administrator Hub
          </h1>
          <p className="text-xs text-stone-400 mt-1 max-w-xl">
            Logged in as {currentUser?.name}. Full granular RBAC access to commissions, culinary approvals, rider dispatch algorithm, audit trails, and multi-currency controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportFinancialsCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold transition-colors border border-stone-700 shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export Ledger (CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Backend Authoritative) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Platform GMV</div>
          <div className="text-xl font-extrabold text-stone-900 font-mono tabular-nums mt-1">
            {metrics ? formatCurrency(metrics.total_gmv) : (metricsLoading ? '...' : formatCurrency(0))}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Today: {metrics ? formatCurrency(metrics.today_gmv) : (metricsLoading ? '...' : formatCurrency(0))}</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Net Commission</div>
          <div className="text-xl font-extrabold text-emerald-600 font-mono tabular-nums mt-1">
            {metrics ? formatCurrency(metrics.total_commission) : (metricsLoading ? '...' : formatCurrency(0))}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Today: {metrics ? formatCurrency(metrics.today_commission) : (metricsLoading ? '...' : formatCurrency(0))}</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Orders Placed</div>
          <div className="text-xl font-extrabold text-stone-900 font-mono tabular-nums mt-1">
            {metrics ? metrics.total_orders : (metricsLoading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">{metrics?.today_orders ?? 0} today · {metrics?.active_deliveries ?? 0} in route</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Approved Kitchens</div>
          <div className="text-xl font-extrabold text-amber-600 font-mono tabular-nums mt-1">
            {metrics ? metrics.approved_restaurants : (metricsLoading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">{metrics?.pending_restaurant_approvals ?? 0} pending review</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Active Courier Fleet</div>
          <div className="text-xl font-extrabold text-indigo-600 font-mono tabular-nums mt-1">
            {metrics ? metrics.active_riders : (metricsLoading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">{metrics?.total_riders ?? 0} couriers total</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Total Customers</div>
          <div className="text-xl font-extrabold text-blue-600 font-mono tabular-nums mt-1">
            {metrics ? metrics.total_customers : (metricsLoading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">{metrics?.active_customers ?? 0} active accounts</div>
        </div>
      </div>

      {/* Admin Module Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-stone-200 mb-8 scrollbar-none">
        {[
          { id: 'analytics', label: 'Analytics & Revenue', icon: <DollarSign className="w-3.5 h-3.5" /> },
          { id: 'restaurants', label: 'Kitchens & Commissions', icon: <Store className="w-3.5 h-3.5" /> },
          { id: 'riders', label: 'Riders & Dispatch', icon: <Bike className="w-3.5 h-3.5" /> },
          { id: 'orders', label: 'All Orders', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
          { id: 'customers', label: 'Customers', icon: <Users className="w-3.5 h-3.5" /> },
          { id: 'coupons', label: 'Coupons & Vouchers', icon: <Tag className="w-3.5 h-3.5" /> },
          { id: 'financials', label: 'Financial Transactions', icon: <DollarSign className="w-3.5 h-3.5" /> },
          { id: 'reviews', label: 'Reviews Moderation', icon: <Star className="w-3.5 h-3.5" /> },
          { id: 'zones', label: 'Delivery Zones', icon: <MapPin className="w-3.5 h-3.5" /> },
          { id: 'cms', label: 'CMS & Policies', icon: <FileText className="w-3.5 h-3.5" /> },
          { id: 'audit', label: 'Immutable Audit Log', icon: <Clock className="w-3.5 h-3.5" /> },
          { id: 'settings', label: 'Platform Settings', icon: <SettingsIcon className="w-3.5 h-3.5" /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB: Analytics & Revenue */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Visual Revenue SVG Chart */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Merchandise Volume Trend</h3>
                  <p className="text-xs text-stone-500">Gross sales across rolling days</p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600">+18.4% vs last week</span>
              </div>

              {/* Clean SVG Area Chart */}
              <div className="h-48 w-full pt-4">
                <svg className="w-full h-full" viewBox="0 0 500 160">
                  <defs>
                    <linearGradient id="gradRevenue" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#d97706" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#d97706" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0,140 Q 60,110 120,120 T 240,70 T 360,50 T 500,20 L 500,160 L 0,160 Z"
                    fill="url(#gradRevenue)"
                  />
                  <path
                    d="M 0,140 Q 60,110 120,120 T 240,70 T 360,50 T 500,20"
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  {/* Data Points */}
                  <circle cx="120" cy="120" r="4" fill="#d97706" />
                  <circle cx="240" cy="70" r="4" fill="#d97706" />
                  <circle cx="360" cy="50" r="4" fill="#d97706" />
                  <circle cx="500" cy="20" r="4" fill="#d97706" />
                </svg>
              </div>

              <div className="flex justify-between text-[11px] text-stone-400 font-mono pt-3 border-t border-stone-100">
                <span>Mon (Rs. 18.2k)</span>
                <span>Wed (Rs. 24.5k)</span>
                <span>Fri (Rs. 38.9k)</span>
                <span>Sun (Rs. 52.4k)</span>
              </div>
            </div>

            {/* Kitchen Share Breakdown */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-stone-900 mb-1">Partner Order Distribution</h3>
              <p className="text-xs text-stone-500 mb-4">Volume throughput by verified kitchen</p>

              <div className="space-y-4">
                {restaurants.map((rest) => {
                  const restOrders = orders.filter(o => o.restaurantId === rest.id);
                  const pct = Math.max(15, Math.round((restOrders.length / Math.max(1, orders.length)) * 100));

                  return (
                    <div key={rest.id}>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-stone-800">{rest.name}</span>
                        <span className="font-mono text-stone-600">{pct}% ({restOrders.length} orders)</span>
                      </div>
                      <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Kitchens & Commission */}
      {activeTab === 'restaurants' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-stone-900">Partner Kitchen Applications & Rates</h2>
              <p className="text-xs text-stone-500">Approve new restaurant applications, manage suspensions/rejections, and configure commission rates</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={adminRestSearch}
                  onChange={(e) => setAdminRestSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAdminRestaurants()}
                  placeholder="Search kitchens..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl w-48 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <select
                value={adminRestStatusFilter}
                onChange={(e) => setAdminRestStatusFilter(e.target.value)}
                className="text-xs py-1.5 px-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Approvals</option>
                <option value="approved">Approved</option>
                <option value="suspended">Suspended</option>
                <option value="rejected">Rejected</option>
              </select>

              <button
                onClick={fetchAdminRestaurants}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Filter
              </button>
            </div>
          </div>

          {adminRestLoading ? (
            <div className="py-12 text-center text-xs text-stone-400">Loading kitchens directory...</div>
          ) : adminRestaurants.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-500">No restaurants match your query.</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {adminRestaurants.map((rest: any) => {
                const status = rest.status;
                const isApproved = status === 'approved';
                const isPending = status === 'pending';
                const isSuspended = status === 'suspended';
                const isRejected = status === 'rejected';

                return (
                  <div key={rest.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={rest.cover_image || rest.coverImage || '/placeholder.png'}
                        alt={rest.name}
                        className="w-14 h-14 rounded-xl object-cover border border-stone-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-stone-900">{rest.name}</h4>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isApproved ? 'bg-emerald-50 text-emerald-700' :
                            isPending ? 'bg-amber-50 text-amber-700' :
                            isSuspended ? 'bg-red-50 text-red-700' :
                            'bg-stone-100 text-stone-600'
                          }`}>
                            {status}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {rest.city} · Base fee: {formatCurrency(Number(rest.delivery_fee ?? rest.deliveryFee ?? 0))}
                          {rest.owner && ` · Owner: ${rest.owner.name} (${rest.owner.email})`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs text-stone-500 block">Commission Tier</span>
                        <button
                          onClick={() => {
                            setEditingCommissionRest(rest);
                            setNewCommissionRate(Number(rest.commission_rate ?? rest.commissionRate ?? 15));
                          }}
                          className="text-xs font-mono font-bold text-amber-600 hover:underline"
                        >
                          {rest.commission_rate ?? rest.commissionRate ?? 15}% {rest.commission_type ?? rest.commissionType ?? 'percentage'} (Edit)
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleInspectRestaurant(rest.id)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
                        >
                          Details
                        </button>

                        {isPending && (
                          <>
                            <button
                              onClick={() => handleApproveRestaurant(rest.id)}
                              className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setStatusReasonModal({ id: rest.id, action: 'reject', name: rest.name })}
                              className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {isApproved && (
                          <button
                            onClick={() => setStatusReasonModal({ id: rest.id, action: 'suspend', name: rest.name })}
                            className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            Suspend
                          </button>
                        )}

                        {isSuspended && (
                          <>
                            <button
                              onClick={() => handleReactivateRestaurant(rest.id)}
                              className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors"
                            >
                              Reactivate
                            </button>
                            <button
                              onClick={() => setStatusReasonModal({ id: rest.id, action: 'reject', name: rest.name })}
                              className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {isRejected && (
                          <button
                            onClick={() => handleReactivateRestaurant(rest.id)}
                            className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Restaurant Status Reason Modal (Reject / Suspend) */}
          {statusReasonModal && (
            <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200">
                <h3 className="text-base font-bold text-stone-900 mb-1 capitalize">
                  {statusReasonModal.action} Restaurant
                </h3>
                <p className="text-xs text-stone-500 mb-4">
                  Please provide a documented reason for this administrative action regarding <strong>{statusReasonModal.name}</strong>.
                </p>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Audit Log Reason
                  </label>
                  <textarea
                    rows={3}
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="e.g. Health code violation, unresponsive management, failed onboarding inspection..."
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setStatusReasonModal(null);
                      setActionReason('');
                    }}
                    className="px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmStatusReason}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs capitalize"
                  >
                    Confirm {statusReasonModal.action}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Restaurant Details Modal */}
          {inspectingRestaurant && (
            <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-stone-900">{inspectingRestaurant.restaurant?.name}</h3>
                    <p className="text-xs text-stone-500">{inspectingRestaurant.restaurant?.city} · {inspectingRestaurant.restaurant?.area}</p>
                  </div>
                  <span className="text-xs font-bold uppercase px-2 py-0.5 bg-stone-100 rounded">
                    {inspectingRestaurant.restaurant?.status}
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <h4 className="font-bold text-stone-900 mb-1">Owner & Contact</h4>
                    <p className="text-stone-600">Owner: {inspectingRestaurant.restaurant?.owner?.name || 'N/A'}</p>
                    <p className="text-stone-600">Email: {inspectingRestaurant.restaurant?.owner?.email || 'N/A'}</p>
                    <p className="text-stone-600">Phone: {inspectingRestaurant.restaurant?.owner?.phone || inspectingRestaurant.restaurant?.phone || 'N/A'}</p>
                  </div>

                  <div>
                    <h4 className="font-bold text-stone-900 mb-1">Operational Summary</h4>
                    <div className="grid grid-cols-3 gap-2 text-center p-3 bg-stone-50 rounded-xl">
                      <div>
                        <div className="text-[10px] text-stone-400">Total Revenue</div>
                        <div className="font-bold text-stone-900 font-mono">{formatCurrency(inspectingRestaurant.stats?.total_revenue ?? 0)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-stone-400">Total Orders</div>
                        <div className="font-bold text-stone-900 font-mono">{inspectingRestaurant.stats?.total_orders ?? 0}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-stone-400">Menu Items</div>
                        <div className="font-bold text-stone-900 font-mono">{inspectingRestaurant.stats?.total_products ?? 0}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-stone-900 mb-1">Delivery Configuration</h4>
                    <p className="text-stone-600">Service Radius: {inspectingRestaurant.restaurant?.service_radius_km ?? 10} km</p>
                    <p className="text-stone-600">Base Delivery Fee: {formatCurrency(Number(inspectingRestaurant.restaurant?.delivery_fee ?? 0))}</p>
                    <p className="text-stone-600">Minimum Order: {formatCurrency(Number(inspectingRestaurant.restaurant?.minimum_order ?? 0))}</p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setInspectingRestaurant(null)}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Commission Modal */}
          {editingCommissionRest && (
            <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200">
                <h3 className="text-base font-bold text-stone-900 mb-1">
                  Adjust Commission: {editingCommissionRest.name}
                </h3>
                <p className="text-xs text-stone-500 mb-4">
                  Set platform revenue share percentage for every order routed through this kitchen.
                </p>

                <div className="mb-4">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Commission Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="40"
                    value={newCommissionRate}
                    onChange={(e) => setNewCommissionRate(parseInt(e.target.value, 10) || 15)}
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-base font-bold"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setEditingCommissionRest(null)}
                    className="px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (editingCommissionRest) {
                        try {
                          const res = await adminApi.updateCommission(editingCommissionRest.id, newCommissionRate, 'percentage');
                          if (res.success) {
                            showToast('Commission rate updated successfully', 'success');
                            setEditingCommissionRest(null);
                            fetchAdminRestaurants();
                          } else {
                            showToast(res.message || 'Failed to update commission', 'error');
                          }
                        } catch (err: any) {
                          showToast(err?.message || 'Failed to update commission', 'error');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    Save Rate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Riders & Smart Dispatch */}
      {activeTab === 'riders' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-stone-900">Courier Fleet & Automated Dispatch</h2>
              <p className="text-xs text-stone-500">Monitor live courier fleet, register new drivers, update availability, and assign delivery jobs</p>
            </div>
            <button
              onClick={() => setShowRiderModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Courier</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {riders.map((r) => {
              const isAvailable = r.status === 'available';
              const isSuspended = r.status === 'suspended';

              return (
                <div key={r.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">
                          <Bike className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-stone-900">{r.name}</h4>
                          <span className="text-[10px] text-stone-500">{r.phone}</span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isAvailable 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : isSuspended 
                          ? 'bg-red-50 text-red-700' 
                          : 'bg-stone-200 text-stone-600'
                      }`}>
                        {r.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-stone-600 my-2 pt-2 border-t border-stone-200/60">
                      <div>Vehicle: <strong>{r.vehicle}</strong> ({r.vehicleNumber})</div>
                      <div>Active In-Route: <strong className="font-mono text-amber-700">{r.assignedOrderCount}</strong></div>
                      <div>Total Deliveries: <strong className="font-mono">{r.totalDeliveries}</strong></div>
                      <div>Rating: <strong className="text-amber-600">{r.rating} ★</strong></div>
                      <div>Fee / Drop: <strong className="font-mono">{formatCurrency(r.commissionPerDelivery || 100)}</strong></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-3 border-t border-stone-200 text-[11px]">
                    {isSuspended ? (
                      <button
                        onClick={() => handleUpdateRiderStatus(r.id, 'available')}
                        className="text-emerald-700 font-bold hover:underline cursor-pointer"
                      >
                        Activate Driver
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateRiderStatus(r.id, 'suspended')}
                        className="text-amber-700 font-semibold hover:underline cursor-pointer"
                      >
                        Suspend Driver
                      </button>
                    )}

                    <button
                      onClick={() => handleDeactivateRider(r.id)}
                      className="text-red-600 font-semibold hover:underline cursor-pointer"
                    >
                      Archive Driver
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Unassigned Orders Queue with Manual & Auto-Dispatch */}
          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3">
            Orders Requiring Courier Assignment
          </h3>

          <div className="space-y-3">
            {orders.filter(o => !o.riderId && !['delivered', 'cancelled'].includes(o.orderStatus)).length === 0 ? (
              <p className="text-xs text-stone-500 py-3">All active orders have been assigned to couriers.</p>
            ) : (
              orders.filter(o => !o.riderId && !['delivered', 'cancelled'].includes(o.orderStatus)).map((ord) => {
                const availableRiders = riders.filter(r => r.status === 'available' || r.status === 'busy');

                return (
                  <div key={ord.id} className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-stone-900">{ord.orderNumber}</span>
                        <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                          {ord.orderStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-0.5">
                        {ord.restaurantName} → {ord.deliveryAddress.area}, {ord.deliveryAddress.city}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={selectedRiderForOrder[ord.id] || ''}
                        onChange={(e) => setSelectedRiderForOrder(prev => ({ ...prev, [ord.id]: e.target.value }))}
                        className="text-xs p-2 bg-white border border-stone-200 rounded-xl"
                      >
                        <option value="">Select Available Courier...</option>
                        {availableRiders.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.vehicle} - {r.status})
                          </option>
                        ))}
                      </select>

                      <button
                        disabled={Boolean(orderActionLoading[ord.id])}
                        onClick={() => handleManualAssign(ord.id)}
                        className="px-3 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        {orderActionLoading[ord.id] ? 'Assigning...' : 'Assign Selected'}
                      </button>

                      <button
                        disabled={Boolean(orderActionLoading[ord.id])}
                        onClick={() => handleAutoDispatch(ord.id)}
                        className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{orderActionLoading[ord.id] ? 'Dispatching...' : 'Auto-Dispatch'}</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Assigned Orders Queue with Unassign Courier Action */}
          <div className="mt-8 pt-6 border-t border-stone-200">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3">
              Assigned Couriers & Active Deliveries
            </h3>

            <div className="space-y-3">
              {orders.filter(o => o.riderId && !['delivered', 'cancelled'].includes(o.orderStatus)).length === 0 ? (
                <p className="text-xs text-stone-500 py-2">No active courier assignments at this time.</p>
              ) : (
                orders.filter(o => o.riderId && !['delivered', 'cancelled'].includes(o.orderStatus)).map((ord) => {
                  const assignedRider = riders.find(r => r.id === ord.riderId);
                  const isTransitStarted = ['on_the_way', 'delivered'].includes(ord.orderStatus);

                  return (
                    <div key={ord.id} className="p-4 bg-stone-50 border border-stone-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-stone-900">{ord.orderNumber}</span>
                          <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                            {ord.orderStatus.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 mt-0.5">
                          {ord.restaurantName} → {ord.deliveryAddress.area}, {ord.deliveryAddress.city}
                        </p>
                        <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-2">
                          <Bike className="w-3.5 h-3.5 text-amber-600" />
                          <span>Assigned Courier: <strong>{ord.riderName || assignedRider?.name || 'Assigned Courier'}</strong> ({ord.riderPhone || assignedRider?.phone || 'No phone'})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isTransitStarted ? (
                          <span className="text-xs font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                            Transit In-Progress (Cannot Unassign)
                          </span>
                        ) : (
                          <button
                            disabled={Boolean(orderActionLoading[ord.id])}
                            onClick={() => handleUnassignCourier(ord.id)}
                            className="px-3.5 py-2 bg-stone-200 hover:bg-red-100 disabled:opacity-50 text-red-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                          >
                            {orderActionLoading[ord.id] ? 'Unassigning...' : 'Unassign Courier'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Create Courier Modal */}
          {showRiderModal && (
            <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
                <h3 className="text-base font-bold text-stone-900 mb-1">Register New Delivery Courier</h3>
                <p className="text-xs text-stone-500 mb-4">
                  Create an authenticated courier profile with vehicle registration and per-drop commission.
                </p>

                <form onSubmit={handleCreateRiderSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newRiderName}
                      onChange={(e) => setNewRiderName(e.target.value)}
                      placeholder="e.g. Tariq Khan"
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={newRiderEmail}
                        onChange={(e) => setNewRiderEmail(e.target.value)}
                        placeholder="rider@fastflow.app"
                        className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        required
                        value={newRiderPhone}
                        onChange={(e) => setNewRiderPhone(e.target.value)}
                        placeholder="0300-1234567"
                        className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={newRiderPassword}
                      onChange={(e) => setNewRiderPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Vehicle Type</label>
                      <select
                        value={newRiderVehicleType}
                        onChange={(e) => setNewRiderVehicleType(e.target.value as any)}
                        className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                      >
                        <option value="Motorcycle">Motorcycle</option>
                        <option value="Bicycle">Bicycle</option>
                        <option value="Scooter">Scooter</option>
                        <option value="Car">Car</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Vehicle Plate / Number</label>
                      <input
                        type="text"
                        required
                        value={newRiderVehicleNumber}
                        onChange={(e) => setNewRiderVehicleNumber(e.target.value)}
                        placeholder="LHR-2026-99"
                        className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl uppercase font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Commission Per Delivery ({formatCurrency(0).split(' ')[0]})</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newRiderCommission}
                      onChange={(e) => setNewRiderCommission(e.target.value)}
                      placeholder="100"
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRiderModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={riderFormLoading}
                      className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {riderFormLoading ? 'Registering...' : 'Register Courier'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: All Orders */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-stone-900 mb-1">Global Marketplace Orders Oversight</h2>
              <p className="text-xs text-stone-500">Real-time status monitoring, search, inspection, and administrative override controls</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAdminOrders()}
                  placeholder="Search order #..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl w-44 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="text-xs py-1.5 px-2.5 bg-stone-50 border border-stone-200 rounded-xl"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="ready_for_pickup">Ready for Pickup</option>
                <option value="picked_up">Picked Up</option>
                <option value="on_the_way">On The Way</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <button
                onClick={fetchAdminOrders}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Filter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {ordersLoading ? (
              <div className="py-12 text-center text-xs text-stone-400">Loading marketplace orders...</div>
            ) : (adminOrders.length > 0 ? adminOrders : orders).length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-500">No orders match your filter criteria.</div>
            ) : (
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 text-stone-900 font-bold border-b border-stone-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3">Order Number</th>
                    <th className="py-3 px-3">Restaurant</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Total</th>
                    <th className="py-3 px-3">Courier</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {(adminOrders.length > 0 ? adminOrders : orders).map((o: any) => {
                    const orderNum = o.order_number || o.orderNumber;
                    const restName = o.restaurant?.name || o.restaurantName || 'Restaurant';
                    const custName = o.customer?.name || o.customer_name || o.customerName || 'Customer';
                    const totalVal = Number(o.grand_total ?? o.grandTotal ?? 0);
                    const courierName = o.rider?.user?.name || o.rider_name || o.riderName || 'Unassigned';
                    const oStatus = o.order_status || o.orderStatus || 'pending';

                    return (
                      <tr key={o.id} className="hover:bg-stone-50/50">
                        <td className="py-3 px-3 font-mono font-bold text-stone-900">{orderNum}</td>
                        <td className="py-3 px-3 font-semibold text-stone-800">{restName}</td>
                        <td className="py-3 px-3">{custName}</td>
                        <td className="py-3 px-3 font-mono font-bold text-stone-900">{formatCurrency(totalVal)}</td>
                        <td className="py-3 px-3 text-stone-500">{courierName}</td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-[11px] uppercase tracking-wider text-amber-700">
                            {String(oStatus).replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 flex items-center gap-2">
                          <button
                            onClick={() => handleInspectOrder(o.id)}
                            className="text-stone-700 hover:text-stone-900 font-semibold text-[11px] underline cursor-pointer"
                          >
                            Details
                          </button>
                          {oStatus !== 'cancelled' && oStatus !== 'delivered' && (
                            <button
                              onClick={() => updateOrderStatus(o.id, 'cancelled', 'Super Admin manual intervention')}
                              className="text-red-600 hover:underline text-[11px]"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Detailed Order Snapshot Modal */}
          {inspectingOrder && (
            <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-stone-900">Order {inspectingOrder.order_number}</h3>
                    <p className="text-xs text-stone-500">Created: {new Date(inspectingOrder.created_at).toLocaleString()}</p>
                  </div>
                  <span className="text-xs font-bold uppercase px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                    {String(inspectingOrder.order_status).replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-xl">
                    <div>
                      <div className="text-[10px] text-stone-400">Customer</div>
                      <div className="font-bold text-stone-900">{inspectingOrder.customer?.name || inspectingOrder.customer_name}</div>
                      <div className="text-stone-500">{inspectingOrder.customer?.phone || inspectingOrder.customer_phone}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-stone-400">Restaurant</div>
                      <div className="font-bold text-stone-900">{inspectingOrder.restaurant?.name}</div>
                      <div className="text-stone-500">{inspectingOrder.restaurant?.city}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-stone-900 mb-1">Financial Breakdown</h4>
                    <div className="space-y-1 text-stone-600">
                      <div className="flex justify-between"><span>Subtotal:</span><span className="font-mono">{formatCurrency(Number(inspectingOrder.subtotal))}</span></div>
                      <div className="flex justify-between"><span>Delivery Fee:</span><span className="font-mono">{formatCurrency(Number(inspectingOrder.delivery_fee))}</span></div>
                      <div className="flex justify-between"><span>Tax:</span><span className="font-mono">{formatCurrency(Number(inspectingOrder.tax))}</span></div>
                      {Number(inspectingOrder.discount) > 0 && (
                        <div className="flex justify-between text-emerald-600"><span>Discount:</span><span className="font-mono">-{formatCurrency(Number(inspectingOrder.discount))}</span></div>
                      )}
                      <div className="flex justify-between font-bold text-stone-900 pt-1 border-t border-stone-200">
                        <span>Grand Total:</span><span className="font-mono text-sm">{formatCurrency(Number(inspectingOrder.grand_total))}</span>
                      </div>
                      <div className="text-[11px] text-stone-500 pt-1">
                        Payment: <strong>{String(inspectingOrder.payment_method).toUpperCase()}</strong> ({inspectingOrder.payment_status})
                      </div>
                    </div>
                  </div>

                  {Array.isArray(inspectingOrder.items) && inspectingOrder.items.length > 0 && (
                    <div>
                      <h4 className="font-bold text-stone-900 mb-1">Order Items</h4>
                      <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
                        {inspectingOrder.items.map((item: any, idx: number) => (
                          <div key={idx} className="p-2.5 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-bold">{item.quantity}x </span>
                              <span>{item.product_name}</span>
                              {Array.isArray(item.addons) && item.addons.length > 0 && (
                                <div className="text-[10px] text-stone-400">
                                  + {item.addons.map((a: any) => a.addon_name).join(', ')}
                                </div>
                              )}
                            </div>
                            <span className="font-mono font-semibold">{formatCurrency(Number(item.total_price))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setInspectingOrder(null)}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Customers Management */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-stone-900">Customer Directory & Account Oversight</h2>
              <p className="text-xs text-stone-500">Monitor customer accounts, spending volume, and activate or deactivate accounts safely</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchCustomers()}
                  placeholder="Search customer..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl w-48 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <select
                value={customerStatusFilter}
                onChange={(e) => setCustomerStatusFilter(e.target.value)}
                className="text-xs py-1.5 px-2.5 bg-stone-50 border border-stone-200 rounded-xl"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              <button
                onClick={fetchCustomers}
                className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs"
              >
                Filter
              </button>
            </div>
          </div>

          {customersLoading ? (
            <div className="py-12 text-center text-xs text-stone-400">Loading customers directory...</div>
          ) : customersList.length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-500">No customer accounts matched your criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-600">
                <thead className="bg-stone-50 text-stone-900 font-bold border-b border-stone-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3">Orders</th>
                    <th className="py-3 px-3">Total Spend</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {customersList.map((cust) => {
                    const isActive = cust.status === 'active';

                    const handleToggleStatus = async () => {
                      const targetStatus = isActive ? 'inactive' : 'active';
                      try {
                        const res = await adminApi.setCustomerStatus(cust.id, targetStatus);
                        if (res.success) {
                          showToast(`Customer account ${cust.name} set to ${targetStatus}`, 'info');
                          fetchCustomers();
                          fetchDashboardMetrics();
                        }
                      } catch (err: any) {
                        showToast(err?.message || 'Failed to update customer status', 'error');
                      }
                    };

                    return (
                      <tr key={cust.id} className="hover:bg-stone-50/50">
                        <td className="py-3 px-3 font-semibold text-stone-900">
                          <div>{cust.name}</div>
                          <div className="text-[10px] text-stone-400 font-normal">{cust.email}</div>
                        </td>
                        <td className="py-3 px-3">{cust.phone || 'No phone recorded'}</td>
                        <td className="py-3 px-3 font-mono font-bold text-stone-900">{cust.orders_count} orders</td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-600">{formatCurrency(cust.total_spent)}</td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-200 text-stone-600'
                          }`}>
                            {cust.status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={handleToggleStatus}
                            className={`text-xs font-semibold hover:underline ${
                              isActive ? 'text-red-600' : 'text-emerald-700'
                            }`}
                          >
                            {isActive ? 'Deactivate' : 'Activate Account'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB: Coupons & Vouchers */}
      {activeTab === 'coupons' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-stone-900">Promotions & Vouchers</h2>
              <p className="text-xs text-stone-500">Create discount codes with min spend and expiration rules</p>
            </div>
            <button
              onClick={() => setShowCouponModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Coupon</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {coupons.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-extrabold text-sm text-stone-900 tracking-wider bg-white px-2 py-0.5 rounded border border-stone-200">
                      {c.code}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      c.isActive ? 'text-emerald-700' : 'text-stone-400'
                    }`}>
                      {c.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 mb-2">{c.description}</p>
                  <div className="text-[11px] text-stone-500 space-y-0.5">
                    <div>Min Order: <strong>{formatCurrency(c.minOrder)}</strong></div>
                    <div>Usage Count: <strong className="font-mono">{c.timesUsed}</strong></div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-200 flex justify-end">
                  <button
                    onClick={() => toggleCoupon(c.id)}
                    className="text-xs font-semibold text-stone-600 hover:text-stone-900"
                  >
                    {c.isActive ? 'Disable Code' : 'Enable Code'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Coupon creation modal */}
          {showCouponModal && (
            <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
                <h3 className="text-base font-bold text-stone-900 mb-1">Create Promotional Voucher</h3>
                <p className="text-xs text-stone-500 mb-4">Set code, discount type, and minimum order requirements.</p>

                <form onSubmit={handleCreateCoupon} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Voucher Code</label>
                    <input
                      type="text"
                      required
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value)}
                      placeholder="e.g. SUMMER25"
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Discount Type</label>
                      <select
                        value={newCouponType}
                        onChange={(e) => setNewCouponType(e.target.value as any)}
                        className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Discount Value</label>
                      <input
                        type="number"
                        required
                        value={newCouponValue}
                        onChange={(e) => setNewCouponValue(e.target.value)}
                        placeholder="20"
                        className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Minimum Order Amount</label>
                    <input
                      type="number"
                      value={newCouponMinOrder}
                      onChange={(e) => setNewCouponMinOrder(e.target.value)}
                      placeholder="1000"
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={newCouponDesc}
                      onChange={(e) => setNewCouponDesc(e.target.value)}
                      placeholder="20% off your next craft meal"
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCouponModal(false)}
                      className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs"
                    >
                      Create Coupon
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Financial Transactions */}
      {activeTab === 'financials' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900">Immutable Financial Ledger</h2>
              <p className="text-xs text-stone-500">Automated transaction breakdown: customer gross, partner payouts, and platform cut</p>
            </div>
            <button
              onClick={exportFinancialsCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-semibold text-stone-800"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead className="bg-stone-50 text-stone-900 font-bold border-b border-stone-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">Order Number</th>
                  <th className="py-3 px-3">Restaurant</th>
                  <th className="py-3 px-3">Gross Total</th>
                  <th className="py-3 px-3">Platform Comm.</th>
                  <th className="py-3 px-3">Kitchen Payout</th>
                  <th className="py-3 px-3">Rider Fee</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {financials.map((f) => (
                  <tr key={f.id} className="hover:bg-stone-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-stone-900">{f.orderNumber}</td>
                    <td className="py-3 px-3 font-semibold text-stone-800">{f.restaurantName}</td>
                    <td className="py-3 px-3 font-mono font-bold text-stone-900">{formatCurrency(f.grossAmount)}</td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-700">+{formatCurrency(f.platformCommission)}</td>
                    <td className="py-3 px-3 font-mono text-stone-700">{formatCurrency(f.restaurantPayout)}</td>
                    <td className="py-3 px-3 font-mono text-stone-700">{formatCurrency(f.riderPayout)}</td>
                    <td className="py-3 px-3 capitalize font-semibold text-stone-800">{f.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Reviews Moderation */}
      {activeTab === 'reviews' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <h2 className="text-base font-bold text-stone-900 mb-1">Customer Reviews Moderation</h2>
          <p className="text-xs text-stone-500 mb-6">Review authentic feedback before public display on restaurant pages</p>

          <div className="space-y-3">
            {reviews.map((rev) => (
              <div key={rev.id} className="p-4 rounded-2xl border border-stone-200 bg-stone-50 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-stone-900">{rev.customerName}</span>
                    <span className="text-stone-300">·</span>
                    <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{rev.rating} / 5</span>
                    </span>
                    <span className="text-[11px] text-stone-400">({new Date(rev.createdAt).toLocaleDateString()})</span>
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed italic">"{rev.comment}"</p>
                </div>

                <button
                  onClick={() => toggleReviewApproval(rev.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                    rev.isApproved
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  {rev.isApproved ? 'Approved (Visible)' : 'Hidden'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Delivery Zones */}
      {activeTab === 'zones' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-stone-900 mb-1">Service Radii & Delivery Zones</h2>
              <p className="text-xs text-stone-500">Configure platform dispatch zones, base fees, and distance thresholds</p>
            </div>
            <button
              onClick={() => setShowZoneModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Delivery Zone</span>
            </button>
          </div>

          {zonesLoading ? (
            <div className="py-12 text-center text-xs text-stone-400">Loading delivery zones...</div>
          ) : (adminZones.length > 0 ? adminZones : deliveryZones).length === 0 ? (
            <div className="py-12 text-center text-xs text-stone-500">No delivery zones registered on the platform.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(adminZones.length > 0 ? adminZones : deliveryZones).map((z: any) => {
                const zoneId = z.id;
                const zoneName = z.name || z.zone_name;
                const city = z.city;
                const radiusKm = z.radius_km ?? z.radiusKm ?? 10;
                const baseFee = Number(z.base_fee ?? z.baseFee ?? 0);
                const perKmFee = Number(z.per_km_fee ?? z.perKmFee ?? 0);

                return (
                  <div key={zoneId} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-stone-900">{zoneName}</span>
                        <span className="text-[11px] text-stone-500 bg-stone-200/60 px-2 py-0.5 rounded font-medium">{city}</span>
                      </div>
                      <div className="space-y-1 text-xs text-stone-600 mb-3">
                        <div>Coverage Radius: <strong className="font-mono">{radiusKm} km</strong></div>
                        <div>Base Delivery Fee: <strong className="font-mono">{formatCurrency(baseFee)}</strong></div>
                        <div>Per Km Increment: <strong className="font-mono">{formatCurrency(perKmFee)}</strong></div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-stone-200/60 flex justify-end">
                      <button
                        onClick={() => handleDeleteZone(zoneId, zoneName)}
                        className="text-red-600 hover:text-red-700 text-xs font-semibold cursor-pointer"
                      >
                        Delete Zone
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Create Delivery Zone Modal */}
          {showZoneModal && (
            <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200">
                <h3 className="text-base font-bold text-stone-900 mb-1">Create Platform Delivery Zone</h3>
                <p className="text-xs text-stone-500 mb-4">
                  Define geographic coverage, baseline delivery charge, and per-kilometer rate.
                </p>

                <form onSubmit={handleCreateZone} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">Zone Name</label>
                    <input
                      type="text"
                      required
                      value={zoneForm.name}
                      onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                      placeholder="e.g. Downtown Central Sector"
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={zoneForm.city}
                      onChange={(e) => setZoneForm({ ...zoneForm, city: e.target.value })}
                      placeholder="e.g. Lahore"
                      className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Radius (km)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={100}
                        value={zoneForm.radius_km}
                        onChange={(e) => setZoneForm({ ...zoneForm, radius_km: Number(e.target.value) })}
                        className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Base Fee</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={zoneForm.base_fee}
                        onChange={(e) => setZoneForm({ ...zoneForm, base_fee: Number(e.target.value) })}
                        className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Per Km</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={zoneForm.per_km_fee}
                        onChange={(e) => setZoneForm({ ...zoneForm, per_km_fee: Number(e.target.value) })}
                        className="w-full text-xs p-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
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
                      disabled={zoneSaving}
                      className="px-4 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs"
                    >
                      {zoneSaving ? 'Saving...' : 'Save Zone'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: CMS & Policies */}
      {activeTab === 'cms' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <h2 className="text-base font-bold text-stone-900 mb-1">Content Management System (CMS)</h2>
          <p className="text-xs text-stone-500 mb-6">Edit marketplace legal agreements, refund terms, and FAQs</p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              {cmsPages.map((page) => (
                <button
                  key={page.slug}
                  onClick={() => {
                    setSelectedCMSPage(page);
                    setCmsContentEdit(page.content);
                  }}
                  className={`w-full text-left p-3 rounded-xl text-xs font-semibold transition-all ${
                    selectedCMSPage.slug === page.slug
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {page.title}
                </button>
              ))}
            </div>

            <div className="md:col-span-3 space-y-3">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                Editing: {selectedCMSPage.title}
              </h3>
              <textarea
                rows={10}
                value={cmsContentEdit}
                onChange={(e) => setCmsContentEdit(e.target.value)}
                className="w-full text-xs p-4 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => updateCMSPage(selectedCMSPage.slug, cmsContentEdit)}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  Save CMS Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: Immutable Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <h2 className="text-base font-bold text-stone-900 mb-1">Platform Audit Trail</h2>
          <p className="text-xs text-stone-500 mb-6">Immutable logs recording sensitive role interventions, order modifications, and rate updates</p>

          <div className="divide-y divide-stone-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900">{log.userName}</span>
                    <span className="text-[10px] font-mono uppercase bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">
                      {log.role}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="font-mono text-amber-600 font-semibold">{log.action}</span>
                  </div>
                  <p className="text-stone-600 mt-0.5">{log.details || 'No additional parameters'}</p>
                </div>
                <div className="text-right text-[11px] text-stone-400 font-mono shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: Platform Settings */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold text-stone-900 mb-1">Global Marketplace Configurations</h2>
              <p className="text-xs text-stone-500">Manage currency formats, default platform commissions, and tax thresholds (Backend Persistent)</p>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={settingsSaving || settingsLoading}
              className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2"
            >
              <span>{settingsSaving ? 'Saving...' : 'Save Platform Settings'}</span>
            </button>
          </div>

          {settingsLoading ? (
            <div className="py-12 text-center text-xs text-stone-400">Loading platform settings...</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Application Name</label>
                <input
                  type="text"
                  value={settingsForm.app_name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, app_name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Currency Code</label>
                <input
                  type="text"
                  value={settingsForm.currency_code}
                  onChange={(e) => setSettingsForm({ ...settingsForm, currency_code: e.target.value })}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Currency Symbol</label>
                <input
                  type="text"
                  value={settingsForm.currency_symbol}
                  onChange={(e) => setSettingsForm({ ...settingsForm, currency_symbol: e.target.value })}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">GST Tax Percentage (%)</label>
                <input
                  type="number"
                  value={settingsForm.default_tax_percentage}
                  onChange={(e) => setSettingsForm({ ...settingsForm, default_tax_percentage: e.target.value })}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Default Partner Commission (%)</label>
                <input
                  type="number"
                  value={settingsForm.default_commission_rate}
                  onChange={(e) => setSettingsForm({ ...settingsForm, default_commission_rate: e.target.value })}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Default Base Delivery Fee</label>
                <input
                  type="number"
                  value={settingsForm.default_base_delivery_fee}
                  onChange={(e) => setSettingsForm({ ...settingsForm, default_base_delivery_fee: e.target.value })}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                />
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

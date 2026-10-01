import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { riderApi, RiderDashboardData } from '../../services/api/riderApi';
import { 
  Bike, 
  MapPin, 
  Navigation, 
  PackageCheck,
  Power,
  RotateCw,
  AlertCircle
} from 'lucide-react';

export const RiderDashboard: React.FC = () => {
  const { 
    currentUser, 
    formatCurrency,
    showToast,
    openAuthModal 
  } = useApp();

  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [dashboardData, setDashboardData] = useState<RiderDashboardData | null>(null);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Authoritative API Data Fetch
  const loadDashboard = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'delivery_rider') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);

    try {
      const [dashRes, ordersRes] = await Promise.all([
        riderApi.getDashboard(),
        riderApi.getOrders({ status: 'delivered', per_page: 20 }),
      ]);

      if (dashRes.success && dashRes.data) {
        setDashboardData(dashRes.data);
      } else {
        setFetchError(dashRes.message || 'Failed to load courier dashboard');
      }

      if (ordersRes.success && ordersRes.data) {
        const orderList = Array.isArray(ordersRes.data) 
          ? ordersRes.data 
          : (ordersRes.data.orders?.data || ordersRes.data.orders || []);
        setCompletedOrders(orderList);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Unable to connect to Fastflow courier server';
      setFetchError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser, showToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto pb-24 px-4">
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
          <Bike className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">Delivery Courier Sign In</h3>
          <p className="text-xs text-stone-500 mt-1 mb-6 max-w-sm mx-auto">
            Sign in with authorized courier credentials to accept delivery jobs, update live transit status, and track earnings.
          </p>
          <button
            onClick={() => openAuthModal('login')}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Sign In as Courier
          </button>
        </div>
      </div>
    );
  }

  if (currentUser.role !== 'delivery_rider') {
    return (
      <div className="max-w-4xl mx-auto pb-24 px-4">
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">Courier Role Required</h3>
          <p className="text-xs text-stone-500 mt-1 mb-6 max-w-sm mx-auto">
            The active account ({currentUser.email}) has role <strong className="font-mono text-stone-800">{currentUser.role}</strong>. Please sign in with an account having the <strong className="font-mono text-stone-800">delivery_rider</strong> role.
          </p>
          <button
            onClick={() => openAuthModal('login')}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Switch Account
          </button>
        </div>
      </div>
    );
  }

  if (loading && !dashboardData) {
    return (
      <div className="max-w-5xl mx-auto pb-24 px-4 sm:px-6">
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
          <RotateCw className="w-8 h-8 text-amber-500 mx-auto animate-spin mb-3" />
          <p className="text-xs text-stone-500">Loading courier console and active dispatches from server...</p>
        </div>
      </div>
    );
  }

  if (fetchError && !dashboardData) {
    return (
      <div className="max-w-5xl mx-auto pb-24 px-4 sm:px-6">
        <div className="bg-white rounded-3xl border border-red-200 p-12 text-center shadow-xs">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-stone-800">Courier Profile Not Found</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto mb-4">{fetchError}</p>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const rider = dashboardData?.rider;
  const metrics = dashboardData?.metrics;
  const currentOrder = dashboardData?.current_order;

  // Toggle Availability
  const handleToggleStatus = async () => {
    if (!rider) return;
    const nextStatus = rider.status === 'available' ? 'offline' : 'available';

    setActionLoading(true);
    try {
      const res = await riderApi.updateStatus(nextStatus);
      if (res.success && res.data) {
        setDashboardData((prev) => prev ? {
          ...prev,
          rider: { ...prev.rider, status: res.data.status }
        } : null);
        showToast(`Courier status updated to ${res.data.status}`, 'info');
      } else {
        showToast(res.message || 'Status update failed on server', 'error');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update courier status';
      showToast(msg, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Status Transitions
  const handleAcceptOrder = async (orderId: number | string) => {
    setActionLoading(true);
    try {
      const res = await riderApi.acceptOrder(orderId);
      if (res.success) {
        showToast('Delivery assignment accepted!', 'success');
        await loadDashboard();
      } else {
        showToast(res.message || 'Failed to accept delivery', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to accept delivery', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePickupOrder = async (orderId: number | string) => {
    setActionLoading(true);
    try {
      const res = await riderApi.pickupOrder(orderId);
      if (res.success) {
        showToast('Package picked up from restaurant kitchen!', 'success');
        await loadDashboard();
      } else {
        showToast(res.message || 'Failed to confirm pickup', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to confirm pickup', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartDelivery = async (orderId: number | string) => {
    setActionLoading(true);
    try {
      const res = await riderApi.startDelivery(orderId);
      if (res.success) {
        showToast('En route to customer delivery address!', 'info');
        await loadDashboard();
      } else {
        showToast(res.message || 'Failed to start delivery', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to start delivery', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliverOrder = async (orderId: number | string) => {
    setActionLoading(true);
    try {
      const res = await riderApi.deliverOrder(orderId);
      if (res.success) {
        showToast('Order successfully marked as delivered!', 'success');
        await loadDashboard();
      } else {
        showToast(res.message || 'Failed to confirm handover', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to confirm handover', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-24 px-4 sm:px-6">
      
      {/* Rider Status & Profile Bar */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-stone-100 border-2 border-amber-500 shadow-xs shrink-0 flex items-center justify-center">
            <Bike className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-stone-900">{rider?.name || currentUser.name}</h1>
              <span className="text-xs font-mono font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                {rider?.vehicle_number || 'Unregistered'}
              </span>
              {!rider?.is_active && (
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                  Inactive / Suspended
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {rider?.vehicle_type || 'Vehicle'} Dispatch · Rating: <strong className="text-stone-800">{rider?.rating || 5.0} ★</strong> · Total Completed: {rider?.total_deliveries || 0}
            </p>
          </div>
        </div>

        {/* Online / Offline Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-stone-500">Dispatch Status:</span>
          <button
            disabled={actionLoading || !rider?.is_active}
            onClick={handleToggleStatus}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 ${
              rider?.status === 'available'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : rider?.status === 'on_delivery'
                ? 'bg-amber-600 text-white cursor-not-allowed'
                : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>
              {rider?.status === 'available' 
                ? 'Online (Accepting Trips)' 
                : rider?.status === 'on_delivery'
                ? 'On Delivery Transit'
                : rider?.status === 'busy'
                ? 'Busy'
                : 'Offline'}
            </span>
          </button>
        </div>
      </div>

      {/* Authoritative Earnings & Trip Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Today's Earnings</div>
          <div className="text-2xl font-extrabold text-stone-900 font-mono tabular-nums mt-1">
            {formatCurrency(metrics?.today_earnings ?? rider?.today_earnings ?? 0)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Base courier fee + customer tips</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Active In-Route Trips</div>
          <div className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums mt-1">
            {metrics?.active_deliveries ?? (currentOrder ? 1 : 0)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Authoritative live assignments</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Deliveries Completed Today</div>
          <div className="text-2xl font-extrabold text-indigo-600 font-mono tabular-nums mt-1">
            {metrics?.today_deliveries ?? completedOrders.length}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Verified server deliveries</div>
        </div>
      </div>

      {/* Active Trip Queue */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-stone-900">Current Assigned Dispatch Trip</h2>
          <button
            onClick={loadDashboard}
            disabled={actionLoading}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {!currentOrder ? (
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
            <Bike className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-stone-800">No active delivery assignments</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Remain online in your delivery zone. Orders ready for dispatch will appear in this console.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border-2 border-amber-400 p-6 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-stone-100 gap-2">
              <div>
                <span className="text-xs font-mono font-bold text-stone-500">{currentOrder.order_number}</span>
                <h3 className="text-base font-bold text-stone-900 mt-0.5">
                  {currentOrder.restaurant?.name || 'Kitchen'} → {currentOrder.customer_name}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                  {currentOrder.order_status.replace(/_/g, ' ')}
                </span>
                <span className="text-sm font-extrabold font-mono tabular-nums text-stone-900">
                  Earn: {formatCurrency((rider?.commission_per_delivery || 100) + (currentOrder.tip || 0))}
                </span>
              </div>
            </div>

            {/* Route Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Pickup Restaurant */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-900 mb-1">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span>Step 1: Kitchen Pickup</span>
                </div>
                <p className="text-xs font-semibold text-stone-800">{currentOrder.restaurant?.name}</p>
                <p className="text-xs text-stone-500 mt-0.5">{currentOrder.restaurant?.address || 'Counter Dispatch'}</p>
                {currentOrder.restaurant?.phone && (
                  <p className="text-[11px] font-mono text-stone-600 mt-1">Tel: {currentOrder.restaurant.phone}</p>
                )}
              </div>

              {/* Delivery Customer */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-900 mb-1">
                  <Navigation className="w-4 h-4 text-emerald-600" />
                  <span>Step 2: Customer Destination</span>
                </div>
                <p className="text-xs font-semibold text-stone-800">{currentOrder.customer_name} ({currentOrder.customer_phone})</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {typeof currentOrder.delivery_address === 'object'
                    ? `${currentOrder.delivery_address.street || ''}, ${currentOrder.delivery_address.area || ''}, ${currentOrder.delivery_address.city || ''}`
                    : currentOrder.delivery_address}
                </p>
                {currentOrder.delivery_instructions && (
                  <p className="mt-1 text-[11px] text-amber-800 italic">
                    Instruction: "{currentOrder.delivery_instructions}"
                  </p>
                )}
              </div>
            </div>

            {/* Items Summary */}
            {currentOrder.items && currentOrder.items.length > 0 && (
              <div className="mb-6 p-4 bg-stone-50 rounded-2xl border border-stone-100 text-xs">
                <div className="font-semibold text-stone-700 mb-2">Package Items to Verify:</div>
                <ul className="space-y-1 text-stone-600">
                  {currentOrder.items.map((it: any, idx: number) => (
                    <li key={it.id || idx} className="flex justify-between">
                      <span>{it.quantity}x {it.product_name} {it.variant_name ? `(${it.variant_name})` : ''}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dispatch Workflow Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-100">
              <div className="text-xs text-stone-500">
                Payment: <strong className="text-stone-900 uppercase">{currentOrder.payment_method}</strong> ({currentOrder.payment_status === 'paid' ? 'Pre-Paid Online' : `Collect ${formatCurrency(currentOrder.grand_total)} in cash`})
              </div>

              <div className="flex items-center gap-3">
                {currentOrder.order_status === 'assigned_to_rider' && (
                  <>
                    <button
                      disabled={actionLoading}
                      onClick={() => handleAcceptOrder(currentOrder.id)}
                      className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      Accept Job
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => handlePickupOrder(currentOrder.id)}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      Confirm Package Picked Up
                    </button>
                  </>
                )}

                {currentOrder.order_status === 'picked_up' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStartDelivery(currentOrder.id)}
                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    Start Transit (On The Way)
                  </button>
                )}

                {currentOrder.order_status === 'on_the_way' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleDeliverOrder(currentOrder.id)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>Confirm Handover & Delivered</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Completed History Table */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
        <h3 className="text-base font-bold text-stone-900 mb-4">Completed Deliveries History</h3>
        {completedOrders.length === 0 ? (
          <p className="text-xs text-stone-500">No completed orders found in server ledger.</p>
        ) : (
          <div className="divide-y divide-stone-100 text-xs">
            {completedOrders.map((ord: any) => (
              <div key={ord.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-mono font-bold text-stone-900">{ord.order_number || ord.orderNumber}</div>
                  <div className="text-stone-500">
                    {ord.restaurant?.name || ord.restaurantName || 'Kitchen'} → {
                      typeof ord.delivery_address === 'object'
                        ? ord.delivery_address.area || ord.delivery_address.city
                        : ord.delivery_address || 'Customer'
                    }
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold font-mono text-emerald-700">
                    +{formatCurrency((rider?.commission_per_delivery || 100) + (ord.tip || 0))}
                  </div>
                  <div className="text-[10px] text-stone-400">Delivered</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

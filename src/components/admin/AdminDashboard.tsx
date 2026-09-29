import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Restaurant, Rider, Coupon, OrderStatus } from '../../types';
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
  Sparkles 
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
    formatCurrency 
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'analytics' | 'restaurants' | 'riders' | 'orders' | 'coupons' | 'financials' | 'reviews' | 'zones' | 'cms' | 'audit' | 'settings'
  >('analytics');

  // Stats
  const totalGMV = orders.reduce((sum, o) => sum + (o.orderStatus !== 'cancelled' ? o.grandTotal : 0), 0);
  const totalCommissions = financials.reduce((sum, f) => sum + f.platformCommission, 0);
  const totalOrdersCount = orders.length;
  const activeRestaurantsCount = restaurants.filter(r => r.status === 'approved').length;
  const activeRidersCount = riders.filter(r => r.status === 'available').length;

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
            Logged in as {currentUser.name}. Full granular RBAC access to commissions, culinary approvals, rider dispatch algorithm, audit trails, and multi-currency controls.
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Platform GMV</div>
          <div className="text-xl font-extrabold text-stone-900 font-mono tabular-nums mt-1">
            {formatCurrency(totalGMV)}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Gross order value</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Net Platform Commission</div>
          <div className="text-xl font-extrabold text-emerald-600 font-mono tabular-nums mt-1">
            {formatCurrency(totalCommissions)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-0.5">Retained platform fee</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Total Orders Placed</div>
          <div className="text-xl font-extrabold text-stone-900 font-mono tabular-nums mt-1">
            {totalOrdersCount}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Across all kitchens</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Approved Kitchens</div>
          <div className="text-xl font-extrabold text-amber-600 font-mono tabular-nums mt-1">
            {activeRestaurantsCount}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">{restaurants.length} registered</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Active Courier Fleet</div>
          <div className="text-xl font-extrabold text-indigo-600 font-mono tabular-nums mt-1">
            {activeRidersCount}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Online for dispatch</div>
        </div>
      </div>

      {/* Admin Module Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-stone-200 mb-8 scrollbar-none">
        {[
          { id: 'analytics', label: 'Analytics & Revenue', icon: <DollarSign className="w-3.5 h-3.5" /> },
          { id: 'restaurants', label: 'Kitchens & Commissions', icon: <Store className="w-3.5 h-3.5" /> },
          { id: 'riders', label: 'Riders & Dispatch', icon: <Bike className="w-3.5 h-3.5" /> },
          { id: 'orders', label: 'All Orders', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
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
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-stone-900">Partner Kitchen Applications & Rates</h2>
              <p className="text-xs text-stone-500">Approve new restaurant applications and configure custom commission percentages</p>
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {restaurants.map((rest) => {
              const isApproved = rest.status === 'approved';

              return (
                <div key={rest.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={rest.coverImage}
                      alt={rest.name}
                      className="w-14 h-14 rounded-xl object-cover border border-stone-200 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-stone-900">{rest.name}</h4>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isApproved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {rest.status}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {rest.city} · {rest.cuisines.join(', ')} · Base fee: {formatCurrency(rest.deliveryFee)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-xs text-stone-500 block">Commission Tier</span>
                      <button
                        onClick={() => {
                          setEditingCommissionRest(rest);
                          setNewCommissionRate(rest.commissionRate);
                        }}
                        className="text-xs font-mono font-bold text-amber-600 hover:underline"
                      >
                        {rest.commissionRate}% {rest.commissionType} (Edit)
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {isApproved ? (
                        <button
                          onClick={() => setRestaurantStatus(rest.id, 'suspended')}
                          className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => setRestaurantStatus(rest.id, 'approved')}
                          className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors"
                        >
                          Approve Partner
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

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
                    onClick={handleSaveCommission}
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
              <p className="text-xs text-stone-500">Monitor active rider workload and trigger dispatch algorithms</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {riders.map((r) => (
              <div key={r.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <div className="flex items-center gap-3 mb-2">
                  <img
                    src={r.photo}
                    alt={r.name}
                    className="w-10 h-10 rounded-full object-cover border border-stone-300"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-stone-900">{r.name}</h4>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      r.status === 'available' ? 'text-emerald-700' : 'text-stone-400'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-stone-600">
                  <div>Vehicle: <strong>{r.vehicle}</strong> ({r.vehicleNumber})</div>
                  <div>Active Trips: <strong className="font-mono">{r.assignedOrderCount}</strong></div>
                  <div>Total Deliveries: <strong className="font-mono">{r.totalDeliveries}</strong></div>
                  <div>Rating: <strong className="text-amber-600">{r.rating} ★</strong></div>
                </div>
              </div>
            ))}
          </div>

          {/* Unassigned Orders Queue with Auto-Dispatch Button */}
          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3">
            Orders Requiring Courier Assignment
          </h3>

          <div className="space-y-2">
            {orders.filter(o => !o.riderId && !['delivered', 'cancelled'].includes(o.orderStatus)).length === 0 ? (
              <p className="text-xs text-stone-500 py-3">All active orders have been assigned to couriers.</p>
            ) : (
              orders.filter(o => !o.riderId && !['delivered', 'cancelled'].includes(o.orderStatus)).map((ord) => (
                <div key={ord.id} className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-xs">{ord.orderNumber}</span>
                    <span className="text-xs text-stone-600 ml-2">from {ord.restaurantName} to {ord.deliveryAddress.area}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => autoDispatchRider(ord.id)}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Smart Auto-Dispatch</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB: All Orders */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <h2 className="text-base font-bold text-stone-900 mb-1">Global Marketplace Orders Oversight</h2>
          <p className="text-xs text-stone-500 mb-6">Real-time status monitoring and administrative override controls</p>

          <div className="overflow-x-auto">
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
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-stone-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-stone-900">{o.orderNumber}</td>
                    <td className="py-3 px-3 font-semibold text-stone-800">{o.restaurantName}</td>
                    <td className="py-3 px-3">{o.customerName}</td>
                    <td className="py-3 px-3 font-mono font-bold text-stone-900">{formatCurrency(o.grandTotal)}</td>
                    <td className="py-3 px-3 text-stone-500">{o.riderName || 'Unassigned'}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-[11px] uppercase tracking-wider text-amber-700">
                        {o.orderStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => updateOrderStatus(o.id, 'cancelled', 'Super Admin manual intervention')}
                        className="text-red-600 hover:underline text-[11px]"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <h2 className="text-base font-bold text-stone-900 mb-1">Service Radii & Delivery Zones</h2>
          <p className="text-xs text-stone-500 mb-6">Configure dispatch zones, base fees, and distance thresholds</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {deliveryZones.map((z) => (
              <div key={z.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-stone-900">{z.name}</span>
                  <span className="text-[11px] text-stone-500">{z.city}</span>
                </div>
                <div className="space-y-1 text-xs text-stone-600">
                  <div>Coverage Radius: <strong className="font-mono">{z.radiusKm} km</strong></div>
                  <div>Base Delivery Fee: <strong className="font-mono">{formatCurrency(z.baseFee)}</strong></div>
                  <div>Per Km Increment: <strong className="font-mono">{formatCurrency(z.perKmFee)}</strong></div>
                </div>
              </div>
            ))}
          </div>
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
          <h2 className="text-base font-bold text-stone-900 mb-1">Global Marketplace Configurations</h2>
          <p className="text-xs text-stone-500 mb-6">Manage currency formats, default platform commissions, and tax thresholds</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Currency Code</label>
              <input
                type="text"
                value={settings.currencyCode}
                onChange={(e) => updateSettings({ currencyCode: e.target.value })}
                className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={settings.currencySymbol}
                onChange={(e) => updateSettings({ currencySymbol: e.target.value })}
                className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">GST Tax Percentage (%)</label>
              <input
                type="number"
                value={settings.taxPercentage}
                onChange={(e) => updateSettings({ taxPercentage: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Default Partner Commission (%)</label>
              <input
                type="number"
                value={settings.defaultCommissionRate}
                onChange={(e) => updateSettings({ defaultCommissionRate: parseFloat(e.target.value) || 15 })}
                className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

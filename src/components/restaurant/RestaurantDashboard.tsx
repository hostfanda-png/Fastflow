import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product, Order, OrderStatus } from '../../types';
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
  Download, 
  Settings, 
  Search,
  Filter 
} from 'lucide-react';

export const RestaurantDashboard: React.FC = () => {
  const { 
    currentUser, 
    restaurants, 
    products, 
    orders, 
    categories,
    formatCurrency, 
    updateOrderStatus, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    toggleProductAvailability,
    hasPermission,
    openAuthModal
  } = useApp();

  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'staff' | 'settings'>('orders');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto pb-24 px-4">
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
          <Store className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">Merchant Portal Sign In</h3>
          <p className="text-xs text-stone-500 mt-1 mb-6 max-w-sm mx-auto">
            Sign in with your restaurant partner credentials to manage live kitchen tickets and update your menu.
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

  // Identify restaurant for the logged-in owner/staff
  const currentRestaurant = restaurants.find((r) => r.id === currentUser.restaurantId) || restaurants[0];

  if (!currentRestaurant) {
    return (
      <div className="max-w-4xl mx-auto pb-24 px-4">
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
          <Store className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">No Restaurant Assigned</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Your partner account is pending admin verification or has no active kitchen branch assigned yet.
          </p>
        </div>
      </div>
    );
  }

  // Orders for this restaurant
  const restaurantOrders = orders.filter((o) => o.restaurantId === currentRestaurant.id);
  const restaurantProducts = products.filter((p) => p.restaurantId === currentRestaurant.id);

  // Stats calculation
  const todayOrders = restaurantOrders.length;
  const todayRevenue = restaurantOrders
    .filter((o) => o.orderStatus !== 'cancelled')
    .reduce((sum, o) => sum + o.subtotal, 0);
  const pendingOrders = restaurantOrders.filter((o) => ['pending', 'confirmed'].includes(o.orderStatus)).length;
  const preparingOrders = restaurantOrders.filter((o) => o.orderStatus === 'preparing').length;
  const readyOrders = restaurantOrders.filter((o) => o.orderStatus === 'ready_for_pickup').length;
  const completedOrders = restaurantOrders.filter((o) => o.orderStatus === 'delivered').length;

  // Filtered orders list
  const filteredOrders = restaurantOrders.filter((o) => {
    if (orderStatusFilter === 'all') return true;
    if (orderStatusFilter === 'active') return ['pending', 'confirmed', 'preparing', 'ready_for_pickup'].includes(o.orderStatus);
    return o.orderStatus === orderStatusFilter;
  });

  // Product modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDiscount, setProdDiscount] = useState('');
  const [prodCategory, setProdCategory] = useState(categories[1]?.id || 'cat-pizza');
  const [prodPrepTime, setProdPrepTime] = useState('15');

  // Staff simulation state
  const [staffList, setStaffList] = useState([
    { id: 'st-1', name: 'Sofia Chen', email: 'sofia@fuegotrattoria.com', role: 'Kitchen Manager', permissions: ['Orders', 'Menu'] },
    { id: 'st-2', name: 'Marco Vitti', email: 'vitti@fuegotrattoria.com', role: 'Head Pizzaiolo', permissions: ['Orders'] }
  ]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');

  const openAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdDesc('');
    setProdPrice('');
    setProdDiscount('');
    setProdPrepTime('15');
    setShowProductModal(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdName(p.name);
    setProdDesc(p.description);
    setProdPrice(p.price.toString());
    setProdDiscount(p.discountPrice ? p.discountPrice.toString() : '');
    setProdCategory(p.categoryId);
    setProdPrepTime(p.preparationTime.toString());
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodPrice) return;

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        name: prodName,
        description: prodDesc,
        price: parseFloat(prodPrice),
        discountPrice: prodDiscount ? parseFloat(prodDiscount) : undefined,
        categoryId: prodCategory,
        preparationTime: parseInt(prodPrepTime, 10) || 15
      });
    } else {
      addProduct({
        restaurantId: currentRestaurant.id,
        categoryId: prodCategory,
        name: prodName,
        description: prodDesc,
        image: currentRestaurant.coverImage,
        price: parseFloat(prodPrice),
        discountPrice: prodDiscount ? parseFloat(prodDiscount) : undefined,
        isAvailable: true,
        preparationTime: parseInt(prodPrepTime, 10) || 15,
        variants: [
          { id: 'v-std', name: 'Standard Portion', priceModifier: 0 }
        ]
      });
    }
    setShowProductModal(false);
  };

  const exportOrdersCSV = () => {
    const headers = ['Order Number,Customer,Items,Grand Total,Status,Date\n'];
    const rows = restaurantOrders.map(o => 
      `"${o.orderNumber}","${o.customerName}","${o.items.length} dishes",${o.grandTotal},"${o.orderStatus}","${o.createdAt}"\n`
    );
    const blob = new Blob([headers.concat(rows).join('')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dineflow_orders_${currentRestaurant.slug}.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8">
      
      {/* Restaurant Header */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={currentRestaurant.coverImage}
            alt={currentRestaurant.name}
            className="w-16 h-16 rounded-2xl object-cover border border-stone-200 shadow-xs"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                {currentRestaurant.name}
              </h1>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider">
                Partner Active
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Logged in as <strong className="text-stone-800">{currentUser.name}</strong> ({currentUser.role.replace('_', ' ')}) · Commission: {currentRestaurant.commissionRate}%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportOrdersCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Orders (CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Today's Revenue</div>
          <div className="text-xl font-extrabold text-stone-900 font-mono tabular-nums mt-1">
            {formatCurrency(todayRevenue)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Gross item sales</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Active Kitchen Orders</div>
          <div className="text-xl font-extrabold text-amber-600 font-mono tabular-nums mt-1">
            {pendingOrders + preparingOrders + readyOrders}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">{preparingOrders} currently on stoves</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Ready For Courier</div>
          <div className="text-xl font-extrabold text-indigo-600 font-mono tabular-nums mt-1">
            {readyOrders}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Packed on counter</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Completed Deliveries</div>
          <div className="text-xl font-extrabold text-emerald-600 font-mono tabular-nums mt-1">
            {completedOrders}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Dispatched & fulfilled</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Customer Rating</div>
          <div className="text-xl font-extrabold text-stone-900 font-mono tabular-nums mt-1 flex items-center gap-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>{currentRestaurant.rating.toFixed(1)}</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">{currentRestaurant.reviewCount} verified reviews</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3 mb-6">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'orders'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Live Orders Management ({restaurantOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('menu')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'menu'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <ChefHat className="w-4 h-4" />
          <span>Dishes & Menu Catalog ({restaurantProducts.length})</span>
        </button>

        {currentUser.role === 'restaurant_owner' && (
          <button
            onClick={() => setActiveTab('staff')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'staff'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Kitchen Staff</span>
          </button>
        )}
      </div>

      {/* TAB 1: Live Orders */}
      {activeTab === 'orders' && (
        <div>
          {/* Sub Filters */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Orders' },
              { id: 'active', label: 'Active Kitchen Queue' },
              { id: 'pending', label: 'New / Pending' },
              { id: 'preparing', label: 'Preparing' },
              { id: 'ready_for_pickup', label: 'Ready for Pickup' },
              { id: 'delivered', label: 'Delivered' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setOrderStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  orderStatusFilter === f.id
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center">
              <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-xs text-stone-500">No orders in this state.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const isPending = order.orderStatus === 'pending';
                const isConfirmed = order.orderStatus === 'confirmed';
                const isPreparing = order.orderStatus === 'preparing';
                const isReady = order.orderStatus === 'ready_for_pickup';

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-stone-900">{order.orderNumber}</span>
                        <span className="text-stone-300">·</span>
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${
                          order.orderStatus === 'pending' ? 'text-amber-600' :
                          order.orderStatus === 'preparing' ? 'text-orange-600' :
                          order.orderStatus === 'ready_for_pickup' ? 'text-indigo-600' :
                          order.orderStatus === 'delivered' ? 'text-emerald-600' : 'text-stone-500'
                        }`}>
                          {order.orderStatus.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-stone-800">
                        Customer: <strong className="text-stone-900">{order.customerName}</strong> ({order.customerPhone})
                      </div>

                      <div className="mt-2 text-xs text-stone-600 space-y-0.5">
                        {order.items.map((it) => (
                          <div key={it.id} className="flex items-center gap-2">
                            <span className="font-bold text-stone-900">{it.quantity}x</span>
                            <span>{it.productName}</span>
                            {it.variantName && <span className="text-stone-400">({it.variantName})</span>}
                            {it.addons && it.addons.length > 0 && (
                              <span className="text-stone-400 text-[11px]">[{it.addons.map(a => a.name).join(', ')}]</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {order.deliveryInstructions && (
                        <p className="mt-2 text-[11px] text-amber-800 italic">
                          Note: "{order.deliveryInstructions}"
                        </p>
                      )}
                    </div>

                    {/* Action Controls for Kitchen */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-stone-100">
                      <div className="text-right">
                        <div className="text-sm font-extrabold font-mono tabular-nums text-stone-900">
                          {formatCurrency(order.subtotal)}
                        </div>
                        <div className="text-[10px] text-stone-400 capitalize">
                          Net sales (excl. delivery)
                        </div>
                      </div>

                      {/* State transition triggers */}
                      {isPending && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateOrderStatus(order.id, 'confirmed', 'Kitchen accepted order')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                          >
                            Accept Order
                          </button>
                          <button
                            onClick={() => updateOrderStatus(order.id, 'cancelled', 'Kitchen rejected: items sold out')}
                            className="px-3 py-1.5 bg-stone-100 hover:bg-red-50 text-red-600 rounded-xl text-xs font-semibold transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {isConfirmed && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'preparing', 'Chef started preparation')}
                          className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                        >
                          Mark as Preparing
                        </button>
                      )}

                      {isPreparing && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'ready_for_pickup', 'Boxed and heat-sealed')}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                        >
                          Mark Ready for Courier
                        </button>
                      )}

                      {isReady && (
                        <div className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Awaiting Courier Pickup</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Menu Management */}
      {activeTab === 'menu' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-stone-900">Restaurant Menu Catalog</h2>
              <p className="text-xs text-stone-500">Add dishes, set prices, and control real-time stock availability</p>
            </div>

            <button
              onClick={openAddProduct}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Dish</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {restaurantProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-3 bg-stone-100">
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {!prod.isAvailable && (
                      <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center">
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider bg-red-600 px-2.5 py-0.5 rounded">
                          Sold Out
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-stone-900">{prod.name}</h3>
                    <div className="text-xs font-mono font-bold text-stone-900 tabular-nums">
                      {formatCurrency(prod.price)}
                    </div>
                  </div>

                  <p className="mt-1 text-xs text-stone-500 line-clamp-2">
                    {prod.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <button
                    onClick={() => toggleProductAvailability(prod.id)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                      prod.isAvailable
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-red-50 text-red-700 hover:bg-red-100'
                    }`}
                  >
                    {prod.isAvailable ? 'In Stock' : 'Mark Available'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditProduct(prod)}
                      className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg"
                      title="Edit dish"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteProduct(prod.id)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete dish"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Staff Management */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-stone-900">Kitchen Staff Permissions</h2>
              <p className="text-xs text-stone-500">Assign staff accounts with limited access to orders and kitchen management</p>
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {staffList.map((member) => (
              <div key={member.id} className="py-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-stone-900">{member.name}</div>
                  <div className="text-[11px] text-stone-500">{member.email} · {member.role}</div>
                </div>
                <div className="flex items-center gap-2">
                  {member.permissions.map((p) => (
                    <span key={p} className="text-[10px] font-mono uppercase bg-stone-100 px-2 py-0.5 rounded text-stone-700">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Add Staff Form */}
          <div className="mt-6 pt-6 border-t border-stone-200">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3">Add Kitchen Employee</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Full Name"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                className="text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
              />
              <input
                type="email"
                placeholder="Staff Email"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                className="text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
              />
              <button
                onClick={() => {
                  if (!newStaffName || !newStaffEmail) return;
                  setStaffList(prev => [...prev, {
                    id: `st-${Date.now()}`,
                    name: newStaffName,
                    email: newStaffEmail,
                    role: 'Kitchen Associate',
                    permissions: ['Orders']
                  }]);
                  setNewStaffName('');
                  setNewStaffEmail('');
                }}
                className="py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold"
              >
                Create Staff Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Add / Edit Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              {editingProduct ? 'Edit Dish Details' : 'Create New Menu Item'}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Enter recipe pricing and preparation time.
            </p>

            <form onSubmit={handleSaveProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Quattro Formaggi Pizza"
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Description & Ingredients</label>
                <textarea
                  rows={2}
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Detailed culinary ingredients and allergens..."
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Regular Price</label>
                  <input
                    type="number"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="1200"
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Special Discount Price (Optional)</label>
                  <input
                    type="number"
                    value={prodDiscount}
                    onChange={(e) => setProdDiscount(e.target.value)}
                    placeholder="1000"
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Category</label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    {categories.filter(c => c.id !== 'cat-all').map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Prep Time (mins)</label>
                  <input
                    type="number"
                    value={prodPrepTime}
                    onChange={(e) => setProdPrepTime(e.target.value)}
                    placeholder="15"
                    className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  {editingProduct ? 'Save Changes' : 'Add to Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

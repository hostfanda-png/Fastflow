import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Order } from '../../types';
import { 
  Bike, 
  MapPin, 
  Phone, 
  Navigation, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  AlertCircle,
  PackageCheck,
  Power 
} from 'lucide-react';

export const RiderDashboard: React.FC = () => {
  const { 
    currentUser, 
    currentRider, 
    updateRiderStatus, 
    orders, 
    updateOrderStatus, 
    formatCurrency,
    showToast 
  } = useApp();

  const rider = currentRider || {
    id: 'rider-tariq',
    name: currentUser.name,
    phone: currentUser.phone,
    vehicle: 'Motorcycle',
    vehicleNumber: 'LEK-2024-81',
    status: 'available' as const,
    todayEarnings: 2840,
    totalDeliveries: 428,
    rating: 4.9
  };

  // Find active deliveries assigned to this rider
  const assignedOrders = orders.filter(
    (o) => o.riderId === rider.id && !['delivered', 'cancelled'].includes(o.orderStatus)
  );

  const completedOrders = orders.filter(
    (o) => o.riderId === rider.id && o.orderStatus === 'delivered'
  );

  return (
    <div className="max-w-5xl mx-auto pb-24 px-4 sm:px-6">
      
      {/* Rider Status & Profile Bar */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-stone-100 border-2 border-amber-500 shadow-xs shrink-0">
            <img
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120'}
              alt={currentUser.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-stone-900">{currentUser.name}</h1>
              <span className="text-xs font-mono font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                {rider.vehicleNumber}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {rider.vehicle} Dispatch · Rating: <strong className="text-stone-800">{rider.rating} ★</strong> · Total Trips: {rider.totalDeliveries}
            </p>
          </div>
        </div>

        {/* Online / Offline Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-stone-500">Dispatch Status:</span>
          <button
            onClick={() => {
              const nextStatus = rider.status === 'available' ? 'offline' : 'available';
              updateRiderStatus(rider.id, nextStatus);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              rider.status === 'available'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-stone-200 hover:bg-stone-300 text-stone-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{rider.status === 'available' ? 'Online (Accepting Trips)' : 'Offline'}</span>
          </button>
        </div>
      </div>

      {/* Earnings Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Today's Earnings</div>
          <div className="text-2xl font-extrabold text-stone-900 font-mono tabular-nums mt-1">
            {formatCurrency(rider.todayEarnings)}
          </div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Includes tips and dispatch fee</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Assigned Deliveries</div>
          <div className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums mt-1">
            {assignedOrders.length}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">Active trips in route</div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs">
          <div className="text-xs text-stone-500 font-medium">Completed Trips Today</div>
          <div className="text-2xl font-extrabold text-indigo-600 font-mono tabular-nums mt-1">
            {completedOrders.length}
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">100% on-time completion</div>
        </div>
      </div>

      {/* Active Trip Queue */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-stone-900">Current Assigned Dispatch Trips</h2>
          <span className="text-xs font-mono tabular-nums text-stone-500">
            {assignedOrders.length} active
          </span>
        </div>

        {assignedOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
            <Bike className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-stone-800">No active delivery assignments</h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Remain online in your delivery zone. New orders placed by customers will be automatically dispatched to your console.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {assignedOrders.map((order) => {
              const isAssigned = order.orderStatus === 'assigned_to_rider';
              const isPickedUp = order.orderStatus === 'picked_up';
              const isOnTheWay = order.orderStatus === 'on_the_way';

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl border-2 border-amber-400 p-6 shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-stone-100 gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-stone-500">{order.orderNumber}</span>
                      <h3 className="text-base font-bold text-stone-900 mt-0.5">
                        {order.restaurantName} → {order.customerName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                        {order.orderStatus.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm font-extrabold font-mono tabular-nums text-stone-900">
                        Picks Fee: {formatCurrency(100 + order.tip)}
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
                      <p className="text-xs font-semibold text-stone-800">{order.restaurantName}</p>
                      <p className="text-xs text-stone-500 mt-0.5">Kitchen counter dispatch</p>
                    </div>

                    {/* Delivery Customer */}
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200">
                      <div className="flex items-center gap-2 text-xs font-bold text-stone-900 mb-1">
                        <Navigation className="w-4 h-4 text-emerald-600" />
                        <span>Step 2: Customer Destination</span>
                      </div>
                      <p className="text-xs font-semibold text-stone-800">{order.customerName} ({order.customerPhone})</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {order.deliveryAddress.street}, {order.deliveryAddress.area}, {order.deliveryAddress.city}
                      </p>
                      {order.deliveryInstructions && (
                        <p className="mt-1 text-[11px] text-amber-800 italic">
                          Instruction: "{order.deliveryInstructions}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Dispatch Workflow Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-stone-100">
                    <div className="text-xs text-stone-500">
                      Payment Mode: <strong className="text-stone-900 uppercase">{order.paymentMethod}</strong> ({order.paymentStatus === 'paid' ? 'Pre-Paid Online' : `Collect ${formatCurrency(order.grandTotal)} in cash`})
                    </div>

                    <div className="flex items-center gap-3">
                      {isAssigned && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'picked_up', 'Rider arrived and picked up package')}
                          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-bold shadow-xs transition-colors"
                        >
                          Confirm Package Picked Up
                        </button>
                      )}

                      {isPickedUp && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'on_the_way', 'Rider en route to customer')}
                          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                        >
                          Start Delivery (On The Way)
                        </button>
                      )}

                      {isOnTheWay && (
                        <button
                          onClick={() => {
                            updateOrderStatus(order.id, 'delivered', 'Rider handed over food to customer');
                            showToast(`Order #${order.orderNumber} successfully marked as delivered!`, 'success');
                          }}
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center gap-1.5"
                        >
                          <PackageCheck className="w-4 h-4" />
                          <span>Confirm Handover & Delivered</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed History Table */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
        <h3 className="text-base font-bold text-stone-900 mb-4">Completed Deliveries Log</h3>
        {completedOrders.length === 0 ? (
          <p className="text-xs text-stone-500">No completed orders yet today.</p>
        ) : (
          <div className="divide-y divide-stone-100 text-xs">
            {completedOrders.map((ord) => (
              <div key={ord.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-mono font-bold text-stone-900">{ord.orderNumber}</div>
                  <div className="text-stone-500">{ord.restaurantName} → {ord.deliveryAddress.area}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold font-mono text-emerald-700">+{formatCurrency(100 + ord.tip)}</div>
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

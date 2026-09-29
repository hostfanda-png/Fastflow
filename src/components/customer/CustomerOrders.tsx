import React from 'react';
import { useApp } from '../../context/AppContext';
import { Order } from '../../types';
import { Clock, CheckCircle2, ChevronRight, Package, AlertCircle } from 'lucide-react';

interface CustomerOrdersProps {
  onSelectOrder: (orderId: string) => void;
  onExplore: () => void;
}

export const CustomerOrders: React.FC<CustomerOrdersProps> = ({
  onSelectOrder,
  onExplore
}) => {
  const { orders, formatCurrency, currentUser, openAuthModal } = useApp();

  if (!currentUser) {
    return (
      <div className="max-w-4xl mx-auto pb-24 px-4">
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
          <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">Sign in to view orders</h3>
          <p className="text-xs text-stone-500 mt-1 mb-6 max-w-sm mx-auto">
            Please sign in to your Fastflow account to track real-time dispatches and view past order invoices.
          </p>
          <button
            onClick={() => openAuthModal('login')}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const customerOrders = orders.filter((o) => o.customerId === currentUser.id);

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Order History</h1>
        <p className="text-xs text-stone-500">Track current culinary dispatches and past meals</p>
      </div>

      {customerOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
          <Package className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">No orders placed yet</h3>
          <p className="text-xs text-stone-500 mt-1 mb-6 max-w-sm mx-auto">
            Discover Neapolitan pizzerias, smash burger joints, and sushi kitchens in your area.
          </p>
          <button
            onClick={onExplore}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            Explore Restaurants
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {customerOrders.map((order) => {
            const isDelivered = order.orderStatus === 'delivered';
            const isCancelled = order.orderStatus === 'cancelled';
            const inTransit = !isDelivered && !isCancelled;

            return (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order.id)}
                className="group cursor-pointer bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:border-amber-400 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-stone-500">{order.orderNumber}</span>
                    <span className="text-stone-300">·</span>
                    <span className={`text-[11px] font-bold uppercase tracking-wider ${
                      inTransit ? 'text-amber-600' : isDelivered ? 'text-emerald-700' : 'text-red-600'
                    }`}>
                      {order.orderStatus.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-stone-900 group-hover:text-amber-600 transition-colors">
                    {order.restaurantName}
                  </h3>

                  <p className="text-xs text-stone-500 mt-0.5">
                    {order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                  </p>

                  <div className="mt-2 text-[11px] text-stone-400">
                    Placed: {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  <div className="text-right">
                    <div className="text-sm font-extrabold font-mono tabular-nums text-stone-900">
                      {formatCurrency(order.grandTotal)}
                    </div>
                    <div className="text-[11px] text-stone-400 capitalize">
                      {order.paymentMethod.toUpperCase()} · {order.items.length} dishes
                    </div>
                  </div>

                  <div className="p-2 bg-stone-50 group-hover:bg-amber-50 rounded-xl text-stone-400 group-hover:text-amber-600 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

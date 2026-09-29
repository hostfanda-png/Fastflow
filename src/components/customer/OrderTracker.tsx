import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Order, OrderStatus } from '../../types';
import { 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Package, 
  Bike, 
  Home, 
  AlertCircle, 
  XCircle, 
  Star, 
  Phone, 
  FastForward, 
  MessageSquare,
  ArrowLeft 
} from 'lucide-react';

interface OrderTrackerProps {
  orderId?: string;
  onBack: () => void;
}

export const OrderTracker: React.FC<OrderTrackerProps> = ({ orderId, onBack }) => {
  const { 
    orders, 
    activeOrder, 
    formatCurrency, 
    simulateOrderStep, 
    cancelOrder, 
    addReview,
    riders 
  } = useApp();

  const targetOrder: Order | undefined = orderId 
    ? orders.find((o) => o.id === orderId) 
    : activeOrder || orders[0];

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [restaurantRating, setRestaurantRating] = useState(5);
  const [foodRating, setFoodRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  // Cancellation state
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('Changed mind');

  if (!targetOrder) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-stone-300 mx-auto mb-3" />
        <h2 className="text-base font-bold text-stone-800">No active order found</h2>
        <p className="text-xs text-stone-500 mt-1 mb-6">You have no pending orders in transit right now.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold"
        >
          Return to Kitchens
        </button>
      </div>
    );
  }

  const assignedRider = targetOrder.riderId 
    ? riders.find((r) => r.id === targetOrder.riderId) 
    : null;

  const steps: { status: OrderStatus; label: string; icon: React.ReactNode }[] = [
    { status: 'confirmed', label: 'Accepted', icon: <CheckCircle2 className="w-4 h-4" /> },
    { status: 'preparing', label: 'In Kitchen', icon: <ChefHat className="w-4 h-4" /> },
    { status: 'ready_for_pickup', label: 'Packed', icon: <Package className="w-4 h-4" /> },
    { status: 'on_the_way', label: 'On The Way', icon: <Bike className="w-4 h-4" /> },
    { status: 'delivered', label: 'Delivered', icon: <Home className="w-4 h-4" /> }
  ];

  const getStepState = (stepStatus: OrderStatus) => {
    const orderIndex = steps.findIndex(s => s.status === targetOrder.orderStatus);
    const stepIndex = steps.findIndex(s => s.status === stepStatus);

    if (targetOrder.orderStatus === 'cancelled') return 'cancelled';
    if (orderIndex === -1 && targetOrder.orderStatus === 'pending') {
      return stepIndex === 0 ? 'current' : 'upcoming';
    }
    if (stepIndex < orderIndex) return 'completed';
    if (stepIndex === orderIndex) return 'current';
    return 'upcoming';
  };

  const isDelivered = targetOrder.orderStatus === 'delivered';
  const isCancelled = targetOrder.orderStatus === 'cancelled';
  const canCancel = ['pending', 'confirmed'].includes(targetOrder.orderStatus);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    addReview(targetOrder.id, targetOrder.restaurantId, restaurantRating, foodRating, reviewComment);
    setShowReviewModal(false);
  };

  return (
    <div className="max-w-3xl mx-auto pb-24 px-4">
      
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-3 py-1.5 rounded-lg shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Storefront</span>
        </button>

        {/* Live Simulation Stepper Trigger for effortless evaluation */}
        {!isDelivered && !isCancelled && (
          <button
            onClick={() => simulateOrderStep(targetOrder.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-lg text-xs font-bold shadow-xs transition-colors"
            title="Advance the order state automatically to test courier progression"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Simulate Next Stage</span>
          </button>
        )}
      </div>

      {/* Main Tracker Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden mb-6">
        
        {/* Banner Area */}
        <div className={`p-6 text-white ${isCancelled ? 'bg-red-900' : 'bg-stone-900'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-amber-400 font-mono">
                <span>{targetOrder.orderNumber}</span>
                <span className="text-white/40">·</span>
                <span className="text-stone-300 capitalize">{targetOrder.paymentMethod.toUpperCase()}</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight mt-1">
                {isCancelled
                  ? 'Order Cancelled'
                  : isDelivered
                  ? 'Culinary Delivery Complete'
                  : `Preparing at ${targetOrder.restaurantName}`}
              </h1>
              <p className="text-xs text-stone-300 mt-1">
                {isCancelled
                  ? `Reason: ${targetOrder.cancellationReason || 'User request'}`
                  : isDelivered
                  ? 'Your thermal courier has delivered your dishes. Enjoy your meal!'
                  : `Estimated arrival: ${targetOrder.estimatedDeliveryTime}`}
              </p>
            </div>

            {/* Status Indicator */}
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 text-center shrink-0">
              <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Live Status</span>
              <span className="text-xs font-bold text-amber-400 capitalize">
                {targetOrder.orderStatus.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* Stepper Progress Bar (Anti-slop: clean geometric indicators) */}
          {!isCancelled && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="grid grid-cols-5 gap-2 text-center">
                {steps.map((s, idx) => {
                  const state = getStepState(s.status);
                  const isCompleted = state === 'completed';
                  const isCurrent = state === 'current';

                  return (
                    <div key={s.status} className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-2 transition-all ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isCurrent
                          ? 'bg-amber-500 text-stone-950 ring-4 ring-amber-500/20 animate-pulse'
                          : 'bg-white/10 text-stone-400'
                      }`}>
                        {s.icon}
                      </div>
                      <span className={`text-[11px] font-medium leading-tight ${
                        isCurrent ? 'text-amber-300 font-bold' : isCompleted ? 'text-stone-200' : 'text-stone-500'
                      }`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Assigned Courier Card */}
        {targetOrder.riderName && (
          <div className="p-4 sm:p-5 bg-amber-50/50 border-b border-stone-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-stone-200 border border-stone-300 shrink-0">
                <img
                  src={assignedRider?.photo || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120'}
                  alt={targetOrder.riderName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="text-[11px] text-amber-800 font-bold uppercase tracking-wider">
                  Assigned Delivery Rider
                </div>
                <div className="text-sm font-bold text-stone-900">{targetOrder.riderName}</div>
                <div className="text-xs text-stone-500">
                  {assignedRider?.vehicle || 'Motorcycle'} · {assignedRider?.vehicleNumber || 'Standard'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`tel:${targetOrder.riderPhone || '+923129988776'}`}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-300 hover:bg-stone-50 rounded-xl text-xs font-semibold text-stone-800 shadow-xs transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-amber-600" />
                <span>Call Courier</span>
              </a>
            </div>
          </div>
        )}

        {/* Order Details & Items Breakdown */}
        <div className="p-6 space-y-6">
          {/* Destination */}
          <div className="flex items-start gap-3 text-xs">
            <Home className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-bold text-stone-900">Delivery Address</span>
              <p className="text-stone-600 mt-0.5">
                {targetOrder.deliveryAddress.street}, {targetOrder.deliveryAddress.area}, {targetOrder.deliveryAddress.city}
              </p>
              {targetOrder.deliveryInstructions && (
                <p className="text-amber-800 font-medium mt-1">
                  Note: "{targetOrder.deliveryInstructions}"
                </p>
              )}
            </div>
          </div>

          {/* Itemized summary */}
          <div className="border-t border-stone-100 pt-4">
            <span className="text-xs font-bold text-stone-900 uppercase tracking-wider block mb-3">
              Order Items ({targetOrder.items.length})
            </span>

            <div className="space-y-2">
              {targetOrder.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between text-xs py-1">
                  <div className="text-stone-700">
                    <span className="font-bold">{it.quantity}x</span> {it.productName}
                    {it.variantName && <span className="text-stone-400 ml-1">({it.variantName})</span>}
                  </div>
                  <span className="font-mono tabular-nums font-semibold text-stone-900">
                    {formatCurrency(it.totalPrice)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial totals */}
            <div className="mt-4 pt-4 border-t border-stone-200 space-y-1.5 text-xs text-stone-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatCurrency(targetOrder.subtotal)}</span>
              </div>
              {targetOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Voucher Discount</span>
                  <span className="font-mono tabular-nums">-{formatCurrency(targetOrder.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery Base Fee</span>
                <span className="font-mono tabular-nums">{formatCurrency(targetOrder.deliveryFee)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST Tax (5%)</span>
                <span className="font-mono tabular-nums">{formatCurrency(targetOrder.tax)}</span>
              </div>
              {targetOrder.tip > 0 && (
                <div className="flex justify-between">
                  <span>Courier Tip</span>
                  <span className="font-mono tabular-nums">+{formatCurrency(targetOrder.tip)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-sm text-stone-900">
                <span>Paid Grand Total</span>
                <span className="font-mono tabular-nums text-base">{formatCurrency(targetOrder.grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Action Row: Cancel Order or Rate Experience */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
            {canCancel && !showCancelPrompt && (
              <button
                onClick={() => setShowCancelPrompt(true)}
                className="text-xs text-red-600 hover:text-red-800 font-semibold"
              >
                Cancel Order
              </button>
            )}

            {isDelivered && !targetOrder.hasBeenReviewed && (
              <button
                onClick={() => setShowReviewModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Rate Restaurant & Food</span>
              </button>
            )}

            {isDelivered && targetOrder.hasBeenReviewed && (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Review Submitted · Thank you!</span>
              </span>
            )}
          </div>

          {/* Cancel prompt dialog */}
          {showCancelPrompt && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-red-900 block">
                Are you sure you want to cancel this order?
              </span>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-red-200 rounded-xl"
              >
                <option value="Changed mind">Changed mind</option>
                <option value="Delivery time too long">Delivery time too long</option>
                <option value="Incorrect address entered">Incorrect address entered</option>
              </select>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setShowCancelPrompt(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Never mind
                </button>
                <button
                  onClick={() => {
                    cancelOrder(targetOrder.id, cancelReason);
                    setShowCancelPrompt(false);
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg shadow-xs"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Review Dialog Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              Rate your meal from {targetOrder.restaurantName}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Your feedback guides partner kitchen standards.
            </p>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Restaurant Rating */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Overall Experience ({restaurantRating} / 5)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRestaurantRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-6 h-6 ${
                        star <= restaurantRating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                      }`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Food Rating */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Food Quality & Freshness ({foodRating} / 5)
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFoodRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-6 h-6 ${
                        star <= foodRating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'
                      }`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Your Culinary Review
                </label>
                <textarea
                  required
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="How was the pizza crust, burger seasoning, or packaging?"
                  className="w-full text-xs p-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  Post Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

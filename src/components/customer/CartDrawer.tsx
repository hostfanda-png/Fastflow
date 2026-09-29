import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Tag, 
  ArrowRight, 
  AlertTriangle,
  Info 
} from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout
}) => {
  const { 
    cart, 
    cartRestaurant, 
    updateCartQuantity, 
    removeFromCart, 
    clearCart,
    cartTotals,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    riderTip,
    setRiderTip,
    formatCurrency,
    replaceCartModal,
    confirmReplaceCart,
    cancelReplaceCart
  } = useApp();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');

  if (!isOpen) {
    // Render only the replacement modal if triggered while drawer is closed
    if (replaceCartModal.isOpen) {
      return (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-stone-900">Replace active cart?</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed mb-6">
              Your bag already contains dishes from <strong className="text-stone-900">{replaceCartModal.currentRestaurantName}</strong>. A single order can only contain food prepared by one restaurant kitchen. Would you like to clear your current selection and start a new order with <strong className="text-stone-900">{replaceCartModal.newRestaurantName}</strong>?
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={cancelReplaceCart}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
              >
                Keep Current Cart
              </button>
              <button
                onClick={confirmReplaceCart}
                className="px-4 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-lg shadow-sm transition-colors"
              >
                Replace Bag
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponInput.trim()) return;

    const res = applyCoupon(couponInput);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponInput('');
    }
  };

  const tipOptions = [0, 50, 100, 200];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-950/60 backdrop-blur-xs flex justify-end">
      
      {/* Replacement Modal if user clicked another restaurant while in cart */}
      {replaceCartModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-stone-900">Replace active cart?</h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed mb-6">
              Your bag already contains dishes from <strong className="text-stone-900">{replaceCartModal.currentRestaurantName}</strong>. A single order can only contain food prepared by one restaurant kitchen. Would you like to clear your current selection and start a new order with <strong className="text-stone-900">{replaceCartModal.newRestaurantName}</strong>?
            </p>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={cancelReplaceCart}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors"
              >
                Keep Current Cart
              </button>
              <button
                onClick={confirmReplaceCart}
                className="px-4 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-lg shadow-sm transition-colors"
              >
                Replace Bag
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Container */}
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between">
        
        {/* Header */}
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-stone-900">Your Order Bag</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-stone-800">Your bag is empty</h3>
            <p className="mt-1 text-xs text-stone-500 max-w-xs">
              Explore our verified culinary artisans and add wood-fired pizzas, smash burgers, or fresh sushi.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Restaurant Info Header */}
            {cartRestaurant && (
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-amber-800 font-semibold uppercase tracking-wider">
                    Ordering from:
                  </div>
                  <div className="text-xs font-bold text-stone-900">{cartRestaurant.name}</div>
                </div>
                <button
                  onClick={clearCart}
                  className="text-[11px] text-red-600 hover:text-red-800 font-medium hover:underline"
                >
                  Clear Bag
                </button>
              </div>
            )}

            {/* Itemized List */}
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-3"
                >
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-14 h-14 rounded-lg object-cover bg-stone-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className="text-xs font-bold text-stone-900 truncate">
                        {item.productName}
                      </h4>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-stone-400 hover:text-red-600 p-0.5 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {item.selectedVariant && (
                      <div className="text-[11px] text-stone-500 font-medium">
                        Size: {item.selectedVariant.name}
                      </div>
                    )}

                    {item.selectedAddons.length > 0 && (
                      <div className="text-[11px] text-stone-500">
                        +{item.selectedAddons.map((a) => a.name).join(', ')}
                      </div>
                    )}

                    {item.specialInstructions && (
                      <div className="text-[11px] text-amber-700 italic truncate">
                        "{item.specialInstructions}"
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-bold font-mono tabular-nums text-stone-900">
                        {formatCurrency(item.itemTotal)}
                      </span>

                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-stone-200 bg-white rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-stone-100 text-stone-600"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold font-mono tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-stone-100 text-stone-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon Code Section */}
            <div className="pt-2 border-t border-stone-100">
              <label className="block text-xs font-bold text-stone-900 mb-2">
                Promotional Voucher
              </label>

              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold">{appliedCoupon.code}</span>
                      <span className="text-emerald-700 ml-1.5 font-mono tabular-nums">
                        (-{formatCurrency(cartTotals.discount)})
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-stone-400 hover:text-stone-700 text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Tag className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="Try FEAST100 or WELCOME50"
                        className="w-full text-xs pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-[11px] text-red-600 leading-tight">{couponError}</p>
                  )}
                </form>
              )}
            </div>

            {/* Courier Tip Selection */}
            <div className="pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-stone-900">Courier Tip</span>
                <span className="text-[11px] text-stone-500">100% goes to rider</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {tipOptions.map((tip) => (
                  <button
                    key={tip}
                    onClick={() => setRiderTip(tip)}
                    className={`py-1.5 text-xs font-mono tabular-nums font-semibold rounded-lg border transition-all ${
                      riderTip === tip
                        ? 'bg-amber-500 text-stone-950 border-amber-500'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {tip === 0 ? 'None' : formatCurrency(tip)}
                  </button>
                ))}
              </div>
            </div>

            {/* Bill Summary Breakdown */}
            <div className="pt-3 border-t border-stone-200 space-y-2 text-xs">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatCurrency(cartTotals.subtotal)}</span>
              </div>

              {cartTotals.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Voucher Discount</span>
                  <span className="font-mono tabular-nums">-{formatCurrency(cartTotals.discount)}</span>
                </div>
              )}

              <div className="flex justify-between text-stone-600">
                <span>Delivery Base Fee</span>
                <span className="font-mono tabular-nums">{formatCurrency(cartTotals.deliveryFee)}</span>
              </div>

              <div className="flex justify-between text-stone-600">
                <span>GST Tax (5%)</span>
                <span className="font-mono tabular-nums">{formatCurrency(cartTotals.tax)}</span>
              </div>

              <div className="flex justify-between text-stone-600">
                <span>Platform Service Fee</span>
                <span className="font-mono tabular-nums">{formatCurrency(cartTotals.serviceFee)}</span>
              </div>

              {riderTip > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>Rider Tip</span>
                  <span className="font-mono tabular-nums">+{formatCurrency(riderTip)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-extrabold text-stone-900">
                <span>Grand Total</span>
                <span className="font-mono tabular-nums text-base text-stone-900">
                  {formatCurrency(cartTotals.grandTotal)}
                </span>
              </div>
            </div>

          </div>
        )}

        {/* Footer Checkout Action */}
        {cart.length > 0 && (
          <div className="p-4 bg-stone-50 border-t border-stone-200">
            <button
              onClick={() => {
                onClose();
                onProceedToCheckout();
              }}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-colors"
            >
              <span>Proceed to Checkout</span>
              <div className="flex items-center gap-2 font-mono tabular-nums text-amber-400">
                <span>{formatCurrency(cartTotals.grandTotal)}</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

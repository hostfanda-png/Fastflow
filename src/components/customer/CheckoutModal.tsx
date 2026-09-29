import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentMethod, Address } from '../../types';
import { 
  X, 
  MapPin, 
  CreditCard, 
  Banknote, 
  ShieldCheck, 
  Clock, 
  Check, 
  Plus, 
  ArrowRight,
  AlertCircle 
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (orderId: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess
}) => {
  const { 
    currentUser, 
    cart, 
    cartRestaurant, 
    cartTotals, 
    savedAddresses, 
    currentAddress, 
    setCurrentAddress, 
    addSavedAddress,
    formatCurrency, 
    placeOrder,
    showToast 
  } = useApp();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>(
    currentAddress.deliveryInstructions || ''
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Address creation form toggle
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newLabel, setNewLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [newStreet, setNewStreet] = useState('');
  const [newArea, setNewArea] = useState('Gulberg III');
  const [newCity, setNewCity] = useState('Lahore');

  // Simulated credit card state
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExp, setCardExp] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');

  if (!isOpen) return null;

  const handleSaveNewAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreet.trim()) return;

    const newAddr: Address = {
      id: `addr-${Date.now()}`,
      label: newLabel,
      street: newStreet.trim(),
      area: newArea,
      city: newCity,
      lat: 31.5204 + (Math.random() - 0.5) * 0.02,
      lng: 74.3587 + (Math.random() - 0.5) * 0.02,
      deliveryInstructions: deliveryInstructions
    };

    addSavedAddress(newAddr);
    setShowNewAddressForm(false);
    setNewStreet('');
  };

  const handleConfirmOrder = async () => {
    if (cart.length === 0) return;

    setIsSubmitting(true);
    try {
      const createdOrder = await placeOrder(paymentMethod, deliveryInstructions);
      showToast(`Order #${createdOrder.orderNumber} successfully placed!`, 'success');
      onOrderSuccess(createdOrder.id);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Error creating order', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-stone-200">
        
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-stone-900">Finalize & Dispatch Order</h2>
            <p className="text-xs text-stone-500">Review address and select payment gateway</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Section 1: Delivery Address */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-600" />
                <span>Delivery Location</span>
              </span>
              <button
                onClick={() => setShowNewAddressForm(!showNewAddressForm)}
                className="text-xs text-amber-600 hover:text-amber-800 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showNewAddressForm ? 'Cancel' : 'Add New Address'}</span>
              </button>
            </div>

            {showNewAddressForm ? (
              <form onSubmit={handleSaveNewAddress} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 mb-3">
                <div className="grid grid-cols-3 gap-2">
                  {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                    <button
                      type="button"
                      key={lbl}
                      onClick={() => setNewLabel(lbl)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        newLabel === lbl ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-200'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  required
                  value={newStreet}
                  onChange={(e) => setNewStreet(e.target.value)}
                  placeholder="House/Apartment #, Building, Street..."
                  className="w-full text-xs p-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newArea}
                    onChange={(e) => setNewArea(e.target.value)}
                    placeholder="Area (e.g. Gulberg III)"
                    className="text-xs p-2 bg-white border border-stone-200 rounded-xl"
                  />
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="City (e.g. Lahore)"
                    className="text-xs p-2 bg-white border border-stone-200 rounded-xl"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs transition-colors"
                >
                  Save and Use Address
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {savedAddresses.map((addr) => {
                  const isSelected = currentAddress.id === addr.id;
                  return (
                    <div
                      key={addr.id}
                      onClick={() => setCurrentAddress(addr)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start justify-between ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/40 text-stone-900 shadow-xs'
                          : 'border-stone-200 hover:bg-stone-50 text-stone-600'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>{addr.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-600" />}
                        </div>
                        <p className="mt-1 text-xs text-stone-500 leading-snug">
                          {addr.street}, {addr.area}, {addr.city}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Delivery Instructions */}
            <div className="mt-3">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Rider Delivery Instructions
              </label>
              <input
                type="text"
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                placeholder="e.g. Gate code #4921, call upon arrival, leave with security"
                className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Section 2: Payment Gateway Interface Abstraction */}
          <div className="pt-4 border-t border-stone-200">
            <span className="text-xs font-bold text-stone-900 uppercase tracking-wider block mb-3">
              Payment Gateway Architecture
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* COD Gateway */}
              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  paymentMethod === 'cod'
                    ? 'border-amber-500 bg-amber-50/40 shadow-xs'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="w-4 h-4 text-amber-600 mt-0.5"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Cash on Delivery (COD)</span>
                  </div>
                  <p className="mt-1 text-[11px] text-stone-500 leading-relaxed">
                    Pay with physical cash or mobile transfer when courier hands over food.
                  </p>
                </div>
              </label>

              {/* Stripe Online Gateway */}
              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  paymentMethod === 'stripe'
                    ? 'border-amber-500 bg-amber-50/40 shadow-xs'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="stripe"
                  checked={paymentMethod === 'stripe'}
                  onChange={() => setPaymentMethod('stripe')}
                  className="w-4 h-4 text-amber-600 mt-0.5"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                    <CreditCard className="w-4 h-4 text-indigo-600" />
                    <span>Credit / Debit Card (Stripe)</span>
                  </div>
                  <p className="mt-1 text-[11px] text-stone-500 leading-relaxed">
                    PCI-compliant tokenized payment with Visa, Mastercard, or UnionPay.
                  </p>
                </div>
              </label>
            </div>

            {/* Simulated Stripe Card Fields */}
            {paymentMethod === 'stripe' && (
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Stripe PCI-DSS Card Sandbox</span>
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="Card Number"
                    className="w-full text-xs p-2 bg-white border border-stone-200 rounded-xl font-mono"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={cardExp}
                      onChange={(e) => setCardExp(e.target.value)}
                      placeholder="MM/YY"
                      className="text-xs p-2 bg-white border border-stone-200 rounded-xl font-mono"
                    />
                    <input
                      type="text"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="CVC"
                      className="text-xs p-2 bg-white border border-stone-200 rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Order Overview Table */}
          <div className="pt-4 border-t border-stone-200">
            <span className="text-xs font-bold text-stone-900 uppercase tracking-wider block mb-2">
              Order Summary ({cartRestaurant?.name})
            </span>

            <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200 space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs text-stone-700">
                  <span className="truncate pr-2">
                    {item.quantity}x {item.productName} {item.selectedVariant ? `(${item.selectedVariant.name})` : ''}
                  </span>
                  <span className="font-mono tabular-nums font-semibold shrink-0">
                    {formatCurrency(item.itemTotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Bill Total Line */}
            <div className="mt-3 flex items-center justify-between text-sm font-bold text-stone-900 px-1">
              <span>Total Payable Amount</span>
              <span className="font-mono tabular-nums text-lg text-amber-600">
                {formatCurrency(cartTotals.grandTotal)}
              </span>
            </div>
          </div>

        </div>

        {/* Modal Action Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-200 transition-colors"
          >
            Modify Selection
          </button>

          <button
            onClick={handleConfirmOrder}
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Dispatching Order...</span>
            ) : (
              <>
                <span>Confirm & Place Order</span>
                <span className="font-mono tabular-nums text-amber-400">
                  ({formatCurrency(cartTotals.grandTotal)})
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

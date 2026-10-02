import React, { useState } from 'react';
import { Product, ProductVariant, ProductAddon, CartItem } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Plus, Minus, Clock, ShieldCheck } from 'lucide-react';

interface FoodItemModalProps {
  product: Product;
  restaurantName: string;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const FoodItemModal: React.FC<FoodItemModalProps> = ({
  product,
  restaurantName,
  onClose,
  onAddToCart
}) => {
  const { formatCurrency } = useApp();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(
    product.variants && product.variants.length > 0 ? product.variants[0] : undefined
  );

  const [selectedAddons, setSelectedAddons] = useState<ProductAddon[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');

  const basePrice = (product.discount_price ?? product.discountPrice) ?? product.price;
  const variantPrice = (selectedVariant?.price_modifier ?? selectedVariant?.priceModifier) ?? 0;
  const addonsPrice = selectedAddons.reduce((sum, a) => sum + Number(a.price || 0), 0);
  const unitPrice = basePrice + variantPrice + addonsPrice;
  const totalPrice = unitPrice * quantity;

  const toggleAddon = (addon: ProductAddon) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => String(a.id) === String(addon.id));
      if (exists) {
        return prev.filter((a) => String(a.id) !== String(addon.id));
      } else {
        return [...prev, addon];
      }
    });
  };

  const handleConfirm = () => {
    const cartLine: CartItem = {
      id: String(product.id),
      productId: String(product.id),
      productName: product.name,
      productImage: product.image,
      restaurantId: String(product.restaurant_id || product.restaurantId || ''),
      restaurantName,
      unitPrice,
      quantity,
      selectedVariant: selectedVariant ? {
        id: String(selectedVariant.id),
        name: selectedVariant.name,
        priceModifier: Number(selectedVariant.price_modifier ?? selectedVariant.priceModifier ?? 0)
      } : undefined,
      selectedAddons: selectedAddons.map((a) => ({
        addonId: String(a.id),
        name: a.name,
        price: Number(a.price)
      })),
      specialInstructions: specialInstructions.trim() ? specialInstructions.trim() : undefined,
      itemTotal: totalPrice
    };

    onAddToCart(cartLine);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-stone-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 bg-stone-900/60 hover:bg-stone-900 text-white rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Product Image */}
        <div className="relative aspect-[16/9] w-full bg-stone-100">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-4 text-white">
            <span className="text-xs text-amber-300 font-semibold">{restaurantName}</span>
            <h2 className="text-lg font-bold">{product.name}</h2>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Description & Prep Info */}
          <div>
            <p className="text-xs text-stone-600 leading-relaxed">
              {product.description}
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-stone-500">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Prep time: ~{product.preparationTime} mins</span>
            </div>
          </div>

          {/* Variants Selector (e.g. Single, Double, Meal) */}
          {product.variants && product.variants.length > 0 && (
            <div className="pt-4 border-t border-stone-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Select Size / Style <span className="text-amber-600">*</span>
                </span>
                <span className="text-[11px] text-stone-400">Required</span>
              </div>

              <div className="space-y-2">
                {product.variants.map((v) => {
                  const isChecked = selectedVariant?.id === v.id;
                  return (
                    <label
                      key={v.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-amber-500 bg-amber-50/50 text-stone-900'
                          : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="productVariant"
                          checked={isChecked}
                          onChange={() => setSelectedVariant(v)}
                          className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-stone-300"
                        />
                        <span className="text-xs font-medium">{v.name}</span>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-stone-600">
                        {Number(v.price_modifier ?? v.priceModifier ?? 0) > 0 
                          ? `+${formatCurrency(Number(v.price_modifier ?? v.priceModifier))}` 
                          : 'Standard'}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-ons Selector */}
          {product.addons && product.addons.length > 0 && (
            <div className="pt-4 border-t border-stone-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Culinary Extras & Dips
                </span>
                <span className="text-[11px] text-stone-400">Optional</span>
              </div>

              <div className="space-y-2">
                {product.addons.map((addon) => {
                  const isChecked = selectedAddons.some((a) => a.id === addon.id);
                  return (
                    <label
                      key={addon.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-amber-500 bg-amber-50/50 text-stone-900'
                          : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAddon(addon)}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                        />
                        <span className="text-xs font-medium">{addon.name}</span>
                      </div>
                      <span className="text-xs font-mono tabular-nums text-stone-600">
                        +{formatCurrency(addon.price)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Instructions */}
          <div className="pt-4 border-t border-stone-100">
            <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-2">
              Kitchen Instructions
            </label>
            <textarea
              rows={2}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. Extra crispy crust, dressing on the side, no onions..."
              className="w-full text-xs p-3 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none text-stone-800 placeholder:text-stone-400"
            />
          </div>
        </div>

        {/* Modal Footer with Stepper & Dynamic Total */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-4">
          {/* Quantity Stepper */}
          <div className="flex items-center border border-stone-300 bg-white rounded-xl overflow-hidden shadow-xs">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="p-2.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-xs font-bold font-mono tabular-nums text-stone-900">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="p-2.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={handleConfirm}
            className="flex-1 flex items-center justify-between px-5 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
          >
            <span>Add to Cart</span>
            <span className="font-mono tabular-nums text-amber-400 font-extrabold">
              {formatCurrency(totalPrice)}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};

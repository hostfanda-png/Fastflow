import React, { useState, useEffect } from 'react';
import { Product, ProductCategory, ProductAddon, ProductVariant } from '../../types';
import { productApi } from '../../services/api/productApi';
import { X, Utensils, Plus, Trash2, Image as ImageIcon, Save, AlertCircle } from 'lucide-react';

interface ProductModalProps {
  isOpen: boolean;
  restaurantId: string | number;
  product: Product | null;
  categories: ProductCategory[];
  allAddons: ProductAddon[];
  onClose: () => void;
  onSave: () => Promise<void>;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  restaurantId,
  product,
  categories,
  allAddons,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [image, setImage] = useState('');
  const [prepTime, setPrepTime] = useState('15');
  const [sortOrder, setSortOrder] = useState('0');
  const [isAvailable, setIsAvailable] = useState(true);

  // Dynamic Variants state
  const [variants, setVariants] = useState<Array<{ id?: string | number; name: string; price_modifier: number }>>([]);
  
  // Selected Addon IDs
  const [selectedAddonIds, setSelectedAddonIds] = useState<number[]>([]);

  // Local state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setCategoryId(String(product.category_id || product.categoryId || (categories[0]?.id ?? '')));
      setDescription(product.description || '');
      setPrice(String(product.price || ''));
      setDiscountPrice(product.discount_price || product.discountPrice ? String(product.discount_price ?? product.discountPrice) : '');
      setCompareAtPrice(product.compare_at_price || product.compareAtPrice ? String(product.compare_at_price ?? product.compareAtPrice) : '');
      setImage(product.image || '');
      setPrepTime(String(product.preparation_time || product.preparationTime || 15));
      setSortOrder(String(product.sort_order ?? 0));
      setIsAvailable(product.is_available !== false && product.isAvailable !== false);

      if (product.variants && product.variants.length > 0) {
        setVariants(product.variants.map(v => ({
          id: v.id,
          name: v.name,
          price_modifier: Number(v.price_modifier ?? v.priceModifier ?? 0),
        })));
      } else {
        setVariants([]);
      }

      if (product.addons && product.addons.length > 0) {
        setSelectedAddonIds(product.addons.map(a => Number(a.id)));
      } else {
        setSelectedAddonIds([]);
      }
    } else {
      setName('');
      setCategoryId(categories[0]?.id ? String(categories[0].id) : '');
      setDescription('');
      setPrice('');
      setDiscountPrice('');
      setCompareAtPrice('');
      setImage('');
      setPrepTime('15');
      setSortOrder('0');
      setIsAvailable(true);
      setVariants([]);
      setSelectedAddonIds([]);
    }
    setError(null);
  }, [product, categories, isOpen]);

  if (!isOpen) return null;

  const handleAddVariant = () => {
    setVariants([...variants, { name: '', price_modifier: 0 }]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: 'name' | 'price_modifier', value: any) => {
    const updated = [...variants];
    updated[index] = {
      ...updated[index],
      [field]: field === 'price_modifier' ? parseFloat(value) || 0 : value,
    };
    setVariants(updated);
  };

  const handleToggleAddon = (addonId: number) => {
    setSelectedAddonIds(prev => 
      prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Dish name is required.');
      return;
    }
    if (!categoryId) {
      setError('Please select a menu category.');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      setError('Please provide a valid price (greater than or equal to 0).');
      return;
    }

    setSaving(true);
    setError(null);

    const payload: any = {
      name: name.trim(),
      category_id: parseInt(categoryId, 10),
      description: description.trim() || null,
      price: numPrice,
      discount_price: discountPrice ? parseFloat(discountPrice) : null,
      compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
      image: image.trim() || null,
      preparation_time: parseInt(prepTime, 10) || 15,
      sort_order: parseInt(sortOrder, 10) || 0,
      is_available: isAvailable,
      variants: variants.filter(v => v.name.trim() !== ''),
      addons: selectedAddonIds,
    };

    try {
      if (product) {
        await productApi.update(restaurantId, product.id, payload);
      } else {
        await productApi.create(restaurantId, payload);
      }
      await onSave();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save food item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-stone-200 my-8">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-stone-900">
                {product ? 'Edit Dish / Product' : 'Add New Dish to Menu'}
              </h2>
              <p className="text-[11px] text-stone-500">Configure dish details, pricing, variants, and extra add-ons</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Main Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">1. Basic Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Dish / Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smash Double Burger, Chicken Biryani"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Menu Category *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                >
                  <option value="" disabled>Select category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Description / Ingredients
              </label>
              <textarea
                rows={2}
                placeholder="Delicious description of ingredients, portion size, and flavor profile..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-stone-900 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Image URL (Direct link)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                />
                {image && (
                  <img
                    src={image}
                    alt="Preview"
                    className="w-10 h-10 object-cover rounded-xl border border-stone-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Pricing & Availability */}
          <div className="space-y-4 pt-4 border-t border-stone-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">2. Pricing & Preparation</h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Base Price (PKR) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="1200"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Discount Price
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Optional"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(e.target.value)}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Prep Time (Mins)
                </label>
                <input
                  type="number"
                  min="1"
                  max="240"
                  value={prepTime}
                  onChange={(e) => setPrepTime(e.target.value)}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full text-xs p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:bg-white focus:ring-2 focus:ring-stone-900 outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="w-4 h-4 text-stone-900 rounded border-stone-300 focus:ring-stone-900"
                />
                <span className="text-xs font-semibold text-stone-700">In Stock & Available for Ordering</span>
              </label>
            </div>
          </div>

          {/* Variants */}
          <div className="space-y-4 pt-4 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">3. Portion Sizes & Variants</h3>
                <p className="text-[11px] text-stone-500">e.g. Single, Double, Large (+250 PKR)</p>
              </div>
              <button
                type="button"
                onClick={handleAddVariant}
                className="flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variant</span>
              </button>
            </div>

            {variants.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-stone-200 text-center text-xs text-stone-400">
                No variants added. This item will sell at standard base price.
              </div>
            ) : (
              <div className="space-y-2">
                {variants.map((v, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                    <input
                      type="text"
                      placeholder="Variant name (e.g. Double Patty / Large)"
                      value={v.name}
                      onChange={(e) => handleVariantChange(idx, 'name', e.target.value)}
                      className="flex-1 text-xs p-2 bg-white border border-stone-200 rounded-lg outline-none"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-stone-500">+PKR</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={v.price_modifier}
                        onChange={(e) => handleVariantChange(idx, 'price_modifier', e.target.value)}
                        className="w-24 text-xs p-2 bg-white border border-stone-200 rounded-lg font-mono outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(idx)}
                      className="text-stone-400 hover:text-red-600 p-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Addons Selection */}
          <div className="space-y-4 pt-4 border-t border-stone-100">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">4. Extra Add-ons</h3>
              <p className="text-[11px] text-stone-500">Select extras available for customer customisation with this dish</p>
            </div>

            {allAddons.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-stone-200 text-center text-xs text-stone-400">
                No store add-ons created yet. Add extras in the Add-ons tab.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allAddons.map((addon) => {
                  const isChecked = selectedAddonIds.includes(Number(addon.id));
                  return (
                    <label
                      key={addon.id}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-amber-50/60 border-amber-300 text-amber-950 font-medium'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleAddon(Number(addon.id))}
                          className="w-4 h-4 text-stone-900 rounded border-stone-300"
                        />
                        <span>{addon.name}</span>
                      </div>
                      <span className="font-mono text-stone-500 font-bold">+PKR {addon.price}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : product ? 'Save Dish' : 'Create Dish'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

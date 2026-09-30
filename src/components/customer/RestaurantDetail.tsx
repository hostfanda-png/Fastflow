import React, { useState, useEffect, useCallback } from 'react';
import { Restaurant, Product, ProductCategory } from '../../types';
import { useApp } from '../../context/AppContext';
import { restaurantApi } from '../../services/api/restaurantApi';
import { 
  ArrowLeft, 
  Star, 
  Clock, 
  Bike, 
  MapPin, 
  Phone, 
  Search, 
  Plus, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { FoodItemModal } from './FoodItemModal';

interface RestaurantDetailProps {
  restaurant: Restaurant;
  onBack: () => void;
}

export const RestaurantDetail: React.FC<RestaurantDetailProps> = ({ restaurant, onBack }) => {
  const { products: contextProducts, categories: contextCategories, formatCurrency, addToCart } = useApp();

  const [menuCategories, setMenuCategories] = useState<ProductCategory[]>([]);
  const [menuProducts, setMenuProducts] = useState<Product[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [menuSearch, setMenuSearch] = useState<string>('');

  // Fetch structured menu from backend API
  const fetchMenu = useCallback(async () => {
    setLoadingMenu(true);
    setMenuError(null);

    try {
      const res = await restaurantApi.getMenu(restaurant.id);
      if (res.success && res.data) {
        if (res.data.categories && res.data.categories.length > 0) {
          setMenuCategories(res.data.categories);
        } else {
          setMenuCategories(contextCategories);
        }

        if (res.data.products) {
          setMenuProducts(res.data.products);
        } else {
          // Fallback to context products for this restaurant
          const filtered = contextProducts.filter(p => String(p.restaurant_id || p.restaurantId) === String(restaurant.id));
          setMenuProducts(filtered);
        }
      } else {
        const filtered = contextProducts.filter(p => String(p.restaurant_id || p.restaurantId) === String(restaurant.id));
        setMenuProducts(filtered);
        setMenuCategories(contextCategories);
      }
    } catch {
      // Graceful fallback to context products
      const filtered = contextProducts.filter(p => String(p.restaurant_id || p.restaurantId) === String(restaurant.id));
      setMenuProducts(filtered);
      setMenuCategories(contextCategories);
    } finally {
      setLoadingMenu(false);
    }
  }, [restaurant.id, contextCategories, contextProducts]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // Filter products by category and search
  const filteredProducts = menuProducts.filter((p) => {
    const pCatId = String(p.category_id || p.categoryId || '');
    const matchesCategory = activeTab === 'all' || pCatId === activeTab;
    const matchesSearch = menuSearch === '' || 
      p.name.toLowerCase().includes(menuSearch.toLowerCase()) || 
      (p.description && p.description.toLowerCase().includes(menuSearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="pb-24">
      {/* Back Button */}
      <div className="mb-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-3 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Restaurants</span>
        </button>
      </div>

      {/* Restaurant Hero Card */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs mb-8">
        {/* Cover Photo */}
        <div className="relative h-64 sm:h-80 w-full bg-stone-100">
          <img
            src={restaurant.coverImage || restaurant.cover_image}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/30 to-transparent" />

          {/* Tag & Status */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              restaurant.isOpen || restaurant.is_open ? 'bg-emerald-500 text-white' : 'bg-stone-800 text-stone-300'
            }`}>
              {restaurant.isOpen || restaurant.is_open ? 'Open Now' : 'Closed'}
            </span>
          </div>

          {/* Identity in Header */}
          <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold mb-1">
                <span>{Array.isArray(restaurant.cuisines) ? restaurant.cuisines.map((c: any) => typeof c === 'string' ? c : c.name).join(' · ') : ''}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                {restaurant.name}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-stone-300 max-w-2xl line-clamp-2">
                {restaurant.description}
              </p>
            </div>

            <div className="bg-stone-900/90 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex items-center gap-4 text-xs shrink-0">
              <div className="text-center">
                <div className="flex items-center gap-1 font-bold text-amber-400">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span className="font-mono tabular-nums text-sm">{(Number(restaurant.rating) || 4.5).toFixed(1)}</span>
                </div>
                <div className="text-[10px] text-stone-400">{restaurant.reviewCount || restaurant.review_count || 0} reviews</div>
              </div>

              <div className="h-6 w-px bg-white/15" />

              <div className="text-center">
                <div className="font-bold text-white font-mono tabular-nums text-sm">
                  {restaurant.estimatedDeliveryTime || restaurant.estimated_delivery_time || '25-35 min'}
                </div>
                <div className="text-[10px] text-stone-400">Delivery ETA</div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Strip */}
        <div className="p-4 sm:p-6 bg-stone-50 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{restaurant.address}, {restaurant.area}, {restaurant.city}</span>
          </div>

          <div className="flex items-center gap-6 font-mono tabular-nums">
            <div className="flex items-center gap-1.5">
              <Bike className="w-4 h-4 text-stone-400" />
              <span>Delivery: <strong>{formatCurrency(Number(restaurant.deliveryFee ?? restaurant.delivery_fee ?? 0))}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-stone-400" />
              <span>Min Order: <strong>{formatCurrency(Number(restaurant.minimumOrder ?? restaurant.minimum_order ?? 0))}</strong></span>
            </div>
            {restaurant.phone && (
              <div className="hidden sm:flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-stone-400" />
                <span>{restaurant.phone}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu Navigation & Search */}
      <div className="sticky top-16 z-30 bg-stone-50/95 backdrop-blur-sm pt-2 pb-4 mb-6 border-b border-stone-200">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
              }`}
            >
              All Items ({menuProducts.length})
            </button>
            {menuCategories.filter(c => c.id !== 'cat-all').map((cat) => {
              const count = menuProducts.filter(p => String(p.category_id || p.categoryId) === String(cat.id)).length;
              if (count === 0 && activeTab !== String(cat.id)) return null;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(String(cat.id))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === String(cat.id)
                      ? 'bg-stone-900 text-white'
                      : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Quick Menu Filter */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
              placeholder="Search dishes in menu..."
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
          </div>

        </div>
      </div>

      {/* Menu Grid */}
      {loadingMenu ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center flex flex-col items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-stone-400" />
          <span className="text-xs text-stone-500">Loading dishes from restaurant menu...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <AlertCircle className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-stone-800">No dishes match your filter</h3>
          <p className="text-xs text-stone-500 mt-1">Try another category or search keyword.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProducts.map((product) => {
            const discPrice = product.discount_price ?? product.discountPrice;
            const hasDiscount = discPrice && discPrice < product.price;
            const isAvail = product.is_available !== false && product.isAvailable !== false;

            return (
              <div
                key={product.id}
                onClick={() => {
                  if (isAvail) setSelectedProduct(product);
                }}
                className={`group bg-white rounded-2xl border border-stone-200 p-4 transition-all flex gap-4 items-center justify-between ${
                  isAvail ? 'cursor-pointer hover:border-amber-400 hover:shadow-xs' : 'opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-stone-900 group-hover:text-amber-600 transition-colors">
                      {product.name}
                    </h3>
                    {hasDiscount && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        Special Offer
                      </span>
                    )}
                    {!isAvail && (
                      <span className="text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                        Sold Out
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-stone-500 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="font-mono tabular-nums text-xs">
                      {hasDiscount ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-stone-900">
                            {formatCurrency(discPrice!)}
                          </span>
                          <span className="text-stone-400 line-through text-[11px]">
                            {formatCurrency(product.price)}
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-stone-900">
                          {formatCurrency(product.price)}
                        </span>
                      )}
                    </div>

                    <span className="text-stone-300">·</span>
                    <span className="text-[11px] text-stone-400">
                      ~{product.preparation_time || product.preparationTime || 15} mins
                    </span>
                  </div>
                </div>

                {/* Product Thumbnail & Quick Add Button */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                      <Bike className="w-6 h-6" />
                    </div>
                  )}
                  {isAvail && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(product);
                      }}
                      className="absolute bottom-1.5 right-1.5 p-1.5 bg-stone-900 hover:bg-amber-500 text-white hover:text-stone-950 rounded-lg shadow-md transition-colors cursor-pointer"
                      title="Customize & Add"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Customizer Modal */}
      {selectedProduct && (
        <FoodItemModal
          product={selectedProduct}
          restaurantName={restaurant.name}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={addToCart}
        />
      )}
    </div>
  );
};

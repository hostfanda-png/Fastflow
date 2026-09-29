import React, { useState } from 'react';
import { Restaurant, Product } from '../../types';
import { useApp } from '../../context/AppContext';
import { 
  ArrowLeft, 
  Star, 
  Clock, 
  Bike, 
  MapPin, 
  Phone, 
  Search, 
  Plus, 
  AlertCircle 
} from 'lucide-react';
import { FoodItemModal } from './FoodItemModal';

interface RestaurantDetailProps {
  restaurant: Restaurant;
  onBack: () => void;
}

export const RestaurantDetail: React.FC<RestaurantDetailProps> = ({ restaurant, onBack }) => {
  const { products, categories, formatCurrency, addToCart } = useApp();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [menuSearch, setMenuSearch] = useState<string>('');

  // Filter products for this restaurant
  const restaurantProducts = products.filter((p) => p.restaurantId === restaurant.id);

  // Filter by category and search
  const filteredProducts = restaurantProducts.filter((p) => {
    const matchesCategory = activeTab === 'all' || p.categoryId === activeTab;
    const matchesSearch = menuSearch === '' || 
      p.name.toLowerCase().includes(menuSearch.toLowerCase()) || 
      p.description.toLowerCase().includes(menuSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="pb-24">
      {/* Back Button */}
      <div className="mb-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-3 py-1.5 rounded-lg shadow-xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Restaurants</span>
        </button>
      </div>

      {/* Restaurant Hero Card */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm mb-8">
        {/* Cover Photo */}
        <div className="relative h-64 sm:h-80 w-full bg-stone-100">
          <img
            src={restaurant.coverImage}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/30 to-transparent" />

          {/* Tag & Status */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              restaurant.isOpen ? 'bg-emerald-500 text-white' : 'bg-stone-800 text-stone-300'
            }`}>
              {restaurant.isOpen ? 'Open Now' : 'Closed'}
            </span>
          </div>

          {/* Identity in Header */}
          <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold mb-1">
                <span>{restaurant.cuisines.join(' · ')}</span>
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
                  <span className="font-mono tabular-nums text-sm">{restaurant.rating.toFixed(1)}</span>
                </div>
                <div className="text-[10px] text-stone-400">{restaurant.reviewCount} reviews</div>
              </div>

              <div className="h-6 w-px bg-white/15" />

              <div className="text-center">
                <div className="font-bold text-white font-mono tabular-nums text-sm">
                  {restaurant.estimatedDeliveryTime}
                </div>
                <div className="text-[10px] text-stone-400">Delivery ETA</div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Strip (No pills: clean typography) */}
        <div className="p-4 sm:p-6 bg-stone-50 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{restaurant.address}, {restaurant.area}, {restaurant.city}</span>
          </div>

          <div className="flex items-center gap-6 font-mono tabular-nums">
            <div className="flex items-center gap-1.5">
              <Bike className="w-4 h-4 text-stone-400" />
              <span>Delivery: <strong>{formatCurrency(restaurant.deliveryFee)}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-stone-400" />
              <span>Min Order: <strong>{formatCurrency(restaurant.minimumOrder)}</strong></span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-stone-400" />
              <span>{restaurant.phone}</span>
            </div>
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'all'
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
              }`}
            >
              All Items ({restaurantProducts.length})
            </button>
            {categories.filter(c => c.id !== 'cat-all').map((cat) => {
              const count = restaurantProducts.filter(p => p.categoryId === cat.id).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeTab === cat.id
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
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

        </div>
      </div>

      {/* Menu Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <AlertCircle className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-stone-800">No dishes match your filter</h3>
          <p className="text-xs text-stone-500 mt-1">Try another category or search keyword.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProducts.map((product) => {
            const hasDiscount = product.discountPrice && product.discountPrice < product.price;

            return (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="group cursor-pointer bg-white rounded-2xl border border-stone-200 p-4 hover:border-amber-400 hover:shadow-md transition-all flex gap-4 items-center justify-between"
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
                  </div>

                  <p className="mt-1 text-xs text-stone-500 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="font-mono tabular-nums text-xs">
                      {hasDiscount ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-stone-900">
                            {formatCurrency(product.discountPrice!)}
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
                    <span className="text-[11px] text-stone-400">~{product.preparationTime} mins</span>
                  </div>
                </div>

                {/* Product Thumbnail & Quick Add Button */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(product);
                    }}
                    className="absolute bottom-1.5 right-1.5 p-1.5 bg-stone-900 hover:bg-amber-500 text-white hover:text-stone-950 rounded-lg shadow-md transition-colors"
                    title="Customize & Add"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
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

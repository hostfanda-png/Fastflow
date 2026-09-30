import React, { useState, useEffect, useCallback } from 'react';
import { Product, ProductCategory, ProductAddon } from '../../types';
import { categoryApi } from '../../services/api/categoryApi';
import { productApi } from '../../services/api/productApi';
import { addonApi } from '../../services/api/addonApi';
import { useApp } from '../../context/AppContext';
import { CategoryModal } from './CategoryModal';
import { ProductModal } from './ProductModal';
import { AddonModal } from './AddonModal';
import { 
  Plus, 
  Search, 
  Filter, 
  FolderPlus, 
  Sparkles, 
  Utensils, 
  Edit, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  AlertCircle, 
  Check, 
  RefreshCw, 
  ArrowUpDown,
  ChefHat
} from 'lucide-react';

interface MenuManagementProps {
  restaurantId: string | number;
}

export const MenuManagement: React.FC<MenuManagementProps> = ({ restaurantId }) => {
  const { formatCurrency } = useApp();

  // Sub-tabs: 'products' | 'categories' | 'addons'
  const [subTab, setSubTab] = useState<'products' | 'categories' | 'addons'>('products');

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [addons, setAddons] = useState<ProductAddon[]>([]);
  
  // Loading & Feedback
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available' | 'sold_out'>('all');

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);

  const [showAddonModal, setShowAddonModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState<ProductAddon | null>(null);

  // Fetch all menu entities
  const loadMenuData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [catsRes, prodsRes, addonsRes] = await Promise.all([
        categoryApi.getOwnerCategories(restaurantId),
        productApi.getOwnerProducts(restaurantId),
        addonApi.getAll(restaurantId),
      ]);

      if (catsRes.success && catsRes.data) {
        setCategories(catsRes.data);
      }
      if (prodsRes.success && prodsRes.data) {
        setProducts(prodsRes.data);
      }
      if (addonsRes.success && addonsRes.data) {
        setAddons(addonsRes.data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load restaurant menu data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadMenuData();
  }, [loadMenuData]);

  // Clear success notification
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Handle Category Save
  const handleSaveCategory = async (data: Partial<ProductCategory>) => {
    if (editingCategory) {
      const res = await categoryApi.update(restaurantId, editingCategory.id, data);
      if (res.success) {
        setSuccessMsg(`Category '${res.data?.name || 'Item'}' updated successfully.`);
      }
    } else {
      const res = await categoryApi.create(restaurantId, data);
      if (res.success) {
        setSuccessMsg(`Category '${res.data?.name || 'Item'}' created.`);
      }
    }
    await loadMenuData();
  };

  // Handle Category Delete
  const handleDeleteCategory = async (category: ProductCategory) => {
    if (!confirm(`Are you sure you want to remove '${category.name}'?`)) return;
    setError(null);
    try {
      const res = await categoryApi.delete(restaurantId, category.id);
      if (res.success) {
        setSuccessMsg(`Category '${category.name}' deleted.`);
        await loadMenuData();
      } else {
        setError(res.message || 'Could not delete category.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error deleting category.');
    }
  };

  // Handle Addon Save
  const handleSaveAddon = async (data: Partial<ProductAddon>) => {
    if (editingAddon) {
      const res = await addonApi.update(restaurantId, editingAddon.id, data);
      if (res.success) {
        setSuccessMsg(`Add-on '${res.data?.name || 'Item'}' updated.`);
      }
    } else {
      const res = await addonApi.create(restaurantId, data);
      if (res.success) {
        setSuccessMsg(`Add-on '${res.data?.name || 'Item'}' created.`);
      }
    }
    await loadMenuData();
  };

  // Handle Addon Delete
  const handleDeleteAddon = async (addon: ProductAddon) => {
    if (!confirm(`Are you sure you want to delete add-on '${addon.name}'?`)) return;
    setError(null);
    try {
      const res = await addonApi.delete(restaurantId, addon.id);
      if (res.success) {
        setSuccessMsg(`Add-on '${addon.name}' removed.`);
        await loadMenuData();
      } else {
        setError(res.message || 'Could not delete add-on.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error deleting add-on.');
    }
  };

  // Handle Product Delete
  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to remove '${product.name}' from your menu?`)) return;
    setError(null);
    try {
      const res = await productApi.delete(restaurantId, product.id);
      if (res.success) {
        setSuccessMsg(`Dish '${product.name}' removed from menu.`);
        setProducts(prev => prev.filter(p => String(p.id) !== String(product.id)));
      } else {
        setError(res.message || 'Could not remove product.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error deleting product.');
    }
  };

  // Handle Product Availability Toggle
  const handleToggleProductAvailability = async (product: Product) => {
    setError(null);
    try {
      const res = await productApi.toggleAvailability(restaurantId, product.id);
      if (res.success) {
        const isAvail = res.data?.is_available ?? !product.isAvailable;
        setSuccessMsg(`'${product.name}' marked as ${isAvail ? 'In Stock' : 'Sold Out'}.`);
        setProducts(prev => prev.map(p => {
          if (String(p.id) === String(product.id)) {
            return { ...p, isAvailable: isAvail, is_available: isAvail };
          }
          return p;
        }));
      } else {
        setError(res.message || 'Could not toggle product availability.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error updating product.');
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const pCatId = String(p.category_id || p.categoryId || '');
    const matchesCat = selectedCategoryFilter === 'all' || pCatId === selectedCategoryFilter;
    const matchesSearch = searchQuery === '' || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const isAvail = p.is_available !== false && p.isAvailable !== false;
    const matchesAvail = availabilityFilter === 'all' || 
      (availabilityFilter === 'available' && isAvail) || 
      (availabilityFilter === 'sold_out' && !isAvail);

    return matchesCat && matchesSearch && matchesAvail;
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-red-700 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-600 font-bold">×</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-700 text-xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 font-bold">×</button>
        </div>
      )}

      {/* Header & Subtabs */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-stone-900">Menu & Catalog Studio</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Live multi-vendor catalog management for dishes, variants, extras, and categories
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setRefreshing(true);
                loadMenuData();
              }}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-xl text-xs font-semibold text-stone-700 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center gap-2 pt-4 overflow-x-auto">
          <button
            onClick={() => setSubTab('products')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              subTab === 'products'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Dishes & Products ({products.length})</span>
          </button>

          <button
            onClick={() => setSubTab('categories')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              subTab === 'categories'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Menu Categories ({categories.length})</span>
          </button>

          <button
            onClick={() => setSubTab('addons')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              subTab === 'addons'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Extra Add-ons ({addons.length})</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: PRODUCTS / DISHES */}
      {subTab === 'products' && (
        <div className="space-y-4">
          {/* Action Bar & Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search dishes by name or ingredient..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-stone-900 outline-none"
                />
              </div>

              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 outline-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Availability Filter */}
              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value as any)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 outline-none cursor-pointer hidden md:block"
              >
                <option value="all">All Stock Status</option>
                <option value="available">In Stock Only</option>
                <option value="sold_out">Sold Out Only</option>
              </select>
            </div>

            <button
              onClick={() => {
                setEditingProduct(null);
                setShowProductModal(true);
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Dish</span>
            </button>
          </div>

          {/* Product Cards Grid */}
          {loading ? (
            <div className="p-12 text-center text-xs text-stone-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-stone-400" />
              <span>Loading menu items from server...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                <ChefHat className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">No dishes found</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                {searchQuery || selectedCategoryFilter !== 'all'
                  ? 'No menu items match your search filters.'
                  : 'Start building your restaurant menu by adding your first signature dish.'}
              </p>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setShowProductModal(true);
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Dish</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((prod) => {
                const isAvail = prod.is_available !== false && prod.isAvailable !== false;
                const variantsCount = prod.variants?.length || 0;
                const addonsCount = prod.addons?.length || 0;

                return (
                  <div
                    key={prod.id}
                    className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs p-4 flex flex-col justify-between hover:border-stone-300 transition-all"
                  >
                    <div>
                      {/* Product Image & Sold Out Badge */}
                      <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-3 bg-stone-100">
                        {prod.image ? (
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-300">
                            <Utensils className="w-8 h-8" />
                          </div>
                        )}

                        {!isAvail && (
                          <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center">
                            <span className="text-[11px] font-bold text-white uppercase tracking-wider bg-red-600 px-2.5 py-0.5 rounded">
                              Sold Out
                            </span>
                          </div>
                        )}

                        {prod.category && (
                          <span className="absolute top-2 left-2 bg-stone-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                            {prod.category.name}
                          </span>
                        )}
                      </div>

                      {/* Title & Price */}
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-stone-900">{prod.name}</h3>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-mono font-bold text-stone-900 tabular-nums">
                            {formatCurrency(prod.price)}
                          </div>
                          {prod.discount_price && (
                            <div className="text-[10px] font-mono text-stone-400 line-through">
                              {formatCurrency(prod.discount_price)}
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="mt-1 text-xs text-stone-500 line-clamp-2">
                        {prod.description || 'No description provided.'}
                      </p>

                      {/* Metadata badges */}
                      <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[11px]">
                        {variantsCount > 0 && (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
                            {variantsCount} Sizes/Variants
                          </span>
                        )}
                        {addonsCount > 0 && (
                          <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-md font-semibold">
                            {addonsCount} Extras
                          </span>
                        )}
                        <span className="text-stone-400 font-mono">
                          ⏱ {prod.preparation_time || prod.preparationTime || 15}m prep
                        </span>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                      <button
                        onClick={() => handleToggleProductAvailability(prod)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                          isAvail
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-red-50 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        {isAvail ? <ToggleRight className="w-4 h-4 text-emerald-600" /> : <ToggleLeft className="w-4 h-4 text-red-600" />}
                        <span>{isAvail ? 'In Stock' : 'Sold Out'}</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingProduct(prod);
                            setShowProductModal(true);
                          }}
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Dish"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(prod)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Dish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: MENU CATEGORIES */}
      {subTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <h3 className="text-xs font-bold text-stone-900">Custom Restaurant Sections</h3>
              <p className="text-[11px] text-stone-500">Organize your menu into structured sections for customers</p>
            </div>
            <button
              onClick={() => {
                setEditingCategory(null);
                setShowCategoryModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
              <FolderPlus className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-stone-800">No categories created yet</h4>
              <p className="text-xs text-stone-500 mt-1">Create categories like Starters, Mains, and Drinks.</p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs divide-y divide-stone-100">
              {categories.map((cat) => (
                <div key={cat.id} className="p-4 flex items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
                      {cat.icon || '📁'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">{cat.name}</span>
                        {cat.is_active === false && (
                          <span className="text-[10px] bg-stone-200 text-stone-600 font-bold px-2 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                        {cat.restaurant_id ? (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded">
                            Custom
                          </span>
                        ) : (
                          <span className="text-[10px] bg-stone-100 text-stone-500 font-medium px-1.5 py-0.2 rounded">
                            Global
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">
                        {cat.description || 'No description'} • {cat.products_count ?? 0} dishes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setShowCategoryModal(true);
                      }}
                      className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors"
                      title="Edit Category"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {cat.restaurant_id && (
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: EXTRA ADD-ONS */}
      {subTab === 'addons' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
            <div>
              <h3 className="text-xs font-bold text-stone-900">Customization Extras & Add-ons</h3>
              <p className="text-[11px] text-stone-500">Configure sauces, extra toppings, and dips across your menu</p>
            </div>
            <button
              onClick={() => {
                setEditingAddon(null);
                setShowAddonModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Extra</span>
            </button>
          </div>

          {addons.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
              <Sparkles className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-stone-800">No add-ons created</h4>
              <p className="text-xs text-stone-500 mt-1">Create extras like Extra Cheese, Garlic Mayo, and Drinks.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {addons.map((addon) => {
                const isAvail = addon.is_available !== false && addon.isAvailable !== false;
                return (
                  <div key={addon.id} className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-900">{addon.name}</span>
                        {!isAvail && (
                          <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded">
                            Out of stock
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-700 mt-0.5">
                        +{formatCurrency(addon.price)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingAddon(addon);
                          setShowAddonModal(true);
                        }}
                        className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                        title="Edit Addon"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAddon(addon)}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Addon"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CategoryModal
        isOpen={showCategoryModal}
        category={editingCategory}
        onClose={() => setShowCategoryModal(false)}
        onSave={handleSaveCategory}
      />

      <ProductModal
        isOpen={showProductModal}
        restaurantId={restaurantId}
        product={editingProduct}
        categories={categories}
        allAddons={addons}
        onClose={() => setShowProductModal(false)}
        onSave={async () => {
          await loadMenuData();
        }}
      />

      <AddonModal
        isOpen={showAddonModal}
        addon={editingAddon}
        onClose={() => setShowAddonModal(false)}
        onSave={handleSaveAddon}
      />
    </div>
  );
};

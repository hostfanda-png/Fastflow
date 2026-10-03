import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { ToastContainer } from './components/common/Toast';
import { HeroBanner } from './components/customer/HeroBanner';
import { CategoryList } from './components/customer/CategoryList';
import { RestaurantCard } from './components/customer/RestaurantCard';
import { RestaurantDetail } from './components/customer/RestaurantDetail';
import { CartDrawer } from './components/customer/CartDrawer';
import { CheckoutModal } from './components/customer/CheckoutModal';
import { OrderTracker } from './components/customer/OrderTracker';
import { CustomerOrders } from './components/customer/CustomerOrders';
import { CustomerProfile } from './components/customer/CustomerProfile';
import { CMSModal } from './components/customer/CMSModal';
import { AuthModal } from './components/common/AuthModal';
import { RestaurantDashboard } from './components/restaurant/RestaurantDashboard';
import { RiderDashboard } from './components/rider/RiderDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { NotFoundView } from './components/common/NotFoundView';
import { Restaurant } from './types';
import { 
  Sparkles, 
  Bike, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  Smartphone, 
  Star,
  CheckCircle,
  Tag,
  ShieldAlert
} from 'lucide-react';
import { SkeletonLoader } from './components/common/SkeletonLoader';
import { ApiErrorMessage } from './components/common/ApiErrorMessage';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { parsePath, formatAdminPath, navigateTo, AppView, AdminTab } from './utils/router';
import { restaurantApi } from './services/api/restaurantApi';

const MainApp: React.FC = () => {
  const { 
    currentUser,
    isLoggedIn,
    restaurants, 
    products, 
    coupons, 
    reviews, 
    activeOrder, 
    setActiveOrder, 
    orders,
    formatCurrency,
    isLoading,
    apiError,
    refreshData,
    isAuthModalOpen,
    closeAuthModal,
    openAuthModal,
    authModalMode
  } = useApp();

  const [activeView, setActiveView] = useState<AppView>('storefront');
  const [adminTab, setAdminTab] = useState<AdminTab>('analytics');
  const [adminDetailType, setAdminDetailType] = useState<'restaurant' | 'order' | 'customer' | 'rider' | undefined>(undefined);
  const [adminDetailId, setAdminDetailId] = useState<string | number | undefined>(undefined);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('cat-all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [activeCMSPage, setActiveCMSPage] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>(typeof window !== 'undefined' ? window.location.pathname : '/');

  // Parse path and synchronize view state
  const syncRouteFromPath = (pathname: string) => {
    setCurrentPath(pathname);
    const route = parsePath(pathname);

    setActiveView(route.view);

    if (route.cmsSlug) {
      setActiveCMSPage(route.cmsSlug);
    }

    if (route.view === 'admin_portal') {
      if (route.adminTab) {
        setAdminTab(route.adminTab);
      }
      setAdminDetailType(route.detailType);
      setAdminDetailId(route.detailId);
    }

    if (route.view === 'restaurant_detail' && route.restaurantId) {
      const found = restaurants.find(r => String(r.id) === String(route.restaurantId));
      if (found) {
        setSelectedRestaurant(found);
      } else {
        // Fetch restaurant details dynamically if not in initial list
        restaurantApi.getById(route.restaurantId)
          .then((res) => {
            if (res.data) setSelectedRestaurant(res.data);
          })
          .catch(() => {
            // Handled gracefully
          });
      }
    }

    if (route.view === 'order_tracker' && route.orderId) {
      const found = orders.find(o => String(o.id) === String(route.orderId) || o.orderNumber === route.orderId);
      if (found) {
        setActiveOrder(found);
      }
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      syncRouteFromPath(window.location.pathname);

      const handlePopState = () => {
        syncRouteFromPath(window.location.pathname);
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [restaurants.length]);

  // View transition helper
  const changeView = (view: AppView, path?: string) => {
    setActiveView(view);
    if (view === 'storefront') setSelectedRestaurant(null);

    const targetPath = path || (
      view === 'storefront' ? '/' :
      view === 'offers' ? '/offers' :
      view === 'orders' ? '/orders' :
      view === 'profile' ? '/profile' :
      view === 'restaurant_portal' ? '/restaurant-portal' :
      view === 'rider_portal' ? '/rider-portal' :
      view === 'admin_portal' ? '/admin/dashboard' :
      '/'
    );

    navigateTo(targetPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setActiveView('restaurant_detail');
    navigateTo(`/restaurants/${restaurant.id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderSuccess = (orderId: string) => {
    setIsCheckoutOpen(false);
    setActiveView('order_tracker');
    navigateTo(`/order-tracker/${orderId}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCMS = (slug: string) => {
    setActiveCMSPage(slug);
    navigateTo(`/${slug}`);
  };

  // Filter restaurants by category, search query
  const filteredRestaurants = restaurants.filter((r) => {
    const matchesSearch = searchQuery === '' || 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.cuisines.some(c => c.toLowerCase().includes(searchQuery.toLowerCase())) ||
      products.some(p => p.restaurantId === r.id && p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'cat-all' || (() => {
      if (selectedCategory === 'cat-pizza') return r.cuisines.some(c => c.toLowerCase().includes('pizza') || c.toLowerCase().includes('italian'));
      if (selectedCategory === 'cat-burgers') return r.cuisines.some(c => c.toLowerCase().includes('burger') || c.toLowerCase().includes('american'));
      if (selectedCategory === 'cat-sushi') return r.cuisines.some(c => c.toLowerCase().includes('sushi') || c.toLowerCase().includes('japanese'));
      if (selectedCategory === 'cat-mexican') return r.cuisines.some(c => c.toLowerCase().includes('mexican') || c.toLowerCase().includes('taco'));
      return true;
    })();

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans antialiased text-stone-900 selection:bg-amber-100 selection:text-amber-900">
      
      {/* Top Navigation */}
      <Header
        activeView={activeView}
        setActiveView={(view) => changeView(view as AppView)}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenCMS={handleOpenCMS}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* VIEW 1: Storefront Landing */}
        {activeView === 'storefront' && (
          <div>
            {/* Hero Banner with live search */}
            <HeroBanner
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onExploreClick={() => {
                const el = document.getElementById('restaurants-grid');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            {/* Browse Categories Tabs */}
            <CategoryList
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Special Promo Banners Strip */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              <div 
                onClick={() => {
                  const r = restaurants.find(x => x.id === 'rest-fuego');
                  if (r) handleOpenRestaurant(r);
                }}
                className="group cursor-pointer relative overflow-hidden rounded-2xl bg-stone-900 text-white p-6 shadow-sm border border-stone-800 flex items-center justify-between"
              >
                <div className="relative z-10 max-w-xs">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    Chef Special Promotion
                  </span>
                  <h3 className="text-lg font-bold mt-1 text-white group-hover:text-amber-300 transition-colors">
                    20% Off Neapolitan Pizzas
                  </h3>
                  <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                    Slow-fermented sourdough, fresh Fior di Latte, and San Marzano tomatoes.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                    <span>Order Margherita & Diavola</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
                <img
                  src="/src/assets/images/restaurant_artisan_pizza_1790680520718.jpg"
                  alt="Neapolitan Pizza"
                  className="w-28 h-28 sm:w-36 sm:h-36 object-cover rounded-xl opacity-90 group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div 
                onClick={() => {
                  const r = restaurants.find(x => x.id === 'rest-iron-grill');
                  if (r) handleOpenRestaurant(r);
                }}
                className="group cursor-pointer relative overflow-hidden rounded-2xl bg-stone-900 text-white p-6 shadow-sm border border-stone-800 flex items-center justify-between"
              >
                <div className="relative z-10 max-w-xs">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    Smash Burger Week
                  </span>
                  <h3 className="text-lg font-bold mt-1 text-white group-hover:text-amber-300 transition-colors">
                    The Double Iron Smash Deal
                  </h3>
                  <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                    Angus smash patties with crispy lacy edges, smoked bacon & truffle fries.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-transform">
                    <span>Explore Smash Burgers</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
                <img
                  src="/src/assets/images/restaurant_craft_burger_1790680534475.jpg"
                  alt="Craft Burger"
                  className="w-28 h-28 sm:w-36 sm:h-36 object-cover rounded-xl opacity-90 group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Restaurants Section */}
            <div id="restaurants-grid" className="scroll-mt-24 mb-16">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                    Featured Master Kitchens
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Verified independent restaurants delivering in your area
                  </p>
                </div>

                <div className="text-xs font-mono font-semibold text-stone-500">
                  {filteredRestaurants.length} Available
                </div>
              </div>

              {apiError && (
                <ApiErrorMessage message={apiError} onRetry={refreshData} />
              )}

              {isLoading ? (
                <SkeletonLoader type="card" count={4} />
              ) : filteredRestaurants.length === 0 ? (
                <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center shadow-xs">
                  <p className="text-sm font-bold text-stone-800">No restaurants match your search</p>
                  <p className="text-xs text-stone-500 mt-1">Try clearing filters or search terms.</p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('cat-all'); }}
                    className="mt-4 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Reset Search
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredRestaurants.map((restaurant) => (
                    <RestaurantCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      onClick={() => handleOpenRestaurant(restaurant)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* How It Works Section */}
            <div className="bg-white rounded-3xl border border-stone-200 p-8 sm:p-12 mb-16 shadow-xs">
              <div className="text-center max-w-xl mx-auto mb-10">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                  Engineered For Freshness
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight mt-1">
                  How Fastflow Delivers
                </h2>
                <p className="text-xs sm:text-sm text-stone-500 mt-2">
                  A synchronous multi-vendor infrastructure ensuring zero condensation and maximum culinary fidelity.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg mx-auto mb-4 border border-amber-200">
                    1
                  </div>
                  <h3 className="text-sm font-bold text-stone-900">Select Single Kitchen</h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    Choose from master pizzerias, smokehouses, or raw bars in your designated zone.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg mx-auto mb-4 border border-amber-200">
                    2
                  </div>
                  <h3 className="text-sm font-bold text-stone-900">Cooked to Order</h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    Orders hit the chef console instantly and fire under exact temperature recipes.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg mx-auto mb-4 border border-amber-200">
                    3
                  </div>
                  <h3 className="text-sm font-bold text-stone-900">Smart Dispatch</h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    Nearest motorized courier is assigned with insulated thermal containment packs.
                  </p>
                </div>

                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg mx-auto mb-4 border border-amber-200">
                    4
                  </div>
                  <h3 className="text-sm font-bold text-stone-900">Doorstep Handover</h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    Contactless delivery with live status tracking and prompt review moderation.
                  </p>
                </div>
              </div>
            </div>

            {/* Testimonials / Customer Reviews */}
            <div className="mb-16">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">Verified Diner Reviews</h2>
                  <p className="text-xs text-stone-500">Real feedback from completed food delivery orders</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reviews.slice(0, 3).map((rev) => (
                  <div key={rev.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1 text-amber-400 mb-2">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                        ))}
                      </div>
                      <p className="text-xs text-stone-700 leading-relaxed italic">
                        "{rev.comment}"
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-900">{rev.customerName}</span>
                      <span className="text-[11px] text-stone-400">Verified Order</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* VIEW 2: Restaurant Detail Page */}
        {activeView === 'restaurant_detail' && (
          selectedRestaurant ? (
            <RestaurantDetail
              restaurant={selectedRestaurant}
              onBack={() => {
                setSelectedRestaurant(null);
                changeView('storefront', '/');
              }}
            />
          ) : (
            <NotFoundView
              type="frontend_404"
              path={currentPath}
              message="The requested restaurant could not be located or may have been updated."
              onNavigateHome={() => changeView('storefront', '/')}
            />
          )
        )}

        {/* VIEW 3: Special Offers */}
        {activeView === 'offers' && (
          <div className="max-w-4xl mx-auto pb-24">
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">Special Vouchers & Promotions</h1>
              <p className="text-xs text-stone-500">Use promo codes at checkout for instant discounts</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {coupons.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl border-2 border-dashed border-amber-300 p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-extrabold text-sm text-stone-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        {c.code}
                      </span>
                      <span className="text-xs font-bold text-amber-600">
                        {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `Flat Rs. ${c.discountValue}`}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-2 leading-relaxed">{c.description}</p>
                    <div className="text-[11px] text-stone-400 mt-2">
                      Minimum order: {formatCurrency(c.minOrder)}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(c.code);
                      setIsCartOpen(true);
                    }}
                    className="mt-4 w-full py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Apply in Bag
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 4: Customer Order History */}
        {activeView === 'orders' && (
          <CustomerOrders
            onSelectOrder={(ordId) => {
              const found = orders.find(o => o.id === ordId);
              if (found) setActiveOrder(found);
              setActiveView('order_tracker');
              navigateTo(`/order-tracker/${ordId}`);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onExplore={() => changeView('storefront', '/')}
          />
        )}

        {/* VIEW 5: Live Order Tracking */}
        {activeView === 'order_tracker' && (
          <OrderTracker
            orderId={activeOrder?.id}
            onBack={() => changeView('storefront', '/')}
          />
        )}

        {/* VIEW 6: Customer Profile & Addresses */}
        {activeView === 'profile' && <CustomerProfile />}

        {/* VIEW 7: Restaurant Owner / Staff Portal */}
        {activeView === 'restaurant_portal' && <RestaurantDashboard />}

        {/* VIEW 8: Delivery Rider Console */}
        {activeView === 'rider_portal' && <RiderDashboard />}

        {/* VIEW 9: Super Admin Console */}
        {activeView === 'admin_portal' && (
          currentUser?.role === 'super_admin' ? (
            <AdminDashboard
              initialTab={adminTab}
              detailType={adminDetailType}
              detailId={adminDetailId}
              onTabChange={(tab, id) => {
                setAdminTab(tab as any);
                if (id) {
                  setAdminDetailId(id);
                } else {
                  setAdminDetailId(undefined);
                  setAdminDetailType(undefined);
                }
                navigateTo(formatAdminPath(tab as any, id));
              }}
            />
          ) : !isLoggedIn ? (
            <div className="max-w-md mx-auto my-16 bg-white rounded-3xl border border-stone-200 p-8 text-center shadow-lg">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
                Super Admin Authentication
              </h2>
              <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                The Master Governance Console is strictly restricted to authenticated platform super administrators. Please sign in with your administrator credentials.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => openAuthModal('login')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Sign In as Admin
                </button>
                <button
                  onClick={() => changeView('storefront', '/')}
                  className="w-full sm:w-auto px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Back to Storefront
                </button>
              </div>
            </div>
          ) : (
            <NotFoundView
              type="auth_403"
              path={currentPath}
              message={`Logged in as ${currentUser?.name || 'User'} (${currentUser?.role || 'user'}). This account does not possess Super Administrator privileges to access platform governance.`}
              onNavigateHome={() => changeView('storefront', '/')}
            />
          )
        )}

        {/* VIEW 10: 404 Not Found */}
        {activeView === 'not_found' && (
          <NotFoundView
            type="frontend_404"
            path={currentPath}
            onNavigateHome={() => changeView('storefront', '/')}
            onNavigateAdmin={() => {
              changeView('admin_portal', '/admin/dashboard');
            }}
          />
        )}

      </main>

      {/* Slide-out Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onProceedToCheckout={() => setIsCheckoutOpen(true)}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* CMS Policy / About / FAQ Modal */}
      {activeCMSPage && (
        <CMSModal
          slug={activeCMSPage}
          onClose={() => {
            setActiveCMSPage(null);
            if (['/about-us', '/about', '/faq', '/help', '/terms', '/privacy', '/refund-policy'].includes(window.location.pathname)) {
              navigateTo('/');
            }
          }}
        />
      )}

      {/* Authentication & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        initialMode={authModalMode}
      />

      {/* Footer */}
      <Footer
        onOpenCMS={handleOpenCMS}
        setActiveView={(view) => changeView(view as AppView)}
      />

      {/* Transient Alerts / Toasts */}
      <ToastContainer />

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

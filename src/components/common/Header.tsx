import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShoppingBag, 
  MapPin, 
  User as UserIcon, 
  Menu, 
  X, 
  ChevronDown, 
  Sparkles,
  Search
} from 'lucide-react';

interface HeaderProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onOpenCart: () => void;
  onOpenSearch?: () => void;
  onOpenCMS?: (slug: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  activeView, 
  setActiveView, 
  onOpenCart,
  onOpenCMS,
}) => {
  const { 
    currentUser, 
    cart, 
    selectedCity, 
    setSelectedCity, 
    selectedArea, 
    setSelectedArea,
    formatCurrency,
    cartTotals,
    t,
    isLoggedIn,
    openAuthModal,
    logout
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const locations = [
    { city: 'Lahore', area: 'Gulberg III' },
    { city: 'Lahore', area: 'DHA Phase 5' },
    { city: 'Karachi', area: 'Clifton Block 4' },
    { city: 'Islamabad', area: 'Sector F-7' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveView('storefront')}
              className="text-left group flex items-center gap-2"
            >
              <span className="text-2xl font-bold tracking-tight text-stone-900 group-hover:text-amber-600 transition-colors">
                Fastflow
              </span>
            </button>

            {/* Location Selector */}
            <div className="relative hidden md:block">
              <button 
                onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 px-3 py-1.5 rounded-lg transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-medium truncate max-w-[140px]">{selectedArea}, {selectedCity}</span>
                <ChevronDown className="w-3 h-3 text-stone-400" />
              </button>

              {locationDropdownOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-60 bg-white border border-stone-200 rounded-xl shadow-lg p-2 z-50">
                  <div className="text-[11px] font-medium text-stone-400 uppercase tracking-wider px-2 py-1">
                    Select Delivery Zone
                  </div>
                  {locations.map((loc, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedCity(loc.city);
                        setSelectedArea(loc.area);
                        setLocationDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        selectedCity === loc.city && selectedArea === loc.area
                          ? 'bg-amber-50 text-amber-900 font-semibold'
                          : 'text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <span>{loc.area}</span>
                      <span className="text-stone-400 text-[11px]">{loc.city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Zone 2: 4-6 clean text navigation links */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-stone-600">
            <button 
              onClick={() => setActiveView('storefront')}
              className={`hover:text-stone-900 transition-colors ${activeView === 'storefront' ? 'text-amber-600 font-semibold' : ''}`}
            >
              {t('Restaurants')}
            </button>
            <button 
              onClick={() => setActiveView('offers')}
              className={`hover:text-stone-900 transition-colors ${activeView === 'offers' ? 'text-amber-600 font-semibold' : ''}`}
            >
              Special Offers
            </button>
            <button 
              onClick={() => setActiveView('orders')}
              className={`hover:text-stone-900 transition-colors ${activeView === 'orders' ? 'text-amber-600 font-semibold' : ''}`}
            >
              My Orders
            </button>
            <button 
              onClick={() => onOpenCMS ? onOpenCMS('about-us') : setActiveView('about-us')}
              className={`hover:text-stone-900 transition-colors ${activeView === 'about-us' ? 'text-amber-600 font-semibold' : ''}`}
            >
              About
            </button>
            <button 
              onClick={() => onOpenCMS ? onOpenCMS('faq') : setActiveView('faq')}
              className={`hover:text-stone-900 transition-colors ${activeView === 'faq' ? 'text-amber-600 font-semibold' : ''}`}
            >
              Help & FAQ
            </button>
          </nav>

          {/* Zone 3: 1-2 primary actions */}
          <div className="flex items-center gap-3">
            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative flex items-center gap-2 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline font-mono tabular-nums">
                {cartTotals.grandTotal > 0 ? formatCurrency(cartTotals.grandTotal) : 'Bag'}
              </span>
              {cartItemCount > 0 && (
                <span className="flex items-center justify-center min-w-[20px] h-5 px-1 bg-amber-500 text-stone-950 font-bold rounded-full text-[11px] font-mono tabular-nums">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Profile / Auth Button */}
            <div className="relative">
              {currentUser && isLoggedIn ? (
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 border border-stone-200 hover:border-stone-300 rounded-lg text-xs font-medium text-stone-800 bg-white hover:bg-stone-50 transition-colors"
                >
                  {currentUser.avatar ? (
                    <img 
                      src={currentUser.avatar} 
                      alt={currentUser.name} 
                      className="w-6 h-6 rounded-full object-cover shrink-0" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserIcon className="w-4 h-4 text-stone-500 shrink-0" />
                  )}
                  <span className="hidden sm:inline truncate max-w-[100px]">{currentUser.name.split(' ')[0]}</span>
                  <ChevronDown className="w-3 h-3 text-stone-400" />
                </button>
              ) : (
                <button
                  onClick={() => openAuthModal('login')}
                  className="flex items-center gap-1.5 px-3 py-2 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-stone-900 rounded-lg text-xs font-bold transition-colors"
                >
                  <UserIcon className="w-4 h-4 text-amber-600" />
                  <span>Sign In</span>
                </button>
              )}

              {profileDropdownOpen && currentUser && (
                <div className="absolute right-0 mt-1.5 w-56 bg-white border border-stone-200 rounded-2xl shadow-xl p-2 z-50 animate-fade-in">
                  <div className="px-3 py-2 border-b border-stone-100">
                    <p className="text-xs font-bold text-stone-900 truncate">{currentUser.name}</p>
                    <p className="text-[11px] text-stone-500 font-mono truncate">{currentUser.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      {currentUser.role.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <button
                      onClick={() => {
                        if (currentUser.role === 'customer') setActiveView('profile');
                        else if (currentUser.role === 'restaurant_owner' || currentUser.role === 'restaurant_staff') setActiveView('restaurant_portal');
                        else if (currentUser.role === 'delivery_rider') setActiveView('rider_portal');
                        else if (currentUser.role === 'super_admin') setActiveView('admin_portal');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
                    >
                      {currentUser.role === 'customer' ? 'Customer Profile & Addresses' : 'Open Workspace Portal'}
                    </button>

                    <button
                      onClick={() => {
                        setActiveView('orders');
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
                    >
                      My Orders
                    </button>
                  </div>

                  <div className="pt-1 border-t border-stone-100">
                    <button
                      onClick={() => {
                        logout();
                        setProfileDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <div className="pb-2 border-b border-stone-100 flex items-center justify-between">
            <span className="text-xs text-stone-500">Delivering to:</span>
            <span className="text-xs font-semibold text-stone-900">{selectedArea}, {selectedCity}</span>
          </div>
          <button 
            onClick={() => { setActiveView('storefront'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-sm font-medium text-stone-800"
          >
            {t('Restaurants')}
          </button>
          <button 
            onClick={() => { setActiveView('offers'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-sm font-medium text-stone-800"
          >
            Special Offers & Promos
          </button>
          <button 
            onClick={() => { setActiveView('orders'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-sm font-medium text-stone-800"
          >
            My Orders
          </button>
          <button 
            onClick={() => { setActiveView('profile'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-sm font-medium text-stone-800"
          >
            Customer Profile & Addresses
          </button>
          <button 
            onClick={() => { 
              if (onOpenCMS) onOpenCMS('about-us'); 
              else setActiveView('about-us'); 
              setMobileMenuOpen(false); 
            }}
            className="block w-full text-left py-2 text-sm font-medium text-stone-800"
          >
            About Fastflow
          </button>
          <button 
            onClick={() => { 
              if (onOpenCMS) onOpenCMS('faq'); 
              else setActiveView('faq'); 
              setMobileMenuOpen(false); 
            }}
            className="block w-full text-left py-2 text-sm font-medium text-stone-800"
          >
            FAQ & Support
          </button>
        </div>
      )}
    </header>
  );
};

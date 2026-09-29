import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Truck, Clock, Sparkles } from 'lucide-react';

interface FooterProps {
  onOpenCMS: (slug: string) => void;
  setActiveView: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenCMS, setActiveView }) => {
  const { settings, updateSettings } = useApp();

  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Marketplace Guarantees */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12 border-b border-stone-800">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-stone-800 rounded-xl text-amber-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Curated Independent Kitchens</h3>
              <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                Handpicked culinary artisans, authentic wood-fired ovens, and master sushi chefs meeting rigorous food hygiene standards.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-stone-800 rounded-xl text-amber-400 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Dedicated Thermal Dispatch</h3>
              <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                Orders routed to nearby motorized riders with insulated thermal bags to preserve searing heat and crisp textures.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 bg-stone-800 rounded-xl text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Fair Partner Commission</h3>
              <p className="mt-1 text-xs text-stone-400 leading-relaxed">
                Transparent revenue shares and direct payouts empowering independent local restaurateurs to thrive sustainably.
              </p>
            </div>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12">
          <div>
            <span className="text-lg font-bold text-white tracking-tight">DineFlow</span>
            <p className="mt-2 text-xs text-stone-400 leading-relaxed">
              The next-generation multi-vendor culinary delivery network connecting local kitchens, riders, and hungry diners.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <select
                value={settings.activeLanguage}
                onChange={(e) => updateSettings({ activeLanguage: e.target.value as any })}
                className="bg-stone-800 border border-stone-700 text-stone-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="en">English (US)</option>
                <option value="ur">اردو (Urdu)</option>
                <option value="ar">العربية (Arabic)</option>
              </select>

              <select
                value={settings.currencyCode}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'PKR') updateSettings({ currencyCode: 'PKR', currencySymbol: 'Rs.', decimalPlaces: 0 });
                  if (val === 'USD') updateSettings({ currencyCode: 'USD', currencySymbol: '$', decimalPlaces: 2 });
                  if (val === 'AED') updateSettings({ currencyCode: 'AED', currencySymbol: 'AED', decimalPlaces: 2 });
                }}
                className="bg-stone-800 border border-stone-700 text-stone-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="PKR">PKR (Rs.)</option>
                <option value="USD">USD ($)</option>
                <option value="AED">AED (AED)</option>
              </select>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-wider">Explore</h4>
            <ul className="mt-3 space-y-2 text-xs text-stone-400">
              <li>
                <button onClick={() => setActiveView('storefront')} className="hover:text-white transition-colors">
                  Featured Restaurants
                </button>
              </li>
              <li>
                <button onClick={() => setActiveView('offers')} className="hover:text-white transition-colors">
                  Discount Promotions
                </button>
              </li>
              <li>
                <button onClick={() => setActiveView('orders')} className="hover:text-white transition-colors">
                  Live Order Tracker
                </button>
              </li>
              <li>
                <button onClick={() => onOpenCMS('faq')} className="hover:text-white transition-colors">
                  Support & Help Center
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-wider">Partner With Us</h4>
            <ul className="mt-3 space-y-2 text-xs text-stone-400">
              <li>
                <button onClick={() => setActiveView('restaurant_portal')} className="hover:text-white transition-colors">
                  Restaurant Owner Dashboard
                </button>
              </li>
              <li>
                <button onClick={() => setActiveView('rider_portal')} className="hover:text-white transition-colors">
                  Delivery Rider Console
                </button>
              </li>
              <li>
                <button onClick={() => setActiveView('admin_portal')} className="hover:text-white transition-colors">
                  Platform Admin Portal
                </button>
              </li>
              <li>
                <button onClick={() => onOpenCMS('about-us')} className="hover:text-white transition-colors">
                  Marketplace Standards
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-stone-200 uppercase tracking-wider">Legal & Compliance</h4>
            <ul className="mt-3 space-y-2 text-xs text-stone-400">
              <li>
                <button onClick={() => onOpenCMS('terms')} className="hover:text-white transition-colors">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => onOpenCMS('privacy')} className="hover:text-white transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => onOpenCMS('refund-policy')} className="hover:text-white transition-colors">
                  Refund & Cancellation Policy
                </button>
              </li>
              <li>
                <button onClick={() => onOpenCMS('faq')} className="hover:text-white transition-colors">
                  Food Allergen Notices
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© 2026 DineFlow Technologies Inc. All rights reserved. Original software architecture suitable for CodeCanyon commercial deployment.</p>
          <div className="flex items-center gap-4">
            <span className="font-mono text-[11px] text-stone-400">Server Status: Nominal</span>
            <span>·</span>
            <span className="font-mono text-[11px] text-stone-400">PCI-DSS Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

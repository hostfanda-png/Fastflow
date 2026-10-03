export type AppView =
  | 'storefront'
  | 'restaurant_detail'
  | 'offers'
  | 'orders'
  | 'order_tracker'
  | 'profile'
  | 'restaurant_portal'
  | 'rider_portal'
  | 'admin_portal'
  | 'not_found';

export type AdminTab =
  | 'analytics'
  | 'restaurants'
  | 'riders'
  | 'orders'
  | 'customers'
  | 'coupons'
  | 'financials'
  | 'reviews'
  | 'zones'
  | 'cms'
  | 'audit'
  | 'settings';

export interface RouteState {
  view: AppView;
  adminTab?: AdminTab;
  detailType?: 'restaurant' | 'order' | 'customer' | 'rider';
  detailId?: string;
  restaurantId?: string;
  orderId?: string;
  cmsSlug?: string | null;
  rawPath: string;
}

/**
 * Deterministic path parser with strict priority ordering:
 * 1. Root & exact top-level storefront paths
 * 2. Static portal routes (/restaurant-portal, /restaurant/portal, /rider-portal, /rider/portal)
 * 3. Static CMS routes (/about, /faq, /terms, etc.)
 * 4. Admin routes (/admin, /admin/:tab, /admin/:tab/:id)
 * 5. Dynamic entity routes (/restaurant/:id, /restaurants/:id, /order-tracker/:id)
 * 6. Fallback to not_found for unknown paths
 */
export function parsePath(pathname: string): RouteState {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const parts = cleanPath.split('/').filter(Boolean);

  // 1. Root / Storefront
  if (parts.length === 0 || cleanPath === '/' || cleanPath === '/storefront') {
    return { view: 'storefront', rawPath: cleanPath };
  }

  // 2. Static Portals (MUST evaluate before dynamic /restaurant/:id and /rider/:id)
  if (
    cleanPath === '/restaurant-portal' || 
    (parts[0] === 'restaurant' && parts[1] === 'portal') ||
    (parts[0] === 'restaurants' && parts[1] === 'portal')
  ) {
    return { view: 'restaurant_portal', rawPath: cleanPath };
  }

  if (
    cleanPath === '/rider-portal' || 
    (parts[0] === 'rider' && parts[1] === 'portal') ||
    (parts[0] === 'riders' && parts[1] === 'portal')
  ) {
    return { view: 'rider_portal', rawPath: cleanPath };
  }

  // 3. Static Customer Views
  if (parts[0] === 'offers' || parts[0] === 'coupons') {
    return { view: 'offers', rawPath: cleanPath };
  }

  if (parts[0] === 'orders' && parts.length === 1) {
    return { view: 'orders', rawPath: cleanPath };
  }

  if (parts[0] === 'profile') {
    return { view: 'profile', rawPath: cleanPath };
  }

  // 4. Static CMS Pages
  if (parts[0] === 'about' || parts[0] === 'about-us') {
    return { view: 'storefront', cmsSlug: 'about-us', rawPath: cleanPath };
  }
  if (parts[0] === 'faq' || parts[0] === 'help') {
    return { view: 'storefront', cmsSlug: 'faq', rawPath: cleanPath };
  }
  if (parts[0] === 'terms' || parts[0] === 'terms-of-service') {
    return { view: 'storefront', cmsSlug: 'terms', rawPath: cleanPath };
  }
  if (parts[0] === 'privacy' || parts[0] === 'privacy-policy') {
    return { view: 'storefront', cmsSlug: 'privacy', rawPath: cleanPath };
  }
  if (parts[0] === 'refund-policy' || parts[0] === 'refunds') {
    return { view: 'storefront', cmsSlug: 'refund-policy', rawPath: cleanPath };
  }

  // 5. Admin Governance Routes
  if (parts[0] === 'admin') {
    const sub = parts[1] || 'dashboard';

    if (sub === 'dashboard' || sub === 'analytics') {
      return { view: 'admin_portal', adminTab: 'analytics', rawPath: cleanPath };
    }
    if (sub === 'restaurants') {
      return {
        view: 'admin_portal',
        adminTab: 'restaurants',
        detailType: parts[2] ? 'restaurant' : undefined,
        detailId: parts[2],
        rawPath: cleanPath,
      };
    }
    if (sub === 'orders') {
      return {
        view: 'admin_portal',
        adminTab: 'orders',
        detailType: parts[2] ? 'order' : undefined,
        detailId: parts[2],
        rawPath: cleanPath,
      };
    }
    if (sub === 'customers') {
      return {
        view: 'admin_portal',
        adminTab: 'customers',
        detailType: parts[2] ? 'customer' : undefined,
        detailId: parts[2],
        rawPath: cleanPath,
      };
    }
    if (sub === 'riders') {
      return {
        view: 'admin_portal',
        adminTab: 'riders',
        detailType: parts[2] ? 'rider' : undefined,
        detailId: parts[2],
        rawPath: cleanPath,
      };
    }
    if (sub === 'coupons') {
      return { view: 'admin_portal', adminTab: 'coupons', rawPath: cleanPath };
    }
    if (sub === 'financials' || sub === 'settlements' || sub === 'refunds') {
      return { view: 'admin_portal', adminTab: 'financials', rawPath: cleanPath };
    }
    if (sub === 'reviews') {
      return { view: 'admin_portal', adminTab: 'reviews', rawPath: cleanPath };
    }
    if (sub === 'delivery-zones' || sub === 'zones') {
      return { view: 'admin_portal', adminTab: 'zones', rawPath: cleanPath };
    }
    if (sub === 'cms' || sub === 'pages') {
      return { view: 'admin_portal', adminTab: 'cms', rawPath: cleanPath };
    }
    if (sub === 'audit-logs' || sub === 'audit') {
      return { view: 'admin_portal', adminTab: 'audit', rawPath: cleanPath };
    }
    if (sub === 'settings') {
      return { view: 'admin_portal', adminTab: 'settings', rawPath: cleanPath };
    }

    // Unknown admin sub-path
    return {
      view: 'not_found',
      rawPath: cleanPath,
    };
  }

  // 6. Dynamic Order Tracking (/order-tracker or /order-tracker/:id)
  if (parts[0] === 'order-tracker' || parts[0] === 'tracker') {
    return { view: 'order_tracker', orderId: parts[1], rawPath: cleanPath };
  }

  // 7. Dynamic Restaurant Detail (/restaurant/:id or /restaurants/:id)
  if ((parts[0] === 'restaurant' || parts[0] === 'restaurants') && parts.length >= 2) {
    // Guaranteed not to be 'portal' because portal matched in rule 2
    return { view: 'restaurant_detail', restaurantId: parts[1], rawPath: cleanPath };
  }

  // 8. Fallback 404 for unknown routes
  return {
    view: 'not_found',
    rawPath: cleanPath,
  };
}

export function formatAdminPath(tab: AdminTab, detailId?: string | number): string {
  const tabPathMap: Record<AdminTab, string> = {
    analytics: 'dashboard',
    restaurants: 'restaurants',
    riders: 'riders',
    orders: 'orders',
    customers: 'customers',
    coupons: 'coupons',
    financials: 'financials',
    reviews: 'reviews',
    zones: 'delivery-zones',
    cms: 'cms',
    audit: 'audit-logs',
    settings: 'settings',
  };

  const segment = tabPathMap[tab] || tab;
  if (detailId) {
    return `/admin/${segment}/${detailId}`;
  }
  return `/admin/${segment}`;
}

export function navigateTo(path: string, replace = false): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === path) return;

  if (replace) {
    window.history.replaceState({}, '', path);
  } else {
    window.history.pushState({}, '', path);
  }
  window.dispatchEvent(new PopStateEvent('popstate'));
}

# Fastflow — Phase 6.1 Frontend ↔ Laravel API Connectivity & 404 Audit Report

**Repository:** `hostfanda-png/Fastflow`  
**Branch:** `main`  
**Phase:** Phase 6.1 — Complete Frontend ↔ Laravel API Connectivity & 404 Fix  
**Laravel Source Verification:** **PASS (`SOURCE VERIFIED`)**  
**Frontend Source & Build Verification:** **PASS (`SOURCE VERIFIED` & `BUILD VERIFIED`)**  
**Runtime Laravel Verification:** **NOT EXECUTED (`Reason: PHP/Composer unavailable in Google AI Studio container`)**  
**Phase 7 Status:** **`NOT STARTED`** (Strict Hard Stop Enforced)

---

## 1. Root Cause of the `POST /api/v1/auth/login` HTTP 404

### Primary Root Cause
1. **Unproxied Relative Base URL (`VITE_API_URL=/api/v1`) in Standalone Vite Process:**
   - The frontend API client (`src/services/api/client.ts`) defaults to `VITE_API_URL=/api/v1`.
   - When the user submitted credentials in `AuthModal`, `authApi.login()` executed `POST /api/v1/auth/login` against the current browser origin (Vite server on port `3000`).
   - `vite.config.ts` previously had **no `server.proxy` or `preview.proxy` configuration** for `/api` or `/sanctum`.
   - Furthermore, the Google AI Studio preview container runs only Node.js/Vite and **does not have PHP, Composer, or MySQL installed**, meaning no Laravel HTTP server is listening inside the preview container.
   - Because Vite had no proxy rule and no backend process handling `POST /api/v1/auth/login`, Vite returned a raw `404 Not Found` HTML/empty response, which `client.ts` caught and displayed as `HTTP Error 404`.

### Secondary Root Causes Discovered During Full-Stack Audit
2. **Missing Public `GET /api/v1/reviews` Route in Laravel (`backend/routes/api.php`):**
   - On application startup, `AppContext.tsx` (`refreshData()`) called `reviewApi.getAll()` (`GET /api/v1/reviews`) to populate customer testimonials on the storefront landing page.
   - `backend/routes/api.php` only registered `POST /api/v1/reviews` (inside `auth:sanctum`), `GET /api/v1/restaurants/{restaurant}/reviews`, and `GET /api/v1/customer/reviews`.
   - Against a real Laravel server, `GET /api/v1/reviews` would have returned an actual Laravel `404 Not Found`.
3. **Unauthenticated `GET /api/v1/admin/riders` Call on Public Startup (`src/context/AppContext.tsx`):**
   - `AppContext.tsx` previously called `adminApi.getRiders()` unconditionally inside `refreshData()` on public page load even when no user was logged in, triggering a `401 Unauthenticated` or `403 Forbidden` for anonymous visitors and non-admin users.
4. **Silent Swallowing of Initial API Failure in `AppContext.tsx`:**
   - `refreshData()` used `Promise.allSettled([...])` and only checked `if (restRes.status === 'fulfilled')`, silently ignoring `restRes.status === 'rejected'` instead of surfacing `apiError` to the `<ApiErrorMessage />` component when the backend is unreachable.
5. **Invalid Wildcard CORS with Credentials (`backend/config/cors.php`):**
   - `backend/config/cors.php` previously combined `'allowed_origins' => ['*']` with `'supports_credentials' => true`. Modern browsers reject CORS responses that combine wildcard `*` origins with `Access-Control-Allow-Credentials: true`.

---

## 2. API Architecture

Fastflow uses a strict, single-source-of-truth three-tier architecture:

```text
React 19 + TypeScript + Vite SPA (Port 3000)
        │
        │  HTTP JSON + Authorization: Bearer <Sanctum Token>
        │  (+ Idempotency-Key header on financial mutations)
        ▼
Vite Dev/Preview Proxy (/api -> VITE_BACKEND_URL)  OR  Direct HTTPS (VITE_API_URL)
        │
        ▼
Laravel 11 REST API (/api/v1/*)
  ├── bootstrap/app.php (API routing, JSON exception rendering, role/permission middleware)
  ├── routes/api.php (Route::prefix('v1'))
  ├── Sanctum Token Guard (auth:sanctum)
  ├── RBAC Middleware (CheckRole, CheckPermission)
  └── Controllers & Domain Services (AuthController, AdminController, PaymentService, etc.)
        │
        ▼
MySQL / MariaDB Relational Database
```

- **Zero Mock Fallbacks:** No mock users, fake tokens, localStorage-only authentication, or synthetic business data exist in the frontend.

---

## 3. Frontend API Configuration

- **File:** `src/services/api/client.ts` & `.env.example`
- **Base URL Resolution (`resolveApiBaseUrl`):**
  - Reads `import.meta.env.VITE_API_URL || '/api/v1'`.
  - If an operator configures a root domain in `VITE_API_URL` (e.g., `https://api.fastflow.app` or `http://127.0.0.1:8000` without `/api/v1`), `resolveApiBaseUrl()` automatically normalizes it to `https://api.fastflow.app/api/v1`.
  - Prevents duplicate prefixes (`/api/v1/api/v1/...`) if an endpoint path already starts with `/api/v1`.
  - Automatically attaches `Accept: application/json`, `Content-Type: application/json` (omitted automatically for `FormData` uploads), and `Authorization: Bearer <token>` from `localStorage.getItem('fastflow_auth_token')`.

---

## 4. Laravel API Configuration

- **Bootstrap (`backend/bootstrap/app.php`):**
  - Registers `api: __DIR__.'/../routes/api.php'` (which Laravel automatically prefixes with `/api`).
  - Inside `backend/routes/api.php`, all v1 endpoints are wrapped in `Route::prefix('v1')->group(...)`, producing `/api/v1/*`.
  - Standardized JSON exception rendering for `api/*`:
    - `ValidationException` → `422` (`{ success: false, message: 'Validation failed', errors: ... }`)
    - `AuthenticationException` → `401` (`{ success: false, message: 'Unauthenticated' }`)
    - `AccessDeniedHttpException` → `403` (`{ success: false, message: 'Forbidden: ...' }`)
    - `ModelNotFoundException` & `NotFoundHttpException` → `404` (`{ success: false, message: 'Requested API endpoint or resource was not found.' }`)

---

## 5. Vite Proxy Configuration

- **File:** `vite.config.ts`
- Configured both `server.proxy` and `preview.proxy` to forward `/api` and `/sanctum` requests to the Laravel backend URL configured via `VITE_BACKEND_URL` (or `LARAVEL_BACKEND_URL`, defaulting to `http://127.0.0.1:8000`):
  - Preserves HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`), request bodies, `Authorization: Bearer <token>` headers, `Idempotency-Key` headers, and cookies.
  - Supports both local full-stack development (`VITE_API_URL=/api/v1` proxied to `VITE_BACKEND_URL=http://127.0.0.1:8000`) and remote production deployments (`VITE_API_URL=https://your-laravel-api.example.com/api/v1`).

---

## 6. CORS Configuration

- **File:** `backend/config/cors.php` & `backend/.env.example`
- Replaced the invalid wildcard `'allowed_origins' => ['*']` + `'supports_credentials' => true` combination with explicit environment-driven origins via `CORS_ALLOWED_ORIGINS` / `FRONTEND_URL` (defaulting to `http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173`) and optional `CORS_ALLOWED_ORIGIN_PATTERNS`.
- Explicitly permitted `Authorization`, `Content-Type`, `Accept`, `Origin`, `X-Requested-With`, `X-XSRF-TOKEN`, `Idempotency-Key`, `X-Idempotency-Key`, and `Stripe-Signature` headers.

---

## 7. Sanctum Authentication Flow

1. **Login Request:** `AuthModal.tsx` calls `login(email, password)` in `AppContext.tsx` → `authApi.login(email, password)` → `POST /api/v1/auth/login`.
2. **Backend Verification (`AuthController@login`):**
   - Validates credentials via `LoginRequest`.
   - Looks up `User::with(['role.permissions', 'restaurant'])->where('email', $request->email)->first()`.
   - Verifies password hash via `Hash::check($request->password, $user->password)` (returns `401` on mismatch, `403` if suspended).
   - Generates a real Sanctum personal access token (`$user->createToken('auth_token')->plainTextToken`).
3. **Token Storage & Session Hydration:**
   - `authApi.login` stores the returned Sanctum token via `apiClient.setToken(res.data.token)`.
   - `AppContext.login` verifies the token against `GET /api/v1/auth/me` (with `Authorization: Bearer <token>`), hydrates `currentUser` (`id`, `name`, `email`, `role`, `permissions`, `restaurantId`), sets `isLoggedIn = true`, and triggers `refreshData()`.
4. **Startup & 401 Expiry Handling:**
   - On page reload, if `fastflow_auth_token` exists in `localStorage`, `AppContext` calls `GET /api/v1/auth/me`. If the token is invalid or expired, `client.ts` clears the token and dispatches `fastflow:unauthorized`, resetting `currentUser` to `null`.

---

## 8. Admin Dashboard Authentication Flow

- **Seeded Super Admin Account (`backend/database/seeders/UserSeeder.php`):**
  - Email: `admin@fastflow.app`
  - Role: `super_admin`
- **Frontend Route Guard (`src/App.tsx` lines 514–565):**
  - Navigating to `/admin/dashboard` (or any `/admin/*` route) checks:
    1. `currentUser?.role === 'super_admin'` → Renders `<AdminDashboard />`, which immediately calls `adminApi.getDashboardMetrics()` (`GET /api/v1/admin/dashboard`) and section APIs.
    2. `!isLoggedIn` → Renders the "Super Admin Authentication" gate prompting the user to sign in via Sanctum (`openAuthModal('login')`).
    3. Logged in as a non-admin role → Renders `<NotFoundView type="auth_403" />` explaining the current role lacks Super Administrator privileges.
- **Backend Route Guard (`backend/routes/api.php` line 190):**
  - All `/api/v1/admin/*` endpoints are protected by `Route::prefix('admin')->middleware(['auth:sanctum', 'role:super_admin'])`.

---

## 9. Complete API Endpoint Verification Matrix

| Module | Frontend Call (`src/services/api/*`) | HTTP Method | Laravel Route (`/api/v1/...`) | Controller@Method | Status |
|---|---|---|---|---|---|
| **Auth** | `authApi.login` | `POST` | `/api/v1/auth/login` | `AuthController@login` | **PASS (SOURCE VERIFIED)** |
| **Auth** | `authApi.register` | `POST` | `/api/v1/auth/register` | `AuthController@register` | **PASS (SOURCE VERIFIED)** |
| **Auth** | `authApi.me` | `GET` | `/api/v1/auth/me` | `AuthController@me` | **PASS (SOURCE VERIFIED)** |
| **Auth** | `authApi.logout` | `POST` | `/api/v1/auth/logout` | `AuthController@logout` | **PASS (SOURCE VERIFIED)** |
| **Customer** | `customerApi.getProfile` | `GET` | `/api/v1/auth/me` | `AuthController@me` | **PASS (SOURCE VERIFIED)** |
| **Customer** | `customerApi.updateProfile` | `PUT` | `/api/v1/customer/profile` | `CustomerController@updateProfile` | **PASS (SOURCE VERIFIED)** |
| **Customer** | `customerApi.changePassword` | `POST` | `/api/v1/customer/change-password` | `CustomerController@changePassword` | **PASS (SOURCE VERIFIED)** |
| **Customer** | `customerApi.deactivateAccount` | `POST` | `/api/v1/customer/deactivate` | `CustomerController@deactivateAccount` | **PASS (SOURCE VERIFIED)** |
| **Customer** | `customerApi.getAddresses` | `GET` | `/api/v1/customer/addresses` | `CustomerController@getAddresses` | **PASS (SOURCE VERIFIED)** |
| **Customer** | `customerApi.addAddress` | `POST` | `/api/v1/customer/addresses` | `CustomerController@storeAddress` | **PASS (SOURCE VERIFIED)** |
| **Customer** | `customerApi.updateAddress` | `PUT` | `/api/v1/customer/addresses/{id}` | `CustomerController@updateAddress` | **PASS (SOURCE VERIFIED)** |
| **Customer** | `customerApi.deleteAddress` | `DELETE` | `/api/v1/customer/addresses/{id}` | `CustomerController@deleteAddress` | **PASS (SOURCE VERIFIED)** |
| **Customer** | `customerApi.setDefaultAddress` | `PUT` | `/api/v1/customer/addresses/{id}/default` | `CustomerController@setDefaultAddress` | **PASS (SOURCE VERIFIED)** |
| **Customer** | `customerApi.getFavorites` | `GET` | `/api/v1/customer/favorites` | `CustomerController@getFavorites` | **PASS (SOURCE VERIFIED)** |
| **Customer** | `customerApi.toggleRestaurantFavorite` | `POST` | `/api/v1/customer/favorites/restaurants/{restaurant}` | `CustomerController@toggleRestaurantFavorite` | **PASS (SOURCE VERIFIED)** |
| **Customer** | `customerApi.toggleProductFavorite` | `POST` | `/api/v1/customer/favorites/products/{product}` | `CustomerController@toggleProductFavorite` | **PASS (SOURCE VERIFIED)** |
| **Customer** | `customerApi.getNotifications` | `GET` | `/api/v1/customer/notifications` | `CustomerController@getNotifications` | **PASS (SOURCE VERIFIED)** |
| **Customer** | `customerApi.markNotificationRead` | `PUT` | `/api/v1/customer/notifications/{id}/read` | `CustomerController@markNotificationRead` | **PASS (SOURCE VERIFIED)** |
| **Customer** | `customerApi.markAllNotificationsRead` | `PUT` | `/api/v1/customer/notifications/read-all` | `CustomerController@markAllNotificationsRead` | **PASS (SOURCE VERIFIED)** |
| **Customer** | `customerApi.deleteNotification` | `DELETE` | `/api/v1/customer/notifications/{id}` | `CustomerController@deleteNotification` | **PASS (SOURCE VERIFIED)** |
| **Customer** | `customerApi.getReviews` | `GET` | `/api/v1/customer/reviews` | `CustomerController@getReviews` | **PASS (SOURCE VERIFIED)** |
| **Public / Catalog** | `restaurantApi.getAll` | `GET` | `/api/v1/restaurants` | `RestaurantController@index` | **PASS (SOURCE VERIFIED)** |
| **Public / Catalog** | `restaurantApi.getById` | `GET` | `/api/v1/restaurants/{restaurant}` | `RestaurantController@show` | **PASS (SOURCE VERIFIED)** |
| **Public / Catalog** | `restaurantApi.getMenu` | `GET` | `/api/v1/restaurants/{restaurant}/menu` | `MenuController@getPublicMenu` | **PASS (SOURCE VERIFIED)** |
| **Public / Catalog** | `restaurantApi.checkDelivery` | `GET` | `/api/v1/restaurants/{restaurant}/delivery-check` | `RestaurantController@checkDelivery` | **PASS (SOURCE VERIFIED)** |
| **Public / Catalog** | `restaurantApi.getReviews` | `GET` | `/api/v1/restaurants/{restaurant}/reviews` | `RestaurantController@getReviews` | **PASS (SOURCE VERIFIED)** |
| **Public / Catalog** | `restaurantApi.getCuisines` | `GET` | `/api/v1/cuisines` | `CuisineController@index` | **PASS (SOURCE VERIFIED)** |
| **Public / Catalog** | `categoryApi.getAll` | `GET` | `/api/v1/categories` | `MenuController@getCategories` | **PASS (SOURCE VERIFIED)** |
| **Public / Catalog** | `productApi.getPublicProducts` | `GET` | `/api/v1/products` | `MenuController@getPublicProducts` | **PASS (SOURCE VERIFIED)** |
| **Public / Catalog** | `couponApi.getAll` | `GET` | `/api/v1/coupons` | `CouponController@index` | **PASS (SOURCE VERIFIED)** |
| **Public / Catalog** | `couponApi.validate` | `POST` | `/api/v1/coupons/validate` | `CouponController@validateCoupon` | **PASS (SOURCE VERIFIED)** |
| **Reviews** | `reviewApi.getAll` | `GET` | `/api/v1/reviews` | `ReviewController@index` | **PASS (FIXED & SOURCE VERIFIED)** |
| **Reviews** | `reviewApi.submit` | `POST` | `/api/v1/reviews` | `ReviewController@store` | **PASS (SOURCE VERIFIED)** |
| **Cart** | `cartApi.getCart` | `GET` | `/api/v1/cart` | `CartController@getCart` | **PASS (SOURCE VERIFIED)** |
| **Cart** | `cartApi.addItem` | `POST` | `/api/v1/cart/items` | `CartController@addItem` | **PASS (SOURCE VERIFIED)** |
| **Cart** | `cartApi.updateQuantity` | `PUT` | `/api/v1/cart/items/{item}` | `CartController@updateItem` | **PASS (SOURCE VERIFIED)** |
| **Cart** | `cartApi.clearCart` | `DELETE` | `/api/v1/cart/clear` | `CartController@clearCart` | **PASS (SOURCE VERIFIED)** |
| **Cart** | `cartApi.applyCoupon` | `POST` | `/api/v1/cart/coupon` | `CartController@applyCoupon` | **PASS (SOURCE VERIFIED)** |
| **Cart** | `cartApi.removeCoupon` | `DELETE` | `/api/v1/cart/coupon` | `CartController@removeCoupon` | **PASS (SOURCE VERIFIED)** |
| **Cart** | `cartApi.setTip` | `POST` | `/api/v1/cart/tip` | `CartController@setTip` | **PASS (SOURCE VERIFIED)** |
| **Orders** | `orderApi.checkout` | `POST` | `/api/v1/orders/checkout` | `OrderController@checkout` | **PASS (SOURCE VERIFIED)** |
| **Orders** | `orderApi.getAll` | `GET` | `/api/v1/orders` | `OrderController@index` | **PASS (SOURCE VERIFIED)** |
| **Orders** | `orderApi.getById` | `GET` | `/api/v1/orders/{order}` | `OrderController@show` | **PASS (SOURCE VERIFIED)** |
| **Orders** | `orderApi.cancel` | `POST` | `/api/v1/orders/{order}/cancel` | `OrderController@cancel` | **PASS (SOURCE VERIFIED)** |
| **Payments** | `paymentApi.createStripeIntent` | `POST` | `/api/v1/payments/stripe/create-intent` | `PaymentController@createIntent` | **PASS (SOURCE VERIFIED)** |
| **Payments** | `paymentApi.getCustomerPaymentHistory` | `GET` | `/api/v1/payments/history` | `PaymentController@getCustomerPaymentHistory` | **PASS (SOURCE VERIFIED)** |
| **Payments** | `paymentApi.markCodCollected` | `POST` | `/api/v1/orders/{order}/collect-cod` | `PaymentController@collectCod` | **PASS (SOURCE VERIFIED)** |
| **Payments** | `paymentApi.refundOrder` | `POST` | `/api/v1/orders/{order}/refund` | `PaymentController@refund` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.apply` | `POST` | `/api/v1/restaurant/apply` | `OwnerRestaurantController@apply` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.getOwnerRestaurants` | `GET` | `/api/v1/owner/restaurants` | `OwnerRestaurantController@index` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.getOwnerRestaurantDetails` | `GET` | `/api/v1/owner/restaurants/{restaurant}` | `OwnerRestaurantController@show` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.updateProfile` | `PUT` | `/api/v1/owner/restaurants/{restaurant}` | `OwnerRestaurantController@update` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.getDashboard` | `GET` | `/api/v1/owner/restaurants/{restaurant}/dashboard` | `OwnerRestaurantController@dashboard` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.uploadMedia` | `POST` | `/api/v1/owner/restaurants/{restaurant}/media` | `OwnerRestaurantController@uploadMedia` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.getHours` | `GET` | `/api/v1/owner/restaurants/{restaurant}/hours` | `OwnerRestaurantController@getHours` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.updateHours` | `PUT` | `/api/v1/owner/restaurants/{restaurant}/hours` | `OwnerRestaurantController@updateHours` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.getDeliveryZones` | `GET` | `/api/v1/owner/restaurants/{restaurant}/delivery-zones` | `OwnerRestaurantController@getDeliveryZones` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.createDeliveryZone` | `POST` | `/api/v1/owner/restaurants/{restaurant}/delivery-zones` | `OwnerRestaurantController@storeDeliveryZone` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.updateDeliveryZone` | `PUT` | `/api/v1/owner/restaurants/{restaurant}/delivery-zones/{zone}` | `OwnerRestaurantController@updateDeliveryZone` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.deleteDeliveryZone` | `DELETE` | `/api/v1/owner/restaurants/{restaurant}/delivery-zones/{zone}` | `OwnerRestaurantController@deleteDeliveryZone` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.getOwnerOrders` | `GET` | `/api/v1/owner/restaurants/{restaurant}/orders` | `OwnerRestaurantController@getOrders` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.updateOrderStatus` | `PUT` | `/api/v1/owner/restaurants/{restaurant}/orders/{order}/status` | `OwnerRestaurantController@updateOrderStatus` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.getEligibleRiders` | `GET` | `/api/v1/owner/restaurants/{restaurant}/eligible-riders` | `OwnerRestaurantController@getEligibleRiders` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.assignRider` | `POST` | `/api/v1/owner/restaurants/{restaurant}/orders/{order}/assign-rider` | `OwnerRestaurantController@assignRider` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.unassignRider` | `POST` | `/api/v1/owner/restaurants/{restaurant}/orders/{order}/unassign-rider` | `OwnerRestaurantController@unassignRider` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.getFinancials` | `GET` | `/api/v1/owner/restaurants/{restaurant}/financials` | `OwnerRestaurantController@getFinancials` | **PASS (SOURCE VERIFIED)** |
| **Owner / Partner** | `restaurantApi.refundOrder` | `POST` | `/api/v1/owner/restaurants/{restaurant}/orders/{order}/refund` | `PaymentController@refund` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `categoryApi.getOwnerCategories` | `GET` | `/api/v1/owner/restaurants/{restaurant}/categories` | `MenuController@getOwnerCategories` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `categoryApi.create` | `POST` | `/api/v1/owner/restaurants/{restaurant}/categories` | `MenuController@storeCategory` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `categoryApi.getById` | `GET` | `/api/v1/owner/restaurants/{restaurant}/categories/{category}` | `MenuController@showCategory` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `categoryApi.update` | `PUT` | `/api/v1/owner/restaurants/{restaurant}/categories/{category}` | `MenuController@updateCategory` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `categoryApi.delete` | `DELETE` | `/api/v1/owner/restaurants/{restaurant}/categories/{category}` | `MenuController@deleteCategory` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `categoryApi.reorder` | `POST` | `/api/v1/owner/restaurants/{restaurant}/categories/reorder` | `MenuController@reorderCategories` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `productApi.getOwnerProducts` | `GET` | `/api/v1/owner/restaurants/{restaurant}/products` | `MenuController@getOwnerProducts` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `productApi.getById` | `GET` | `/api/v1/owner/restaurants/{restaurant}/products/{product}` | `MenuController@showProduct` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `productApi.create` | `POST` | `/api/v1/owner/restaurants/{restaurant}/products` | `MenuController@storeProduct` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `productApi.update` | `PUT` | `/api/v1/owner/restaurants/{restaurant}/products/{product}` | `MenuController@updateProduct` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `productApi.delete` | `DELETE` | `/api/v1/owner/restaurants/{restaurant}/products/{product}` | `MenuController@deleteProduct` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `productApi.toggleAvailability` | `PATCH` | `/api/v1/owner/restaurants/{restaurant}/products/{product}/toggle` | `MenuController@toggleAvailability` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `productApi.uploadImage` | `POST` | `/api/v1/owner/restaurants/{restaurant}/products/{product}/image` | `MenuController@uploadProductImage` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `productApi.reorder` | `POST` | `/api/v1/owner/restaurants/{restaurant}/products/reorder` | `MenuController@reorderProducts` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `productApi.getVariants` | `GET` | `/api/v1/owner/restaurants/{restaurant}/products/{product}/variants` | `MenuController@getVariants` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `productApi.createVariant` | `POST` | `/api/v1/owner/restaurants/{restaurant}/products/{product}/variants` | `MenuController@storeVariant` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `productApi.updateVariant` | `PUT` | `/api/v1/owner/restaurants/{restaurant}/products/{product}/variants/{variant}` | `MenuController@updateVariant` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `productApi.deleteVariant` | `DELETE` | `/api/v1/owner/restaurants/{restaurant}/products/{product}/variants/{variant}` | `MenuController@deleteVariant` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `addonApi.getAll` | `GET` | `/api/v1/owner/restaurants/{restaurant}/addons` | `MenuController@getAddons` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `addonApi.create` | `POST` | `/api/v1/owner/restaurants/{restaurant}/addons` | `MenuController@storeAddon` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `addonApi.update` | `PUT` | `/api/v1/owner/restaurants/{restaurant}/addons/{addon}` | `MenuController@updateAddon` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `addonApi.delete` | `DELETE` | `/api/v1/owner/restaurants/{restaurant}/addons/{addon}` | `MenuController@deleteAddon` | **PASS (SOURCE VERIFIED)** |
| **Owner Menu** | `addonApi.syncForProduct` | `POST` | `/api/v1/owner/restaurants/{restaurant}/products/{product}/addons/sync` | `MenuController@syncProductAddons` | **PASS (SOURCE VERIFIED)** |
| **Rider** | `riderApi.getDashboard` | `GET` | `/api/v1/rider/dashboard` | `RiderController@dashboard` | **PASS (SOURCE VERIFIED)** |
| **Rider** | `riderApi.getCurrentOrder` | `GET` | `/api/v1/rider/orders/current` | `RiderController@getCurrentOrder` | **PASS (SOURCE VERIFIED)** |
| **Rider** | `riderApi.getOrders` | `GET` | `/api/v1/rider/orders` | `RiderController@getOrders` | **PASS (SOURCE VERIFIED)** |
| **Rider** | `riderApi.updateStatus` | `PUT` | `/api/v1/rider/status` | `RiderController@updateStatus` | **PASS (SOURCE VERIFIED)** |
| **Rider** | `riderApi.acceptOrder` | `POST` | `/api/v1/rider/orders/{order}/accept` | `RiderController@acceptOrder` | **PASS (SOURCE VERIFIED)** |
| **Rider** | `riderApi.pickupOrder` | `POST` | `/api/v1/rider/orders/{order}/pickup` | `RiderController@pickupOrder` | **PASS (SOURCE VERIFIED)** |
| **Rider** | `riderApi.startDelivery` | `POST` | `/api/v1/rider/orders/{order}/start-delivery` | `RiderController@startDelivery` | **PASS (SOURCE VERIFIED)** |
| **Rider** | `riderApi.deliverOrder` | `POST` | `/api/v1/rider/orders/{order}/deliver` | `RiderController@deliverOrder` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.getDashboardMetrics` | `GET` | `/api/v1/admin/dashboard` | `AdminController@dashboard` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.getRestaurants` | `GET` | `/api/v1/admin/restaurants` | `AdminController@getRestaurants` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.getRestaurant` | `GET` | `/api/v1/admin/restaurants/{restaurant}` | `AdminController@showRestaurant` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.approveRestaurant` | `POST` | `/api/v1/admin/restaurants/{restaurant}/approve` | `AdminController@approveRestaurant` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.rejectRestaurant` | `POST` | `/api/v1/admin/restaurants/{restaurant}/reject` | `AdminController@rejectRestaurant` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.suspendRestaurant` | `POST` | `/api/v1/admin/restaurants/{restaurant}/suspend` | `AdminController@suspendRestaurant` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.reactivateRestaurant` | `POST` | `/api/v1/admin/restaurants/{restaurant}/reactivate` | `AdminController@reactivateRestaurant` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.setRestaurantStatus` | `PUT` | `/api/v1/admin/restaurants/{restaurant}/status` | `AdminController@setRestaurantStatus` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.updateCommission` | `PUT` | `/api/v1/admin/restaurants/{restaurant}/commission` | `AdminController@updateCommission` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.getOrders` | `GET` | `/api/v1/admin/orders` | `AdminController@getOrders` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.getOrder` | `GET` | `/api/v1/admin/orders/{order}` | `AdminController@showOrder` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.assignRider` | `POST` | `/api/v1/admin/orders/{order}/assign-rider` | `AdminController@assignRider` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.unassignRider` | `POST` | `/api/v1/admin/orders/{order}/unassign-rider` | `AdminController@unassignRider` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.autoDispatch` | `POST` | `/api/v1/admin/orders/{order}/auto-dispatch` | `AdminController@autoDispatch` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.refundOrder` | `POST` | `/api/v1/admin/orders/{order}/refund` | `PaymentController@refund` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.collectCod` | `POST` | `/api/v1/admin/orders/{order}/collect-cod` | `PaymentController@collectCod` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.getCustomers` | `GET` | `/api/v1/admin/customers` | `AdminController@getCustomers` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.getCustomer` | `GET` | `/api/v1/admin/customers/{customer}` | `AdminController@showCustomer` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.setCustomerStatus` | `PUT` | `/api/v1/admin/customers/{customer}/status` | `AdminController@setCustomerStatus` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.getRiders` | `GET` | `/api/v1/admin/riders` | `AdminController@getRiders` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.createRider` | `POST` | `/api/v1/admin/riders` | `AdminController@storeRider` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.getRider` | `GET` | `/api/v1/admin/riders/{rider}` | `AdminController@showRider` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.updateRider` | `PUT` | `/api/v1/admin/riders/{rider}` | `AdminController@updateRider` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.deleteRider` | `DELETE` | `/api/v1/admin/riders/{rider}` | `AdminController@deleteRider` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.getFinancials` | `GET` | `/api/v1/admin/financials` | `AdminController@getFinancials` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.getSettlements` | `GET` | `/api/v1/admin/settlements` | `AdminController@getSettlements` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.createSettlement` | `POST` | `/api/v1/admin/settlements` | `AdminController@createSettlement` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.markSettlementPaid` | `PUT` | `/api/v1/admin/settlements/{settlement}/pay` | `AdminController@markSettlementPaid` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.getRefunds` | `GET` | `/api/v1/admin/refunds` | `AdminController@getRefunds` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.getSettings` | `GET` | `/api/v1/admin/settings` | `AdminController@getSettings` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.updateSettings` | `PUT` | `/api/v1/admin/settings` | `AdminController@updateSettings` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.getDeliveryZones` | `GET` | `/api/v1/admin/delivery-zones` | `AdminController@getDeliveryZones` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.createDeliveryZone` | `POST` | `/api/v1/admin/delivery-zones` | `AdminController@storeDeliveryZone` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.updateDeliveryZone` | `PUT` | `/api/v1/admin/delivery-zones/{zone}` | `AdminController@updateDeliveryZone` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.deleteDeliveryZone` | `DELETE` | `/api/v1/admin/delivery-zones/{zone}` | `AdminController@deleteDeliveryZone` | **PASS (SOURCE VERIFIED)** |
| **Admin** | `adminApi.getAuditLogs` | `GET` | `/api/v1/admin/audit-logs` | `AdminController@getAuditLogs` | **PASS (SOURCE VERIFIED)** |

---

## 10. 404 & Connectivity Issues Discovered & Fixes Applied

1. **`vite.config.ts` — Added Development & Preview Proxy for `/api` and `/sanctum`:**
   - Proxies `/api` and `/sanctum` to `VITE_BACKEND_URL` (or `LARAVEL_BACKEND_URL`, default `http://127.0.0.1:8000`) with header/method/body preservation.
2. **`src/services/api/client.ts` — Semantic HTTP Error Classification & Base URL Normalization:**
   - Added `resolveApiBaseUrl()` so setting `VITE_API_URL=https://your-laravel-host.com` automatically normalizes to `https://your-laravel-host.com/api/v1`.
   - Differentiates HTTP `401` (Authentication failure), `403` (Authorization failure), `404` with JSON (Backend resource/route not found) vs. `404` without JSON (`BACKEND_UNREACHABLE` — unproxied or offline Laravel backend), `409` (Business conflict), `422` (Validation/business rule failure, extracting field-level messages), and `500+` (Server error, sanitizing SQL/stack traces).
   - Automatically omits `Content-Type: application/json` when `options.body instanceof FormData` so multipart media uploads succeed.
3. **`backend/routes/api.php` & `backend/app/Http/Controllers/Api/V1/ReviewController.php` — Added Public `GET /api/v1/reviews` Endpoint:**
   - Implemented `ReviewController@index` and registered `Route::get('reviews', [ReviewController::class, 'index'])` so `reviewApi.getAll()` on storefront load resolves to a real Laravel route instead of 404ing.
4. **`backend/bootstrap/app.php` — Added `404` JSON Exception Rendering for `api/*`:**
   - Registered `ModelNotFoundException` and `NotFoundHttpException` JSON renderers returning `{ success: false, message: '...' }` with HTTP 404.
5. **`backend/config/cors.php` & `backend/.env.example` — Fixed Credentialed CORS Origins:**
   - Replaced wildcard `'*'` origins with environment-driven `CORS_ALLOWED_ORIGINS` / `FRONTEND_URL` so credentialed cross-origin requests from a deployed frontend to a deployed Laravel API succeed safely.
6. **`src/context/AppContext.tsx` & `src/services/api/orderApi.ts` — Startup Error Surfacing & Post-Login Verification:**
   - Removed the unauthenticated `adminApi.getRiders()` call from public startup.
   - Surfaced `apiError` when `restaurantApi.getAll()` rejects so the UI displays a clear connection error instead of silently showing an empty catalog.
   - Updated `login()` and `register()` to verify the Sanctum token against `GET /api/v1/auth/me` and trigger `refreshData()`.
   - Normalized `orderApi.getAll()` response handling (`orders` array inside paginated payload).

---

## 11. Tests Executed & Environment Limitations

- **Frontend TypeScript Typecheck (`npm run lint` / `tsc --noEmit`):** **BUILD VERIFIED — PASSED (0 errors)**
- **Frontend Production Build (`npm run build` / `vite build`):** **BUILD VERIFIED — PASSED (0 errors)**
- **Laravel Source & Route Verification:** **SOURCE VERIFIED — PASSED**
- **Runtime Laravel Verification:** **NOT EXECUTED**
  - **Reason:** PHP, Composer, and MySQL/MariaDB are not installed in the Google AI Studio Node.js container (`php: command not found`, `composer: command not found`).
  - **Connecting Google AI Studio Preview to a Live Laravel Backend:** To use the live login and Admin Dashboard from Google AI Studio Preview, deploy the `/backend` Laravel application to an external PHP/MySQL host and set `VITE_API_URL=https://<your-laravel-domain>/api/v1` (or `VITE_BACKEND_URL=https://<your-laravel-domain>`) in the environment variables, and include the AI Studio Preview URL in Laravel's `CORS_ALLOWED_ORIGINS`.

---

## 12. Remaining Issues & Phase 7 Status

- **Payment & Refund Subsystem:** All Phase 4 and Phase 6.1 payment, COD validation, and persistent Stripe refund idempotency protections remain intact and untouched.
- **Phase 7 Status:** **`NOT STARTED`** (Strict Hard Stop Enforced).

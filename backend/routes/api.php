<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\RestaurantController;
use App\Http\Controllers\Api\V1\OwnerRestaurantController;
use App\Http\Controllers\Api\V1\MenuController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\RiderController;
use App\Http\Controllers\Api\V1\ReviewController;
use App\Http\Controllers\Api\V1\CouponController;
use App\Http\Controllers\Api\V1\AdminController;
use App\Http\Controllers\Api\V1\CuisineController;

Route::prefix('v1')->group(function () {

    // Authentication Routes
    Route::prefix('auth')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login']);

        Route::middleware('auth:sanctum')->group(function () {
            Route::post('logout', [AuthController::class, 'logout']);
            Route::get('me', [AuthController::class, 'me']);
        });
    });

    // Public Browsing Routes
    Route::get('restaurants', [RestaurantController::class, 'index']);
    Route::get('restaurants/{restaurant}', [RestaurantController::class, 'show']);
    Route::get('restaurants/{restaurant}/menu', [MenuController::class, 'getPublicMenu']);
    Route::get('categories', [MenuController::class, 'getCategories']);
    Route::get('products', [MenuController::class, 'getPublicProducts']);
    Route::get('cuisines', [CuisineController::class, 'index']);
    Route::get('coupons', [CouponController::class, 'index']);
    Route::post('coupons/validate', [CouponController::class, 'validateCoupon']);

    // Public Webhooks
    Route::post('payments/stripe/webhook', [PaymentController::class, 'stripeWebhook']);

    // Authenticated Customer Routes
    Route::middleware(['auth:sanctum'])->group(function () {
        // Cart
        Route::prefix('cart')->group(function () {
            Route::get('/', [CartController::class, 'getCart']);
            Route::post('items', [CartController::class, 'addItem']);
            Route::put('items/{item}', [CartController::class, 'updateItem']);
            Route::delete('clear', [CartController::class, 'clearCart']);
            Route::post('coupon', [CartController::class, 'applyCoupon']);
            Route::delete('coupon', [CartController::class, 'removeCoupon']);
            Route::post('tip', [CartController::class, 'setTip']);
        });

        // Checkout & Orders
        Route::prefix('orders')->group(function () {
            Route::post('checkout', [OrderController::class, 'checkout']);
            Route::get('/', [OrderController::class, 'index']);
            Route::get('{order}', [OrderController::class, 'show']);
            Route::post('{order}/cancel', [OrderController::class, 'cancel']);
        });

        // Payments
        Route::prefix('payments')->group(function () {
            Route::post('stripe/create-intent', [PaymentController::class, 'createIntent']);
        });

        // Customer Profile & Address Management
        Route::prefix('customer')->group(function () {
            Route::get('profile', [CustomerController::class, 'getProfile']);
            Route::put('profile', [CustomerController::class, 'updateProfile']);
            Route::get('addresses', [CustomerController::class, 'getAddresses']);
            Route::post('addresses', [CustomerController::class, 'storeAddress']);
            Route::put('addresses/{id}', [CustomerController::class, 'updateAddress']);
            Route::delete('addresses/{id}', [CustomerController::class, 'deleteAddress']);
        });

        // Restaurant Partner Application (any authenticated user can apply)
        Route::post('restaurant/apply', [OwnerRestaurantController::class, 'apply']);

        // Reviews
        Route::post('reviews', [ReviewController::class, 'store']);
    });

    // Restaurant Owner & Kitchen Staff Routes
    Route::prefix('owner')->middleware(['auth:sanctum', 'role:restaurant_owner,restaurant_staff,super_admin'])->group(function () {
        Route::get('restaurants', [OwnerRestaurantController::class, 'index']);
        Route::post('restaurants', [OwnerRestaurantController::class, 'apply']);
        Route::get('restaurants/{restaurant}', [OwnerRestaurantController::class, 'show']);
        Route::put('restaurants/{restaurant}', [OwnerRestaurantController::class, 'update']);
        Route::get('restaurants/{restaurant}/dashboard', [OwnerRestaurantController::class, 'dashboard']);
        Route::post('restaurants/{restaurant}/media', [OwnerRestaurantController::class, 'uploadMedia']);

        // Operating Hours
        Route::get('restaurants/{restaurant}/hours', [OwnerRestaurantController::class, 'getHours']);
        Route::put('restaurants/{restaurant}/hours', [OwnerRestaurantController::class, 'updateHours']);

        // Delivery Zones
        Route::get('restaurants/{restaurant}/delivery-zones', [OwnerRestaurantController::class, 'getDeliveryZones']);
        Route::post('restaurants/{restaurant}/delivery-zones', [OwnerRestaurantController::class, 'storeDeliveryZone']);
        Route::put('restaurants/{restaurant}/delivery-zones/{zone}', [OwnerRestaurantController::class, 'updateDeliveryZone']);
        Route::delete('restaurants/{restaurant}/delivery-zones/{zone}', [OwnerRestaurantController::class, 'deleteDeliveryZone']);

        // Orders
        Route::get('restaurants/{restaurant}/orders', [OwnerRestaurantController::class, 'getOrders']);
        Route::put('restaurants/{restaurant}/orders/{order}/status', [OwnerRestaurantController::class, 'updateOrderStatus']);
        
        // Menu: Categories CRUD
        Route::get('restaurants/{restaurant}/categories', [MenuController::class, 'getOwnerCategories']);
        Route::post('restaurants/{restaurant}/categories', [MenuController::class, 'storeCategory']);
        Route::get('restaurants/{restaurant}/categories/{category}', [MenuController::class, 'showCategory']);
        Route::put('restaurants/{restaurant}/categories/{category}', [MenuController::class, 'updateCategory']);
        Route::delete('restaurants/{restaurant}/categories/{category}', [MenuController::class, 'deleteCategory']);
        Route::post('restaurants/{restaurant}/categories/reorder', [MenuController::class, 'reorderCategories']);

        // Menu: Products CRUD
        Route::get('restaurants/{restaurant}/products', [MenuController::class, 'getOwnerProducts']);
        Route::post('restaurants/{restaurant}/products', [MenuController::class, 'storeProduct']);
        Route::get('restaurants/{restaurant}/products/{product}', [MenuController::class, 'showProduct']);
        Route::put('restaurants/{restaurant}/products/{product}', [MenuController::class, 'updateProduct']);
        Route::delete('restaurants/{restaurant}/products/{product}', [MenuController::class, 'deleteProduct']);
        Route::patch('restaurants/{restaurant}/products/{product}/toggle', [MenuController::class, 'toggleAvailability']);
        Route::post('restaurants/{restaurant}/products/{product}/image', [MenuController::class, 'uploadProductImage']);
        Route::post('restaurants/{restaurant}/products/reorder', [MenuController::class, 'reorderProducts']);

        // Menu: Product Variants
        Route::get('restaurants/{restaurant}/products/{product}/variants', [MenuController::class, 'getVariants']);
        Route::post('restaurants/{restaurant}/products/{product}/variants', [MenuController::class, 'storeVariant']);
        Route::put('restaurants/{restaurant}/products/{product}/variants/{variant}', [MenuController::class, 'updateVariant']);
        Route::delete('restaurants/{restaurant}/products/{product}/variants/{variant}', [MenuController::class, 'deleteVariant']);

        // Menu: Add-ons
        Route::get('restaurants/{restaurant}/addons', [MenuController::class, 'getAddons']);
        Route::post('restaurants/{restaurant}/addons', [MenuController::class, 'storeAddon']);
        Route::put('restaurants/{restaurant}/addons/{addon}', [MenuController::class, 'updateAddon']);
        Route::delete('restaurants/{restaurant}/addons/{addon}', [MenuController::class, 'deleteAddon']);
        Route::post('restaurants/{restaurant}/products/{product}/addons/sync', [MenuController::class, 'syncProductAddons']);
    });

    // Delivery Courier Routes
    Route::prefix('rider')->middleware(['auth:sanctum', 'role:delivery_rider'])->group(function () {
        Route::get('orders', [RiderController::class, 'getOrders']);
        Route::put('status', [RiderController::class, 'updateStatus']);
        Route::post('orders/{order}/pickup', [RiderController::class, 'pickupOrder']);
        Route::post('orders/{order}/start-delivery', [RiderController::class, 'startDelivery']);
        Route::post('orders/{order}/deliver', [RiderController::class, 'deliverOrder']);
    });

    // Super Admin Routes
    Route::prefix('admin')->middleware(['auth:sanctum', 'role:super_admin'])->group(function () {
        Route::get('dashboard', [AdminController::class, 'dashboard']);
        Route::get('restaurants', [AdminController::class, 'getRestaurants']);
        Route::put('restaurants/{restaurant}/status', [AdminController::class, 'setRestaurantStatus']);
        Route::put('restaurants/{restaurant}/commission', [AdminController::class, 'updateCommission']);
        Route::get('riders', [AdminController::class, 'getRiders']);
        Route::post('orders/{order}/assign-rider', [AdminController::class, 'assignRider']);
        Route::post('orders/{order}/auto-dispatch', [AdminController::class, 'autoDispatch']);
        Route::get('financials', [AdminController::class, 'getFinancials']);
        Route::get('audit-logs', [AdminController::class, 'getAuditLogs']);
    });
});

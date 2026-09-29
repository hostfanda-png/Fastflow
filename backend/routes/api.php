<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\RestaurantController;
use App\Http\Controllers\Api\V1\OwnerRestaurantController;
use App\Http\Controllers\Api\V1\MenuController;
use App\Http\Controllers\Api\V1\CartController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\RiderController;
use App\Http\Controllers\Api\V1\ReviewController;
use App\Http\Controllers\Api\V1\CouponController;
use App\Http\Controllers\Api\V1\AdminController;

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
    Route::get('categories', [MenuController::class, 'getCategories']);
    Route::get('coupons', [CouponController::class, 'index']);
    Route::post('coupons/validate', [CouponController::class, 'validateCoupon']);

    // Authenticated Customer Routes
    Route::middleware(['auth:sanctum'])->group(function () {
        // Cart
        Route::prefix('cart')->group(function () {
            Route::get('/', [CartController::class, 'getCart']);
            Route::post('items', [CartController::class, 'addItem']);
            Route::put('items/{item}', [CartController::class, 'updateItem']);
            Route::delete('clear', [CartController::class, 'clearCart']);
        });

        // Checkout & Orders
        Route::prefix('orders')->group(function () {
            Route::post('checkout', [OrderController::class, 'checkout']);
            Route::get('/', [OrderController::class, 'index']);
            Route::get('{order}', [OrderController::class, 'show']);
            Route::post('{order}/cancel', [OrderController::class, 'cancel']);
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

        // Reviews
        Route::post('reviews', [ReviewController::class, 'store']);
    });

    // Restaurant Owner & Kitchen Staff Routes
    Route::prefix('owner')->middleware(['auth:sanctum', 'role:restaurant_owner,restaurant_staff'])->group(function () {
        Route::get('restaurants', [OwnerRestaurantController::class, 'index']);
        Route::get('restaurants/{restaurant}', [OwnerRestaurantController::class, 'show']);
        Route::get('restaurants/{restaurant}/orders', [OwnerRestaurantController::class, 'getOrders']);
        Route::put('restaurants/{restaurant}/orders/{order}/status', [OwnerRestaurantController::class, 'updateOrderStatus']);
        
        // Menu CRUD
        Route::post('restaurants/{restaurant}/products', [MenuController::class, 'storeProduct']);
        Route::put('restaurants/{restaurant}/products/{product}', [MenuController::class, 'updateProduct']);
        Route::delete('restaurants/{restaurant}/products/{product}', [MenuController::class, 'deleteProduct']);
        Route::patch('restaurants/{restaurant}/products/{product}/toggle', [MenuController::class, 'toggleAvailability']);
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

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\Order;
use App\Models\Rider;
use App\Models\User;
use App\Models\Coupon;
use App\Models\Review;
use App\Models\FinancialTransaction;
use App\Models\AuditLog;
use App\Models\Setting;
use App\Models\DeliveryZone;
use App\Models\Page;
use App\Services\AuditService;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AdminController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $totalOrders = Order::count();
        $totalGMV = Order::where('order_status', '!=', 'cancelled')->sum('grand_total');
        $totalCommission = FinancialTransaction::sum('platform_commission');
        $restaurantsCount = Restaurant::count();
        $approvedRestaurantsCount = Restaurant::where('status', 'approved')->count();
        $ridersCount = Rider::count();
        $activeRidersCount = Rider::where('status', 'available')->count();
        $customersCount = User::whereHas('role', fn($q) => $q->where('name', 'customer'))->count();

        return $this->sendResponse([
            'metrics' => [
                'total_gmv' => (float)$totalGMV,
                'total_commission' => (float)$totalCommission,
                'total_orders' => $totalOrders,
                'total_restaurants' => $restaurantsCount,
                'approved_restaurants' => $approvedRestaurantsCount,
                'total_riders' => $ridersCount,
                'active_riders' => $activeRidersCount,
                'total_customers' => $customersCount,
            ]
        ], 'Admin dashboard metrics');
    }

    public function getRestaurants(): JsonResponse
    {
        $restaurants = Restaurant::with(['owner', 'cuisines'])->orderByDesc('created_at')->get();
        return $this->sendResponse($restaurants, 'All restaurants retrieved');
    }

    public function setRestaurantStatus(Request $request, int $restaurantId): JsonResponse
    {
        $restaurant = Restaurant::findOrFail($restaurantId);
        $status = $request->validate([
            'status' => ['required', 'in:pending,approved,suspended,rejected'],
        ])['status'];

        $restaurant->status = $status;
        $restaurant->save();

        AuditService::log('admin.restaurant_status', 'Restaurants', (string)$restaurant->id, "Changed status of {$restaurant->name} to {$status}");

        return $this->sendResponse($restaurant, "Restaurant status updated to {$status}");
    }

    public function updateCommission(Request $request, int $restaurantId): JsonResponse
    {
        $restaurant = Restaurant::findOrFail($restaurantId);
        $validated = $request->validate([
            'commission_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'commission_type' => ['required', 'in:percentage,fixed'],
            'fixed_commission_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $restaurant->update($validated);

        AuditService::log('admin.commission_update', 'Commissions', (string)$restaurant->id, "Updated commission rate to {$validated['commission_rate']}%");

        return $this->sendResponse($restaurant, 'Restaurant commission updated');
    }

    public function getRiders(): JsonResponse
    {
        $riders = Rider::with('user')->get();
        return $this->sendResponse($riders, 'Rider fleet retrieved');
    }

    public function assignRider(Request $request, int $orderId): JsonResponse
    {
        $order = Order::findOrFail($orderId);
        $riderId = $request->validate(['rider_id' => ['required', 'exists:riders,id']])['rider_id'];
        $rider = Rider::with('user')->findOrFail($riderId);

        $order->rider_id = $rider->id;
        if (in_array($order->order_status, ['pending', 'confirmed', 'ready_for_pickup'])) {
            $order->order_status = 'assigned_to_rider';
        }
        $order->save();

        $rider->increment('assigned_order_count');

        AuditService::log('admin.assign_rider', 'Orders', (string)$order->id, "Assigned courier {$rider->user->name} to order {$order->order_number}");

        return $this->sendResponse($order->load('rider.user'), "Order assigned to {$rider->user->name}");
    }

    public function autoDispatch(int $orderId): JsonResponse
    {
        $order = Order::findOrFail($orderId);

        // Find available rider with least assigned workload
        $bestRider = Rider::where('status', 'available')
            ->orderBy('assigned_order_count', 'asc')
            ->first();

        if (!$bestRider) {
            return $this->sendError('No couriers are currently online and available in this delivery zone', [], 404);
        }

        $order->rider_id = $bestRider->id;
        $order->order_status = 'assigned_to_rider';
        $order->save();

        $bestRider->increment('assigned_order_count');

        AuditService::log('admin.auto_dispatch', 'Dispatch', (string)$order->id, "Algorithm automatically dispatched rider {$bestRider->id}");

        return $this->sendResponse($order->load('rider.user'), "Auto-dispatched to {$bestRider->vehicle_number}");
    }

    public function getFinancials(): JsonResponse
    {
        $financials = FinancialTransaction::orderByDesc('created_at')->get();
        return $this->sendResponse($financials, 'Financial transactions ledger');
    }

    public function getAuditLogs(): JsonResponse
    {
        $logs = AuditLog::orderByDesc('created_at')->limit(100)->get();
        return $this->sendResponse($logs, 'Platform audit trail');
    }
}

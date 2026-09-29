<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\Order;
use App\Services\OrderService;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class OwnerRestaurantController extends Controller
{
    protected OrderService $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasRole('restaurant_owner')) {
            $restaurants = Restaurant::where('owner_id', $user->id)->with(['cuisines', 'products'])->get();
        } elseif ($user->hasRole('restaurant_staff')) {
            $restaurants = Restaurant::where('id', $user->restaurant_id)->with(['cuisines', 'products'])->get();
        } else {
            return $this->sendError('Access denied: not a restaurant owner or staff', [], 403);
        }

        return $this->sendResponse($restaurants, 'Owner restaurants retrieved');
    }

    public function show(Request $request, int $restaurantId): JsonResponse
    {
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $restaurant = Restaurant::with(['products.variants', 'products.addons', 'staff.user', 'hours', 'orders.items'])
            ->findOrFail($restaurantId);

        return $this->sendResponse($restaurant, 'Restaurant dashboard details');
    }

    public function getOrders(Request $request, int $restaurantId): JsonResponse
    {
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $query = Order::where('restaurant_id', $restaurantId)->with(['items.addons', 'statusHistories'])->orderByDesc('created_at');

        if ($status = $request->query('status')) {
            if ($status !== 'all') {
                $query->where('order_status', $status);
            }
        }

        $orders = $query->get();

        return $this->sendResponse($orders, 'Restaurant orders retrieved');
    }

    public function updateOrderStatus(Request $request, int $restaurantId, int $orderId): JsonResponse
    {
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $order = Order::where('restaurant_id', $restaurantId)->findOrFail($orderId);
        $status = $request->input('status');
        $note = $request->input('note', 'Updated by kitchen staff');

        $allowedTransitions = ['confirmed', 'preparing', 'ready_for_pickup', 'cancelled'];
        if (!in_array($status, $allowedTransitions)) {
            return $this->sendError("Restaurant cannot transition order to '{$status}'", [], 422);
        }

        $this->orderService->updateStatus($order, $status, $note, $user->name);
        AuditService::log('order.status_update', 'Kitchen', (string)$order->id, "Kitchen marked order as {$status}", $user);

        return $this->sendResponse($order, "Order status transitioned to {$status}");
    }

    protected function authorizeRestaurantAccess($user, int $restaurantId): void
    {
        if ($user->hasRole('super_admin')) {
            return;
        }

        $isOwner = Restaurant::where('id', $restaurantId)->where('owner_id', $user->id)->exists();
        $isStaff = ($user->restaurant_id == $restaurantId);

        if (!$isOwner && !$isStaff) {
            abort(403, 'Unauthorized access to this restaurant. IDOR protection enforced.');
        }
    }
}

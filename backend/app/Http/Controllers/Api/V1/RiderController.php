<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Rider;
use App\Services\OrderService;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RiderController extends Controller
{
    protected OrderService $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    /**
     * Authoritative Rider Dashboard Summary
     */
    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $rider = Rider::where('user_id', $user->id)->firstOrFail();

        // Get current active delivery
        $activeOrder = Order::where('rider_id', $rider->id)
            ->whereIn('order_status', ['assigned_to_rider', 'picked_up', 'on_the_way'])
            ->with(['restaurant', 'items.addons'])
            ->latest('updated_at')
            ->first();

        $activeOrdersCount = Order::where('rider_id', $rider->id)
            ->whereIn('order_status', ['assigned_to_rider', 'picked_up', 'on_the_way'])
            ->count();

        $todayStart = now()->startOfDay();
        $todayDeliveries = Order::where('rider_id', $rider->id)
            ->where('order_status', 'delivered')
            ->where('updated_at', '>=', $todayStart)
            ->count();

        return $this->sendResponse([
            'rider' => [
                'id' => $rider->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'vehicle_type' => $rider->vehicle_type,
                'vehicle_number' => $rider->vehicle_number,
                'status' => $rider->status,
                'is_active' => (bool)$rider->is_active,
                'rating' => (float)$rider->rating,
                'commission_per_delivery' => (float)$rider->commission_per_delivery,
                'today_earnings' => (float)$rider->today_earnings,
                'total_earnings' => (float)$rider->total_earnings,
                'assigned_order_count' => (int)$rider->assigned_order_count,
                'total_deliveries' => (int)$rider->total_deliveries,
            ],
            'metrics' => [
                'today_deliveries' => $todayDeliveries,
                'active_deliveries' => $activeOrdersCount,
                'today_earnings' => (float)$rider->today_earnings,
                'total_earnings' => (float)$rider->total_earnings,
            ],
            'current_order' => $activeOrder ? $this->formatOrderForRider($activeOrder) : null,
        ], 'Rider dashboard retrieved');
    }

    /**
     * Get Current Active Delivery for Authenticated Rider.
     * Returns 200 with null if no active delivery exists.
     * Never returns fake or mock orders.
     */
    public function getCurrentOrder(Request $request): JsonResponse
    {
        $user = $request->user();
        $rider = Rider::where('user_id', $user->id)->firstOrFail();

        $order = Order::where('rider_id', $rider->id)
            ->whereIn('order_status', ['assigned_to_rider', 'picked_up', 'on_the_way'])
            ->with(['restaurant', 'items.addons'])
            ->latest('updated_at')
            ->first();

        return $this->sendResponse(
            $order ? $this->formatOrderForRider($order) : null,
            $order ? 'Current active delivery retrieved' : 'No active delivery currently assigned'
        );
    }

    /**
     * Get orders assigned to the authenticated rider.
     * Enforces strict authorization: Ignores any client-supplied rider_id query param.
     */
    public function getOrders(Request $request): JsonResponse
    {
        $user = $request->user();
        $rider = Rider::where('user_id', $user->id)->firstOrFail();

        $statusFilter = $request->query('status'); // 'active', 'delivered', 'all'

        $query = Order::where('rider_id', $rider->id)
            ->with(['restaurant', 'items.addons'])
            ->orderByDesc('created_at');

        if ($statusFilter === 'active') {
            $query->whereIn('order_status', ['assigned_to_rider', 'picked_up', 'on_the_way']);
        } elseif ($statusFilter === 'delivered') {
            $query->where('order_status', 'delivered');
        }

        $perPage = min(50, max(1, (int)$request->query('per_page', 15)));
        $orders = $query->paginate($perPage);

        $transformed = $orders->through(fn($order) => $this->formatOrderForRider($order));

        return $this->sendResponse([
            'rider' => [
                'id' => $rider->id,
                'name' => $user->name,
                'status' => $rider->status,
                'is_active' => (bool)$rider->is_active,
            ],
            'orders' => $transformed,
        ], 'Rider assigned orders retrieved');
    }

    /**
     * Update Rider Availability / Status with Server-Side State Machine Transitions.
     */
    public function updateStatus(Request $request): JsonResponse
    {
        $user = $request->user();
        $rider = Rider::where('user_id', $user->id)->firstOrFail();

        // Suspended or inactive riders cannot change their status
        if (!$rider->is_active || $rider->status === 'suspended' || $rider->status === 'inactive') {
            return $this->sendError('Your courier account is suspended or inactive. Please contact administration.', [], 403);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:available,busy,offline'],
        ]);

        $newStatus = $validated['status'];
        $currentStatus = $rider->status;

        if ($currentStatus === $newStatus) {
            return $this->sendResponse($rider, "Rider status is already {$newStatus}");
        }

        // Check if rider has active, unfinished deliveries
        $hasActiveDeliveries = Order::where('rider_id', $rider->id)
            ->whereIn('order_status', ['assigned_to_rider', 'picked_up', 'on_the_way'])
            ->exists();

        if ($hasActiveDeliveries && $newStatus === 'offline') {
            return $this->sendError('Cannot switch to offline while you have an active delivery in progress.', [], 422);
        }

        // State Machine validation
        $allowedTransitions = [
            'offline' => ['available'],
            'available' => ['offline', 'busy'],
            'busy' => ['available', 'offline'],
            'on_delivery' => ['available', 'busy', 'offline'],
        ];

        $validTargets = $allowedTransitions[$currentStatus] ?? [];

        if (!in_array($newStatus, $validTargets)) {
            return $this->sendError("Invalid status transition from '{$currentStatus}' to '{$newStatus}'.", [], 422);
        }

        $rider->status = $newStatus;
        $rider->save();

        AuditService::log('rider.status_change', 'Riders', (string)$rider->id, "Courier transitioned status from {$currentStatus} to {$newStatus}", $user);

        return $this->sendResponse($rider, "Rider status updated to {$newStatus}");
    }

    /**
     * Courier confirms/accepts assigned order
     */
    public function acceptOrder(Request $request, int $orderId): JsonResponse
    {
        $user = $request->user();
        $rider = Rider::where('user_id', $user->id)->firstOrFail();

        $order = Order::where('rider_id', $rider->id)->findOrFail($orderId);

        if ($order->order_status !== 'assigned_to_rider') {
            return $this->sendError("Order cannot be accepted in '{$order->order_status}' status.", [], 422);
        }

        // Transition rider status to on_delivery / busy if currently available
        if ($rider->status === 'available') {
            $rider->status = 'on_delivery';
            $rider->save();
        }

        AuditService::log('delivery.status_change', 'Delivery', (string)$order->id, "Courier accepted order assignment", $user);

        return $this->sendResponse($this->formatOrderForRider($order), 'Delivery assignment accepted');
    }

    /**
     * Courier picks up package from the restaurant
     */
    public function pickupOrder(Request $request, int $orderId): JsonResponse
    {
        $user = $request->user();
        $rider = Rider::where('user_id', $user->id)->firstOrFail();

        $order = Order::where('rider_id', $rider->id)->findOrFail($orderId);

        if (!in_array($order->order_status, ['assigned_to_rider', 'ready_for_pickup'])) {
            return $this->sendError("Cannot pick up order in '{$order->order_status}' status.", [], 422);
        }

        $this->orderService->updateStatus($order, 'picked_up', 'Courier picked up package from restaurant kitchen', $user->name);

        $rider->status = 'on_delivery';
        $rider->save();

        AuditService::log('delivery.status_change', 'Delivery', (string)$order->id, "Courier confirmed package pickup", $user);

        return $this->sendResponse($this->formatOrderForRider($order->fresh(['restaurant', 'items.addons'])), 'Order marked as picked up');
    }

    /**
     * Courier starts transit to customer
     */
    public function startDelivery(Request $request, int $orderId): JsonResponse
    {
        $user = $request->user();
        $rider = Rider::where('user_id', $user->id)->firstOrFail();

        $order = Order::where('rider_id', $rider->id)->findOrFail($orderId);

        if ($order->order_status !== 'picked_up') {
            return $this->sendError("Cannot start delivery for order with status '{$order->order_status}'. Must be 'picked_up'.", [], 422);
        }

        $this->orderService->updateStatus($order, 'on_the_way', 'Courier en route to customer destination', $user->name);

        AuditService::log('delivery.status_change', 'Delivery', (string)$order->id, "Courier started transit to customer", $user);

        return $this->sendResponse($this->formatOrderForRider($order->fresh(['restaurant', 'items.addons'])), 'Order is on the way');
    }

    /**
     * Courier completes delivery to customer
     */
    public function deliverOrder(Request $request, int $orderId): JsonResponse
    {
        $user = $request->user();
        $rider = Rider::where('user_id', $user->id)->firstOrFail();

        return DB::transaction(function () use ($rider, $orderId, $user) {
            $order = Order::where('rider_id', $rider->id)->where('id', $orderId)->lockForUpdate()->firstOrFail();

            if (!in_array($order->order_status, ['on_the_way', 'picked_up'])) {
                return $this->sendError("Cannot deliver order in '{$order->order_status}' status. Required: 'on_the_way'.", [], 422);
            }

            $lockedRider = Rider::where('id', $rider->id)->lockForUpdate()->firstOrFail();

            $this->orderService->updateStatus($order, 'delivered', 'Courier handed order over to customer', $user->name);

            // Update rider stats & earnings
            $deliveryEarnings = (float)$lockedRider->commission_per_delivery + (float)$order->tip;
            $lockedRider->today_earnings += $deliveryEarnings;
            $lockedRider->total_earnings += $deliveryEarnings;
            $lockedRider->total_deliveries += 1;
            $lockedRider->assigned_order_count = max(0, $lockedRider->assigned_order_count - 1);

            // Check remaining active orders; if none, reset status to available
            $remainingActive = Order::where('rider_id', $lockedRider->id)
                ->where('id', '!=', $order->id)
                ->whereIn('order_status', ['assigned_to_rider', 'picked_up', 'on_the_way'])
                ->exists();

            if (!$remainingActive && $lockedRider->is_active) {
                $lockedRider->status = 'available';
            }

            $lockedRider->save();

            AuditService::log('delivery.status_change', 'Delivery', (string)$order->id, "Delivered and earned {$deliveryEarnings}", $user);

            return $this->sendResponse($this->formatOrderForRider($order->fresh(['restaurant', 'items.addons'])), 'Order successfully delivered');
        });
    }

    /**
     * Format Order object for rider display, respecting privacy rules
     * (Only returns necessary customer delivery info, not private internal credentials)
     */
    protected function formatOrderForRider(Order $order): array
    {
        $address = json_decode($order->delivery_address_json, true) ?: [
            'street' => $order->delivery_address_json,
            'area' => '',
            'city' => '',
        ];

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'order_status' => $order->order_status,
            'customer_name' => $order->customer_name,
            'customer_phone' => $order->customer_phone,
            'delivery_address' => $address,
            'delivery_instructions' => $order->delivery_instructions,
            'payment_method' => $order->payment_method,
            'payment_status' => $order->payment_status,
            'grand_total' => (float)$order->grand_total,
            'tip' => (float)$order->tip,
            'estimated_delivery_time' => $order->estimated_delivery_time,
            'restaurant' => [
                'id' => $order->restaurant?->id,
                'name' => $order->restaurant?->name,
                'address' => $order->restaurant?->address,
                'phone' => $order->restaurant?->phone,
                'city' => $order->restaurant?->city,
                'area' => $order->restaurant?->area,
            ],
            'items' => $order->items->map(fn($item) => [
                'id' => $item->id,
                'product_name' => $item->product_name,
                'quantity' => $item->quantity,
                'variant_name' => $item->variant_name,
                'special_instructions' => $item->special_instructions,
                'addons' => $item->addons->map(fn($a) => [
                    'name' => $a->addon_name,
                    'price' => (float)$a->price,
                ]),
            ]),
            'created_at' => $order->created_at?->toIso8601String(),
            'updated_at' => $order->updated_at?->toIso8601String(),
        ];
    }
}

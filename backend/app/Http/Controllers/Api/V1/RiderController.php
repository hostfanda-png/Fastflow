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

    public function getOrders(Request $request): JsonResponse
    {
        $user = $request->user();
        $rider = Rider::where('user_id', $user->id)->firstOrFail();

        $assignedOrders = Order::where('rider_id', $rider->id)
            ->with(['restaurant', 'items'])
            ->orderByDesc('created_at')
            ->get();

        return $this->sendResponse([
            'rider' => $rider,
            'orders' => $assignedOrders,
        ], 'Rider assigned orders retrieved');
    }

    public function updateStatus(Request $request): JsonResponse
    {
        $user = $request->user();
        $rider = Rider::where('user_id', $user->id)->firstOrFail();

        $status = $request->validate([
            'status' => ['required', 'string', 'in:available,busy,offline'],
        ])['status'];

        $rider->status = $status;
        $rider->save();

        AuditService::log('rider.status_update', 'Riders', (string)$rider->id, "Courier set status to {$status}", $user);

        return $this->sendResponse($rider, "Rider status updated to {$status}");
    }

    public function pickupOrder(Request $request, int $orderId): JsonResponse
    {
        $user = $request->user();
        $rider = Rider::where('user_id', $user->id)->firstOrFail();
        $order = Order::where('rider_id', $rider->id)->findOrFail($orderId);

        $this->orderService->updateStatus($order, 'picked_up', 'Courier picked up package from restaurant', $user->name);
        AuditService::log('rider.pickup', 'Delivery', (string)$order->id, "Courier confirmed package pickup", $user);

        return $this->sendResponse($order, 'Order picked up');
    }

    public function startDelivery(Request $request, int $orderId): JsonResponse
    {
        $user = $request->user();
        $rider = Rider::where('user_id', $user->id)->firstOrFail();
        $order = Order::where('rider_id', $rider->id)->findOrFail($orderId);

        $this->orderService->updateStatus($order, 'on_the_way', 'Courier en route to customer destination', $user->name);

        return $this->sendResponse($order, 'Order is on the way');
    }

    public function deliverOrder(Request $request, int $orderId): JsonResponse
    {
        $user = $request->user();
        $rider = Rider::where('user_id', $user->id)->firstOrFail();
        $order = Order::where('rider_id', $rider->id)->findOrFail($orderId);

        $this->orderService->updateStatus($order, 'delivered', 'Courier handed order to customer', $user->name);

        // Update rider earnings
        $deliveryEarnings = $rider->commission_per_delivery + $order->tip;
        $rider->today_earnings += $deliveryEarnings;
        $rider->total_earnings += $deliveryEarnings;
        $rider->total_deliveries += 1;
        $rider->assigned_order_count = max(0, $rider->assigned_order_count - 1);
        $rider->save();

        AuditService::log('rider.delivered', 'Delivery', (string)$order->id, "Delivered and earned {$deliveryEarnings}", $user);

        return $this->sendResponse($order, 'Order successfully marked as delivered');
    }
}

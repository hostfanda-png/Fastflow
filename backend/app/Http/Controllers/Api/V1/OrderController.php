<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckoutRequest;
use App\Models\Order;
use App\Models\Cart;
use App\Services\OrderService;
use App\Services\AuditService;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Exception;

class OrderController extends Controller
{
    protected OrderService $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    public function checkout(CheckoutRequest $request): JsonResponse
    {
        $user = $request->user();

        try {
            $data = $request->validated();
            if (empty($data['idempotency_key'])) {
                $data['idempotency_key'] = $request->header('X-Idempotency-Key') ?? $request->header('Idempotency-Key');
            }

            $order = $this->orderService->createOrder($user, $data);

            // Clear server cart if order successful
            $cart = Cart::where('user_id', $user->id)->first();
            if ($cart) {
                $cart->items()->delete();
                $cart->restaurant_id = null;
                $cart->coupon_code = null;
                $cart->rider_tip = 0.00;
                $cart->save();
            }

            AuditService::log('order.created', 'Orders', (string)$order->id, "Placed order {$order->order_number}", $user);

            return $this->sendResponse($order, 'Order placed successfully', 201);
        } catch (Exception $e) {
            return $this->sendError($e->getMessage(), [], 422);
        }
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Order::where('customer_id', $user->id)
            ->with(['restaurant', 'items.addons', 'rider.user', 'payment', 'refunds'])
            ->orderByDesc('created_at');

        if ($status = $request->query('status')) {
            $query->where('order_status', $status);
        }

        $perPage = (int)$request->query('per_page', 15);
        $orders = $query->paginate($perPage);

        return $this->sendResponse([
            'orders' => $orders->items(),
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'total' => $orders->total(),
                'per_page' => $orders->perPage(),
            ],
        ], 'Customer orders retrieved');
    }

    public function show(Request $request, string $identifier): JsonResponse
    {
        $user = $request->user();

        $order = Order::with(['restaurant', 'items.addons', 'rider.user', 'statusHistories', 'payment', 'refunds'])
            ->where(function ($q) use ($identifier) {
                $q->where('id', $identifier)->orWhere('order_number', $identifier);
            })
            ->firstOrFail();

        // Customer can only view their own order unless super admin or rider or restaurant owner
        if (!$user->hasRole('super_admin') && 
            $order->customer_id !== $user->id && 
            $order->rider?->user_id !== $user->id && 
            $order->restaurant->owner_id !== $user->id && 
            $user->restaurant_id !== $order->restaurant_id) {
            return $this->sendError('Unauthorized access to this order', [], 403);
        }

        return $this->sendResponse($order, 'Order tracking details');
    }

    public function cancel(Request $request, int $orderId): JsonResponse
    {
        $user = $request->user();
        $order = Order::with(['payment'])->findOrFail($orderId);

        // Security check: only order owner or super admin can cancel
        if ($order->customer_id !== $user->id && !$user->hasRole('super_admin')) {
            return $this->sendError('Unauthorized', [], 403);
        }

        // Only pending and confirmed orders can be cancelled by customer
        if (!in_array($order->order_status, ['pending', 'confirmed']) && !$user->hasRole('super_admin')) {
            return $this->sendError('Cannot cancel order after food preparation has commenced or courier has been dispatched.', [], 422);
        }

        $reason = $request->input('reason', 'Cancelled by customer');
        $this->orderService->updateStatus($order, 'cancelled', $reason, $user->name);
        $order->cancellation_reason = $reason;
        $order->save();

        // If payment was already completed (e.g. online Stripe), initiate refund through PaymentService
        if ($order->payment_status === 'paid') {
            app(PaymentService::class)->processRefund($order, (float)$order->grand_total, "Order cancelled: {$reason}", $user);
        } elseif ($order->payment) {
            $order->payment->update(['status' => 'cancelled']);
        }

        AuditService::log('order.cancelled', 'Orders', (string)$order->id, "Cancelled: {$reason}", $user);

        return $this->sendResponse($order->fresh(['payment', 'refunds', 'statusHistories']), 'Order cancelled successfully');
    }
}

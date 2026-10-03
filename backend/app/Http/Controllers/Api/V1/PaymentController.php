<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Restaurant;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Exception;

class PaymentController extends Controller
{
    protected PaymentService $paymentService;

    public function __construct(PaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    /**
     * Create a Stripe PaymentIntent for an order.
     * Accessible to the customer who owns the order or super admin.
     */
    public function createIntent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => ['required', 'exists:orders,id'],
        ]);

        $order = Order::findOrFail($validated['order_id']);
        $user = $request->user();

        // Customer isolation / IDOR check
        if ($order->customer_id !== $user->id && !$user->hasRole('super_admin')) {
            return $this->sendError('Unauthorized access to this order.', [], 403);
        }

        try {
            $intentData = $this->paymentService->createPaymentIntent($order, $user);
            return $this->sendResponse($intentData, 'Payment intent created successfully');
        } catch (Exception $e) {
            return $this->sendError($e->getMessage(), [], 422);
        }
    }

    /**
     * Public Webhook endpoint for verified Stripe events with idempotency tracking.
     */
    public function stripeWebhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');

        $result = $this->paymentService->handleStripeWebhook($payload, $sigHeader);

        $httpCode = $result['http_code'] ?? 200;
        unset($result['http_code']);

        return response()->json($result, $httpCode);
    }

    /**
     * Mark Cash on Delivery payment collected by authorized staff/courier/admin.
     */
    public function collectCod(Request $request, int $orderId): JsonResponse
    {
        $user = $request->user();
        $order = Order::findOrFail($orderId);

        // Strict payment method enforcement: only COD orders can be collected
        if (strtolower($order->payment_method) !== 'cod') {
            return $this->sendError("Order #{$order->order_number} has payment method '{$order->payment_method}'. Only Cash on Delivery orders can be collected via this endpoint.", [], 422);
        }

        // Multi-tenant IDOR check: super_admin or restaurant owner who owns the restaurant or assigned rider
        $isOwner = Restaurant::where('id', $order->restaurant_id)->where('owner_id', $user->id)->exists();
        $isAssignedRider = $user->hasRole('delivery_rider') && ($order->rider_id == $user->rider?->id);
        $isAuthorized = $user->hasRole('super_admin') 
            || ($user->hasRole('restaurant_owner') && $isOwner)
            || $isAssignedRider;

        if (!$isAuthorized) {
            return $this->sendError('Unauthorized to record cash payment collection for this order.', [], 403);
        }

        $validated = $request->validate([
            'reference' => ['nullable', 'string', 'max:100'],
        ]);

        try {
            $payment = $this->paymentService->collectCodPayment($order, $user, $validated['reference'] ?? null);
            return $this->sendResponse($payment, 'Cash on Delivery payment recorded as collected.');
        } catch (Exception $e) {
            return $this->sendError($e->getMessage(), [], 422);
        }
    }

    /**
     * Process full or partial refund (Admin & Authorized Restaurant Owner).
     */
    public function refund(Request $request, int $orderId): JsonResponse
    {
        $user = $request->user();
        $order = Order::findOrFail($orderId);

        // Multi-tenant IDOR check: super_admin or restaurant owner who owns the restaurant
        $isOwner = Restaurant::where('id', $order->restaurant_id)->where('owner_id', $user->id)->exists();
        $isAuthorized = $user->hasRole('super_admin') 
            || ($user->hasRole('restaurant_owner') && $isOwner);

        if (!$isAuthorized) {
            return $this->sendError('Unauthorized to issue refunds for this order.', [], 403);
        }

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:500'],
        ]);

        try {
            $refund = $this->paymentService->processRefund($order, (float)$validated['amount'], $validated['reason'], $user);
            return $this->sendResponse($refund, 'Refund processed successfully.');
        } catch (Exception $e) {
            return $this->sendError($e->getMessage(), [], 422);
        }
    }

    /**
     * Customer payment transaction history (Strict Customer Privacy & Isolation).
     */
    public function getCustomerPaymentHistory(Request $request): JsonResponse
    {
        $user = $request->user();

        $payments = Payment::where('customer_id', $user->id)
            ->with(['order:id,order_number,order_status,grand_total,created_at'])
            ->orderByDesc('created_at')
            ->paginate(15);

        // Sanitize output (never expose gateway secrets or internal webhook logs to customer)
        $sanitized = $payments->through(function ($p) {
            return [
                'id' => $p->id,
                'order_id' => $p->order_id,
                'order_number' => $p->order?->order_number,
                'payment_method' => $p->payment_method,
                'amount' => (float)$p->amount,
                'refunded_amount' => (float)$p->refunded_amount,
                'currency' => $p->currency,
                'status' => $p->status,
                'transaction_id' => $p->transaction_id,
                'paid_at' => $p->paid_at?->toIso8601String(),
                'created_at' => $p->created_at->toIso8601String(),
            ];
        });

        return $this->sendResponse($sanitized, 'Customer payment history retrieved');
    }
}

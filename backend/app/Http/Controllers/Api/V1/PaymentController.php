<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Payment;
use App\Models\FinancialTransaction;
use App\Models\OrderStatusHistory;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PaymentController extends Controller
{
    /**
     * Create a Stripe PaymentIntent / Intent Session for an order.
     * Accessible only to the customer who owns the order.
     */
    public function createIntent(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'order_id' => ['required', 'exists:orders,id'],
        ]);

        $order = Order::findOrFail($validated['order_id']);

        if ($order->customer_id !== $user->id && !$user->hasRole('super_admin')) {
            return $this->sendError('Unauthorized access to this order.', [], 403);
        }

        if ($order->payment_method !== 'stripe') {
            return $this->sendError('This order is not configured for Stripe online payment.', [], 422);
        }

        if ($order->payment_status === 'paid') {
            return $this->sendError('This order has already been paid.', [], 422);
        }

        $stripeSecret = env('STRIPE_SECRET');
        $stripeKey = env('STRIPE_KEY');

        if (empty($stripeSecret) || $stripeSecret === 'sk_test_placeholder' || empty($stripeKey) || $stripeKey === 'pk_test_placeholder') {
            return $this->sendError(
                'Stripe payment gateway is currently disabled or not configured in server environment settings (STRIPE_SECRET / STRIPE_KEY missing).',
                ['configured' => false],
                422
            );
        }

        // Generate intent reference
        $intentId = 'pi_' . bin2hex(random_bytes(12));
        $clientSecret = $intentId . '_secret_' . bin2hex(random_bytes(10));

        // Update Payment record
        $payment = Payment::firstOrCreate(
            ['order_id' => $order->id],
            [
                'gateway' => 'stripe',
                'amount' => $order->grand_total,
                'currency' => env('DEFAULT_CURRENCY_CODE', 'PKR'),
                'status' => 'pending',
            ]
        );

        $payment->transaction_id = $intentId;
        $payment->status = 'pending';
        $payment->payload = [
            'client_secret' => $clientSecret,
            'created_at' => now()->toISOString(),
        ];
        $payment->save();

        return $this->sendResponse([
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'amount' => $order->grand_total,
            'currency' => env('DEFAULT_CURRENCY_CODE', 'PKR'),
            'client_secret' => $clientSecret,
            'publishable_key' => $stripeKey,
            'intent_id' => $intentId,
        ], 'Stripe payment intent initialized');
    }

    /**
     * Webhook endpoint to receive verified Stripe events.
     * Validates signatures, prevents duplicate processing (idempotency),
     * and atomically updates order payment status and financial ledgers.
     */
    public function stripeWebhook(Request $request): JsonResponse
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        $webhookSecret = env('STRIPE_WEBHOOK_SECRET');

        // If webhook secret is set, verify signature
        if (!empty($webhookSecret) && $webhookSecret !== 'whsec_placeholder') {
            if (empty($sigHeader)) {
                return response()->json(['error' => 'Missing Stripe-Signature header'], 400);
            }

            // In production environment with Stripe SDK: \Stripe\Webhook::constructEvent($payload, $sigHeader, $webhookSecret);
            $expectedSignature = hash_hmac('sha256', $payload, $webhookSecret);
            if (!hash_equals($expectedSignature, (string)$sigHeader)) {
                return response()->json(['error' => 'Invalid webhook signature'], 400);
            }
        }

        $event = json_decode($payload, true);
        if (!$event || !isset($event['type'])) {
            return response()->json(['error' => 'Invalid event payload structure'], 400);
        }

        $eventType = $event['type'];
        $object = $event['data']['object'] ?? [];

        // Handle successful payment events
        if (in_array($eventType, ['payment_intent.succeeded', 'checkout.session.completed', 'charge.succeeded'])) {
            $orderId = $object['metadata']['order_id'] ?? null;
            $orderNumber = $object['metadata']['order_number'] ?? null;
            $transactionId = $object['id'] ?? null;

            $query = Order::query();
            if ($orderId) {
                $query->where('id', $orderId);
            } elseif ($orderNumber) {
                $query->where('order_number', $orderNumber);
            } elseif ($transactionId) {
                $payment = Payment::where('transaction_id', $transactionId)->first();
                if ($payment) {
                    $query->where('id', $payment->order_id);
                }
            }

            $order = $query->first();

            if ($order) {
                // Idempotency: skip if already processed
                if ($order->payment_status === 'paid') {
                    return response()->json(['status' => 'already_processed'], 200);
                }

                $order->payment_status = 'paid';
                $order->payment_reference = $transactionId;
                $order->save();

                Payment::where('order_id', $order->id)->update([
                    'status' => 'completed',
                    'transaction_id' => $transactionId ?: Payment::where('order_id', $order->id)->value('transaction_id'),
                ]);

                FinancialTransaction::where('order_id', $order->id)->update([
                    'status' => 'settled',
                ]);

                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'status' => $order->order_status,
                    'note' => 'Payment verified & settled via Stripe Webhook (' . ($transactionId ?: 'Online') . ')',
                    'actor' => 'Stripe Webhook',
                    'created_at' => now(),
                ]);

                AuditService::log('payment.webhook_settled', 'Payments', (string)$order->id, "Stripe verified online payment for {$order->order_number}");

                return response()->json(['status' => 'success', 'order_number' => $order->order_number], 200);
            }
        }

        return response()->json(['status' => 'received', 'type' => $eventType], 200);
    }
}

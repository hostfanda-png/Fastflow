<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\PaymentWebhookEvent;
use App\Models\FinancialTransaction;
use App\Models\OrderStatusHistory;
use App\Models\User;
use App\Services\Payment\PaymentGatewayInterface;
use App\Services\Payment\StripeGateway;
use App\Services\Payment\CashOnDeliveryGateway;
use App\Services\AuditService;
use Illuminate\Support\Facades\DB;
use Exception;

class PaymentService
{
    protected StripeGateway $stripeGateway;
    protected CashOnDeliveryGateway $codGateway;

    public function __construct(StripeGateway $stripeGateway, CashOnDeliveryGateway $codGateway)
    {
        $this->stripeGateway = $stripeGateway;
        $this->codGateway = $codGateway;
    }

    /**
     * Resolve appropriate payment gateway instance
     */
    public function getGateway(string $gateway): PaymentGatewayInterface
    {
        return match (strtolower($gateway)) {
            'stripe' => $this->stripeGateway,
            'cod', 'cash_on_delivery' => $this->codGateway,
            default => throw new Exception("Unsupported payment gateway: {$gateway}"),
        };
    }

    /**
     * Create or initialize a server-authoritative payment intent
     */
    public function createPaymentIntent(Order $order, User $customer): array
    {
        if ($order->customer_id !== $customer->id && !$customer->hasRole('super_admin')) {
            throw new Exception("Unauthorized access to this order.");
        }

        if ($order->payment_status === 'paid') {
            throw new Exception("This order has already been paid in full.");
        }

        $gateway = $this->getGateway($order->payment_method);
        $intentResult = $gateway->createPaymentIntent($order);

        if (!$intentResult['success']) {
            throw new Exception($intentResult['message'] ?? 'Failed to initialize payment gateway intent.');
        }

        return DB::transaction(function () use ($order, $customer, $intentResult) {
            $payment = Payment::firstOrNew(['order_id' => $order->id]);
            $payment->customer_id = $customer->id;
            $payment->gateway = $order->payment_method;
            $payment->payment_method = $order->payment_method;
            $payment->transaction_id = $intentResult['intent_id'] ?? null;
            $payment->gateway_payment_intent_id = $intentResult['intent_id'] ?? null;
            $payment->amount = (float)$order->grand_total;
            $payment->currency = $intentResult['currency'] ?? 'PKR';
            $payment->status = Payment::STATUS_PENDING;
            $payment->payload = [
                'client_secret' => $intentResult['client_secret'] ?? null,
                'created_at' => now()->toIso8601String(),
            ];
            $payment->save();

            AuditService::log('payment.intent_created', 'Payments', (string)$payment->id, "Initialized payment intent for order {$order->order_number}", $customer);

            return [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'amount' => (float)$order->grand_total,
                'currency' => $payment->currency,
                'client_secret' => $intentResult['client_secret'],
                'publishable_key' => $intentResult['publishable_key'],
                'intent_id' => $intentResult['intent_id'],
            ];
        });
    }

    /**
     * Handle incoming verified webhook payload with strict event idempotency
     * and mandatory amount + currency + transaction ID verification.
     */
    public function handleStripeWebhook(string $rawPayload, ?string $signature): array
    {
        $parsed = $this->stripeGateway->handleWebhook($rawPayload, $signature);

        if (!$parsed['verified']) {
            return [
                'status' => 'error',
                'http_code' => 400,
                'message' => $parsed['error'] ?? 'Webhook verification failed',
            ];
        }

        $eventId = $parsed['event_id'];
        $eventType = $parsed['event_type'];

        // 1. Idempotency Check on Webhook Event (Persisted Webhook-Event Table)
        $existingEvent = PaymentWebhookEvent::where('gateway', 'stripe')->where('event_id', $eventId)->first();
        if ($existingEvent && $existingEvent->status === 'processed') {
            return [
                'status' => 'already_processed',
                'http_code' => 200,
                'message' => "Event {$eventId} has already been processed.",
            ];
        }

        $webhookRecord = PaymentWebhookEvent::firstOrCreate(
            ['gateway' => 'stripe', 'event_id' => $eventId],
            [
                'event_type' => $eventType,
                'payload' => $parsed['data'] ?? [],
                'status' => 'pending',
            ]
        );

        // Process successful payment events
        if (in_array($eventType, ['payment_intent.succeeded', 'checkout.session.completed', 'charge.succeeded'])) {
            $orderId = $parsed['order_id'];
            $orderNumber = $parsed['order_number'];
            $transactionId = $parsed['transaction_id'];
            $stripeAmount = $parsed['amount'];
            $stripeCurrency = $parsed['currency'];

            return DB::transaction(function () use ($orderId, $orderNumber, $transactionId, $stripeAmount, $stripeCurrency, $webhookRecord, $eventType) {
                $query = Order::query()->lockForUpdate();

                if ($orderId) {
                    $query->where('id', $orderId);
                } elseif ($orderNumber) {
                    $query->where('order_number', $orderNumber);
                } elseif ($transactionId) {
                    $payment = Payment::where('transaction_id', $transactionId)->orWhere('gateway_payment_intent_id', $transactionId)->first();
                    if ($payment) {
                        $query->where('id', $payment->order_id);
                    }
                }

                $order = $query->first();

                if (!$order) {
                    $webhookRecord->status = 'failed';
                    $webhookRecord->error_message = 'Associated order not found';
                    $webhookRecord->save();

                    AuditService::log('payment.security_violation', 'Payments', '0', "Webhook event {$webhookRecord->event_id} failed: Associated order not found");
                    return ['status' => 'order_not_found', 'http_code' => 400];
                }

                $payment = Payment::where('order_id', $order->id)->lockForUpdate()->first();
                if (!$payment) {
                    $webhookRecord->status = 'failed';
                    $webhookRecord->error_message = 'Associated payment record not found';
                    $webhookRecord->save();

                    AuditService::log('payment.security_violation', 'Payments', (string)$order->id, "Webhook event {$webhookRecord->event_id} failed: Payment record missing for order {$order->order_number}");
                    return ['status' => 'payment_missing', 'http_code' => 400];
                }

                // Mandatory Verification 1: PaymentIntent / Transaction ID Verification
                if ($payment->gateway_payment_intent_id && $transactionId && $payment->gateway_payment_intent_id !== $transactionId) {
                    $webhookRecord->status = 'failed';
                    $webhookRecord->error_message = "PaymentIntent ID mismatch: expected {$payment->gateway_payment_intent_id}, got {$transactionId}";
                    $webhookRecord->save();

                    AuditService::log('payment.security_violation', 'Payments', (string)$order->id, "Webhook PaymentIntent ID mismatch on order {$order->order_number}");
                    return ['status' => 'intent_mismatch', 'http_code' => 400];
                }

                // Mandatory Verification 2: Amount Verification (Cents Precision)
                $expectedAmountCents = (int)round((float)$order->grand_total * 100);
                $receivedAmountCents = (int)round((float)$stripeAmount * 100);

                if ($receivedAmountCents !== $expectedAmountCents) {
                    $webhookRecord->status = 'failed';
                    $webhookRecord->error_message = "Amount mismatch: expected {$order->grand_total}, got {$stripeAmount}";
                    $webhookRecord->save();

                    AuditService::log('payment.security_violation', 'Payments', (string)$order->id, "Webhook amount mismatch on order {$order->order_number}: expected {$order->grand_total}, received {$stripeAmount}");
                    return ['status' => 'amount_mismatch', 'http_code' => 400];
                }

                // Mandatory Verification 3: Currency Verification
                $expectedCurrency = strtoupper($payment->currency ?: env('DEFAULT_CURRENCY_CODE', 'PKR'));
                if (strtoupper($stripeCurrency) !== $expectedCurrency) {
                    $webhookRecord->status = 'failed';
                    $webhookRecord->error_message = "Currency mismatch: expected {$expectedCurrency}, got {$stripeCurrency}";
                    $webhookRecord->save();

                    AuditService::log('payment.security_violation', 'Payments', (string)$order->id, "Webhook currency mismatch on order {$order->order_number}: expected {$expectedCurrency}, received {$stripeCurrency}");
                    return ['status' => 'currency_mismatch', 'http_code' => 400];
                }

                // Mandatory Verification 4: Customer Ownership
                if ($payment->customer_id && $order->customer_id && (int)$payment->customer_id !== (int)$order->customer_id) {
                    $webhookRecord->status = 'failed';
                    $webhookRecord->error_message = "Customer ownership mismatch on order";
                    $webhookRecord->save();

                    AuditService::log('payment.security_violation', 'Payments', (string)$order->id, "Customer ownership mismatch on order {$order->order_number}");
                    return ['status' => 'customer_mismatch', 'http_code' => 400];
                }

                // If order is already paid, record event as processed idempotently
                if ($order->payment_status === 'paid' && $payment->status === Payment::STATUS_COMPLETED) {
                    $webhookRecord->status = 'processed';
                    $webhookRecord->processed_at = now();
                    $webhookRecord->save();

                    return ['status' => 'already_paid', 'http_code' => 200];
                }

                // Mark order paid
                $order->payment_status = 'paid';
                $order->payment_reference = $transactionId ?: $order->payment_reference;
                $order->save();

                // Update Payment entity
                $payment->status = Payment::STATUS_COMPLETED;
                $payment->paid_at = now();
                $payment->transaction_id = $transactionId ?: $payment->transaction_id;
                $payment->save();

                // Update Financial Ledger
                FinancialTransaction::where('order_id', $order->id)->update([
                    'status' => 'settled',
                ]);

                // Append status history
                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'status' => $order->order_status,
                    'note' => "Stripe online payment verified & settled ({$transactionId})",
                    'actor' => 'Stripe Webhook',
                    'created_at' => now(),
                ]);

                AuditService::log('payment.webhook_settled', 'Payments', (string)$order->id, "Stripe verified online payment for order {$order->order_number}");

                $webhookRecord->status = 'processed';
                $webhookRecord->processed_at = now();
                $webhookRecord->save();

                return [
                    'status' => 'success',
                    'http_code' => 200,
                    'order_number' => $order->order_number,
                ];
            });
        }

        // Handle failure events
        if (in_array($eventType, ['payment_intent.payment_failed', 'charge.failed'])) {
            $orderId = $parsed['order_id'];
            if ($orderId) {
                Payment::where('order_id', $orderId)->update([
                    'status' => Payment::STATUS_FAILED,
                    'failure_message' => $parsed['data']['last_payment_error']['message'] ?? 'Payment failed on gateway',
                ]);
            }
        }

        $webhookRecord->status = 'processed';
        $webhookRecord->processed_at = now();
        $webhookRecord->save();

        return ['status' => 'ignored_event', 'http_code' => 200, 'type' => $eventType];
    }

    /**
     * Mark Cash on Delivery payment collected by authorized staff/courier/admin
     */
    public function collectCodPayment(Order $order, User $actor, ?string $reference = null): Payment
    {
        return DB::transaction(function () use ($order, $actor, $reference) {
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();

            // Strict payment_method validation: MUST be COD
            if (strtolower($lockedOrder->payment_method) !== 'cod') {
                throw new Exception("Cannot collect Cash on Delivery payment for an order with payment method '{$lockedOrder->payment_method}'. Only Cash on Delivery orders can be collected via the COD endpoint.");
            }

            if ($lockedOrder->payment_status === 'paid') {
                throw new Exception("Order #{$lockedOrder->order_number} has already been marked as paid.");
            }

            if (in_array($lockedOrder->order_status, ['cancelled', 'refunded'])) {
                throw new Exception("Cannot collect payment for an order in '{$lockedOrder->order_status}' status.");
            }

            $payment = Payment::firstOrNew(['order_id' => $lockedOrder->id]);
            if ($payment->exists && $payment->status === Payment::STATUS_COMPLETED) {
                throw new Exception("Payment record for Order #{$lockedOrder->order_number} is already completed.");
            }

            $lockedOrder->payment_status = 'paid';
            $lockedOrder->payment_reference = $reference ?: ('COD-COLLECTED-' . strtoupper(bin2hex(random_bytes(4))));
            $lockedOrder->save();

            $payment->customer_id = $lockedOrder->customer_id;
            $payment->gateway = 'cod';
            $payment->payment_method = 'cod';
            $payment->amount = (float)$lockedOrder->grand_total;
            $payment->status = Payment::STATUS_COMPLETED;
            $payment->paid_at = now();
            $payment->transaction_id = $lockedOrder->payment_reference;
            $payment->save();

            FinancialTransaction::where('order_id', $lockedOrder->id)->update([
                'status' => 'settled',
            ]);

            OrderStatusHistory::create([
                'order_id' => $lockedOrder->id,
                'status' => $lockedOrder->order_status,
                'note' => "Cash on Delivery payment collected and verified by {$actor->name}",
                'actor' => $actor->name,
                'created_at' => now(),
            ]);

            AuditService::log('payment.cod_collected', 'Payments', (string)$lockedOrder->id, "Collected cash payment of PKR {$lockedOrder->grand_total} for {$lockedOrder->order_number}", $actor);

            return $payment;
        });
    }

    /**
     * Process full or partial refund with balance validation, concurrency locking & idempotency protection
     */
    public function processRefund(Order $order, float $amount, string $reason, User $actor, ?string $idempotencyKey = null): Refund
    {
        if ($amount <= 0) {
            throw new Exception("Refund amount must be greater than zero.");
        }

        return DB::transaction(function () use ($order, $amount, $reason, $actor, $idempotencyKey) {
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();

            if ($lockedOrder->payment_status !== 'paid' && $lockedOrder->payment_status !== 'partially_refunded') {
                throw new Exception("Order must be paid before a refund can be issued.");
            }

            $payment = Payment::where('order_id', $lockedOrder->id)->lockForUpdate()->first();
            $paidAmount = (float)($payment ? $payment->amount : $lockedOrder->grand_total);
            
            $alreadyRefunded = (float)Refund::where('order_id', $lockedOrder->id)
                ->whereIn('status', [Refund::STATUS_COMPLETED, Refund::STATUS_PROCESSING])
                ->sum('amount');

            $maxRefundable = max(0.00, round($paidAmount - $alreadyRefunded, 2));

            if (round($amount, 2) > $maxRefundable) {
                throw new Exception("Requested refund of PKR {$amount} exceeds remaining refundable balance of PKR {$maxRefundable}.");
            }

            $alreadyRefundedCount = Refund::where('order_id', $lockedOrder->id)
                ->whereIn('status', [Refund::STATUS_COMPLETED, Refund::STATUS_PROCESSING])
                ->count();
            $nextSeq = $alreadyRefundedCount + 1;
            $amountCents = (int)round($amount * 100);
            $computedIdempotencyKey = $idempotencyKey ?: "refund_ord_{$lockedOrder->id}_seq_{$nextSeq}_amt_{$amountCents}";

            // Dispatch to gateway with deterministic idempotency key
            $gateway = $this->getGateway($lockedOrder->payment_method);
            $gatewayResult = $gateway->refund($lockedOrder, $amount, $reason, $computedIdempotencyKey);

            if (!$gatewayResult['success']) {
                AuditService::log('payment.refund_failed', 'Payments', (string)$lockedOrder->id, "Refund attempt of PKR {$amount} failed: " . ($gatewayResult['message'] ?? 'Unknown error'), $actor);
                throw new Exception("Payment gateway rejected refund: " . ($gatewayResult['message'] ?? 'Unknown error'));
            }

            $refundNumber = 'REF-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));

            $refund = Refund::create([
                'refund_number' => $refundNumber,
                'order_id' => $lockedOrder->id,
                'payment_id' => $payment?->id,
                'customer_id' => $lockedOrder->customer_id,
                'amount' => $amount,
                'reason' => $reason,
                'status' => Refund::STATUS_COMPLETED,
                'gateway_refund_id' => $gatewayResult['refund_id'] ?? null,
                'refund_actor' => $actor->role ?? 'super_admin',
                'processed_by' => $actor->id,
                'processed_at' => now(),
                'metadata' => [
                    'gateway_message' => $gatewayResult['message'] ?? null,
                    'actor_name' => $actor->name,
                    'idempotency_key' => $computedIdempotencyKey,
                ],
            ]);

            // Update payment record
            $totalNowRefunded = round($alreadyRefunded + $amount, 2);
            if ($payment) {
                $payment->refunded_amount = $totalNowRefunded;
                if ($totalNowRefunded >= $paidAmount) {
                    $payment->status = Payment::STATUS_REFUNDED;
                } else {
                    $payment->status = Payment::STATUS_PARTIALLY_REFUNDED;
                }
                $payment->save();
            }

            // Update order status: full refund marks order refunded; partial refund marks payment_status partially_refunded
            if ($totalNowRefunded >= $paidAmount) {
                $lockedOrder->payment_status = 'refunded';
                $lockedOrder->order_status = 'refunded';
                $lockedOrder->save();
            } else {
                $lockedOrder->payment_status = 'partially_refunded';
                $lockedOrder->save();
            }

            // Record Directional Debit Ledger Entry
            FinancialTransaction::create([
                'order_id' => $lockedOrder->id,
                'restaurant_id' => $lockedOrder->restaurant_id,
                'transaction_type' => 'refund',
                'order_number' => $lockedOrder->order_number,
                'gross_amount' => $amount,
                'direction' => 'debit',
                'platform_commission' => 0.00,
                'restaurant_payout' => 0.00,
                'delivery_fee' => 0.00,
                'rider_payout' => 0.00,
                'gateway_fee' => 0.00,
                'reference' => $refundNumber,
                'metadata' => ['reason' => $reason, 'refund_id' => $refund->id, 'idempotency_key' => $computedIdempotencyKey],
                'status' => 'settled',
            ]);

            OrderStatusHistory::create([
                'order_id' => $lockedOrder->id,
                'status' => $lockedOrder->order_status,
                'note' => "Refund of PKR {$amount} processed by {$actor->name}. Reason: {$reason}",
                'actor' => $actor->name,
                'created_at' => now(),
            ]);

            AuditService::log('payment.refund_processed', 'Refunds', (string)$refund->id, "Processed refund of PKR {$amount} for order {$lockedOrder->order_number}", $actor);

            return $refund;
        });
    }
}

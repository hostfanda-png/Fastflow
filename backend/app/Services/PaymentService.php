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
     * Process full or partial refund with balance validation, concurrency locking & persistent idempotency protection.
     *
     * Implements a persistent, database-backed logical refund operation:
     * 1. Pre-flight transaction locks Order/Payment, checks for existing idempotent operation, or creates/reuses a processing Refund record with a stable idempotency_key BEFORE calling the gateway.
     * 2. Executes the external gateway refund call using the persisted idempotency_key outside the DB lock.
     * 3. Finalizes the Refund record, Payment status, Order status, and FinancialTransaction ledger idempotently.
     */
    public function processRefund(Order $order, float $amount, string $reason, User $actor, ?string $idempotencyKey = null): Refund
    {
        if ($amount <= 0) {
            throw new Exception("Refund amount must be greater than zero.");
        }

        $normalizedReason = trim($reason);
        $roundedAmount = round($amount, 2);

        // Phase 1: Persistent pre-gateway reservation & idempotency check
        $operation = DB::transaction(function () use ($order, $roundedAmount, $normalizedReason, $actor, $idempotencyKey) {
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();
            $payment = Payment::where('order_id', $lockedOrder->id)->lockForUpdate()->first();

            // 1. Check explicit client-provided Idempotency-Key first
            if (!empty($idempotencyKey)) {
                $existingByKey = Refund::where('idempotency_key', $idempotencyKey)->lockForUpdate()->first();

                if ($existingByKey) {
                    // Protect against cross-order or cross-tenant reuse of Idempotency-Key
                    if ((int)$existingByKey->order_id !== (int)$lockedOrder->id) {
                        throw new Exception("Idempotency-Key has already been used for another order.");
                    }

                    // Protect against parameter mismatch on the same Idempotency-Key
                    if (round((float)$existingByKey->amount, 2) !== $roundedAmount) {
                        throw new Exception("Idempotency-Key cannot be reused with a different refund amount.");
                    }

                    // If already completed, ensure local ledger/order/payment state is finalized and return idempotently
                    if ($existingByKey->status === Refund::STATUS_COMPLETED) {
                        $this->ensureRefundFinalized($lockedOrder, $payment, $existingByKey, $actor);
                        return ['completed' => true, 'refund' => $existingByKey->fresh()];
                    }

                    // If pending/processing or failed (e.g. previous attempt timed out or failed local finalization),
                    // transition to processing and reuse the exact same Refund record & idempotency_key
                    $existingByKey->status = Refund::STATUS_PROCESSING;
                    $existingByKey->reason = $normalizedReason;
                    $existingByKey->save();

                    return ['completed' => false, 'refund' => $existingByKey, 'order' => $lockedOrder];
                }
            } else {
                // 2. Server-side fallback when client does not provide an Idempotency-Key:
                // Check if there is an existing in-flight (pending/processing) refund for the same order, amount, and reason
                // so a retry after a gateway timeout/interruption recovers the existing operation instead of creating a new one.
                $inFlight = Refund::where('order_id', $lockedOrder->id)
                    ->whereIn('status', [Refund::STATUS_PENDING, Refund::STATUS_PROCESSING])
                    ->where('reason', $normalizedReason)
                    ->lockForUpdate()
                    ->get()
                    ->first(fn (Refund $r) => round((float)$r->amount, 2) === $roundedAmount);

                if ($inFlight) {
                    if (empty($inFlight->idempotency_key)) {
                        $amountCents = (int)round($roundedAmount * 100);
                        $inFlight->idempotency_key = "refund_ord_{$lockedOrder->id}_op_{$inFlight->id}_amt_{$amountCents}";
                    }
                    $inFlight->status = Refund::STATUS_PROCESSING;
                    $inFlight->save();

                    return ['completed' => false, 'refund' => $inFlight, 'order' => $lockedOrder];
                }
            }

            // 3. Validate order payment status and remaining refundable balance for a new refund operation
            if ($lockedOrder->payment_status !== 'paid' && $lockedOrder->payment_status !== 'partially_refunded') {
                throw new Exception("Order must be paid before a refund can be issued.");
            }

            $paidAmount = (float)($payment ? $payment->amount : $lockedOrder->grand_total);

            // Sum both completed and processing refunds to prevent concurrent over-refunding
            $alreadyRefunded = (float)Refund::where('order_id', $lockedOrder->id)
                ->whereIn('status', [Refund::STATUS_COMPLETED, Refund::STATUS_PROCESSING])
                ->sum('amount');

            $maxRefundable = max(0.00, round($paidAmount - $alreadyRefunded, 2));

            if ($roundedAmount > $maxRefundable) {
                throw new Exception("Requested refund of PKR {$roundedAmount} exceeds remaining refundable balance of PKR {$maxRefundable}.");
            }

            $refundNumber = 'REF-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(4)));

            // Create persistent Refund operation in STATUS_PROCESSING BEFORE calling external gateway
            $refund = Refund::create([
                'refund_number' => $refundNumber,
                'order_id' => $lockedOrder->id,
                'payment_id' => $payment?->id,
                'customer_id' => $lockedOrder->customer_id,
                'amount' => $roundedAmount,
                'reason' => $normalizedReason,
                'status' => Refund::STATUS_PROCESSING,
                'gateway_refund_id' => null,
                'idempotency_key' => $idempotencyKey, // Temporary null if server-generated below
                'refund_actor' => $actor->role ?? 'super_admin',
                'processed_by' => $actor->id,
                'processed_at' => null,
                'metadata' => [
                    'actor_name' => $actor->name,
                ],
            ]);

            // Assign a persistent, unique operation-bound idempotency key if client did not provide one
            if (empty($refund->idempotency_key)) {
                $amountCents = (int)round($roundedAmount * 100);
                $computedKey = "refund_ord_{$lockedOrder->id}_op_{$refund->id}_amt_{$amountCents}";
                $refund->idempotency_key = $computedKey;
                $metadata = $refund->metadata ?? [];
                $metadata['idempotency_key'] = $computedKey;
                $refund->metadata = $metadata;
                $refund->save();
            } else {
                $metadata = $refund->metadata ?? [];
                $metadata['idempotency_key'] = $refund->idempotency_key;
                $refund->metadata = $metadata;
                $refund->save();
            }

            return ['completed' => false, 'refund' => $refund, 'order' => $lockedOrder];
        });

        // Short-circuit if this idempotent operation was already completed
        if ($operation['completed']) {
            return $operation['refund'];
        }

        /** @var Refund $pendingRefund */
        $pendingRefund = $operation['refund'];
        /** @var Order $targetOrder */
        $targetOrder = $operation['order'];
        $persistedKey = $pendingRefund->idempotency_key;

        // Phase 2: Dispatch to external gateway using the persisted idempotency key
        $gateway = $this->getGateway($targetOrder->payment_method);
        $gatewayResult = $gateway->refund($targetOrder, $roundedAmount, $normalizedReason, $persistedKey);

        if (!$gatewayResult['success']) {
            DB::transaction(function () use ($pendingRefund, $targetOrder, $roundedAmount, $gatewayResult, $actor) {
                $lockedRefund = Refund::where('id', $pendingRefund->id)->lockForUpdate()->first();
                if ($lockedRefund && $lockedRefund->status !== Refund::STATUS_COMPLETED) {
                    $lockedRefund->status = Refund::STATUS_FAILED;
                    $meta = $lockedRefund->metadata ?? [];
                    $meta['gateway_error'] = $gatewayResult['message'] ?? 'Unknown error';
                    $meta['failed_at'] = now()->toIso8601String();
                    $lockedRefund->metadata = $meta;
                    $lockedRefund->save();
                }

                AuditService::log(
                    'payment.refund_failed',
                    'Payments',
                    (string)$targetOrder->id,
                    "Refund attempt of PKR {$roundedAmount} failed: " . ($gatewayResult['message'] ?? 'Unknown error'),
                    $actor
                );
            });

            throw new Exception("Payment gateway rejected refund: " . ($gatewayResult['message'] ?? 'Unknown error'));
        }

        // Phase 3: Finalize the refund operation idempotently in database
        return DB::transaction(function () use ($targetOrder, $pendingRefund, $gatewayResult, $actor) {
            $lockedOrder = Order::where('id', $targetOrder->id)->lockForUpdate()->firstOrFail();
            $payment = Payment::where('order_id', $lockedOrder->id)->lockForUpdate()->first();
            $lockedRefund = Refund::where('id', $pendingRefund->id)->lockForUpdate()->firstOrFail();

            $lockedRefund->gateway_refund_id = $gatewayResult['refund_id'] ?? $lockedRefund->gateway_refund_id;
            $lockedRefund->status = Refund::STATUS_COMPLETED;
            $lockedRefund->processed_at = $lockedRefund->processed_at ?? now();

            $meta = $lockedRefund->metadata ?? [];
            $meta['gateway_message'] = $gatewayResult['message'] ?? null;
            $meta['actor_name'] = $actor->name;
            $meta['idempotency_key'] = $lockedRefund->idempotency_key;
            $lockedRefund->metadata = $meta;
            $lockedRefund->save();

            $this->ensureRefundFinalized($lockedOrder, $payment, $lockedRefund, $actor);

            return $lockedRefund->fresh();
        });
    }

    /**
     * Ensure Payment, Order, FinancialTransaction ledger, and OrderStatusHistory
     * reflect the completed Refund without duplicating records on retry recovery.
     */
    protected function ensureRefundFinalized(Order $lockedOrder, ?Payment $payment, Refund $refund, User $actor): void
    {
        $paidAmount = (float)($payment ? $payment->amount : $lockedOrder->grand_total);

        $totalCompletedRefunds = round(
            (float)Refund::where('order_id', $lockedOrder->id)
                ->where('status', Refund::STATUS_COMPLETED)
                ->sum('amount'),
            2
        );

        if ($payment) {
            $payment->refunded_amount = $totalCompletedRefunds;
            if ($totalCompletedRefunds >= $paidAmount) {
                $payment->status = Payment::STATUS_REFUNDED;
            } elseif ($totalCompletedRefunds > 0) {
                $payment->status = Payment::STATUS_PARTIALLY_REFUNDED;
            }
            $payment->save();
        }

        if ($totalCompletedRefunds >= $paidAmount) {
            $lockedOrder->payment_status = 'refunded';
            $lockedOrder->order_status = 'refunded';
            $lockedOrder->save();
        } elseif ($totalCompletedRefunds > 0) {
            $lockedOrder->payment_status = 'partially_refunded';
            $lockedOrder->save();
        }

        // Prevent duplicate FinancialTransaction debit entries for the same refund
        $ledgerExists = FinancialTransaction::where('order_id', $lockedOrder->id)
            ->where('transaction_type', 'refund')
            ->where('reference', $refund->refund_number)
            ->exists();

        if (!$ledgerExists) {
            FinancialTransaction::create([
                'order_id' => $lockedOrder->id,
                'restaurant_id' => $lockedOrder->restaurant_id,
                'transaction_type' => 'refund',
                'order_number' => $lockedOrder->order_number,
                'gross_amount' => (float)$refund->amount,
                'direction' => 'debit',
                'platform_commission' => 0.00,
                'restaurant_payout' => 0.00,
                'delivery_fee' => 0.00,
                'rider_payout' => 0.00,
                'gateway_fee' => 0.00,
                'reference' => $refund->refund_number,
                'metadata' => [
                    'reason' => $refund->reason,
                    'refund_id' => $refund->id,
                    'idempotency_key' => $refund->idempotency_key,
                ],
                'status' => 'settled',
            ]);

            OrderStatusHistory::create([
                'order_id' => $lockedOrder->id,
                'status' => $lockedOrder->order_status,
                'note' => "Refund of PKR {$refund->amount} processed by {$actor->name}. Reason: {$refund->reason}",
                'actor' => $actor->name,
                'created_at' => now(),
            ]);

            AuditService::log(
                'payment.refund_processed',
                'Refunds',
                (string)$refund->id,
                "Processed refund of PKR {$refund->amount} for order {$lockedOrder->order_number}",
                $actor
            );
        }
    }
}

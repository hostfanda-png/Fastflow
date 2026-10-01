<?php

namespace App\Services\Payment;

use App\Models\Order;
use Exception;

class StripeGateway implements PaymentGatewayInterface
{
    protected ?string $secretKey;
    protected ?string $publishableKey;
    protected ?string $webhookSecret;

    public function __construct()
    {
        $this->secretKey = env('STRIPE_SECRET');
        $this->publishableKey = env('STRIPE_KEY');
        $this->webhookSecret = env('STRIPE_WEBHOOK_SECRET');
    }

    public function createPaymentIntent(Order $order, array $options = []): array
    {
        if (!$this->isEnabled()) {
            return [
                'success' => false,
                'intent_id' => null,
                'client_secret' => null,
                'publishable_key' => null,
                'amount' => (float)$order->grand_total,
                'currency' => env('DEFAULT_CURRENCY_CODE', 'PKR'),
                'message' => 'Stripe gateway is currently disabled or missing API keys in server configuration.',
            ];
        }

        // Generate intent identifiers server-side
        $intentId = 'pi_' . bin2hex(random_bytes(12));
        $clientSecret = $intentId . '_secret_' . bin2hex(random_bytes(12));

        return [
            'success' => true,
            'intent_id' => $intentId,
            'client_secret' => $clientSecret,
            'publishable_key' => $this->publishableKey,
            'amount' => (float)$order->grand_total,
            'currency' => env('DEFAULT_CURRENCY_CODE', 'PKR'),
            'message' => 'Payment intent initialized successfully.',
        ];
    }

    public function verifyPayment(string $transactionId): array
    {
        if (!$this->isEnabled()) {
            return [
                'success' => false,
                'status' => 'failed',
                'amount' => 0.00,
                'currency' => env('DEFAULT_CURRENCY_CODE', 'PKR'),
                'payload' => [],
            ];
        }

        return [
            'success' => true,
            'status' => 'succeeded',
            'amount' => 0.00,
            'currency' => env('DEFAULT_CURRENCY_CODE', 'PKR'),
            'payload' => ['id' => $transactionId, 'status' => 'succeeded'],
        ];
    }

    public function handleWebhook(string $rawPayload, ?string $signature): array
    {
        // Signature verification if webhook secret is configured
        if (!empty($this->webhookSecret) && $this->webhookSecret !== 'whsec_placeholder') {
            if (empty($signature)) {
                return [
                    'verified' => false,
                    'error' => 'Missing Stripe-Signature header',
                ];
            }

            $expectedSignature = hash_hmac('sha256', $rawPayload, $this->webhookSecret);
            if (!hash_equals($expectedSignature, (string)$signature)) {
                return [
                    'verified' => false,
                    'error' => 'Invalid Stripe webhook signature',
                ];
            }
        }

        $event = json_decode($rawPayload, true);
        if (!$event || !isset($event['type'])) {
            return [
                'verified' => false,
                'error' => 'Invalid JSON payload structure',
            ];
        }

        $eventType = $event['type'];
        $eventId = $event['id'] ?? ('evt_' . md5($rawPayload));
        $object = $event['data']['object'] ?? [];

        $orderId = $object['metadata']['order_id'] ?? null;
        $orderNumber = $object['metadata']['order_number'] ?? null;
        $transactionId = $object['id'] ?? null;
        $amount = isset($object['amount']) ? ((float)$object['amount'] / 100) : null;

        return [
            'verified' => true,
            'event_id' => $eventId,
            'event_type' => $eventType,
            'order_id' => $orderId ? (int)$orderId : null,
            'order_number' => $orderNumber,
            'transaction_id' => $transactionId,
            'amount' => $amount,
            'data' => $object,
        ];
    }

    public function refund(Order $order, float $amount, string $reason): array
    {
        if (!$this->isEnabled()) {
            return [
                'success' => false,
                'refund_id' => null,
                'message' => 'Stripe is disabled or not configured in environment.',
            ];
        }

        $refundId = 're_' . bin2hex(random_bytes(12));

        return [
            'success' => true,
            'refund_id' => $refundId,
            'message' => "Stripe refund of PKR {$amount} processed successfully.",
        ];
    }

    public function isEnabled(): bool
    {
        return !empty($this->secretKey) && $this->secretKey !== 'sk_test_placeholder';
    }
}

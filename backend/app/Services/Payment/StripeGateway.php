<?php

namespace App\Services\Payment;

use App\Models\Order;
use App\Models\Payment;
use Exception;

class StripeGateway implements PaymentGatewayInterface
{
    protected ?string $secretKey;
    protected ?string $publishableKey;
    protected ?string $webhookSecret;
    protected string $currency;

    public function __construct()
    {
        $this->secretKey = env('STRIPE_SECRET_KEY', env('STRIPE_SECRET'));
        $this->publishableKey = env('STRIPE_PUBLISHABLE_KEY', env('STRIPE_KEY'));
        $this->webhookSecret = env('STRIPE_WEBHOOK_SECRET');
        $this->currency = strtoupper(env('STRIPE_CURRENCY', env('DEFAULT_CURRENCY_CODE', 'PKR')));
    }

    /**
     * Determine if Stripe credentials are validly configured in environment.
     */
    public function isConfigured(): bool
    {
        return !empty($this->secretKey) 
            && !empty($this->publishableKey)
            && !empty($this->webhookSecret)
            && !str_starts_with($this->secretKey, 'sk_test_placeholder')
            && !str_starts_with($this->secretKey, 'sk_placeholder')
            && !str_starts_with($this->publishableKey, 'pk_test_placeholder')
            && !str_starts_with($this->webhookSecret, 'whsec_placeholder');
    }

    public function isEnabled(): bool
    {
        return $this->isConfigured();
    }

    /**
     * Create a REAL Stripe PaymentIntent.
     * Never generates synthetic/fake pi_xxx or client_secret.
     */
    public function createPaymentIntent(Order $order, array $options = []): array
    {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'intent_id' => null,
                'client_secret' => null,
                'publishable_key' => null,
                'amount' => (float)$order->grand_total,
                'currency' => $this->currency,
                'message' => 'Stripe gateway is currently disabled or missing API keys in server configuration. Configure STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, and STRIPE_WEBHOOK_SECRET to enable online card payments.',
            ];
        }

        // Amount in smallest currency unit (e.g. cents)
        $amountInCents = (int)round((float)$order->grand_total * 100);

        try {
            if (class_exists('\Stripe\StripeClient')) {
                $stripe = new \Stripe\StripeClient($this->secretKey);
                $intent = $stripe->paymentIntents->create([
                    'amount' => $amountInCents,
                    'currency' => strtolower($this->currency),
                    'metadata' => [
                        'order_id' => (string)$order->id,
                        'order_number' => $order->order_number,
                        'customer_id' => (string)$order->customer_id,
                    ],
                    'description' => "Order #{$order->order_number} at Fastflow",
                ]);

                return [
                    'success' => true,
                    'intent_id' => $intent->id,
                    'client_secret' => $intent->client_secret,
                    'publishable_key' => $this->publishableKey,
                    'amount' => (float)$order->grand_total,
                    'currency' => $this->currency,
                    'message' => 'Payment intent created successfully via Stripe API.',
                ];
            } else {
                // Direct HTTPS API call to Stripe API endpoint
                $postData = [
                    'amount' => $amountInCents,
                    'currency' => strtolower($this->currency),
                    'description' => "Order #{$order->order_number} at Fastflow",
                    'metadata[order_id]' => (string)$order->id,
                    'metadata[order_number]' => $order->order_number,
                    'metadata[customer_id]' => (string)$order->customer_id,
                ];

                $response = $this->executeStripeRequest('POST', 'https://api.stripe.com/v1/payment_intents', $postData);
                if (isset($response['id']) && isset($response['client_secret'])) {
                    return [
                        'success' => true,
                        'intent_id' => $response['id'],
                        'client_secret' => $response['client_secret'],
                        'publishable_key' => $this->publishableKey,
                        'amount' => (float)$order->grand_total,
                        'currency' => $this->currency,
                        'message' => 'Payment intent created successfully via Stripe API.',
                    ];
                }

                $errorMsg = $response['error']['message'] ?? 'Stripe API communication failed';
                return [
                    'success' => false,
                    'intent_id' => null,
                    'client_secret' => null,
                    'publishable_key' => null,
                    'amount' => (float)$order->grand_total,
                    'currency' => $this->currency,
                    'message' => "Stripe API error: {$errorMsg}",
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'intent_id' => null,
                'client_secret' => null,
                'publishable_key' => null,
                'amount' => (float)$order->grand_total,
                'currency' => $this->currency,
                'message' => 'Stripe API error: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Verify payment status directly against Stripe API
     */
    public function verifyPayment(string $transactionId): array
    {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'status' => 'unconfigured',
                'amount' => 0.00,
                'currency' => $this->currency,
                'payload' => [],
            ];
        }

        try {
            if (class_exists('\Stripe\StripeClient')) {
                $stripe = new \Stripe\StripeClient($this->secretKey);
                $intent = $stripe->paymentIntents->retrieve($transactionId);
                return [
                    'success' => true,
                    'status' => $intent->status,
                    'amount' => (float)($intent->amount / 100),
                    'currency' => strtoupper($intent->currency),
                    'payload' => $intent->toArray(),
                ];
            }

            $response = $this->executeStripeRequest('GET', "https://api.stripe.com/v1/payment_intents/{$transactionId}");
            if (isset($response['id'])) {
                return [
                    'success' => true,
                    'status' => $response['status'] ?? 'unknown',
                    'amount' => (float)(($response['amount'] ?? 0) / 100),
                    'currency' => strtoupper($response['currency'] ?? $this->currency),
                    'payload' => $response,
                ];
            }

            return [
                'success' => false,
                'status' => 'failed',
                'amount' => 0.00,
                'currency' => $this->currency,
                'payload' => $response,
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'status' => 'error',
                'amount' => 0.00,
                'currency' => $this->currency,
                'payload' => ['error' => $e->getMessage()],
            ];
        }
    }

    /**
     * Official Stripe Webhook Verification.
     * Verifies raw request body, Stripe-Signature header, and STRIPE_WEBHOOK_SECRET.
     * Rejects invalid or missing signatures with 400.
     */
    public function handleWebhook(string $rawPayload, ?string $signature): array
    {
        if (empty($signature)) {
            return [
                'verified' => false,
                'error' => 'Missing Stripe-Signature header',
            ];
        }

        if (empty($this->webhookSecret) || $this->webhookSecret === 'whsec_placeholder') {
            return [
                'verified' => false,
                'error' => 'Stripe webhook secret is not configured on server',
            ];
        }

        $isValidSignature = false;

        // 1. Use official Stripe SDK if present
        if (class_exists('\Stripe\Webhook')) {
            try {
                \Stripe\Webhook::constructEvent($rawPayload, $signature, $this->webhookSecret, 300);
                $isValidSignature = true;
            } catch (Exception $e) {
                return [
                    'verified' => false,
                    'error' => 'Stripe webhook signature verification failed: ' . $e->getMessage(),
                ];
            }
        } else {
            // 2. Official Stripe Signature Verification Algorithm standard implementation:
            // Header format: t=timestamp,v1=signature,v0=...
            $timestamp = null;
            $signatures = [];
            $items = explode(',', $signature);

            foreach ($items as $item) {
                $parts = explode('=', trim($item), 2);
                if (count($parts) === 2) {
                    $key = trim($parts[0]);
                    $val = trim($parts[1]);
                    if ($key === 't') {
                        $timestamp = (int)$val;
                    } elseif ($key === 'v1') {
                        $signatures[] = $val;
                    }
                }
            }

            if (!$timestamp || empty($signatures)) {
                return [
                    'verified' => false,
                    'error' => 'Malformed Stripe-Signature header format',
                ];
            }

            // Verify timestamp tolerance (300 seconds / 5 minutes)
            if (abs(time() - $timestamp) > 300) {
                return [
                    'verified' => false,
                    'error' => 'Stripe webhook timestamp outside tolerance zone',
                ];
            }

            // Signed payload = timestamp . "." . rawPayload
            $signedPayload = "{$timestamp}.{$rawPayload}";
            $expectedSignature = hash_hmac('sha256', $signedPayload, $this->webhookSecret);

            foreach ($signatures as $sig) {
                if (hash_equals($expectedSignature, $sig)) {
                    $isValidSignature = true;
                    break;
                }
            }
        }

        if (!$isValidSignature) {
            return [
                'verified' => false,
                'error' => 'Invalid Stripe webhook signature',
            ];
        }

        $event = json_decode($rawPayload, true);
        if (!$event || !isset($event['type']) || !isset($event['id'])) {
            return [
                'verified' => false,
                'error' => 'Invalid JSON webhook payload structure',
            ];
        }

        $eventType = $event['type'];
        $eventId = $event['id'];
        $object = $event['data']['object'] ?? [];

        $orderId = $object['metadata']['order_id'] ?? null;
        $orderNumber = $object['metadata']['order_number'] ?? null;
        $transactionId = $object['id'] ?? null;
        $currency = isset($object['currency']) ? strtoupper($object['currency']) : $this->currency;
        $amount = isset($object['amount']) ? ((float)$object['amount'] / 100) : null;

        return [
            'verified' => true,
            'event_id' => $eventId,
            'event_type' => $eventType,
            'order_id' => $orderId ? (int)$orderId : null,
            'order_number' => $orderNumber,
            'transaction_id' => $transactionId,
            'amount' => $amount,
            'currency' => $currency,
            'data' => $object,
        ];
    }

    /**
     * Real Stripe refund execution.
     * Never generates synthetic re_xxx locally.
     */
    public function refund(Order $order, float $amount, string $reason): array
    {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'refund_id' => null,
                'message' => 'Stripe is disabled or not configured in environment. Set STRIPE_SECRET_KEY to enable online card refunds.',
            ];
        }

        $payment = Payment::where('order_id', $order->id)->first();
        $paymentIntentId = $payment?->gateway_payment_intent_id ?: $payment?->transaction_id;

        if (!$paymentIntentId) {
            return [
                'success' => false,
                'refund_id' => null,
                'message' => "Order #{$order->order_number} has no recorded Stripe PaymentIntent ID to refund.",
            ];
        }

        $amountInCents = (int)round($amount * 100);

        try {
            if (class_exists('\Stripe\StripeClient')) {
                $stripe = new \Stripe\StripeClient($this->secretKey);
                $stripeRefund = $stripe->refunds->create([
                    'payment_intent' => $paymentIntentId,
                    'amount' => $amountInCents,
                    'metadata' => [
                        'order_id' => (string)$order->id,
                        'order_number' => $order->order_number,
                        'reason' => $reason,
                    ],
                ]);

                return [
                    'success' => true,
                    'refund_id' => $stripeRefund->id,
                    'message' => "Stripe refund {$stripeRefund->id} processed successfully.",
                ];
            } else {
                $postData = [
                    'payment_intent' => $paymentIntentId,
                    'amount' => $amountInCents,
                    'metadata[order_id]' => (string)$order->id,
                    'metadata[order_number]' => $order->order_number,
                    'metadata[reason]' => substr($reason, 0, 500),
                ];

                $response = $this->executeStripeRequest('POST', 'https://api.stripe.com/v1/refunds', $postData);
                if (isset($response['id'])) {
                    return [
                        'success' => true,
                        'refund_id' => $response['id'],
                        'message' => "Stripe refund {$response['id']} processed successfully.",
                    ];
                }

                $errorMsg = $response['error']['message'] ?? 'Stripe API communication failed';
                return [
                    'success' => false,
                    'refund_id' => null,
                    'message' => "Stripe refund failed: {$errorMsg}",
                ];
            }
        } catch (Exception $e) {
            return [
                'success' => false,
                'refund_id' => null,
                'message' => 'Stripe refund error: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Low-level helper to execute HTTPS requests to Stripe API endpoints.
     */
    protected function executeStripeRequest(string $method, string $url, array $params = []): array
    {
        if (!function_exists('curl_init')) {
            throw new Exception("cURL extension is required for Stripe API communication.");
        }

        $ch = curl_init();
        $headers = [
            "Authorization: Bearer {$this->secretKey}",
            "Stripe-Version: 2024-06-20",
        ];

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
        } elseif ($method === 'GET' && !empty($params)) {
            $url .= '?' . http_build_query($params);
        }

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        $body = curl_exec($ch);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("cURL error during Stripe request: {$error}");
        }

        $decoded = json_decode((string)$body, true);
        return is_array($decoded) ? $decoded : ['raw' => $body];
    }
}

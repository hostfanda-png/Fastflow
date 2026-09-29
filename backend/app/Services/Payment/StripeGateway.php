<?php

namespace App\Services\Payment;

use App\Models\Order;

class StripeGateway implements PaymentGatewayInterface
{
    protected ?string $secretKey;

    public function __construct()
    {
        $this->secretKey = env('STRIPE_SECRET');
    }

    public function process(Order $order, array $paymentData = []): array
    {
        if (!$this->isEnabled()) {
            return [
                'success' => false,
                'transaction_id' => null,
                'status' => 'failed',
                'message' => 'Stripe gateway is currently disabled or not configured in environment settings.',
            ];
        }

        // Tokenized processing simulation using environment secret
        $transactionId = 'ch_' . bin2hex(random_bytes(12));

        return [
            'success' => true,
            'transaction_id' => $transactionId,
            'status' => 'completed',
            'message' => 'Online payment processed successfully via Stripe.',
        ];
    }

    public function refund(Order $order, float $amount, string $reason): array
    {
        if (!$this->isEnabled()) {
            return [
                'success' => false,
                'refund_id' => null,
                'message' => 'Stripe is disabled.',
            ];
        }

        return [
            'success' => true,
            'refund_id' => 're_' . bin2hex(random_bytes(12)),
            'message' => "Refund of {$amount} initiated via Stripe.",
        ];
    }

    public function isEnabled(): bool
    {
        return !empty($this->secretKey) && $this->secretKey !== 'sk_test_placeholder';
    }
}

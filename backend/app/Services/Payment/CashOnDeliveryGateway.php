<?php

namespace App\Services\Payment;

use App\Models\Order;

class CashOnDeliveryGateway implements PaymentGatewayInterface
{
    public function createPaymentIntent(Order $order, array $options = []): array
    {
        $transactionId = 'COD-' . strtoupper(bin2hex(random_bytes(6)));

        return [
            'success' => true,
            'intent_id' => $transactionId,
            'client_secret' => null,
            'publishable_key' => null,
            'amount' => (float)$order->grand_total,
            'currency' => env('DEFAULT_CURRENCY_CODE', 'PKR'),
            'message' => 'Cash on Delivery registered. Payment is due upon food delivery.',
        ];
    }

    public function verifyPayment(string $transactionId): array
    {
        return [
            'success' => true,
            'status' => 'pending',
            'amount' => 0.00,
            'currency' => env('DEFAULT_CURRENCY_CODE', 'PKR'),
            'payload' => ['transaction_id' => $transactionId],
        ];
    }

    public function handleWebhook(string $rawPayload, ?string $signature): array
    {
        return [
            'verified' => false,
            'error' => 'Webhooks are not applicable for Cash on Delivery',
        ];
    }

    public function refund(Order $order, float $amount, string $reason, ?string $idempotencyKey = null): array
    {
        return [
            'success' => true,
            'refund_id' => 'REF-COD-' . strtoupper(bin2hex(random_bytes(6))),
            'idempotency_key' => $idempotencyKey,
            'message' => "Cash refund/adjustment of PKR {$amount} recorded.",
        ];
    }

    public function isEnabled(): bool
    {
        return env('ENABLE_COD', true);
    }
}

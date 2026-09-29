<?php

namespace App\Services\Payment;

use App\Models\Order;

class CashOnDeliveryGateway implements PaymentGatewayInterface
{
    public function process(Order $order, array $paymentData = []): array
    {
        return [
            'success' => true,
            'transaction_id' => 'COD-' . strtoupper(bin2hex(random_bytes(6))),
            'status' => 'pending',
            'message' => 'Cash on delivery registered. Payment due upon courier delivery.',
        ];
    }

    public function refund(Order $order, float $amount, string $reason): array
    {
        return [
            'success' => true,
            'refund_id' => 'REF-COD-' . strtoupper(bin2hex(random_bytes(6))),
            'message' => 'Cash adjustment or wallet credit logged.',
        ];
    }

    public function isEnabled(): bool
    {
        return env('ENABLE_COD', true);
    }
}

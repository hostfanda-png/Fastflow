<?php

namespace App\Services\Payment;

use App\Models\Order;

interface PaymentGatewayInterface
{
    /**
     * Process payment for an order
     * 
     * @param Order $order
     * @param array $paymentData
     * @return array ['success' => bool, 'transaction_id' => string|null, 'message' => string|null]
     */
    public function process(Order $order, array $paymentData = []): array;

    /**
     * Process refund for an order
     * 
     * @param Order $order
     * @param float $amount
     * @param string $reason
     * @return array ['success' => bool, 'refund_id' => string|null, 'message' => string|null]
     */
    public function refund(Order $order, float $amount, string $reason): array;

    /**
     * Check if this payment gateway is enabled in environment configuration
     */
    public function isEnabled(): bool;
}

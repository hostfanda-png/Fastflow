<?php

namespace App\Services\Payment;

use App\Models\Order;

interface PaymentGatewayInterface
{
    /**
     * Create / Initialize a payment intent for an order
     *
     * @param Order $order
     * @param array $options
     * @return array ['success' => bool, 'intent_id' => string, 'client_secret' => string, 'publishable_key' => string, 'amount' => float, 'currency' => string, 'message' => string|null]
     */
    public function createPaymentIntent(Order $order, array $options = []): array;

    /**
     * Verify payment status directly with gateway
     *
     * @param string $transactionId
     * @return array ['success' => bool, 'status' => string, 'amount' => float, 'currency' => string, 'payload' => array]
     */
    public function verifyPayment(string $transactionId): array;

    /**
     * Handle and verify incoming webhook event payload
     *
     * @param string $rawPayload
     * @param string|null $signature
     * @return array ['verified' => bool, 'event_id' => string|null, 'event_type' => string|null, 'order_id' => int|null, 'order_number' => string|null, 'transaction_id' => string|null, 'amount' => float|null, 'data' => array]
     */
    public function handleWebhook(string $rawPayload, ?string $signature): array;

    /**
     * Process a full or partial refund
     *
     * @param Order $order
     * @param float $amount
     * @param string $reason
     * @return array ['success' => bool, 'refund_id' => string|null, 'message' => string|null]
     */
    public function refund(Order $order, float $amount, string $reason): array;

    /**
     * Check if this gateway is enabled and configured in server environment
     */
    public function isEnabled(): bool;
}

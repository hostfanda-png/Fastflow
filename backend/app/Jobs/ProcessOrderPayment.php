<?php

namespace App\Jobs;

use App\Models\Order;
use App\Models\Payment;
use App\Models\FinancialTransaction;
use App\Models\Commission;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ProcessOrderPayment implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected Order $order;
    protected string $paymentMethod;

    public function __construct(Order $order, string $paymentMethod)
    {
        $this->order = $order;
        $this->paymentMethod = $paymentMethod;
    }

    public function handle(): void
    {
        Log::info("Processing payment for Order #{$this->order->order_number} via {$this->paymentMethod}");

        $restaurant = $this->order->restaurant;
        $commissionRate = $restaurant?->commission_rate ?? 15.0;
        $commissionType = $restaurant?->commission_type ?? 'percentage';

        // Calculate commission
        $commissionAmount = $commissionType === 'percentage'
            ? round(($this->order->subtotal * $commissionRate) / 100, 2)
            : min($commissionRate, $this->order->subtotal);

        $restaurantPayout = max(0, $this->order->subtotal - $commissionAmount);

        // Record or update payment record
        Payment::updateOrCreate(
            ['order_id' => $this->order->id],
            [
                'transaction_id' => 'TXN-' . strtoupper(Str::random(12)),
                'amount' => $this->order->grand_total,
                'payment_method' => $this->paymentMethod,
                'status' => $this->paymentMethod === 'cash_on_delivery' ? 'pending' : 'completed',
                'meta' => [
                    'subtotal' => $this->order->subtotal,
                    'tax' => $this->order->tax,
                    'delivery_fee' => $this->order->delivery_fee,
                    'tip' => $this->order->tip,
                ]
            ]
        );

        // Record platform commission ledger
        Commission::create([
            'order_id' => $this->order->id,
            'restaurant_id' => $this->order->restaurant_id,
            'order_total' => $this->order->grand_total,
            'commission_rate' => $commissionRate,
            'commission_type' => $commissionType,
            'commission_amount' => $commissionAmount,
            'net_restaurant_amount' => $restaurantPayout,
            'status' => 'settled',
        ]);

        // Record financial transaction entry
        FinancialTransaction::create([
            'reference_id' => "COMM-ORD-{$this->order->id}",
            'type' => 'commission',
            'amount' => $commissionAmount,
            'direction' => 'credit',
            'account' => 'platform_revenue',
            'notes' => "Platform commission from Order #{$this->order->order_number}",
        ]);

        Log::info("Payment & commission ledger settled for Order #{$this->order->order_number}: Comm=\${$commissionAmount}, Payout=\${$restaurantPayout}");
    }
}

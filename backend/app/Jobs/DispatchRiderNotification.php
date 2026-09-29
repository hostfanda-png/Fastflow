<?php

namespace App\Jobs;

use App\Models\Order;
use App\Models\Rider;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class DispatchRiderNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected Order $order;
    protected ?Rider $rider;

    public function __construct(Order $order, ?Rider $rider = null)
    {
        $this->order = $order;
        $this->rider = $rider;
    }

    public function handle(): void
    {
        $rider = $this->rider ?? $this->order->rider;
        if (!$rider) {
            Log::warning("Cannot dispatch notification: Order #{$this->order->order_number} has no assigned rider.");
            return;
        }

        Log::info("Push Notification sent to Rider {$rider->name} (phone: {$rider->phone}) for Order #{$this->order->order_number}. Pickup: {$this->order->restaurant->name}");
    }
}

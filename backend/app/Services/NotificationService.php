<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Order;
use App\Models\User;

class NotificationService
{
    /**
     * Dispatch persistent customer notification on order status change.
     */
    public static function notifyOrderStatus(Order $order, string $status, ?string $note = null): ?Notification
    {
        $messages = [
            'pending' => "Order #{$order->order_number} has been placed and is pending restaurant acceptance.",
            'confirmed' => "Restaurant has accepted your order #{$order->order_number}.",
            'preparing' => "Your meal for order #{$order->order_number} is being prepared in the kitchen.",
            'ready_for_pickup' => "Order #{$order->order_number} is packed and ready for courier pickup.",
            'assigned_to_rider' => "A delivery courier has been assigned to order #{$order->order_number}.",
            'picked_up' => "Courier has picked up order #{$order->order_number} from the restaurant.",
            'on_the_way' => "Your order #{$order->order_number} is on the way to your delivery address.",
            'delivered' => "Order #{$order->order_number} has been delivered. Enjoy your meal!",
            'cancelled' => "Order #{$order->order_number} was cancelled. " . ($note ? "Reason: {$note}" : ''),
            'refunded' => "Order #{$order->order_number} has been refunded.",
        ];

        $title = "Order " . ucfirst(str_replace('_', ' ', $status));
        $body = $messages[$status] ?? "Order #{$order->order_number} status updated to {$status}.";

        return Notification::create([
            'type' => 'order_status_updated',
            'notifiable_type' => User::class,
            'notifiable_id' => $order->customer_id,
            'data' => [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'restaurant_id' => $order->restaurant_id,
                'status' => $status,
                'title' => $title,
                'message' => $body,
                'note' => $note,
            ],
            'read_at' => null,
        ]);
    }

    /**
     * Dispatch notification for payment changes.
     */
    public static function notifyPaymentStatus(Order $order, string $paymentStatus, ?string $message = null): ?Notification
    {
        return Notification::create([
            'type' => 'payment_status_updated',
            'notifiable_type' => User::class,
            'notifiable_id' => $order->customer_id,
            'data' => [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'payment_status' => $paymentStatus,
                'title' => 'Payment ' . ucfirst($paymentStatus),
                'message' => $message ?? "Payment for order #{$order->order_number} is {$paymentStatus}.",
            ],
            'read_at' => null,
        ]);
    }
}

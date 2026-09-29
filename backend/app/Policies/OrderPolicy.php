<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Order;

class OrderPolicy
{
    /**
     * Determine whether the user can view the order.
     */
    public function view(User $user, Order $order): bool
    {
        if ($user->hasRole('super_admin') || $user->hasRole('support_agent')) {
            return true;
        }

        // Customer owns order
        if ($order->user_id === $user->id) {
            return true;
        }

        // Restaurant owner or kitchen staff
        if ($order->restaurant && ($order->restaurant->owner_id === $user->id || $order->restaurant->staff()->where('user_id', $user->id)->exists())) {
            return true;
        }

        // Assigned rider
        if ($order->rider && $order->rider->user_id === $user->id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can update the order status.
     */
    public function updateStatus(User $user, Order $order): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        // Restaurant staff can update kitchen prep statuses
        if ($order->restaurant && ($order->restaurant->owner_id === $user->id || $order->restaurant->staff()->where('user_id', $user->id)->exists())) {
            return true;
        }

        // Rider can update transit & delivery statuses
        if ($order->rider && $order->rider->user_id === $user->id) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the customer can cancel the order.
     */
    public function cancel(User $user, Order $order): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        // Customers can only cancel pending or confirmed orders before preparation commences
        if ($order->user_id === $user->id && in_array($order->status, ['pending', 'confirmed'])) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether user can assign riders.
     */
    public function assignRider(User $user): bool
    {
        return $user->hasRole('super_admin') || $user->hasPermission('rider.assign');
    }
}

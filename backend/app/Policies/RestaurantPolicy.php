<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Restaurant;

class RestaurantPolicy
{
    /**
     * Determine whether the user can view any restaurants.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the restaurant.
     */
    public function view(?User $user, Restaurant $restaurant): bool
    {
        if ($restaurant->status === 'approved' && $restaurant->is_active) {
            return true;
        }

        if (!$user) {
            return false;
        }

        if ($user->hasRole('super_admin')) {
            return true;
        }

        return $restaurant->owner_id === $user->id || $restaurant->staff()->where('user_id', $user->id)->exists();
    }

    /**
     * Determine whether the user can update the restaurant.
     */
    public function update(User $user, Restaurant $restaurant): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        return (int)$restaurant->owner_id === (int)$user->id;
    }

    /**
     * Determine whether the user can manage restaurant operating hours.
     */
    public function manageHours(User $user, Restaurant $restaurant): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        return (int)$restaurant->owner_id === (int)$user->id;
    }

    /**
     * Determine whether the user can manage delivery zones.
     */
    public function manageDeliveryZones(User $user, Restaurant $restaurant): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        return (int)$restaurant->owner_id === (int)$user->id;
    }

    /**
     * Determine whether the user can upload or manage media (logo, cover).
     */
    public function manageMedia(User $user, Restaurant $restaurant): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        return (int)$restaurant->owner_id === (int)$user->id;
    }

    /**
     * Determine whether the user can view the restaurant dashboard & financial metrics.
     */
    public function viewDashboard(User $user, Restaurant $restaurant): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        return (int)$restaurant->owner_id === (int)$user->id || 
            $restaurant->staff()->where('user_id', $user->id)->exists();
    }

    /**
     * Determine whether the user can manage menu items.
     */
    public function manageMenu(User $user, Restaurant $restaurant): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        if ((int)$restaurant->owner_id === (int)$user->id) {
            return true;
        }

        return $restaurant->staff()->where('user_id', $user->id)->exists();
    }

    /**
     * Determine whether the user can approve or set status of the restaurant.
     */
    public function setStatus(User $user): bool
    {
        return $user->hasRole('super_admin') && $user->hasPermission('restaurant.approve');
    }

    /**
     * Determine whether the user can adjust commission rate.
     */
    public function updateCommission(User $user): bool
    {
        return $user->hasRole('super_admin') && $user->hasPermission('settings.manage');
    }
}

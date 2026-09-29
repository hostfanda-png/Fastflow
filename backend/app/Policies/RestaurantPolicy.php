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

        if ($restaurant->owner_id === $user->id && $user->hasPermission('restaurant.update')) {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can manage menu items.
     */
    public function manageMenu(User $user, Restaurant $restaurant): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        if ($restaurant->owner_id === $user->id) {
            return true;
        }

        return $restaurant->staff()->where('user_id', $user->id)->whereHas('role', function ($q) {
            $q->whereIn('name', ['restaurant_owner', 'restaurant_staff']);
        })->exists();
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

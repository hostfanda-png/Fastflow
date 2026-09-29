<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Product;

class ProductPolicy
{
    public function update(User $user, Product $product): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        $restaurant = $product->restaurant;
        if (!$restaurant) {
            return false;
        }

        return $restaurant->owner_id === $user->id || $restaurant->staff()->where('user_id', $user->id)->exists();
    }

    public function delete(User $user, Product $product): bool
    {
        if ($user->hasRole('super_admin')) {
            return true;
        }

        $restaurant = $product->restaurant;
        if (!$restaurant) {
            return false;
        }

        return $restaurant->owner_id === $user->id;
    }
}

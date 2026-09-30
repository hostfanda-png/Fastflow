<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RestaurantUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user) return false;
        return $user->hasRole('super_admin') || $user->hasRole('restaurant_owner');
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:191',
            'description' => 'nullable|string|max:2000',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:100',
            'cover_image' => 'nullable|string|max:255',
            'logo' => 'nullable|string|max:255',
            'estimated_delivery_time' => 'sometimes|string|max:50',
            'delivery_time_min' => 'sometimes|integer|min:5|max:180',
            'delivery_time_max' => 'sometimes|integer|gte:delivery_time_min|max:240',
            'minimum_order' => 'sometimes|numeric|min:0',
            'min_order_amount' => 'sometimes|numeric|min:0',
            'delivery_fee' => 'sometimes|numeric|min:0|max:10000',
            'delivery_enabled' => 'sometimes|boolean',
            'is_open' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
            'address' => 'sometimes|string|max:255',
            'city' => 'sometimes|string|max:100',
            'area' => 'sometimes|string|max:100',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
            'service_radius_km' => 'sometimes|numeric|min:0.5|max:100',
            'cuisines' => 'nullable|array',
            'cuisines.*' => 'integer|exists:cuisines,id',
        ];
    }
}

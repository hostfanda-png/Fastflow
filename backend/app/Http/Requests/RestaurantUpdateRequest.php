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
            'description' => 'nullable|string',
            'banner_image' => 'nullable|string',
            'logo_image' => 'nullable|string',
            'delivery_time_min' => 'sometimes|integer|min:5|max:180',
            'delivery_time_max' => 'sometimes|integer|gte:delivery_time_min|max:240',
            'min_order_amount' => 'sometimes|numeric|min:0',
            'delivery_fee' => 'sometimes|numeric|min:0',
            'is_open' => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
            'address' => 'sometimes|string|max:255',
            'city' => 'sometimes|string|max:100',
            'area' => 'sometimes|string|max:100',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
            'cuisines' => 'nullable|array',
            'cuisines.*' => 'integer|exists:cuisines,id',
        ];
    }
}

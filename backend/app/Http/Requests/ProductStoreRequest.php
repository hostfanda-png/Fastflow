<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        if (!$user) return false;
        return $user->hasRole('super_admin') || $user->hasRole('restaurant_owner') || $user->hasRole('restaurant_staff');
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:191',
            'category_id' => 'required|exists:categories,id',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'original_price' => 'nullable|numeric|gt:price',
            'image' => 'nullable|string|url|max:500',
            'is_available' => 'boolean',
            'is_featured' => 'boolean',
            'prep_time_minutes' => 'nullable|integer|min:1|max:180',
            'calories' => 'nullable|integer|min:0',
            'is_vegetarian' => 'boolean',
            'is_spicy' => 'boolean',
            'variants' => 'nullable|array',
            'variants.*.name' => 'required_with:variants|string|max:100',
            'variants.*.price' => 'required_with:variants|numeric|min:0',
            'addons' => 'nullable|array',
            'addons.*.name' => 'required_with:addons|string|max:100',
            'addons.*.price' => 'required_with:addons|numeric|min:0',
        ];
    }
}

<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'idempotency_key' => ['nullable', 'string', 'max:255'],
            'restaurant_id' => ['required', 'exists:restaurants,id'],
            'delivery_address' => ['required', 'array'],
            'delivery_address.street' => ['required', 'string'],
            'delivery_address.area' => ['required', 'string'],
            'delivery_address.city' => ['required', 'string'],
            'delivery_instructions' => ['nullable', 'string', 'max:500'],
            'payment_method' => ['required', 'string', 'in:cod,stripe,wallet'],
            'coupon_code' => ['nullable', 'string'],
            'tip' => ['nullable', 'numeric', 'min:0'],
            'items' => ['nullable', 'array'],
            'items.*.product_id' => ['required_with:items', 'exists:products,id'],
            'items.*.quantity' => ['required_with:items', 'integer', 'min:1'],
            'items.*.variant_id' => ['nullable', 'exists:product_variants,id'],
            'items.*.addons' => ['nullable', 'array'],
            'items.*.special_instructions' => ['nullable', 'string', 'max:255'],
        ];
    }
}


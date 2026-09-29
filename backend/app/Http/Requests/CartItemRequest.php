<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CartItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'exists:products,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'variant_id' => ['nullable', 'exists:product_variants,id'],
            'selected_addons' => ['nullable', 'array'],
            'selected_addons.*' => ['integer', 'exists:addons,id'],
            'special_instructions' => ['nullable', 'string', 'max:255'],
            'replace_cart' => ['nullable', 'boolean'],
        ];
    }
}


<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RestaurantMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user && ($user->hasRole('super_admin') || $user->hasRole('restaurant_owner'));
    }

    public function rules(): array
    {
        return [
            'type' => ['required', 'string', 'in:logo,cover_image,gallery'],
            'file' => ['nullable', 'file', 'mimes:jpeg,png,jpg,webp,svg', 'max:5120'],
            'image_url' => ['nullable', 'string', 'max:1000'],
        ];
    }
}

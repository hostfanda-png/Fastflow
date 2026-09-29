<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'restaurantId' => (string) $this->restaurant_id,
            'categoryId' => (string) $this->category_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'price' => (float) $this->price,
            'originalPrice' => $this->original_price ? (float) $this->original_price : null,
            'image' => $this->image,
            'isAvailable' => (bool) $this->is_available,
            'isFeatured' => (bool) $this->is_featured,
            'prepTimeMinutes' => (int) $this->prep_time_minutes,
            'calories' => $this->calories ? (int) $this->calories : null,
            'isVegetarian' => (bool) $this->is_vegetarian,
            'isSpicy' => (bool) $this->is_spicy,
            'variants' => $this->variants ? $this->variants->map(function ($v) {
                return [
                    'id' => (string) $v->id,
                    'name' => $v->name,
                    'price' => (float) $v->price,
                    'isDefault' => (bool) $v->is_default,
                ];
            }) : [],
            'addons' => $this->addons ? $this->addons->map(function ($a) {
                return [
                    'id' => (string) $a->id,
                    'name' => $a->name,
                    'price' => (float) $a->price,
                    'isRequired' => (bool) $a->is_required,
                ];
            }) : [],
        ];
    }
}

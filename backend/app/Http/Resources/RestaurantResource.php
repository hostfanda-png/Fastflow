<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RestaurantResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'ownerId' => (string) $this->owner_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'bannerImage' => $this->banner_image,
            'logoImage' => $this->logo_image,
            'rating' => (float) $this->rating,
            'reviewCount' => (int) $this->review_count,
            'deliveryTimeMin' => (int) $this->delivery_time_min,
            'deliveryTimeMax' => (int) $this->delivery_time_max,
            'minOrderAmount' => (float) $this->min_order_amount,
            'deliveryFee' => (float) $this->delivery_fee,
            'isOpen' => (bool) $this->is_open,
            'isActive' => (bool) $this->is_active,
            'status' => $this->status,
            'commissionType' => $this->commission_type ?? 'percentage',
            'commissionRate' => (float) ($this->commission_rate ?? 15),
            'address' => [
                'street' => $this->address,
                'city' => $this->city,
                'area' => $this->area,
                'lat' => (float) $this->lat,
                'lng' => (float) $this->lng,
            ],
            'cuisines' => $this->cuisines ? $this->cuisines->pluck('name')->toArray() : [],
            'categories' => $this->whenLoaded('products', function () {
                return $this->products->pluck('category.name')->unique()->values()->toArray();
            }),
            'products' => ProductResource::collection($this->whenLoaded('products')),
            'featured' => (bool) $this->featured,
            'discountBadge' => $this->discount_badge,
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}

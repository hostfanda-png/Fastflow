<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'restaurantId' => $this->restaurant_id ? (string) $this->restaurant_id : null,
            'restaurant' => $this->restaurant ? [
                'id' => (string) $this->restaurant->id,
                'name' => $this->restaurant->name,
                'minOrderAmount' => (float) $this->restaurant->min_order_amount,
                'deliveryFee' => (float) $this->restaurant->delivery_fee,
            ] : null,
            'items' => $this->items ? $this->items->map(function ($item) {
                return [
                    'id' => (string) $item->id,
                    'productId' => (string) $item->product_id,
                    'productName' => $item->product?->name ?? 'Dish',
                    'productImage' => $item->product?->image,
                    'variantId' => $item->variant_id ? (string) $item->variant_id : null,
                    'variantName' => $item->variant?->name,
                    'quantity' => (int) $item->quantity,
                    'unitPrice' => (float) $item->unit_price,
                    'totalPrice' => (float) $item->total_price,
                    'specialInstructions' => $item->special_instructions,
                    'addons' => $item->addons ?? [],
                ];
            }) : [],
            'subtotal' => (float) ($this->items ? $this->items->sum('total_price') : 0),
        ];
    }
}

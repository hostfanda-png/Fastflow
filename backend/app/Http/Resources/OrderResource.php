<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'orderNumber' => $this->order_number,
            'userId' => (string) $this->user_id,
            'restaurantId' => (string) $this->restaurant_id,
            'restaurantName' => $this->restaurant ? $this->restaurant->name : 'Restaurant',
            'restaurantImage' => $this->restaurant ? $this->restaurant->logo_image : null,
            'riderId' => $this->rider_id ? (string) $this->rider_id : null,
            'rider' => $this->rider ? [
                'id' => (string) $this->rider->id,
                'name' => $this->rider->name,
                'phone' => $this->rider->phone,
                'photo' => $this->rider->avatar,
                'vehicle' => $this->rider->vehicle_type . ' (' . $this->rider->vehicle_plate . ')',
                'rating' => (float) $this->rider->rating,
                'currentLat' => (float) $this->rider->current_lat,
                'currentLng' => (float) $this->rider->current_lng,
            ] : null,
            'status' => $this->status,
            'subtotal' => (float) $this->subtotal,
            'deliveryFee' => (float) $this->delivery_fee,
            'tax' => (float) $this->tax,
            'serviceFee' => (float) $this->service_fee,
            'discount' => (float) $this->discount,
            'tip' => (float) $this->tip,
            'grandTotal' => (float) $this->grand_total,
            'paymentMethod' => $this->payment_method,
            'paymentStatus' => $this->payment_status,
            'deliveryAddress' => [
                'street' => $this->delivery_address,
                'city' => $this->delivery_city,
                'area' => $this->delivery_area,
                'lat' => (float) $this->delivery_lat,
                'lng' => (float) $this->delivery_lng,
                'deliveryInstructions' => $this->delivery_instructions,
            ],
            'items' => $this->items ? $this->items->map(function ($item) {
                return [
                    'id' => (string) $item->id,
                    'productId' => (string) $item->product_id,
                    'productName' => $item->product_name,
                    'variantName' => $item->variant_name,
                    'quantity' => (int) $item->quantity,
                    'unitPrice' => (float) $item->unit_price,
                    'totalPrice' => (float) $item->total_price,
                    'specialInstructions' => $item->special_instructions,
                    'addons' => $item->addons ? $item->addons->map(fn($ad) => [
                        'addonName' => $ad->addon_name,
                        'price' => (float) $ad->price,
                    ]) : [],
                ];
            }) : [],
            'statusHistory' => $this->statusHistories ? $this->statusHistories->map(function ($sh) {
                return [
                    'status' => $sh->status,
                    'note' => $sh->note,
                    'createdAt' => $sh->created_at?->toISOString(),
                ];
            }) : [],
            'estimatedDeliveryTime' => $this->estimated_delivery_time?->toISOString(),
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}

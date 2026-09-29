<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RiderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'userId' => (string) $this->user_id,
            'name' => $this->name,
            'phone' => $this->phone,
            'avatar' => $this->avatar,
            'vehicleType' => $this->vehicle_type,
            'vehiclePlate' => $this->vehicle_plate,
            'status' => $this->status,
            'currentLat' => (float) $this->current_lat,
            'currentLng' => (float) $this->current_lng,
            'rating' => (float) $this->rating,
            'totalDeliveries' => (int) $this->total_deliveries,
            'earnings' => (float) $this->earnings,
        ];
    }
}

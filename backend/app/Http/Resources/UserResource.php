<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => $this->role?->name ?? 'customer',
            'avatar' => $this->avatar,
            'permissions' => $this->role && $this->role->permissions 
                ? $this->role->permissions->pluck('name')->toArray() 
                : [],
            'restaurantId' => $this->restaurants()->first()?->id ? (string) $this->restaurants()->first()->id : null,
            'riderId' => $this->rider?->id ? (string) $this->rider->id : null,
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}

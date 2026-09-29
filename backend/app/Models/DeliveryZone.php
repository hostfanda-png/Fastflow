<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DeliveryZone extends Model
{
    protected $fillable = ['name', 'city', 'radius_km', 'base_fee', 'per_km_fee', 'is_active'];

    protected $casts = [
        'radius_km' => 'float',
        'base_fee' => 'float',
        'per_km_fee' => 'float',
        'is_active' => 'boolean',
    ];
}

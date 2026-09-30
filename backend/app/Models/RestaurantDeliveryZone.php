<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RestaurantDeliveryZone extends Model
{
    use HasFactory;

    protected $table = 'restaurant_delivery_zones';

    protected $fillable = [
        'restaurant_id',
        'zone_name',
        'delivery_fee',
        'min_order',
        'is_active',
    ];

    protected $casts = [
        'delivery_fee' => 'float',
        'min_order' => 'float',
        'is_active' => 'boolean',
    ];

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }
}

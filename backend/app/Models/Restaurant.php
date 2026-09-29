<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Restaurant extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'owner_id',
        'name',
        'slug',
        'description',
        'logo',
        'cover_image',
        'address',
        'city',
        'area',
        'lat',
        'lng',
        'phone',
        'email',
        'rating',
        'review_count',
        'delivery_fee',
        'minimum_order',
        'estimated_delivery_time',
        'service_radius_km',
        'is_open',
        'is_featured',
        'discount_badge',
        'commission_type',
        'commission_rate',
        'fixed_commission_amount',
        'status',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'rating' => 'float',
        'delivery_fee' => 'float',
        'minimum_order' => 'float',
        'commission_rate' => 'float',
        'service_radius_km' => 'float',
        'is_open' => 'boolean',
        'is_featured' => 'boolean',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function staff()
    {
        return $this->hasMany(RestaurantStaff::class);
    }

    public function hours()
    {
        return $this->hasMany(RestaurantHour::class);
    }

    public function deliveryZones()
    {
        return $this->hasMany(RestaurantDeliveryZone::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function cuisines()
    {
        return $this->belongsToMany(Cuisine::class, 'restaurant_cuisines');
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function scopeActiveAndApproved($query)
    {
        return $query->where('status', 'approved');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Rider extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'user_id',
        'vehicle_type',
        'vehicle_number',
        'status',
        'is_active',
        'current_lat',
        'current_lng',
        'assigned_order_count',
        'total_deliveries',
        'rating',
        'commission_per_delivery',
        'today_earnings',
        'total_earnings',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'current_lat' => 'float',
        'current_lng' => 'float',
        'rating' => 'float',
        'commission_per_delivery' => 'float',
        'today_earnings' => 'float',
        'total_earnings' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function activeOrders()
    {
        return $this->orders()->whereIn('order_status', ['assigned_to_rider', 'picked_up', 'on_the_way']);
    }

    public function currentOrder()
    {
        return $this->orders()->whereIn('order_status', ['assigned_to_rider', 'picked_up', 'on_the_way'])->latest()->first();
    }

    public function isEligibleForAssignment(): bool
    {
        return $this->is_active && !in_array($this->status, ['suspended', 'inactive', 'offline']);
    }
}

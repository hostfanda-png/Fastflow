<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rider extends Model
{
    protected $fillable = [
        'user_id',
        'vehicle_type',
        'vehicle_number',
        'status',
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
}

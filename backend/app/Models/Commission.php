<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Commission extends Model
{
    protected $fillable = [
        'order_id',
        'restaurant_id',
        'order_subtotal',
        'commission_rate',
        'commission_amount',
        'restaurant_net_payout',
        'settlement_status',
    ];

    protected $casts = [
        'order_subtotal' => 'float',
        'commission_rate' => 'float',
        'commission_amount' => 'float',
        'restaurant_net_payout' => 'float',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FinancialTransaction extends Model
{
    protected $fillable = [
        'order_id',
        'restaurant_id',
        'order_number',
        'gross_amount',
        'platform_commission',
        'restaurant_payout',
        'delivery_fee',
        'rider_payout',
        'gateway_fee',
        'status',
    ];

    protected $casts = [
        'gross_amount' => 'float',
        'platform_commission' => 'float',
        'restaurant_payout' => 'float',
        'delivery_fee' => 'float',
        'rider_payout' => 'float',
        'gateway_fee' => 'float',
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

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FinancialTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'restaurant_id',
        'transaction_type',
        'order_number',
        'gross_amount',
        'direction',
        'platform_commission',
        'restaurant_payout',
        'delivery_fee',
        'rider_payout',
        'gateway_fee',
        'reference',
        'metadata',
        'status',
    ];

    protected $casts = [
        'gross_amount' => 'float',
        'platform_commission' => 'float',
        'restaurant_payout' => 'float',
        'delivery_fee' => 'float',
        'rider_payout' => 'float',
        'gateway_fee' => 'float',
        'metadata' => 'array',
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

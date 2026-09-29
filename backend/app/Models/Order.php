<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'order_number',
        'idempotency_key',
        'customer_id',
        'restaurant_id',
        'rider_id',
        'customer_name',
        'customer_phone',
        'delivery_address_json',
        'delivery_instructions',
        'order_status',
        'subtotal',
        'discount',
        'coupon_code',
        'delivery_fee',
        'tax',
        'service_fee',
        'tip',
        'grand_total',
        'payment_method',
        'payment_status',
        'payment_reference',
        'estimated_delivery_time',
        'cancellation_reason',
        'has_been_reviewed',
    ];

    protected $casts = [
        'subtotal' => 'float',
        'discount' => 'float',
        'delivery_fee' => 'float',
        'tax' => 'float',
        'service_fee' => 'float',
        'tip' => 'float',
        'grand_total' => 'float',
        'has_been_reviewed' => 'boolean',
    ];

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function rider()
    {
        return $this->belongsTo(Rider::class);
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function statusHistories()
    {
        return $this->hasMany(OrderStatusHistory::class)->orderBy('created_at', 'asc');
    }

    public function payment()
    {
        return $this->hasOne(Payment::class);
    }

    public function commission()
    {
        return $this->hasOne(Commission::class);
    }

    public function review()
    {
        return $this->hasOne(Review::class);
    }
}

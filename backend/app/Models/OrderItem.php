<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'product_id',
        'product_name',
        'quantity',
        'product_price',
        'variant_price',
        'unit_price',
        'total_price',
        'variant_name',
        'special_instructions',
    ];

    protected $casts = [
        'product_price' => 'float',
        'variant_price' => 'float',
        'unit_price' => 'float',
        'total_price' => 'float',
        'quantity' => 'integer',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function addons()
    {
        return $this->hasMany(OrderItemAddon::class);
    }
}

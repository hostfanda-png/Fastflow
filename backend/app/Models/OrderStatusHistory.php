<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderStatusHistory extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'status',
        'note',
        'actor',
        'created_at',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}

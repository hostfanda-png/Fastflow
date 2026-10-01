<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Refund extends Model
{
    use HasFactory;

    protected $fillable = [
        'refund_number',
        'order_id',
        'payment_id',
        'customer_id',
        'amount',
        'reason',
        'status',
        'gateway_refund_id',
        'refund_actor',
        'processed_by',
        'processed_at',
        'metadata',
    ];

    protected $casts = [
        'amount' => 'float',
        'metadata' => 'array',
        'processed_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function processor()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}

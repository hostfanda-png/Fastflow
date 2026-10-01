<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'customer_id',
        'gateway',
        'payment_method',
        'transaction_id',
        'gateway_payment_intent_id',
        'amount',
        'refunded_amount',
        'currency',
        'status',
        'failure_code',
        'failure_message',
        'paid_at',
        'payload',
    ];

    protected $casts = [
        'amount' => 'float',
        'refunded_amount' => 'float',
        'payload' => 'array',
        'paid_at' => 'datetime',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function refunds()
    {
        return $this->hasMany(Refund::class);
    }

    public function isPaid(): bool
    {
        return $this->status === 'completed' || $this->status === 'paid';
    }

    public function getRemainingRefundableAmountAttribute(): float
    {
        return max(0.00, round((float)$this->amount - (float)$this->refunded_amount, 2));
    }
}

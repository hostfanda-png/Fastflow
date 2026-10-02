<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    // Phase 4 Authoritative Payment State Machine Vocabulary
    public const STATUS_PENDING = 'pending';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_PARTIALLY_REFUNDED = 'partially_refunded';
    public const STATUS_REFUNDED = 'refunded';

    public const VALID_STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_PROCESSING,
        self::STATUS_COMPLETED,
        self::STATUS_FAILED,
        self::STATUS_CANCELLED,
        self::STATUS_PARTIALLY_REFUNDED,
        self::STATUS_REFUNDED,
    ];

    /**
     * Allowed State Transitions:
     * pending -> processing, completed, failed, cancelled
     * processing -> completed, failed, cancelled
     * completed -> partially_refunded, refunded
     * partially_refunded -> partially_refunded, refunded
     * failed -> pending (retry), cancelled
     * cancelled -> [] (terminal)
     * refunded -> [] (terminal)
     */
    protected const TRANSITION_MAP = [
        self::STATUS_PENDING => [
            self::STATUS_PROCESSING,
            self::STATUS_COMPLETED,
            self::STATUS_FAILED,
            self::STATUS_CANCELLED,
        ],
        self::STATUS_PROCESSING => [
            self::STATUS_COMPLETED,
            self::STATUS_FAILED,
            self::STATUS_CANCELLED,
        ],
        self::STATUS_COMPLETED => [
            self::STATUS_PARTIALLY_REFUNDED,
            self::STATUS_REFUNDED,
        ],
        self::STATUS_PARTIALLY_REFUNDED => [
            self::STATUS_PARTIALLY_REFUNDED,
            self::STATUS_REFUNDED,
        ],
        self::STATUS_FAILED => [
            self::STATUS_PENDING,
            self::STATUS_CANCELLED,
        ],
        self::STATUS_CANCELLED => [],
        self::STATUS_REFUNDED => [],
    ];

    protected $fillable = [
        'order_id',
        'customer_id',
        'gateway',
        'payment_method',
        'transaction_id',
        'gateway_payment_intent_id',
        'idempotency_key',
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
        return $this->status === self::STATUS_COMPLETED || $this->status === 'paid';
    }

    public function getRemainingRefundableAmountAttribute(): float
    {
        return max(0.00, round((float)$this->amount - (float)$this->refunded_amount, 2));
    }

    /**
     * Validate if the target status transition is permitted by the state machine
     */
    public function canTransitionTo(string $targetStatus): bool
    {
        if ($this->status === $targetStatus) {
            return true;
        }

        $allowed = self::TRANSITION_MAP[$this->status] ?? [];
        return in_array($targetStatus, $allowed, true);
    }
}

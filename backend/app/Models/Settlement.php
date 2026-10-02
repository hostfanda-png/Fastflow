<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Settlement extends Model
{
    use HasFactory;

    // Phase 4 Authoritative Settlement Vocabulary
    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_PAID = 'paid';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';

    public const VALID_STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_APPROVED,
        self::STATUS_PROCESSING,
        self::STATUS_PAID,
        self::STATUS_FAILED,
        self::STATUS_CANCELLED,
    ];

    protected $fillable = [
        'settlement_number',
        'restaurant_id',
        'period_start',
        'period_end',
        'gross_sales',
        'platform_commission',
        'tax_collected',
        'total_deductions',
        'net_payout',
        'status',
        'payout_method',
        'payment_reference',
        'processed_by',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'gross_sales' => 'float',
        'platform_commission' => 'float',
        'tax_collected' => 'float',
        'total_deductions' => 'float',
        'net_payout' => 'float',
        'paid_at' => 'datetime',
    ];

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function processor()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}

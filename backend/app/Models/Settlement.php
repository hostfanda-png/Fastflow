<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Settlement extends Model
{
    use HasFactory;

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

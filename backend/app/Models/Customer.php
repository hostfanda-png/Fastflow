<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $fillable = ['user_id', 'wallet_balance', 'loyalty_points'];

    protected $casts = [
        'wallet_balance' => 'float',
        'loyalty_points' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RestaurantDocument extends Model
{
    use HasFactory;

    protected $table = 'restaurant_documents';

    protected $fillable = [
        'restaurant_id',
        'document_type',
        'file_path',
        'status',
    ];

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }
}

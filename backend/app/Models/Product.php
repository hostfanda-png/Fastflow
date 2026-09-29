<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'restaurant_id',
        'category_id',
        'name',
        'slug',
        'description',
        'image',
        'price',
        'discount_price',
        'is_available',
        'preparation_time',
        'tax_rate',
    ];

    protected $casts = [
        'price' => 'float',
        'discount_price' => 'float',
        'is_available' => 'boolean',
        'preparation_time' => 'integer',
        'tax_rate' => 'float',
    ];

    public function restaurant()
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function addons()
    {
        return $this->belongsToMany(Addon::class, 'product_addons');
    }
}

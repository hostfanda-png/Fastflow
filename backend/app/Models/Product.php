<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

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
        'compare_at_price',
        'is_available',
        'sort_order',
        'preparation_time',
        'tax_rate',
    ];

    protected $casts = [
        'price' => 'float',
        'discount_price' => 'float',
        'compare_at_price' => 'float',
        'is_available' => 'boolean',
        'sort_order' => 'integer',
        'preparation_time' => 'integer',
        'tax_rate' => 'float',
    ];

    public function restaurant(): BelongsTo
    {
        return $this->belongsTo(Restaurant::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->orderBy('sort_order');
    }

    public function activeVariants(): HasMany
    {
        return $this->hasMany(ProductVariant::class)->where('is_active', true)->orderBy('sort_order');
    }

    public function addons(): BelongsToMany
    {
        return $this->belongsToMany(Addon::class, 'product_addons');
    }

    public function availableAddons(): BelongsToMany
    {
        return $this->belongsToMany(Addon::class, 'product_addons')
            ->where('is_available', true)
            ->where('is_active', true)
            ->orderBy('sort_order');
    }

    public function scopeAvailable($query)
    {
        return $query->where('is_available', true);
    }

    public function getEffectivePriceAttribute(): float
    {
        return $this->discount_price && $this->discount_price > 0 && $this->discount_price < $this->price
            ? (float)$this->discount_price
            : (float)$this->price;
    }
}

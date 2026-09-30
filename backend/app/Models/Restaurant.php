<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Restaurant extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'owner_id',
        'name',
        'slug',
        'description',
        'logo',
        'cover_image',
        'address',
        'city',
        'area',
        'lat',
        'lng',
        'phone',
        'email',
        'rating',
        'review_count',
        'delivery_fee',
        'minimum_order',
        'estimated_delivery_time',
        'service_radius_km',
        'is_open',
        'is_active',
        'delivery_enabled',
        'is_featured',
        'discount_badge',
        'commission_type',
        'commission_rate',
        'fixed_commission_amount',
        'status',
    ];

    protected $casts = [
        'lat' => 'float',
        'lng' => 'float',
        'rating' => 'float',
        'delivery_fee' => 'float',
        'minimum_order' => 'float',
        'commission_rate' => 'float',
        'service_radius_km' => 'float',
        'is_open' => 'boolean',
        'is_active' => 'boolean',
        'delivery_enabled' => 'boolean',
        'is_featured' => 'boolean',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function staff()
    {
        return $this->hasMany(RestaurantStaff::class);
    }

    public function hours()
    {
        return $this->hasMany(RestaurantHour::class);
    }

    public function deliveryZones()
    {
        return $this->hasMany(RestaurantDeliveryZone::class);
    }

    public function documents()
    {
        return $this->hasMany(RestaurantDocument::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function categories()
    {
        return $this->hasMany(Category::class)->orderBy('sort_order');
    }

    public function addons()
    {
        return $this->hasMany(Addon::class)->orderBy('sort_order');
    }

    public function cuisines()
    {
        return $this->belongsToMany(Cuisine::class, 'restaurant_cuisines');
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function scopeActiveAndApproved($query)
    {
        return $query->where('status', 'approved')
            ->where(function ($q) {
                $q->whereNull('is_active')->orWhere('is_active', true);
            });
    }

    /**
     * Authoritative backend determination of whether the restaurant is currently open for orders.
     */
    public function isOpen(?\Carbon\Carbon $checkTime = null): bool
    {
        // 1. Must be approved by administrators
        if ($this->status !== 'approved') {
            return false;
        }

        // 2. Must not be suspended or deactivated
        if ($this->is_active === false) {
            return false;
        }

        // 3. Must not have manually toggled store to closed
        if ($this->is_open === false) {
            return false;
        }

        // 4. Check configured operating hours if defined
        $hours = $this->relationLoaded('hours') ? $this->hours : $this->hours()->get();
        if ($hours->isEmpty()) {
            return true;
        }

        $now = $checkTime ?: now();
        $currentTime = $now->format('H:i:s');
        $todayName = strtolower($now->format('l'));
        $todayHour = $hours->firstWhere('day_of_week', $todayName);

        // Normalize time strings to HH:MM:SS to ensure safe lexicographical comparison
        $normalizeTime = function (?string $time): ?string {
            if (!$time) return null;
            $t = trim($time);
            if (strlen($t) === 5) {
                return $t . ':00';
            }
            return substr($t, 0, 8);
        };

        // Check if currently open via yesterday's overnight shift
        $yesterdayName = strtolower($now->copy()->subDay()->format('l'));
        $yesterdayHour = $hours->firstWhere('day_of_week', $yesterdayName);

        if ($yesterdayHour && !$yesterdayHour->is_closed) {
            $yOpen = $normalizeTime($yesterdayHour->open_time);
            $yClose = $normalizeTime($yesterdayHour->close_time);

            // Check overnight primary shift (e.g. 22:00:00 to 02:00:00)
            if ($yOpen && $yClose && $yOpen > $yClose) {
                if ($currentTime <= $yClose) {
                    return true;
                }
            }

            // Check overnight split shift
            $yOpen2 = $normalizeTime($yesterdayHour->open_time_2);
            $yClose2 = $normalizeTime($yesterdayHour->close_time_2);
            if ($yOpen2 && $yClose2 && $yOpen2 > $yClose2) {
                if ($currentTime <= $yClose2) {
                    return true;
                }
            }
        }

        // Check today's configured shifts
        if ($todayHour && !$todayHour->is_closed) {
            // Check primary shift
            if ($todayHour->open_time && $todayHour->close_time) {
                $open = $normalizeTime($todayHour->open_time);
                $close = $normalizeTime($todayHour->close_time);

                if ($open <= $close) {
                    // Standard daytime hours (e.g. 10:00:00 to 22:00:00)
                    if ($currentTime >= $open && $currentTime <= $close) {
                        return true;
                    }
                } else {
                    // Overnight hours starting today (e.g. 22:00:00 to 02:00:00 next day)
                    if ($currentTime >= $open) {
                        return true;
                    }
                }
            }

            // Check split shift
            if (!empty($todayHour->open_time_2) && !empty($todayHour->close_time_2)) {
                $open2 = $normalizeTime($todayHour->open_time_2);
                $close2 = $normalizeTime($todayHour->close_time_2);

                if ($open2 <= $close2) {
                    if ($currentTime >= $open2 && $currentTime <= $close2) {
                        return true;
                    }
                } else {
                    if ($currentTime >= $open2) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
}

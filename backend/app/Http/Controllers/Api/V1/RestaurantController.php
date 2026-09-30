<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RestaurantController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Restaurant::query()
            ->activeAndApproved()
            ->with(['cuisines', 'hours', 'products.variants', 'products.addons']);

        // Search query
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('area', 'like', "%{$search}%")
                  ->orWhereHas('products', function ($pq) use ($search) {
                      $pq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        // Cuisine filter
        if ($cuisine = $request->query('cuisine')) {
            $query->whereHas('cuisines', function ($q) use ($cuisine) {
                $q->where('name', 'like', "%{$cuisine}%")->orWhere('slug', $cuisine);
            });
        }

        // Category filter
        if ($category = $request->query('category')) {
            if ($category !== 'cat-all') {
                $query->whereHas('products.category', function ($q) use ($category) {
                    $q->where('id', $category)->orWhere('slug', $category);
                });
            }
        }

        // City & Area filter
        if ($city = $request->query('city')) {
            $query->where('city', $city);
        }
        if ($area = $request->query('area')) {
            $query->where('area', $area);
        }

        // Open now filter
        if ($request->boolean('open_now')) {
            $query->where('is_open', true);
        }

        // Offers filter
        if ($request->boolean('has_offers')) {
            $query->whereNotNull('discount_badge');
        }

        // Price / delivery fee range
        if ($maxDeliveryFee = $request->query('max_delivery_fee')) {
            $query->where('delivery_fee', '<=', (float)$maxDeliveryFee);
        }

        // Sorting
        $sortBy = $request->query('sort', 'rating');
        if ($sortBy === 'delivery_time') {
            $query->orderBy('estimated_delivery_time', 'asc');
        } elseif ($sortBy === 'delivery_fee') {
            $query->orderBy('delivery_fee', 'asc');
        } else {
            $query->orderByDesc('rating')->orderByDesc('is_featured');
        }

        $restaurants = $query->get()->map(function ($rest) {
            return [
                'id' => $rest->id,
                'name' => $rest->name,
                'slug' => $rest->slug,
                'description' => $rest->description,
                'logo' => $rest->logo,
                'cover_image' => $rest->cover_image,
                'address' => $rest->address,
                'city' => $rest->city,
                'area' => $rest->area,
                'lat' => $rest->lat,
                'lng' => $rest->lng,
                'rating' => $rest->rating,
                'review_count' => $rest->review_count,
                'delivery_fee' => $rest->delivery_fee,
                'minimum_order' => $rest->minimum_order,
                'estimated_delivery_time' => $rest->estimated_delivery_time,
                'is_open' => $rest->isOpen(),
                'delivery_enabled' => (bool)($rest->delivery_enabled ?? true),
                'is_featured' => $rest->is_featured,
                'discount_badge' => $rest->discount_badge,
                'cuisines' => $rest->cuisines->pluck('name')->toArray(),
            ];
        });

        return $this->sendResponse($restaurants, 'Restaurants retrieved successfully');
    }

    public function show(string $identifier): JsonResponse
    {
        $restaurant = Restaurant::with([
            'cuisines',
            'products' => function ($q) {
                $q->where('is_available', true)->with(['variants', 'addons']);
            },
            'hours',
            'reviews.customer'
        ])
        ->where(function ($q) use ($identifier) {
            $q->where('id', $identifier)->orWhere('slug', $identifier);
        })
        ->firstOrFail();

        return $this->sendResponse($restaurant, 'Restaurant details retrieved');
    }
}

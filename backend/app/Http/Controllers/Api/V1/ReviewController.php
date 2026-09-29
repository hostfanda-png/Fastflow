<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Order;
use App\Models\Restaurant;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ReviewController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'order_id' => ['required', 'exists:orders,id'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'food_rating' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['required', 'string', 'max:1000'],
        ]);

        $order = Order::findOrFail($validated['order_id']);

        if ($order->customer_id !== $user->id) {
            return $this->sendError('You can only review your own orders', [], 403);
        }

        if ($order->order_status !== 'delivered') {
            return $this->sendError('You can only review orders that have been successfully delivered', [], 422);
        }

        if (Review::where('order_id', $order->id)->exists()) {
            return $this->sendError('This order has already been reviewed', [], 409);
        }

        $review = Review::create([
            'order_id' => $order->id,
            'restaurant_id' => $order->restaurant_id,
            'customer_id' => $user->id,
            'rating' => $validated['rating'],
            'food_rating' => $validated['food_rating'],
            'comment' => $validated['comment'],
            'is_approved' => true,
        ]);

        $order->has_been_reviewed = true;
        $order->save();

        // Update restaurant aggregated rating
        $restaurant = Restaurant::find($order->restaurant_id);
        if ($restaurant) {
            $avgRating = Review::where('restaurant_id', $restaurant->id)->avg('rating');
            $count = Review::where('restaurant_id', $restaurant->id)->count();
            $restaurant->rating = round($avgRating, 1);
            $restaurant->review_count = $count;
            $restaurant->save();
        }

        AuditService::log('review.created', 'Reviews', (string)$review->id, "Customer reviewed order #{$order->order_number}", $user);

        return $this->sendResponse($review, 'Review published successfully', 201);
    }
}

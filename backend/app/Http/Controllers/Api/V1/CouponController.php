<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CouponController extends Controller
{
    public function index(): JsonResponse
    {
        $coupons = Coupon::where('is_active', true)->get();
        return $this->sendResponse($coupons, 'Coupons list retrieved');
    }

    public function validateCoupon(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'restaurant_id' => ['nullable', 'exists:restaurants,id'],
        ]);

        $code = strtoupper(trim($validated['code']));
        $coupon = Coupon::where('code', $code)->where('is_active', true)->first();

        if (!$coupon) {
            return $this->sendError('Invalid or expired coupon code', [], 404);
        }

        if ($validated['subtotal'] < $coupon->min_order_amount) {
            return $this->sendError("Order subtotal must be at least {$coupon->min_order_amount} to use this coupon", [], 422);
        }

        if ($coupon->restaurant_id && (!empty($validated['restaurant_id']) && $coupon->restaurant_id != $validated['restaurant_id'])) {
            return $this->sendError('This coupon is not valid for this restaurant', [], 422);
        }

        $discount = 0.00;
        if ($coupon->discount_type === 'percentage') {
            $calc = ($validated['subtotal'] * $coupon->discount_value) / 100;
            $discount = $coupon->max_discount_amount ? min($calc, $coupon->max_discount_amount) : $calc;
        } else {
            $discount = min($validated['subtotal'], $coupon->discount_value);
        }

        return $this->sendResponse([
            'coupon' => $coupon,
            'discount' => round($discount, 2),
            'message' => "Coupon {$coupon->code} applied successfully",
        ]);
    }
}

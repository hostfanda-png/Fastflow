<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CartItemRequest;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CartController extends Controller
{
    public function getCart(Request $request): JsonResponse
    {
        $user = $request->user();
        $cart = Cart::with(['restaurant', 'items.product.category', 'items.variant'])
            ->firstOrCreate(['user_id' => $user->id]);

        return $this->sendResponse($this->formatCart($cart), 'Cart retrieved');
    }

    public function addItem(CartItemRequest $request): JsonResponse
    {
        $user = $request->user();
        $product = Product::with('restaurant')->findOrFail($request->product_id);

        if (!$product->is_available) {
            return $this->sendError('Dish is currently sold out', [], 422);
        }

        $cart = Cart::firstOrCreate(['user_id' => $user->id]);

        // Single Restaurant per cart check
        if ($cart->restaurant_id && $cart->restaurant_id !== $product->restaurant_id) {
            if (!$request->boolean('replace_cart')) {
                return response()->json([
                    'success' => false,
                    'conflict' => true,
                    'message' => 'Cart already contains items from another restaurant.',
                    'current_restaurant' => [
                        'id' => $cart->restaurant_id,
                        'name' => $cart->restaurant?->name,
                    ],
                    'new_restaurant' => [
                        'id' => $product->restaurant_id,
                        'name' => $product->restaurant?->name,
                    ],
                ], 409);
            }

            // Replace cart
            $cart->items()->delete();
            $cart->coupon_code = null;
            $cart->restaurant_id = $product->restaurant_id;
            $cart->save();
        }

        if (!$cart->restaurant_id) {
            $cart->restaurant_id = $product->restaurant_id;
            $cart->save();
        }

        // Add or increment item
        $existingItem = $cart->items()
            ->where('product_id', $product->id)
            ->where('variant_id', $request->variant_id)
            ->first();

        if ($existingItem) {
            $existingItem->quantity += $request->quantity;
            $existingItem->save();
        } else {
            CartItem::create([
                'cart_id' => $cart->id,
                'product_id' => $product->id,
                'variant_id' => $request->variant_id,
                'quantity' => $request->quantity,
                'selected_addons' => $request->selected_addons ?? [],
                'special_instructions' => $request->special_instructions,
            ]);
        }

        return $this->sendResponse($this->formatCart($cart->fresh(['restaurant', 'items.product', 'items.variant'])), 'Item added to cart');
    }

    public function updateItem(Request $request, int $itemId): JsonResponse
    {
        $user = $request->user();
        $cart = Cart::where('user_id', $user->id)->firstOrFail();
        $item = $cart->items()->findOrFail($itemId);

        $quantity = (int)$request->input('quantity', 1);

        if ($quantity <= 0) {
            $item->delete();
            if ($cart->items()->count() === 0) {
                $cart->restaurant_id = null;
                $cart->coupon_code = null;
                $cart->save();
            }
        } else {
            $item->quantity = $quantity;
            $item->save();
        }

        return $this->sendResponse($this->formatCart($cart->fresh(['restaurant', 'items.product', 'items.variant'])), 'Cart updated');
    }

    public function clearCart(Request $request): JsonResponse
    {
        $user = $request->user();
        $cart = Cart::where('user_id', $user->id)->first();
        if ($cart) {
            $cart->items()->delete();
            $cart->restaurant_id = null;
            $cart->coupon_code = null;
            $cart->rider_tip = 0.00;
            $cart->save();
        }

        return $this->sendResponse(null, 'Cart cleared');
    }

    protected function formatCart(Cart $cart): array
    {
        $subtotal = 0.00;
        $items = [];

        foreach ($cart->items as $item) {
            $product = $item->product;
            $unitPrice = $product->discount_price ?? $product->price;

            if ($item->variant) {
                $unitPrice += $item->variant->price_modifier;
            }

            $lineTotal = $unitPrice * $item->quantity;
            $subtotal += $lineTotal;

            $items[] = [
                'id' => $item->id,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'product_image' => $product->image,
                'unit_price' => $unitPrice,
                'quantity' => $item->quantity,
                'item_total' => $lineTotal,
                'variant' => $item->variant ? ['id' => $item->variant->id, 'name' => $item->variant->name] : null,
                'addons' => $item->selected_addons,
                'special_instructions' => $item->special_instructions,
            ];
        }

        $restaurant = $cart->restaurant;
        $deliveryFee = $restaurant ? $restaurant->delivery_fee : 120.00;
        $tax = round(($subtotal * 0.05), 2);
        $serviceFee = $subtotal > 0 ? 30.00 : 0.00;
        $discount = 0.00;

        if ($cart->coupon_code) {
            $coupon = Coupon::where('code', $cart->coupon_code)->where('is_active', true)->first();
            if ($coupon && $subtotal >= $coupon->min_order_amount) {
                $discount = $coupon->discount_type === 'percentage' 
                    ? min(($subtotal * $coupon->discount_value) / 100, $coupon->max_discount_amount ?? PHP_INT_MAX)
                    : $coupon->discount_value;
            }
        }

        $grandTotal = max(0.00, $subtotal - $discount + $deliveryFee + $tax + $serviceFee + $cart->rider_tip);

        return [
            'id' => $cart->id,
            'restaurant' => $restaurant ? [
                'id' => $restaurant->id,
                'name' => $restaurant->name,
                'delivery_fee' => $restaurant->delivery_fee,
                'minimum_order' => $restaurant->minimum_order,
            ] : null,
            'items' => $items,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'coupon_code' => $cart->coupon_code,
            'delivery_fee' => $deliveryFee,
            'tax' => $tax,
            'service_fee' => $serviceFee,
            'tip' => $cart->rider_tip,
            'grand_total' => $grandTotal,
        ];
    }
}

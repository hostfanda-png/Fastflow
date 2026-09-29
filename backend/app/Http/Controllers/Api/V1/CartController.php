<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\CartItemRequest;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Addon;
use App\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

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
            return $this->sendError("Dish '{$product->name}' is currently unavailable or sold out.", [], 422);
        }

        // Strict Variant Validation
        if ($request->filled('variant_id')) {
            $variant = ProductVariant::where('product_id', $product->id)
                ->where('id', $request->variant_id)
                ->first();
            if (!$variant) {
                return $this->sendError("Selected variant does not belong to '{$product->name}'.", [], 422);
            }
        }

        // Strict Addon Validation
        $addonsData = $request->input('selected_addons', []);
        if (!empty($addonsData)) {
            foreach ($addonsData as $addonId) {
                $addon = Addon::where('restaurant_id', $product->restaurant_id)
                    ->where('id', $addonId)
                    ->first();
                if (!$addon) {
                    return $this->sendError("Selected addon (ID: {$addonId}) does not belong to this restaurant.", [], 422);
                }
                if (!$addon->is_available) {
                    return $this->sendError("Selected addon '{$addon->name}' is currently unavailable.", [], 422);
                }
            }
        }

        $cart = Cart::firstOrCreate(['user_id' => $user->id]);

        // Single Restaurant per cart check
        if ($cart->restaurant_id && $cart->restaurant_id !== $product->restaurant_id) {
            if (!$request->boolean('replace_cart')) {
                return response()->json([
                    'success' => false,
                    'conflict' => true,
                    'message' => 'Your bag already contains items from another restaurant.',
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

            // Transactional Replace Cart
            DB::transaction(function () use ($cart, $product) {
                $cart->items()->delete();
                $cart->coupon_code = null;
                $cart->restaurant_id = $product->restaurant_id;
                $cart->save();
            });
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

        if ($existingItem && empty($addonsData) && empty($existingItem->selected_addons)) {
            $existingItem->quantity += $request->quantity;
            $existingItem->save();
        } else {
            CartItem::create([
                'cart_id' => $cart->id,
                'product_id' => $product->id,
                'variant_id' => $request->variant_id,
                'quantity' => $request->quantity,
                'selected_addons' => $addonsData,
                'special_instructions' => $request->special_instructions,
            ]);
        }

        return $this->sendResponse(
            $this->formatCart($cart->fresh(['restaurant', 'items.product', 'items.variant'])),
            'Item added to bag'
        );
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

        return $this->sendResponse(
            $this->formatCart($cart->fresh(['restaurant', 'items.product', 'items.variant'])),
            'Bag item updated'
        );
    }

    public function clearCart(Request $request): JsonResponse
    {
        $user = $request->user();
        $cart = Cart::where('user_id', $user->id)->first();
        if ($cart) {
            DB::transaction(function () use ($cart) {
                $cart->items()->delete();
                $cart->restaurant_id = null;
                $cart->coupon_code = null;
                $cart->rider_tip = 0.00;
                $cart->save();
            });
        }

        return $this->sendResponse(null, 'Bag cleared');
    }

    public function applyCoupon(Request $request): JsonResponse
    {
        $user = $request->user();
        $cart = Cart::where('user_id', $user->id)->firstOrFail();

        $code = strtoupper(trim($request->validate(['code' => 'required|string'])['code']));
        $formatted = $this->formatCart($cart);

        $coupon = Coupon::where('code', $code)->where('is_active', true)->first();
        if (!$coupon) {
            return $this->sendError('Invalid or inactive voucher code.', [], 422);
        }

        if ($coupon->restaurant_id && $cart->restaurant_id && $coupon->restaurant_id != $cart->restaurant_id) {
            return $this->sendError('This voucher cannot be used at this restaurant.', [], 422);
        }

        if ($formatted['subtotal'] < $coupon->min_order_amount) {
            return $this->sendError("Order subtotal must be at least {$coupon->min_order_amount} to use this voucher.", [], 422);
        }

        $cart->coupon_code = $coupon->code;
        $cart->save();

        return $this->sendResponse($this->formatCart($cart->fresh(['restaurant', 'items.product', 'items.variant'])), "Voucher '{$coupon->code}' applied successfully");
    }

    public function removeCoupon(Request $request): JsonResponse
    {
        $user = $request->user();
        $cart = Cart::where('user_id', $user->id)->firstOrFail();
        $cart->coupon_code = null;
        $cart->save();

        return $this->sendResponse($this->formatCart($cart->fresh(['restaurant', 'items.product', 'items.variant'])), 'Voucher removed');
    }

    public function setTip(Request $request): JsonResponse
    {
        $user = $request->user();
        $cart = Cart::where('user_id', $user->id)->firstOrFail();
        $tip = max(0.00, (float)$request->validate(['tip' => 'required|numeric|min:0'])['tip']);

        $cart->rider_tip = $tip;
        $cart->save();

        return $this->sendResponse($this->formatCart($cart->fresh(['restaurant', 'items.product', 'items.variant'])), 'Courier tip updated');
    }

    protected function formatCart(Cart $cart): array
    {
        $subtotal = 0.00;
        $items = [];

        foreach ($cart->items as $item) {
            $product = $item->product;
            if (!$product) continue;

            $unitPrice = $product->discount_price ?? $product->price;

            if ($item->variant) {
                $unitPrice += $item->variant->price_modifier;
            }

            $addonTotal = 0.00;
            $addonsDetail = [];
            if (!empty($item->selected_addons) && is_array($item->selected_addons)) {
                $addons = Addon::whereIn('id', $item->selected_addons)->get();
                foreach ($addons as $ad) {
                    $addonTotal += $ad->price;
                    $addonsDetail[] = [
                        'addon_id' => $ad->id,
                        'name' => $ad->name,
                        'price' => $ad->price,
                    ];
                }
            }

            $unitPriceWithAddons = $unitPrice + $addonTotal;
            $lineTotal = $unitPriceWithAddons * $item->quantity;
            $subtotal += $lineTotal;

            $items[] = [
                'id' => $item->id,
                'product_id' => $product->id,
                'product_name' => $product->name,
                'product_image' => $product->image,
                'unit_price' => $unitPriceWithAddons,
                'quantity' => $item->quantity,
                'item_total' => $lineTotal,
                'variant' => $item->variant ? ['id' => $item->variant->id, 'name' => $item->variant->name] : null,
                'addons' => $addonsDetail,
                'special_instructions' => $item->special_instructions,
            ];
        }

        $restaurant = $cart->restaurant;
        $deliveryFee = $restaurant ? (float)$restaurant->delivery_fee : (float)env('DEFAULT_BASE_DELIVERY_FEE', 150.00);
        $taxPercentage = (float)env('DEFAULT_TAX_PERCENTAGE', 5.0);
        $tax = round(($subtotal * $taxPercentage) / 100, 2);
        $serviceFee = $subtotal > 0 ? (float)env('DEFAULT_SERVICE_FEE', 30.00) : 0.00;
        $discount = 0.00;

        if ($cart->coupon_code && $subtotal > 0) {
            $coupon = Coupon::where('code', $cart->coupon_code)->where('is_active', true)->first();
            if ($coupon && $subtotal >= $coupon->min_order_amount) {
                if (!$coupon->restaurant_id || ($restaurant && $coupon->restaurant_id == $restaurant->id)) {
                    $discount = $coupon->discount_type === 'percentage' 
                        ? min(($subtotal * $coupon->discount_value) / 100, $coupon->max_discount_amount ?? PHP_INT_MAX)
                        : min($subtotal, $coupon->discount_value);
                }
            }
        }

        $grandTotal = max(0.00, $subtotal - $discount + $deliveryFee + $tax + $serviceFee + (float)$cart->rider_tip);

        return [
            'id' => $cart->id,
            'restaurant' => $restaurant ? [
                'id' => $restaurant->id,
                'name' => $restaurant->name,
                'delivery_fee' => (float)$restaurant->delivery_fee,
                'minimum_order' => (float)$restaurant->minimum_order,
            ] : null,
            'items' => $items,
            'subtotal' => round($subtotal, 2),
            'discount' => round($discount, 2),
            'coupon_code' => $cart->coupon_code,
            'delivery_fee' => round($deliveryFee, 2),
            'tax' => round($tax, 2),
            'service_fee' => round($serviceFee, 2),
            'tip' => round((float)$cart->rider_tip, 2),
            'grand_total' => round($grandTotal, 2),
        ];
    }
}


<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderItemAddon;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Addon;
use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Restaurant;
use App\Models\User;
use App\Models\Commission;
use App\Models\FinancialTransaction;
use Illuminate\Support\Facades\DB;
use Exception;

class OrderService
{
    /**
     * Server-side secure checkout calculation and order creation.
     * The backend NEVER trusts frontend totals, prices, discounts, or delivery fees.
     */
    public function createOrder(User $customer, array $data): Order
    {
        return DB::transaction(function () use ($customer, $data) {
            $restaurantId = $data['restaurant_id'];
            $restaurant = Restaurant::findOrFail($restaurantId);

            if ($restaurant->status !== 'approved' || !$restaurant->is_open) {
                throw new Exception("Restaurant {$restaurant->name} is not accepting orders at this time.");
            }

            $itemsData = $data['items'] ?? [];
            if (empty($itemsData)) {
                throw new Exception("Cannot create an empty order.");
            }

            $subtotal = 0.00;
            $preparedItems = [];

            foreach ($itemsData as $itemInput) {
                $product = Product::where('restaurant_id', $restaurantId)
                    ->where('id', $itemInput['product_id'])
                    ->firstOrFail();

                if (!$product->is_available) {
                    throw new Exception("Dish '{$product->name}' is currently sold out.");
                }

                $quantity = max(1, (int)$itemInput['quantity']);
                $unitPrice = $product->discount_price ?? $product->price;
                $variantName = null;

                if (!empty($itemInput['variant_id'])) {
                    $variant = ProductVariant::where('product_id', $product->id)
                        ->where('id', $itemInput['variant_id'])
                        ->first();
                    if ($variant) {
                        $unitPrice += $variant->price_modifier;
                        $variantName = $variant->name;
                    }
                }

                $addonTotal = 0.00;
                $selectedAddons = [];
                if (!empty($itemInput['addons']) && is_array($itemInput['addons'])) {
                    foreach ($itemInput['addons'] as $addonId) {
                        $addon = Addon::where('restaurant_id', $restaurantId)
                            ->where('id', $addonId)
                            ->where('is_available', true)
                            ->first();
                        if ($addon) {
                            $addonTotal += $addon->price;
                            $selectedAddons[] = [
                                'addon_id' => $addon->id,
                                'name' => $addon->name,
                                'price' => $addon->price,
                            ];
                        }
                    }
                }

                $itemLineTotal = ($unitPrice + $addonTotal) * $quantity;
                $subtotal += $itemLineTotal;

                $preparedItems[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice + $addonTotal,
                    'total_price' => $itemLineTotal,
                    'variant_name' => $variantName,
                    'special_instructions' => $itemInput['special_instructions'] ?? null,
                    'addons' => $selectedAddons,
                ];
            }

            if ($subtotal < $restaurant->minimum_order) {
                throw new Exception("Order subtotal of {$subtotal} is below restaurant minimum order threshold of {$restaurant->minimum_order}.");
            }

            // Server-side Coupon Validation
            $discount = 0.00;
            $appliedCouponCode = null;
            if (!empty($data['coupon_code'])) {
                $coupon = Coupon::where('code', strtoupper(trim($data['coupon_code'])))
                    ->where('is_active', true)
                    ->first();

                if ($coupon && $subtotal >= $coupon->min_order_amount) {
                    if (!$coupon->restaurant_id || $coupon->restaurant_id == $restaurantId) {
                        if ($coupon->discount_type === 'percentage') {
                            $calc = ($subtotal * $coupon->discount_value) / 100;
                            $discount = $coupon->max_discount_amount ? min($calc, $coupon->max_discount_amount) : $calc;
                        } else {
                            $discount = min($subtotal, $coupon->discount_value);
                        }
                        $appliedCouponCode = $coupon->code;
                    }
                }
            }

            // Server-side Fees & Tax calculations
            $deliveryFee = $restaurant->delivery_fee;
            $taxPercentage = (float)env('DEFAULT_TAX_PERCENTAGE', 5.0);
            $tax = round(($subtotal * $taxPercentage) / 100, 2);
            $serviceFee = (float)env('DEFAULT_SERVICE_FEE', 30.0);
            $tip = max(0.00, (float)($data['tip'] ?? 0.00));

            $grandTotal = max(0.00, $subtotal - $discount + $deliveryFee + $tax + $serviceFee + $tip);

            // Generate unique human-readable order number: FD-YYYYMMDD-XXXXXX
            $orderNumber = 'FD-' . date('Ymd') . '-' . str_pad((string)random_int(1, 999999), 6, '0', STR_PAD_LEFT);

            $order = Order::create([
                'order_number' => $orderNumber,
                'customer_id' => $customer->id,
                'restaurant_id' => $restaurant->id,
                'rider_id' => null,
                'customer_name' => $customer->name,
                'customer_phone' => $customer->phone ?? 'Unspecified',
                'delivery_address_json' => json_encode($data['delivery_address'] ?? []),
                'delivery_instructions' => $data['delivery_instructions'] ?? null,
                'order_status' => 'pending',
                'subtotal' => $subtotal,
                'discount' => $discount,
                'coupon_code' => $appliedCouponCode,
                'delivery_fee' => $deliveryFee,
                'tax' => $tax,
                'service_fee' => $serviceFee,
                'tip' => $tip,
                'grand_total' => $grandTotal,
                'payment_method' => $data['payment_method'] ?? 'cod',
                'payment_status' => ($data['payment_method'] ?? 'cod') === 'stripe' ? 'paid' : 'pending',
                'estimated_delivery_time' => $restaurant->estimated_delivery_time,
            ]);

            // Save items and item addons
            foreach ($preparedItems as $prepItem) {
                $orderItem = OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $prepItem['product_id'],
                    'product_name' => $prepItem['product_name'],
                    'quantity' => $prepItem['quantity'],
                    'unit_price' => $prepItem['unit_price'],
                    'total_price' => $prepItem['total_price'],
                    'variant_name' => $prepItem['variant_name'],
                    'special_instructions' => $prepItem['special_instructions'],
                ]);

                foreach ($prepItem['addons'] as $add) {
                    OrderItemAddon::create([
                        'order_item_id' => $orderItem->id,
                        'addon_id' => $add['addon_id'],
                        'addon_name' => $add['name'],
                        'price' => $add['price'],
                    ]);
                }
            }

            // Initial status history log
            OrderStatusHistory::create([
                'order_id' => $order->id,
                'status' => 'pending',
                'note' => 'Order placed via ' . strtoupper($order->payment_method),
                'actor' => $customer->name,
                'created_at' => now(),
            ]);

            // Record immutable commission calculation
            $commRate = $restaurant->commission_rate ?: 15.0;
            $platformCommission = round(($subtotal * $commRate) / 100, 2);
            $restaurantPayout = max(0.00, $subtotal - $platformCommission);

            Commission::create([
                'order_id' => $order->id,
                'restaurant_id' => $restaurant->id,
                'order_subtotal' => $subtotal,
                'commission_rate' => $commRate,
                'commission_amount' => $platformCommission,
                'restaurant_net_payout' => $restaurantPayout,
                'settlement_status' => 'pending',
            ]);

            // Record immutable financial transaction record
            FinancialTransaction::create([
                'order_id' => $order->id,
                'restaurant_id' => $restaurant->id,
                'order_number' => $order->order_number,
                'gross_amount' => $grandTotal,
                'platform_commission' => $platformCommission,
                'restaurant_payout' => $restaurantPayout,
                'delivery_fee' => $deliveryFee,
                'rider_payout' => 100.00 + $tip,
                'gateway_fee' => $order->payment_method === 'stripe' ? round($grandTotal * 0.025, 2) : 0.00,
                'status' => 'pending',
            ]);

            // If coupon was applied, log usage
            if ($appliedCouponCode && isset($coupon)) {
                CouponUsage::create([
                    'coupon_id' => $coupon->id,
                    'user_id' => $customer->id,
                    'order_id' => $order->id,
                    'discount_applied' => $discount,
                    'used_at' => now(),
                ]);
                $coupon->increment('used_count');
            }

            return $order->load(['items.addons', 'restaurant']);
        });
    }

    /**
     * Transition order status and append to status history
     */
    public function updateStatus(Order $order, string $newStatus, ?string $note, string $actor): Order
    {
        $order->order_status = $newStatus;
        if ($newStatus === 'delivered') {
            $order->payment_status = 'paid';
        }
        $order->save();

        OrderStatusHistory::create([
            'order_id' => $order->id,
            'status' => $newStatus,
            'note' => $note,
            'actor' => $actor,
            'created_at' => now(),
        ]);

        return $order;
    }
}

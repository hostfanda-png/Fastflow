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
use App\Models\Cart;
use App\Models\Commission;
use App\Models\FinancialTransaction;
use App\Models\Payment;
use App\Models\CustomerAddress;
use App\Services\DeliveryService;
use App\Services\NotificationService;
use Illuminate\Support\Facades\DB;
use Exception;

class OrderService
{
    /**
     * Server-side authoritative checkout calculation and order creation.
     * The backend NEVER trusts frontend totals, prices, discounts, or delivery fees.
     */
    public function createOrder(User $customer, array $data): Order
    {
        return DB::transaction(function () use ($customer, $data) {
            // Double checkout / Idempotency protection
            $idempotencyKey = $data['idempotency_key'] ?? null;
            if (!empty($idempotencyKey)) {
                $existing = Order::where('idempotency_key', $idempotencyKey)->first();
                if ($existing) {
                    if ($existing->customer_id !== $customer->id) {
                        throw new Exception("Idempotency key has already been used by another transaction.");
                    }
                    return $existing->load(['items.addons', 'restaurant']);
                }
            }

            $restaurantId = $data['restaurant_id'];
            $restaurant = Restaurant::findOrFail($restaurantId);

            if ($restaurant->status !== 'approved' || !$restaurant->is_open) {
                throw new Exception("Restaurant '{$restaurant->name}' is not accepting orders at this time.");
            }

            // Retrieve items: prioritize server cart, or use validated items payload
            $cart = Cart::where('user_id', $customer->id)->with(['items.product', 'items.variant'])->first();
            $itemsData = [];

            if ($cart && $cart->items()->count() > 0 && $cart->restaurant_id == $restaurantId) {
                foreach ($cart->items as $ci) {
                    $itemsData[] = [
                        'product_id' => $ci->product_id,
                        'quantity' => $ci->quantity,
                        'variant_id' => $ci->variant_id,
                        'addons' => $ci->selected_addons ?? [],
                        'special_instructions' => $ci->special_instructions,
                    ];
                }
            } elseif (!empty($data['items'])) {
                $itemsData = $data['items'];
            }

            if (empty($itemsData)) {
                throw new Exception("Cannot create an empty order. Please add dishes to your bag.");
            }

            $subtotal = 0.00;
            $preparedItems = [];

            foreach ($itemsData as $itemInput) {
                $product = Product::where('restaurant_id', $restaurantId)
                    ->where('id', $itemInput['product_id'])
                    ->first();

                if (!$product) {
                    throw new Exception("Dish #{$itemInput['product_id']} does not belong to '{$restaurant->name}'.");
                }

                if (!$product->is_available) {
                    throw new Exception("Dish '{$product->name}' is currently unavailable or sold out.");
                }

                $quantity = max(1, (int)$itemInput['quantity']);
                $baseProductPrice = (float)($product->discount_price ?? $product->price);
                $unitPrice = $baseProductPrice;
                $variantName = null;
                $variantModifier = 0.00;

                // Strict Variant Verification
                if (!empty($itemInput['variant_id'])) {
                    $variant = ProductVariant::where('product_id', $product->id)
                        ->where('id', $itemInput['variant_id'])
                        ->first();

                    if (!$variant) {
                        throw new Exception("Selected variant #{$itemInput['variant_id']} does not belong to dish '{$product->name}'.");
                    }

                    $variantModifier = (float)$variant->price_modifier;
                    $unitPrice += $variantModifier;
                    $variantName = $variant->name;
                }

                // Strict Addon Verification
                $addonTotal = 0.00;
                $selectedAddons = [];
                if (!empty($itemInput['addons']) && is_array($itemInput['addons'])) {
                    foreach ($itemInput['addons'] as $addonId) {
                        $addon = Addon::where('restaurant_id', $restaurantId)
                            ->where('id', $addonId)
                            ->first();

                        if (!$addon) {
                            throw new Exception("Selected addon #{$addonId} does not belong to '{$restaurant->name}'.");
                        }

                        if (!$addon->is_available) {
                            throw new Exception("Selected addon '{$addon->name}' is currently unavailable.");
                        }

                        $addonTotal += (float)$addon->price;
                        $selectedAddons[] = [
                            'addon_id' => $addon->id,
                            'name' => $addon->name,
                            'price' => (float)$addon->price,
                        ];
                    }
                }

                $itemLineTotal = ($unitPrice + $addonTotal) * $quantity;
                $subtotal += $itemLineTotal;

                $preparedItems[] = [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity' => $quantity,
                    'product_price' => $baseProductPrice,
                    'variant_price' => $variantModifier,
                    'unit_price' => $unitPrice + $addonTotal,
                    'total_price' => $itemLineTotal,
                    'variant_name' => $variantName,
                    'special_instructions' => $itemInput['special_instructions'] ?? null,
                    'addons' => $selectedAddons,
                ];
            }

            // Delivery address verification & zone availability check
            $addressObj = null;
            $deliveryAddressData = [];
            if (!empty($data['address_id'])) {
                $addressObj = CustomerAddress::where('user_id', $customer->id)->find($data['address_id']);
                if (!$addressObj) {
                    throw new Exception("Selected delivery address does not exist or does not belong to your account.");
                }
                $deliveryAddressData = [
                    'id' => $addressObj->id,
                    'label' => $addressObj->label,
                    'recipient_name' => $addressObj->recipient_name,
                    'phone' => $addressObj->phone,
                    'street' => $addressObj->street,
                    'area' => $addressObj->area,
                    'city' => $addressObj->city,
                    'lat' => $addressObj->lat,
                    'lng' => $addressObj->lng,
                    'delivery_instructions' => $addressObj->delivery_instructions,
                ];
            } elseif (!empty($data['delivery_address'])) {
                $deliveryAddressData = is_array($data['delivery_address'])
                    ? $data['delivery_address']
                    : json_decode($data['delivery_address'], true);
                if (is_array($deliveryAddressData)) {
                    $addressObj = new CustomerAddress($deliveryAddressData);
                }
            }

            // Authoritative Delivery & Availability Check
            $deliveryEligibility = DeliveryService::checkDeliveryEligibility($restaurant, $addressObj, $subtotal);
            if (!$deliveryEligibility['can_deliver']) {
                throw new Exception($deliveryEligibility['reason'] ?? "Restaurant cannot deliver to the selected address.");
            }

            $deliveryFee = (float)$deliveryEligibility['delivery_fee'];
            $minOrder = (float)$deliveryEligibility['minimum_order'];

            if ($subtotal < $minOrder) {
                throw new Exception("Order subtotal of {$subtotal} is below restaurant minimum order threshold of {$minOrder}.");
            }

            // Server-side Coupon Validation
            $discount = 0.00;
            $appliedCouponCode = null;
            $couponCodeInput = !empty($data['coupon_code']) ? $data['coupon_code'] : ($cart?->coupon_code ?? null);

            if (!empty($couponCodeInput)) {
                $coupon = Coupon::where('code', strtoupper(trim($couponCodeInput)))->first();

                if (!$coupon || !$coupon->is_active) {
                    throw new Exception("Voucher code '{$couponCodeInput}' is invalid or inactive.");
                }

                if ($coupon->restaurant_id && $coupon->restaurant_id != $restaurantId) {
                    throw new Exception("Voucher code '{$coupon->code}' cannot be used for restaurant '{$restaurant->name}'.");
                }

                if ($subtotal < $coupon->min_order_amount) {
                    throw new Exception("Order subtotal must be at least {$coupon->min_order_amount} to use voucher '{$coupon->code}'.");
                }

                if ($coupon->usage_limit > 0 && $coupon->used_count >= $coupon->usage_limit) {
                    throw new Exception("Voucher '{$coupon->code}' has reached its global redemption limit.");
                }

                // Customer per-user usage limit check
                $userUsages = CouponUsage::where('coupon_id', $coupon->id)->where('user_id', $customer->id)->count();
                if ($userUsages >= 5) {
                    throw new Exception("You have exceeded the maximum redemptions for voucher '{$coupon->code}'.");
                }

                if ($coupon->discount_type === 'percentage') {
                    $calc = ($subtotal * $coupon->discount_value) / 100;
                    $discount = $coupon->max_discount_amount ? min($calc, $coupon->max_discount_amount) : $calc;
                } else {
                    $discount = min($subtotal, $coupon->discount_value);
                }

                $appliedCouponCode = $coupon->code;
            }

            // Server-side Fees & Tax calculations
            $taxPercentage = (float)env('DEFAULT_TAX_PERCENTAGE', 5.0);
            $tax = round(($subtotal * $taxPercentage) / 100, 2);
            $serviceFee = (float)env('DEFAULT_SERVICE_FEE', 30.0);
            $tip = max(0.00, (float)($data['tip'] ?? ($cart?->rider_tip ?? 0.00)));

            $grandTotal = max(0.00, $subtotal - $discount + $deliveryFee + $tax + $serviceFee + $tip);

            // Generate unique collision-safe order number: FD-YYYYMMDD-XXXXXX
            do {
                $orderNumber = 'FD-' . date('Ymd') . '-' . str_pad((string)random_int(1, 999999), 6, '0', STR_PAD_LEFT);
            } while (Order::where('order_number', $orderNumber)->exists());

            $paymentMethod = $data['payment_method'] ?? 'cod';

            // Critical Security: Payment status for Stripe and COD ALWAYS begins as 'pending'
            $paymentStatus = 'pending';

            $order = Order::create([
                'order_number' => $orderNumber,
                'idempotency_key' => $idempotencyKey,
                'customer_id' => $customer->id,
                'restaurant_id' => $restaurant->id,
                'rider_id' => null,
                'customer_name' => $customer->name,
                'customer_phone' => $customer->phone ?? 'Unspecified',
                'delivery_address_json' => json_encode($deliveryAddressData),
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
                'payment_method' => $paymentMethod,
                'payment_status' => $paymentStatus,
                'estimated_delivery_time' => $deliveryEligibility['estimated_delivery_time'] ?? ($restaurant->estimated_delivery_time ?? '25-35 min'),
            ]);

            // Save items and item addons with historical snapshots
            foreach ($preparedItems as $prepItem) {
                $orderItem = OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $prepItem['product_id'],
                    'product_name' => $prepItem['product_name'],
                    'quantity' => $prepItem['quantity'],
                    'product_price' => $prepItem['product_price'],
                    'variant_price' => $prepItem['variant_price'],
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

            // Initial Payment record
            Payment::create([
                'order_id' => $order->id,
                'customer_id' => $customer->id,
                'gateway' => $paymentMethod,
                'payment_method' => $paymentMethod,
                'transaction_id' => null,
                'amount' => $grandTotal,
                'currency' => env('DEFAULT_CURRENCY_CODE', 'PKR'),
                'status' => Payment::STATUS_PENDING,
            ]);

            // Record immutable commission calculation
            $commRate = $restaurant->commission_rate ?: (float)env('DEFAULT_COMMISSION_PERCENTAGE', 15.0);
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
                'transaction_type' => 'payment',
                'order_number' => $order->order_number,
                'gross_amount' => $grandTotal,
                'direction' => 'credit',
                'platform_commission' => $platformCommission,
                'restaurant_payout' => $restaurantPayout,
                'delivery_fee' => $deliveryFee,
                'rider_payout' => (float)env('DEFAULT_RIDER_BASE_PAYOUT', 100.00) + $tip,
                'gateway_fee' => $order->payment_method === 'stripe' ? round($grandTotal * 0.025, 2) : 0.00,
                'status' => 'pending',
            ]);

            // If coupon was applied, log usage and increment count atomically
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

            // Dispatch customer notification
            NotificationService::notifyOrderStatus($order, 'pending');

            return $order->load(['items.addons', 'restaurant']);
        });
    }

    /**
     * Transition order status and enforce server-side state machine rules
     */
    public function updateStatus(Order $order, string $newStatus, ?string $note, string $actor): Order
    {
        $allowedTransitions = [
            'pending' => ['confirmed', 'cancelled'],
            'confirmed' => ['preparing', 'cancelled'],
            'preparing' => ['ready_for_pickup', 'cancelled'],
            'ready_for_pickup' => ['assigned_to_rider', 'picked_up', 'cancelled'],
            'assigned_to_rider' => ['picked_up', 'ready_for_pickup', 'cancelled'],
            'picked_up' => ['on_the_way'],
            'on_the_way' => ['delivered'],
            'delivered' => ['refunded'],
            'cancelled' => [],
            'refunded' => [],
        ];

        $currentStatus = $order->order_status;
        $validTargets = $allowedTransitions[$currentStatus] ?? [];

        if (!in_array($newStatus, $validTargets) && $currentStatus !== $newStatus) {
            throw new Exception("Invalid order transition from '{$currentStatus}' to '{$newStatus}'.");
        }

        $order->order_status = $newStatus;
        $order->save();

        OrderStatusHistory::create([
            'order_id' => $order->id,
            'status' => $newStatus,
            'note' => $note,
            'actor' => $actor,
            'created_at' => now(),
        ]);

        NotificationService::notifyOrderStatus($order, $newStatus, $note);

        return $order;
    }
}

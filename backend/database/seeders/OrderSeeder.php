<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\User;
use App\Models\Restaurant;
use App\Models\Product;
use App\Models\Rider;
use App\Models\Commission;
use App\Models\FinancialTransaction;
use App\Models\Review;

class OrderSeeder extends Seeder
{
    public function run(): void
    {
        $customer = User::where('email', 'customer@dineflow.app')->first();
        $fuego = Restaurant::where('slug', 'fuego-wood-fired-trattoria')->first();
        $ironGrill = Restaurant::where('slug', 'the-iron-grill-and-smash')->first();
        $rider = Rider::first();

        if (!$customer || !$fuego) {
            return;
        }

        // Active Order (on the way)
        $order1 = Order::firstOrCreate(
            ['order_number' => 'FD-20260929-001001'],
            [
                'customer_id' => $customer->id,
                'restaurant_id' => $fuego->id,
                'rider_id' => $rider?->id,
                'customer_name' => $customer->name,
                'customer_phone' => $customer->phone,
                'delivery_address_json' => json_encode([
                    'label' => 'Home',
                    'street' => 'House 44-B, Street 12, Sector Y',
                    'area' => 'DHA Phase 3',
                    'city' => 'Lahore',
                ]),
                'delivery_instructions' => 'Ring doorbell, leave with gate security if unanswered.',
                'order_status' => 'on_the_way',
                'subtotal' => 2030.00,
                'discount' => 100.00,
                'coupon_code' => 'FEAST100',
                'delivery_fee' => 120.00,
                'tax' => 101.50,
                'service_fee' => 30.00,
                'tip' => 100.00,
                'grand_total' => 2281.50,
                'payment_method' => 'cod',
                'payment_status' => 'pending',
                'estimated_delivery_time' => '20-25 mins',
            ]
        );

        $pizzaProd = Product::where('restaurant_id', $fuego->id)->first();
        if ($pizzaProd) {
            OrderItem::firstOrCreate(
                ['order_id' => $order1->id, 'product_id' => $pizzaProd->id],
                [
                    'product_name' => $pizzaProd->name,
                    'quantity' => 1,
                    'unit_price' => $pizzaProd->price,
                    'total_price' => $pizzaProd->price,
                ]
            );
        }

        OrderStatusHistory::firstOrCreate(
            ['order_id' => $order1->id, 'status' => 'pending'],
            ['note' => 'Order placed via COD', 'actor' => $customer->name, 'created_at' => now()->subMinutes(30)]
        );
        OrderStatusHistory::firstOrCreate(
            ['order_id' => $order1->id, 'status' => 'confirmed'],
            ['note' => 'Kitchen confirmed order', 'actor' => 'Chef', 'created_at' => now()->subMinutes(25)]
        );
        OrderStatusHistory::firstOrCreate(
            ['order_id' => $order1->id, 'status' => 'on_the_way'],
            ['note' => 'Courier dispatched to address', 'actor' => 'Courier', 'created_at' => now()->subMinutes(10)]
        );

        // Completed Order with Review
        if ($ironGrill) {
            $order2 = Order::firstOrCreate(
                ['order_number' => 'FD-20260928-000984'],
                [
                    'customer_id' => $customer->id,
                    'restaurant_id' => $ironGrill->id,
                    'rider_id' => $rider?->id,
                    'customer_name' => $customer->name,
                    'customer_phone' => $customer->phone,
                    'delivery_address_json' => json_encode([
                        'label' => 'Home',
                        'street' => 'House 44-B, Street 12, Sector Y',
                        'area' => 'DHA Phase 3',
                        'city' => 'Lahore',
                    ]),
                    'order_status' => 'delivered',
                    'subtotal' => 2890.00,
                    'discount' => 0.00,
                    'delivery_fee' => 140.00,
                    'tax' => 144.50,
                    'service_fee' => 30.00,
                    'tip' => 50.00,
                    'grand_total' => 3254.50,
                    'payment_method' => 'stripe',
                    'payment_status' => 'paid',
                    'has_been_reviewed' => true,
                    'created_at' => now()->subDay(),
                ]
            );

            Review::firstOrCreate(
                ['order_id' => $order2->id],
                [
                    'restaurant_id' => $ironGrill->id,
                    'customer_id' => $customer->id,
                    'rating' => 5,
                    'food_rating' => 5,
                    'comment' => 'The smash patties had incredible crust and arrived piping hot! The truffle fries were perfectly crispy. Best burger in Lahore by far.',
                    'is_approved' => true,
                ]
            );

            FinancialTransaction::firstOrCreate(
                ['order_id' => $order2->id],
                [
                    'restaurant_id' => $ironGrill->id,
                    'order_number' => $order2->order_number,
                    'gross_amount' => 3254.50,
                    'platform_commission' => 404.60,
                    'restaurant_payout' => 2485.40,
                    'delivery_fee' => 140.00,
                    'rider_payout' => 150.00,
                    'gateway_fee' => 65.00,
                    'status' => 'settled',
                ]
            );
        }
    }
}

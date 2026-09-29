<?php

namespace Database\Factories;

use App\Models\Order;
use App\Models\Restaurant;
use App\Models\User;
use App\Models\Rider;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class OrderFactory extends Factory
{
    protected $model = Order::class;

    public function definition(): array
    {
        $subtotal = fake()->randomFloat(2, 20, 100);
        $deliveryFee = 3.50;
        $tax = round($subtotal * 0.05, 2);
        $serviceFee = 1.50;
        $tip = 2.00;
        $grandTotal = $subtotal + $deliveryFee + $tax + $serviceFee + $tip;

        return [
            'order_number' => 'ORD-' . strtoupper(Str::random(8)),
            'user_id' => User::factory(),
            'restaurant_id' => Restaurant::factory(),
            'rider_id' => null,
            'status' => 'pending',
            'subtotal' => $subtotal,
            'delivery_fee' => $deliveryFee,
            'tax' => $tax,
            'serviceFee' => $serviceFee,
            'discount' => 0,
            'tip' => $tip,
            'grand_total' => $grandTotal,
            'payment_method' => 'cash_on_delivery',
            'payment_status' => 'pending',
            'delivery_address' => fake()->streetAddress(),
            'delivery_city' => 'Metropolis',
            'delivery_area' => 'Downtown',
            'delivery_lat' => fake()->latitude(),
            'delivery_lng' => fake()->longitude(),
            'delivery_instructions' => 'Call on delivery',
        ];
    }
}

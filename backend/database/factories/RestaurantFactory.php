<?php

namespace Database\Factories;

use App\Models\Restaurant;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class RestaurantFactory extends Factory
{
    protected $model = Restaurant::class;

    public function definition(): array
    {
        $name = fake()->company() . ' Kitchen';
        return [
            'owner_id' => User::factory(),
            'name' => $name,
            'slug' => Str::slug($name) . '-' . Str::random(5),
            'description' => fake()->paragraph(),
            'banner_image' => 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
            'logo_image' => 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80',
            'rating' => fake()->randomFloat(1, 4.0, 5.0),
            'review_count' => fake()->numberBetween(10, 500),
            'delivery_time_min' => 20,
            'delivery_time_max' => 35,
            'min_order_amount' => 15.00,
            'delivery_fee' => 3.50,
            'is_open' => true,
            'is_active' => true,
            'status' => 'approved',
            'commission_type' => 'percentage',
            'commission_rate' => 15.00,
            'address' => fake()->streetAddress(),
            'city' => 'Metropolis',
            'area' => 'Downtown',
            'lat' => fake()->latitude(),
            'lng' => fake()->longitude(),
        ];
    }
}

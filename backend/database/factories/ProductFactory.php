<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\Restaurant;
use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $name = fake()->words(3, true);
        return [
            'restaurant_id' => Restaurant::factory(),
            'category_id' => Category::first()?->id ?? 1,
            'name' => ucwords($name),
            'slug' => Str::slug($name) . '-' . Str::random(5),
            'description' => fake()->sentence(),
            'price' => fake()->randomFloat(2, 5, 40),
            'original_price' => fake()->boolean(40) ? fake()->randomFloat(2, 45, 60) : null,
            'image' => 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
            'is_available' => true,
            'is_featured' => fake()->boolean(20),
            'prep_time_minutes' => fake()->numberBetween(10, 30),
            'calories' => fake()->numberBetween(300, 850),
            'is_vegetarian' => fake()->boolean(25),
            'is_spicy' => fake()->boolean(20),
        ];
    }
}

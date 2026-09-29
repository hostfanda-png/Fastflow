<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Role;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => Hash::make('password123'),
            'remember_token' => Str::random(10),
            'phone' => fake()->phoneNumber(),
            'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
            'role_id' => Role::where('name', 'customer')->value('id') ?? 1,
            'is_active' => true,
        ];
    }

    public function superAdmin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role_id' => Role::where('name', 'super_admin')->value('id') ?? 1,
        ]);
    }

    public function restaurantOwner(): static
    {
        return $this->state(fn (array $attributes) => [
            'role_id' => Role::where('name', 'restaurant_owner')->value('id') ?? 2,
        ]);
    }

    public function rider(): static
    {
        return $this->state(fn (array $attributes) => [
            'role_id' => Role::where('name', 'delivery_rider')->value('id') ?? 4,
        ]);
    }
}

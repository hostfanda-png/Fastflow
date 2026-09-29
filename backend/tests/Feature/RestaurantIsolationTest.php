<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use App\Models\Restaurant;
use App\Models\Order;
use App\Models\Rider;
use Illuminate\Foundation\Testing\RefreshDatabase;

class RestaurantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_a_cannot_access_or_manage_owner_b_restaurant(): void
    {
        $ownerRole = Role::firstOrCreate(['name' => 'restaurant_owner'], ['display_name' => 'Owner']);

        $ownerA = User::factory()->create(['role_id' => $ownerRole->id]);
        $ownerB = User::factory()->create(['role_id' => $ownerRole->id]);

        $restaurantB = Restaurant::create([
            'owner_id' => $ownerB->id,
            'name' => 'Restaurant B',
            'slug' => 'restaurant-b',
            'address' => 'Street B',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
        ]);

        // Owner A attempts to access Restaurant B's dashboard
        $response = $this->actingAs($ownerA, 'sanctum')
            ->getJson("/api/v1/owner/restaurants/{$restaurantB->id}");

        $response->assertStatus(403);
    }

    public function test_staff_a_cannot_access_restaurant_b(): void
    {
        $staffRole = Role::firstOrCreate(['name' => 'restaurant_staff'], ['display_name' => 'Staff']);
        $ownerRole = Role::firstOrCreate(['name' => 'restaurant_owner'], ['display_name' => 'Owner']);

        $owner = User::factory()->create(['role_id' => $ownerRole->id]);

        $restaurantA = Restaurant::create([
            'owner_id' => $owner->id,
            'name' => 'Restaurant A',
            'slug' => 'restaurant-a',
            'address' => 'Street A',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
        ]);

        $restaurantB = Restaurant::create([
            'owner_id' => $owner->id,
            'name' => 'Restaurant B',
            'slug' => 'restaurant-b',
            'address' => 'Street B',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
        ]);

        $staffA = User::factory()->create([
            'role_id' => $staffRole->id,
            'restaurant_id' => $restaurantA->id,
        ]);

        // Staff assigned to Restaurant A attempts to update order on Restaurant B
        $response = $this->actingAs($staffA, 'sanctum')
            ->getJson("/api/v1/owner/restaurants/{$restaurantB->id}/orders");

        $response->assertStatus(403);
    }

    public function test_rider_a_cannot_access_or_deliver_rider_b_order(): void
    {
        $riderRole = Role::firstOrCreate(['name' => 'delivery_rider'], ['display_name' => 'Rider']);
        $userA = User::factory()->create(['role_id' => $riderRole->id]);
        $userB = User::factory()->create(['role_id' => $riderRole->id]);

        $riderA = Rider::create(['user_id' => $userA->id, 'status' => 'available']);
        $riderB = Rider::create(['user_id' => $userB->id, 'status' => 'available']);

        $orderForB = Order::create([
            'order_number' => 'FD-20260929-TEST01',
            'customer_id' => 1,
            'restaurant_id' => 1,
            'rider_id' => $riderB->id,
            'customer_name' => 'Test Customer',
            'customer_phone' => '123',
            'delivery_address_json' => '{}',
            'order_status' => 'assigned_to_rider',
            'subtotal' => 1000,
            'grand_total' => 1100,
        ]);

        // Rider A attempts to confirm delivery of Rider B's order
        $response = $this->actingAs($userA, 'sanctum')
            ->postJson("/api/v1/rider/orders/{$orderForB->id}/deliver");

        $response->assertStatus(404); // Scoped to rider A's assigned orders
    }
}

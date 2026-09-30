<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use App\Models\Restaurant;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CartCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_backend_recalculates_and_ignores_tampered_frontend_totals(): void
    {
        $customerRole = Role::firstOrCreate(['name' => 'customer'], ['display_name' => 'Customer']);
        $ownerRole = Role::firstOrCreate(['name' => 'restaurant_owner'], ['display_name' => 'Owner']);

        $customer = User::factory()->create(['role_id' => $customerRole->id]);
        $owner = User::factory()->create(['role_id' => $ownerRole->id]);

        $restaurant = Restaurant::create([
            'owner_id' => $owner->id,
            'name' => 'Pizzeria Trattoria',
            'slug' => 'pizzeria-trattoria',
            'address' => 'Main Ave',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'delivery_fee' => 120.00,
            'minimum_order' => 500.00,
            'status' => 'approved',
            'is_open' => true,
        ]);

        $category = Category::create(['name' => 'Pizzas', 'slug' => 'pizzas']);

        $product = Product::create([
            'restaurant_id' => $restaurant->id,
            'category_id' => $category->id,
            'name' => 'Margherita Pizza',
            'slug' => 'margherita-pizza',
            'price' => 1200.00,
            'is_available' => true,
        ]);

        // Malicious client sends a fake grand_total of 10.00 and fake item price of 5.00
        $response = $this->actingAs($customer, 'sanctum')
            ->postJson('/api/v1/orders/checkout', [
                'restaurant_id' => $restaurant->id,
                'delivery_address' => [
                    'street' => 'House 1',
                    'area' => 'Gulberg',
                    'city' => 'Lahore',
                ],
                'payment_method' => 'cod',
                'items' => [
                    [
                        'product_id' => $product->id,
                        'quantity' => 2,
                        'unit_price' => 5.00, // Attacker forged price
                    ],
                ],
                'grand_total' => 10.00, // Attacker forged total
            ]);

        $response->assertStatus(201);

        // Verification: Backend charged real database price (1200 * 2 = 2400) + 120 delivery fee + 5% tax (120) + 30 service fee = 2670
        $createdOrder = $response->json('data');
        $this->assertEquals(2400.00, $createdOrder['subtotal']);
        $this->assertEquals(2670.00, $createdOrder['grand_total']);
    }

    public function test_cart_prevents_mixing_two_restaurants(): void
    {
        $customerRole = Role::firstOrCreate(['name' => 'customer'], ['display_name' => 'Customer']);
        $ownerRole = Role::firstOrCreate(['name' => 'restaurant_owner'], ['display_name' => 'Owner']);

        $customer = User::factory()->create(['role_id' => $customerRole->id]);
        $owner = User::factory()->create(['role_id' => $ownerRole->id]);

        $restaurantA = Restaurant::create([
            'owner_id' => $owner->id,
            'name' => 'Rest A',
            'slug' => 'rest-a',
            'address' => 'A',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
            'is_open' => true,
        ]);

        $restaurantB = Restaurant::create([
            'owner_id' => $owner->id,
            'name' => 'Rest B',
            'slug' => 'rest-b',
            'address' => 'B',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
            'is_open' => true,
        ]);

        $category = Category::create(['name' => 'Food', 'slug' => 'food']);
        $prodA = Product::create(['restaurant_id' => $restaurantA->id, 'category_id' => $category->id, 'name' => 'Dish A', 'slug' => 'dish-a', 'price' => 500, 'is_available' => true]);
        $prodB = Product::create(['restaurant_id' => $restaurantB->id, 'category_id' => $category->id, 'name' => 'Dish B', 'slug' => 'dish-b', 'price' => 500, 'is_available' => true]);

        // Add Dish A from Restaurant A
        $this->actingAs($customer, 'sanctum')->postJson('/api/v1/cart/items', [
            'product_id' => $prodA->id,
            'quantity' => 1,
        ])->assertStatus(200);

        // Attempt to add Dish B from Restaurant B without replace_cart flag
        $conflictResponse = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/cart/items', [
            'product_id' => $prodB->id,
            'quantity' => 1,
        ]);

        $conflictResponse->assertStatus(409)
            ->assertJsonPath('conflict', true);
    }

    public function test_checkout_double_click_protection_with_idempotency_key(): void
    {
        $customerRole = Role::firstOrCreate(['name' => 'customer'], ['display_name' => 'Customer']);
        $ownerRole = Role::firstOrCreate(['name' => 'restaurant_owner'], ['display_name' => 'Owner']);

        $customer = User::factory()->create(['role_id' => $customerRole->id]);
        $owner = User::factory()->create(['role_id' => $ownerRole->id]);

        $restaurant = Restaurant::create([
            'owner_id' => $owner->id,
            'name' => 'Fast Grill',
            'slug' => 'fast-grill',
            'address' => 'Mall Road',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'delivery_fee' => 100.00,
            'minimum_order' => 100.00,
            'status' => 'approved',
            'is_open' => true,
        ]);

        $category = Category::create(['name' => 'Burgers', 'slug' => 'burgers']);
        $product = Product::create([
            'restaurant_id' => $restaurant->id,
            'category_id' => $category->id,
            'name' => 'Beef Burger',
            'slug' => 'beef-burger',
            'price' => 800.00,
            'is_available' => true,
        ]);

        $payload = [
            'idempotency_key' => 'idemp_key_unique_test_123',
            'restaurant_id' => $restaurant->id,
            'delivery_address' => [
                'street' => 'Street 5',
                'area' => 'Gulberg',
                'city' => 'Lahore',
            ],
            'payment_method' => 'cod',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 1,
                ],
            ],
        ];

        // First request
        $res1 = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/orders/checkout', $payload);
        $res1->assertStatus(201);
        $order1 = $res1->json('data');

        // Immediate duplicate request with same idempotency key
        $res2 = $this->actingAs($customer, 'sanctum')->postJson('/api/v1/orders/checkout', $payload);
        $res2->assertStatus(201);
        $order2 = $res2->json('data');

        $this->assertEquals($order1['id'], $order2['id']);
        $this->assertEquals($order1['order_number'], $order2['order_number']);
    }

    public function test_customer_cannot_view_another_customer_order(): void
    {
        $customerRole = Role::firstOrCreate(['name' => 'customer'], ['display_name' => 'Customer']);
        $ownerRole = Role::firstOrCreate(['name' => 'restaurant_owner'], ['display_name' => 'Owner']);

        $customerA = User::factory()->create(['role_id' => $customerRole->id]);
        $customerB = User::factory()->create(['role_id' => $customerRole->id]);
        $owner = User::factory()->create(['role_id' => $ownerRole->id]);

        $restaurant = Restaurant::create([
            'owner_id' => $owner->id,
            'name' => 'Rest X',
            'slug' => 'rest-x',
            'address' => 'X',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
            'is_open' => true,
        ]);

        $category = Category::create(['name' => 'Meals', 'slug' => 'meals']);
        $product = Product::create(['restaurant_id' => $restaurant->id, 'category_id' => $category->id, 'name' => 'Meal X', 'slug' => 'meal-x', 'price' => 600, 'is_available' => true]);

        // Customer A places an order
        $res = $this->actingAs($customerA, 'sanctum')->postJson('/api/v1/orders/checkout', [
            'restaurant_id' => $restaurant->id,
            'delivery_address' => ['street' => 'Street A', 'area' => 'Gulberg', 'city' => 'Lahore'],
            'payment_method' => 'cod',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ]);
        $order = $res->json('data');

        // Customer B attempts to view Customer A's order
        $intruderRes = $this->actingAs($customerB, 'sanctum')->getJson("/api/v1/orders/{$order['id']}");
        $intruderRes->assertStatus(403);
    }

    public function test_customer_cannot_hijack_another_customer_idempotency_key(): void
    {
        $customerRole = Role::firstOrCreate(['name' => 'customer'], ['display_name' => 'Customer']);
        $ownerRole = Role::firstOrCreate(['name' => 'restaurant_owner'], ['display_name' => 'Owner']);

        $customerA = User::factory()->create(['role_id' => $customerRole->id]);
        $customerB = User::factory()->create(['role_id' => $customerRole->id]);
        $owner = User::factory()->create(['role_id' => $ownerRole->id]);

        $restaurant = Restaurant::create([
            'owner_id' => $owner->id,
            'name' => 'Rest Y',
            'slug' => 'rest-y',
            'address' => 'Y',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
            'is_open' => true,
        ]);

        $category = Category::create(['name' => 'Meals', 'slug' => 'meals-y']);
        $product = Product::create(['restaurant_id' => $restaurant->id, 'category_id' => $category->id, 'name' => 'Dish Y', 'slug' => 'dish-y', 'price' => 500, 'is_available' => true]);

        $sharedKey = 'idemp_shared_key_test_999';

        // Customer A places order with key
        $resA = $this->actingAs($customerA, 'sanctum')->postJson('/api/v1/orders/checkout', [
            'idempotency_key' => $sharedKey,
            'restaurant_id' => $restaurant->id,
            'delivery_address' => ['street' => 'Street A', 'area' => 'Gulberg', 'city' => 'Lahore'],
            'payment_method' => 'cod',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ]);
        $resA->assertStatus(201);

        // Customer B attempts to reuse Customer A's key
        $resB = $this->actingAs($customerB, 'sanctum')->postJson('/api/v1/orders/checkout', [
            'idempotency_key' => $sharedKey,
            'restaurant_id' => $restaurant->id,
            'delivery_address' => ['street' => 'Street B', 'area' => 'Gulberg', 'city' => 'Lahore'],
            'payment_method' => 'cod',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ]);
        // Rejected with 422, does not return Customer A's order
        $resB->assertStatus(422);
    }
}

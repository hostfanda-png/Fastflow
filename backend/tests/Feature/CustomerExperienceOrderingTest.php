<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use App\Models\Restaurant;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductAddon;
use App\Models\CustomerAddress;
use App\Models\Favorite;
use App\Models\ProductFavorite;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Review;
use App\Models\Notification;
use App\Models\RestaurantDeliveryZone;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CustomerExperienceOrderingTest extends TestCase
{
    use RefreshDatabase;

    protected User $customer;
    protected User $otherCustomer;
    protected User $owner;
    protected Restaurant $restaurant;
    protected Category $category;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $customerRole = Role::firstOrCreate(['name' => 'customer'], ['display_name' => 'Customer']);
        $ownerRole = Role::firstOrCreate(['name' => 'restaurant_owner'], ['display_name' => 'Owner']);

        $this->customer = User::factory()->create(['role_id' => $customerRole->id]);
        $this->otherCustomer = User::factory()->create(['role_id' => $customerRole->id]);
        $this->owner = User::factory()->create(['role_id' => $ownerRole->id]);

        $this->restaurant = Restaurant::create([
            'owner_id' => $this->owner->id,
            'name' => 'Gourmet Bistro',
            'slug' => 'gourmet-bistro',
            'cuisine_type' => 'Italian',
            'address' => '100 Sunset Blvd',
            'city' => 'Beverly Hills',
            'area' => 'Downtown',
            'lat' => 34.0522,
            'lng' => -118.2437,
            'delivery_fee' => 50.00,
            'minimum_order' => 200.00,
            'service_radius_km' => 15.0,
            'status' => 'approved',
            'is_active' => true,
            'is_open' => true,
            'delivery_enabled' => true,
        ]);

        $this->category = Category::create([
            'name' => 'Main Courses',
            'slug' => 'main-courses',
        ]);

        $this->product = Product::create([
            'restaurant_id' => $this->restaurant->id,
            'category_id' => $this->category->id,
            'name' => 'Truffle Pasta',
            'slug' => 'truffle-pasta',
            'price' => 350.00,
            'is_available' => true,
        ]);
    }

    // 1. Customer Address Management & IDOR Security Tests
    public function test_customer_can_create_and_manage_addresses(): void
    {
        $response = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/customer/addresses', [
                'label' => 'Home',
                'recipient_name' => 'John Doe',
                'phone' => '+1234567890',
                'street_address' => '123 Main St, Apt 4B',
                'area' => 'Downtown',
                'city' => 'Beverly Hills',
                'lat' => 34.0530,
                'lng' => -118.2440,
                'delivery_instructions' => 'Ring bell 4B',
                'is_default' => true,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.recipient_name', 'John Doe')
            ->assertJsonPath('data.is_default', true);

        $addressId = $response->json('data.id');

        // Customer can list own addresses
        $listResponse = $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/customer/addresses');
        $listResponse->assertStatus(200)
            ->assertJsonCount(1, 'data');

        // Customer can update own address
        $updateResponse = $this->actingAs($this->customer, 'sanctum')
            ->putJson("/api/v1/customer/addresses/{$addressId}", [
                'recipient_name' => 'Johnathon Doe',
                'delivery_instructions' => 'Leave with doorman',
            ]);
        $updateResponse->assertStatus(200)
            ->assertJsonPath('data.recipient_name', 'Johnathon Doe');
    }

    public function test_customer_cannot_access_or_tamper_another_customer_address(): void
    {
        $victimAddress = CustomerAddress::create([
            'user_id' => $this->customer->id,
            'label' => 'Secret Villa',
            'recipient_name' => 'Alice',
            'phone' => '111222333',
            'street_address' => 'Private Road 99',
            'city' => 'Beverly Hills',
            'area' => 'Downtown',
            'is_default' => true,
        ]);

        // Malicious user tries to update Alice's address (IDOR prevention)
        $attackUpdate = $this->actingAs($this->otherCustomer, 'sanctum')
            ->putJson("/api/v1/customer/addresses/{$victimAddress->id}", [
                'recipient_name' => 'Hacker Name',
            ]);
        $attackUpdate->assertStatus(403);

        // Malicious user tries to delete Alice's address
        $attackDelete = $this->actingAs($this->otherCustomer, 'sanctum')
            ->deleteJson("/api/v1/customer/addresses/{$victimAddress->id}");
        $attackDelete->assertStatus(403);

        // Malicious user tries to set Alice's address as default
        $attackDefault = $this->actingAs($this->otherCustomer, 'sanctum')
            ->putJson("/api/v1/customer/addresses/{$victimAddress->id}/default");
        $attackDefault->assertStatus(403);
    }

    // 2. Restaurant Discovery & Delivery Eligibility Tests
    public function test_restaurant_discovery_and_delivery_check(): void
    {
        // Search by cuisine
        $searchResponse = $this->getJson('/api/v1/restaurants?cuisine=Italian');
        $searchResponse->assertStatus(200)
            ->assertJsonPath('status', 'success');

        // Check delivery eligibility within radius
        $eligibilityResponse = $this->getJson("/api/v1/restaurants/{$this->restaurant->id}/check-delivery?lat=34.0530&lng=-118.2440&subtotal=500");
        $eligibilityResponse->assertStatus(200)
            ->assertJsonPath('data.can_deliver', true);

        // Check delivery eligibility far away (exceeding radius)
        $farEligibilityResponse = $this->getJson("/api/v1/restaurants/{$this->restaurant->id}/check-delivery?lat=40.7128&lng=-74.0060&subtotal=500");
        $farEligibilityResponse->assertStatus(200)
            ->assertJsonPath('data.can_deliver', false);
    }

    // 3. Favorites Tests (Restaurant & Product)
    public function test_customer_can_favorite_and_unfavorite_restaurants_and_products(): void
    {
        // Favorite restaurant
        $favRest = $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/customer/favorites/{$this->restaurant->id}");
        $favRest->assertStatus(200)
            ->assertJsonPath('data.favorited', true);

        // Toggle favorite off
        $unfavRest = $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/customer/favorites/{$this->restaurant->id}");
        $unfavRest->assertStatus(200)
            ->assertJsonPath('data.favorited', false);

        // Favorite product
        $favProd = $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/customer/favorites/products/{$this->product->id}");
        $favProd->assertStatus(200)
            ->assertJsonPath('data.favorited', true);
    }

    // 4. Cart Conflict & Server-Authoritative Price Recalculation
    public function test_cart_validates_single_restaurant_and_recalculates_prices(): void
    {
        // Validate cart with server-side pricing
        $calcResponse = $this->postJson('/api/v1/cart/validate', [
            'restaurant_id' => $this->restaurant->id,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 2,
                ]
            ]
        ]);

        $calcResponse->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.subtotal', 700.00);
    }

    // 5. Order Cancellation Rules
    public function test_customer_can_cancel_pending_order_but_cannot_cancel_preparing_order(): void
    {
        $address = CustomerAddress::create([
            'user_id' => $this->customer->id,
            'street_address' => '123 Test St',
            'city' => 'Beverly Hills',
            'area' => 'Downtown',
            'is_default' => true,
        ]);

        $order = Order::create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'order_number' => 'ORD-TEST-001',
            'status' => 'pending',
            'payment_status' => 'pending',
            'subtotal' => 350.00,
            'delivery_fee' => 50.00,
            'tax' => 0.00,
            'discount' => 0.00,
            'total_amount' => 400.00,
            'delivery_address' => json_encode(['street' => '123 Test St']),
        ]);

        // Customer cancels pending order -> allowed
        $cancelPending = $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/orders/{$order->id}/cancel", [
                'reason' => 'Changed my mind',
            ]);
        $cancelPending->assertStatus(200)
            ->assertJsonPath('data.status', 'cancelled');

        // Order in preparing state cannot be cancelled by customer
        $order2 = Order::create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'order_number' => 'ORD-TEST-002',
            'status' => 'preparing',
            'payment_status' => 'paid',
            'subtotal' => 350.00,
            'delivery_fee' => 50.00,
            'tax' => 0.00,
            'discount' => 0.00,
            'total_amount' => 400.00,
            'delivery_address' => json_encode(['street' => '123 Test St']),
        ]);

        $cancelPreparing = $this->actingAs($this->customer, 'sanctum')
            ->postJson("/api/v1/orders/{$order2->id}/cancel", [
                'reason' => 'Too late',
            ]);
        $cancelPreparing->assertStatus(422);
    }

    // 6. Review & Rating Submission
    public function test_customer_can_only_review_completed_orders_they_own(): void
    {
        $deliveredOrder = Order::create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'order_number' => 'ORD-TEST-DELIVERED',
            'status' => 'delivered',
            'payment_status' => 'paid',
            'subtotal' => 350.00,
            'delivery_fee' => 50.00,
            'total_amount' => 400.00,
            'delivery_address' => json_encode(['street' => '123 Test St']),
        ]);

        // Customer submits review for delivered order
        $reviewResponse = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/reviews', [
                'order_id' => $deliveredOrder->id,
                'rating' => 5,
                'comment' => 'Exceptional taste and prompt delivery!',
            ]);
        $reviewResponse->assertStatus(201)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.rating', 5);

        // Cannot submit duplicate review for same order
        $dupReview = $this->actingAs($this->customer, 'sanctum')
            ->postJson('/api/v1/reviews', [
                'order_id' => $deliveredOrder->id,
                'rating' => 4,
                'comment' => 'Another review attempt',
            ]);
        $dupReview->assertStatus(422);

        // Other customer cannot review this order
        $otherOrder = Order::create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'order_number' => 'ORD-TEST-OTHER',
            'status' => 'delivered',
            'payment_status' => 'paid',
            'subtotal' => 350.00,
            'delivery_fee' => 50.00,
            'total_amount' => 400.00,
            'delivery_address' => json_encode(['street' => '123 Test St']),
        ]);

        $unauthorizedReview = $this->actingAs($this->otherCustomer, 'sanctum')
            ->postJson('/api/v1/reviews', [
                'order_id' => $otherOrder->id,
                'rating' => 1,
                'comment' => 'Malicious fake review',
            ]);
        $unauthorizedReview->assertStatus(403);
    }
}

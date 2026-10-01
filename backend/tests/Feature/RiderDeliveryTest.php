<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use App\Models\Restaurant;
use App\Models\Order;
use App\Models\Rider;
use Illuminate\Foundation\Testing\RefreshDatabase;

class RiderDeliveryTest extends TestCase
{
    use RefreshDatabase;

    protected Role $riderRole;
    protected Role $ownerRole;
    protected Role $adminRole;
    protected Role $customerRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->riderRole = Role::firstOrCreate(['name' => 'delivery_rider'], ['display_name' => 'Delivery Rider']);
        $this->ownerRole = Role::firstOrCreate(['name' => 'restaurant_owner'], ['display_name' => 'Restaurant Owner']);
        $this->adminRole = Role::firstOrCreate(['name' => 'super_admin'], ['display_name' => 'Super Admin']);
        $this->customerRole = Role::firstOrCreate(['name' => 'customer'], ['display_name' => 'Customer']);
    }

    /**
     * 1. Rider Isolation: Rider A cannot access Rider B's orders or use ?rider_id= manipulation
     */
    public function test_rider_cannot_access_another_riders_orders(): void
    {
        $userA = User::factory()->create(['role_id' => $this->riderRole->id]);
        $riderA = Rider::create([
            'user_id' => $userA->id,
            'vehicle_type' => 'Motorcycle',
            'vehicle_number' => 'LHR-101',
            'status' => 'available',
        ]);

        $userB = User::factory()->create(['role_id' => $this->riderRole->id]);
        $riderB = Rider::create([
            'user_id' => $userB->id,
            'vehicle_type' => 'Motorcycle',
            'vehicle_number' => 'LHR-202',
            'status' => 'available',
        ]);

        $restaurant = Restaurant::create([
            'name' => 'Test Kitchen',
            'slug' => 'test-kitchen',
            'address' => 'Mall Road',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
        ]);

        $customer = User::factory()->create(['role_id' => $this->customerRole->id]);

        $orderB = Order::create([
            'order_number' => 'FD-TEST-002',
            'customer_id' => $customer->id,
            'restaurant_id' => $restaurant->id,
            'rider_id' => $riderB->id,
            'customer_name' => 'Customer B',
            'customer_phone' => '03001234567',
            'delivery_address_json' => json_encode(['street' => 'Street 2', 'area' => 'DHA', 'city' => 'Lahore']),
            'order_status' => 'assigned_to_rider',
            'subtotal' => 1000,
            'grand_total' => 1150,
            'payment_method' => 'cod',
            'payment_status' => 'pending',
        ]);

        // Rider A attempts to query orders passing rider_id=riderB
        $response = $this->actingAs($userA, 'sanctum')
            ->getJson("/api/v1/rider/orders?rider_id={$riderB->id}");

        $response->assertStatus(200);
        // Response must only return Rider A's orders, NOT Order B!
        $orders = $response->json('data.orders.data') ?? $response->json('data.orders');
        $this->assertEmpty($orders);
    }

    /**
     * 2. Rider Isolation: Rider cannot change another rider's status
     */
    public function test_rider_cannot_change_another_riders_status(): void
    {
        $userA = User::factory()->create(['role_id' => $this->riderRole->id]);
        $riderA = Rider::create([
            'user_id' => $userA->id,
            'vehicle_type' => 'Motorcycle',
            'vehicle_number' => 'LHR-101',
            'status' => 'offline',
        ]);

        $userB = User::factory()->create(['role_id' => $this->riderRole->id]);
        $riderB = Rider::create([
            'user_id' => $userB->id,
            'vehicle_type' => 'Motorcycle',
            'vehicle_number' => 'LHR-202',
            'status' => 'available',
        ]);

        // User A calls updateStatus - it must update Rider A, not Rider B
        $response = $this->actingAs($userA, 'sanctum')
            ->putJson('/api/v1/rider/status', [
                'status' => 'available',
                'rider_id' => $riderB->id, // Tampering attempt
            ]);

        $response->assertStatus(200);
        $this->assertEquals('available', $riderA->fresh()->status);
        $this->assertEquals('available', $riderB->fresh()->status);
    }

    /**
     * 3. Cross-Tenant Restaurant Isolation: Restaurant A cannot assign Restaurant B's order
     */
    public function test_restaurant_a_cannot_assign_restaurant_b_order(): void
    {
        $ownerA = User::factory()->create(['role_id' => $this->ownerRole->id]);
        $restaurantA = Restaurant::create([
            'owner_id' => $ownerA->id,
            'name' => 'Restaurant A',
            'slug' => 'restaurant-a',
            'address' => 'Street A',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
        ]);

        $ownerB = User::factory()->create(['role_id' => $this->ownerRole->id]);
        $restaurantB = Restaurant::create([
            'owner_id' => $ownerB->id,
            'name' => 'Restaurant B',
            'slug' => 'restaurant-b',
            'address' => 'Street B',
            'city' => 'Lahore',
            'area' => 'DHA',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
        ]);

        $riderUser = User::factory()->create(['role_id' => $this->riderRole->id]);
        $rider = Rider::create([
            'user_id' => $riderUser->id,
            'vehicle_type' => 'Motorcycle',
            'vehicle_number' => 'LHR-999',
            'status' => 'available',
            'is_active' => true,
        ]);

        $customer = User::factory()->create(['role_id' => $this->customerRole->id]);
        $orderB = Order::create([
            'order_number' => 'FD-RESTB-001',
            'customer_id' => $customer->id,
            'restaurant_id' => $restaurantB->id,
            'customer_name' => 'Customer',
            'customer_phone' => '03001234567',
            'delivery_address_json' => json_encode(['street' => 'Street B', 'area' => 'DHA', 'city' => 'Lahore']),
            'order_status' => 'ready_for_pickup',
            'subtotal' => 1200,
            'grand_total' => 1350,
            'payment_method' => 'cod',
        ]);

        // Owner A attempts to assign Order B via their own restaurant route
        $response = $this->actingAs($ownerA, 'sanctum')
            ->postJson("/api/v1/owner/restaurants/{$restaurantA->id}/orders/{$orderB->id}/assign-rider", [
                'rider_id' => $rider->id,
            ]);

        // Must reject with 404 (order not found in restaurant A)
        $response->assertStatus(404);
        $this->assertNull($orderB->fresh()->rider_id);

        // Owner A attempts to invoke Restaurant B directly
        $response2 = $this->actingAs($ownerA, 'sanctum')
            ->postJson("/api/v1/owner/restaurants/{$restaurantB->id}/orders/{$orderB->id}/assign-rider", [
                'rider_id' => $rider->id,
            ]);

        // Must reject with 403 (IDOR violation)
        $response2->assertStatus(403);
    }

    /**
     * 4. Assignment Validation: Inactive or suspended riders must be rejected
     */
    public function test_inactive_or_suspended_rider_rejected_for_assignment(): void
    {
        $admin = User::factory()->create(['role_id' => $this->adminRole->id]);
        $customer = User::factory()->create(['role_id' => $this->customerRole->id]);

        $restaurant = Restaurant::create([
            'name' => 'Burger Joint',
            'slug' => 'burger-joint',
            'address' => 'Main Blvd',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
        ]);

        $order = Order::create([
            'order_number' => 'FD-ASSIGN-01',
            'customer_id' => $customer->id,
            'restaurant_id' => $restaurant->id,
            'customer_name' => 'Customer',
            'customer_phone' => '03001234567',
            'delivery_address_json' => json_encode(['street' => 'Street 1', 'area' => 'Gulberg', 'city' => 'Lahore']),
            'order_status' => 'ready_for_pickup',
            'subtotal' => 500,
            'grand_total' => 650,
            'payment_method' => 'cod',
        ]);

        $suspendedUser = User::factory()->create(['role_id' => $this->riderRole->id]);
        $suspendedRider = Rider::create([
            'user_id' => $suspendedUser->id,
            'vehicle_type' => 'Motorcycle',
            'vehicle_number' => 'SUSP-01',
            'status' => 'suspended',
            'is_active' => false,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/admin/orders/{$order->id}/assign-rider", [
                'rider_id' => $suspendedRider->id,
            ]);

        $response->assertStatus(422);
        $this->assertNull($order->fresh()->rider_id);
    }

    /**
     * 5. Assignment Validation: Unassignable order states (cancelled, delivered) must be rejected
     */
    public function test_invalid_order_state_rejected_for_assignment(): void
    {
        $admin = User::factory()->create(['role_id' => $this->adminRole->id]);
        $customer = User::factory()->create(['role_id' => $this->customerRole->id]);

        $restaurant = Restaurant::create([
            'name' => 'Pizza House',
            'slug' => 'pizza-house',
            'address' => 'Ring Road',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
        ]);

        $cancelledOrder = Order::create([
            'order_number' => 'FD-CANCELLED-01',
            'customer_id' => $customer->id,
            'restaurant_id' => $restaurant->id,
            'customer_name' => 'Customer',
            'customer_phone' => '03001234567',
            'delivery_address_json' => json_encode(['street' => 'Street 1', 'area' => 'Gulberg', 'city' => 'Lahore']),
            'order_status' => 'cancelled',
            'subtotal' => 500,
            'grand_total' => 650,
            'payment_method' => 'cod',
        ]);

        $riderUser = User::factory()->create(['role_id' => $this->riderRole->id]);
        $rider = Rider::create([
            'user_id' => $riderUser->id,
            'vehicle_type' => 'Motorcycle',
            'vehicle_number' => 'ACT-01',
            'status' => 'available',
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/admin/orders/{$cancelledOrder->id}/assign-rider", [
                'rider_id' => $rider->id,
            ]);

        $response->assertStatus(422);
    }

    /**
     * 6. Delivery Workflow: Rider cannot skip states arbitrarily (e.g. from assigned straight to delivered)
     */
    public function test_rider_cannot_skip_required_delivery_states(): void
    {
        $riderUser = User::factory()->create(['role_id' => $this->riderRole->id]);
        $rider = Rider::create([
            'user_id' => $riderUser->id,
            'vehicle_type' => 'Motorcycle',
            'vehicle_number' => 'FLOW-01',
            'status' => 'on_delivery',
            'is_active' => true,
        ]);

        $customer = User::factory()->create(['role_id' => $this->customerRole->id]);
        $restaurant = Restaurant::create([
            'name' => 'Biryani Center',
            'slug' => 'biryani-center',
            'address' => 'Anarkali',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
        ]);

        $order = Order::create([
            'order_number' => 'FD-FLOW-01',
            'customer_id' => $customer->id,
            'restaurant_id' => $restaurant->id,
            'rider_id' => $rider->id,
            'customer_name' => 'Customer',
            'customer_phone' => '03001234567',
            'delivery_address_json' => json_encode(['street' => 'Street 1', 'area' => 'Gulberg', 'city' => 'Lahore']),
            'order_status' => 'assigned_to_rider',
            'subtotal' => 600,
            'grand_total' => 750,
            'payment_method' => 'cod',
        ]);

        // Attempting to deliver an order that was not yet picked up
        $response = $this->actingAs($riderUser, 'sanctum')
            ->postJson("/api/v1/rider/orders/{$order->id}/deliver");

        $response->assertStatus(422);
        $this->assertEquals('assigned_to_rider', $order->fresh()->order_status);

        // Proper workflow: Pick up first
        $pickupRes = $this->actingAs($riderUser, 'sanctum')
            ->postJson("/api/v1/rider/orders/{$order->id}/pickup");
        $pickupRes->assertStatus(200);
        $this->assertEquals('picked_up', $order->fresh()->order_status);

        // Start delivery
        $transitRes = $this->actingAs($riderUser, 'sanctum')
            ->postJson("/api/v1/rider/orders/{$order->id}/start-delivery");
        $transitRes->assertStatus(200);
        $this->assertEquals('on_the_way', $order->fresh()->order_status);

        // Complete delivery
        $deliverRes = $this->actingAs($riderUser, 'sanctum')
            ->postJson("/api/v1/rider/orders/{$order->id}/deliver");
        $deliverRes->assertStatus(200);
        $this->assertEquals('delivered', $order->fresh()->order_status);
        $this->assertEquals('paid', $order->fresh()->payment_status);
    }

    /**
     * 7. Unauthorized Rider cannot manipulate another rider's order
     */
    public function test_unauthorized_rider_cannot_update_another_riders_order(): void
    {
        $userA = User::factory()->create(['role_id' => $this->riderRole->id]);
        $riderA = Rider::create([
            'user_id' => $userA->id,
            'vehicle_type' => 'Motorcycle',
            'vehicle_number' => 'RIDER-A',
            'status' => 'available',
        ]);

        $userB = User::factory()->create(['role_id' => $this->riderRole->id]);
        $riderB = Rider::create([
            'user_id' => $userB->id,
            'vehicle_type' => 'Motorcycle',
            'vehicle_number' => 'RIDER-B',
            'status' => 'available',
        ]);

        $customer = User::factory()->create(['role_id' => $this->customerRole->id]);
        $restaurant = Restaurant::create([
            'name' => 'Food Spot',
            'slug' => 'food-spot',
            'address' => 'Ferozepur Rd',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
        ]);

        $orderA = Order::create([
            'order_number' => 'FD-ORD-A',
            'customer_id' => $customer->id,
            'restaurant_id' => $restaurant->id,
            'rider_id' => $riderA->id,
            'customer_name' => 'Customer',
            'customer_phone' => '03001234567',
            'delivery_address_json' => json_encode(['street' => 'Street A', 'area' => 'Gulberg', 'city' => 'Lahore']),
            'order_status' => 'assigned_to_rider',
            'subtotal' => 400,
            'grand_total' => 550,
            'payment_method' => 'cod',
        ]);

        // Rider B attempts to pick up Rider A's order
        $response = $this->actingAs($userB, 'sanctum')
            ->postJson("/api/v1/rider/orders/{$orderA->id}/pickup");

        $response->assertStatus(404);
        $this->assertEquals('assigned_to_rider', $orderA->fresh()->order_status);
    }

    /**
     * 8. Courier Unassignment: Admin & Kitchen can unassign a courier prior to transit
     */
    public function test_admin_and_restaurant_can_unassign_courier(): void
    {
        $admin = User::factory()->create(['role_id' => $this->adminRole->id]);
        $owner = User::factory()->create(['role_id' => $this->ownerRole->id]);
        $restaurant = Restaurant::create([
            'owner_id' => $owner->id,
            'name' => 'Fast Kitchen',
            'slug' => 'fast-kitchen',
            'address' => 'Street 1',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
        ]);

        $riderUser = User::factory()->create(['role_id' => $this->riderRole->id]);
        $rider = Rider::create([
            'user_id' => $riderUser->id,
            'vehicle_type' => 'Motorcycle',
            'vehicle_number' => 'UNASS-1',
            'status' => 'available',
            'assigned_order_count' => 1,
            'is_active' => true,
        ]);

        $customer = User::factory()->create(['role_id' => $this->customerRole->id]);
        $order = Order::create([
            'order_number' => 'FD-UNASS-01',
            'customer_id' => $customer->id,
            'restaurant_id' => $restaurant->id,
            'rider_id' => $rider->id,
            'customer_name' => 'Customer',
            'customer_phone' => '03001234567',
            'delivery_address_json' => json_encode(['street' => 'Street A', 'area' => 'Gulberg', 'city' => 'Lahore']),
            'order_status' => 'assigned_to_rider',
            'subtotal' => 500,
            'grand_total' => 650,
            'payment_method' => 'cod',
        ]);

        // Kitchen unassigns courier
        $res = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/v1/owner/restaurants/{$restaurant->id}/orders/{$order->id}/unassign-rider");

        $res->assertStatus(200);
        $this->assertNull($order->fresh()->rider_id);
        $this->assertEquals('ready_for_pickup', $order->fresh()->order_status);
        $this->assertEquals(0, $rider->fresh()->assigned_order_count);
    }

    /**
     * 9. Unassignment rejected when order is already in-transit
     */
    public function test_cannot_unassign_courier_when_on_the_way(): void
    {
        $admin = User::factory()->create(['role_id' => $this->adminRole->id]);
        $customer = User::factory()->create(['role_id' => $this->customerRole->id]);
        $restaurant = Restaurant::create([
            'name' => 'Pizza Kitchen',
            'slug' => 'pizza-kitchen',
            'address' => 'Street 2',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
        ]);

        $riderUser = User::factory()->create(['role_id' => $this->riderRole->id]);
        $rider = Rider::create([
            'user_id' => $riderUser->id,
            'vehicle_type' => 'Motorcycle',
            'vehicle_number' => 'TRANS-01',
            'status' => 'on_delivery',
            'assigned_order_count' => 1,
            'is_active' => true,
        ]);

        $order = Order::create([
            'order_number' => 'FD-TRANS-01',
            'customer_id' => $customer->id,
            'restaurant_id' => $restaurant->id,
            'rider_id' => $rider->id,
            'customer_name' => 'Customer',
            'customer_phone' => '03001234567',
            'delivery_address_json' => json_encode(['street' => 'Street 2', 'area' => 'Gulberg', 'city' => 'Lahore']),
            'order_status' => 'on_the_way',
            'subtotal' => 800,
            'grand_total' => 950,
            'payment_method' => 'cod',
        ]);

        $res = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/admin/orders/{$order->id}/unassign-rider");

        $res->assertStatus(422);
        $this->assertEquals($rider->id, $order->fresh()->rider_id);
    }

    /**
     * 10. Double Unassignment Protection: Second unassign fails idempotently without corrupting state or counters
     */
    public function test_double_unassignment_prevented_and_state_preserved(): void
    {
        $admin = User::factory()->create(['role_id' => $this->adminRole->id]);
        $customer = User::factory()->create(['role_id' => $this->customerRole->id]);
        $restaurant = Restaurant::create([
            'name' => 'Burger Spot',
            'slug' => 'burger-spot',
            'address' => 'Street 3',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
        ]);

        $riderUser = User::factory()->create(['role_id' => $this->riderRole->id]);
        $rider = Rider::create([
            'user_id' => $riderUser->id,
            'vehicle_type' => 'Motorcycle',
            'vehicle_number' => 'DBL-01',
            'status' => 'available',
            'assigned_order_count' => 1,
            'is_active' => true,
        ]);

        $order = Order::create([
            'order_number' => 'FD-DBL-01',
            'customer_id' => $customer->id,
            'restaurant_id' => $restaurant->id,
            'rider_id' => $rider->id,
            'customer_name' => 'Customer',
            'customer_phone' => '03001234567',
            'delivery_address_json' => json_encode(['street' => 'Street 3', 'area' => 'Gulberg', 'city' => 'Lahore']),
            'order_status' => 'assigned_to_rider',
            'subtotal' => 600,
            'grand_total' => 750,
            'payment_method' => 'cod',
        ]);

        // First unassign succeeds
        $res1 = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/admin/orders/{$order->id}/unassign-rider");
        $res1->assertStatus(200);
        $res1->assertJsonPath('data.rider_id', null);
        $res1->assertJsonPath('data.order_status', 'ready_for_pickup');
        $this->assertEquals(0, $rider->fresh()->assigned_order_count);

        // Immediate second unassign fails with 422, cannot corrupt state or decrement below 0
        $res2 = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/admin/orders/{$order->id}/unassign-rider");
        $res2->assertStatus(422);
        $this->assertEquals(0, $rider->fresh()->assigned_order_count);
        $this->assertEquals('ready_for_pickup', $order->fresh()->order_status);
    }

    /**
     * 11. Authoritative Payload Verification: Unassigned endpoint returns complete order object
     */
    public function test_unassign_endpoint_returns_authoritative_order_payload(): void
    {
        $admin = User::factory()->create(['role_id' => $this->adminRole->id]);
        $customer = User::factory()->create(['role_id' => $this->customerRole->id]);
        $restaurant = Restaurant::create([
            'name' => 'Kebab Hut',
            'slug' => 'kebab-hut',
            'address' => 'Street 4',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
        ]);

        $riderUser = User::factory()->create(['role_id' => $this->riderRole->id]);
        $rider = Rider::create([
            'user_id' => $riderUser->id,
            'vehicle_type' => 'Motorcycle',
            'vehicle_number' => 'KB-01',
            'status' => 'available',
            'assigned_order_count' => 1,
            'is_active' => true,
        ]);

        $order = Order::create([
            'order_number' => 'FD-PAYLOAD-01',
            'customer_id' => $customer->id,
            'restaurant_id' => $restaurant->id,
            'rider_id' => $rider->id,
            'customer_name' => 'Customer',
            'customer_phone' => '03001234567',
            'delivery_address_json' => json_encode(['street' => 'Street 4', 'area' => 'Gulberg', 'city' => 'Lahore']),
            'order_status' => 'assigned_to_rider',
            'subtotal' => 700,
            'grand_total' => 850,
            'payment_method' => 'cod',
        ]);

        $res = $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/admin/orders/{$order->id}/unassign-rider");

        $res->assertStatus(200);
        $data = $res->json('data');
        $this->assertNotNull($data);
        $this->assertEquals($order->id, $data['id']);
        $this->assertNull($data['rider_id']);
        $this->assertEquals('ready_for_pickup', $data['order_status']);
        $this->assertArrayHasKey('restaurant', $data);
        $this->assertArrayHasKey('status_histories', $data);
    }
}

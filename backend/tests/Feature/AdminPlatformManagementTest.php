<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use App\Models\Restaurant;
use App\Models\Category;
use App\Models\Product;
use App\Models\Order;
use App\Models\Rider;
use App\Models\Setting;
use App\Models\DeliveryZone;
use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AdminPlatformManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $customer;
    protected User $owner;
    protected User $riderUser;
    protected Restaurant $restaurant;

    protected function setUp(): void
    {
        parent::setUp();

        $adminRole = Role::firstOrCreate(['name' => 'super_admin'], ['display_name' => 'Super Administrator']);
        $customerRole = Role::firstOrCreate(['name' => 'customer'], ['display_name' => 'Customer']);
        $ownerRole = Role::firstOrCreate(['name' => 'restaurant_owner'], ['display_name' => 'Restaurant Owner']);
        $riderRole = Role::firstOrCreate(['name' => 'delivery_rider'], ['display_name' => 'Delivery Rider']);

        $this->admin = User::factory()->create([
            'role_id' => $adminRole->id,
            'name' => 'Platform Administrator',
            'email' => 'admin@fastflow.test',
        ]);

        $this->customer = User::factory()->create([
            'role_id' => $customerRole->id,
            'name' => 'Regular Customer',
            'email' => 'customer@fastflow.test',
        ]);

        $this->owner = User::factory()->create([
            'role_id' => $ownerRole->id,
            'name' => 'Bistro Owner',
            'email' => 'owner@fastflow.test',
        ]);

        $this->riderUser = User::factory()->create([
            'role_id' => $riderRole->id,
            'name' => 'Fleet Courier',
            'email' => 'courier@fastflow.test',
        ]);

        $this->restaurant = Restaurant::create([
            'owner_id' => $this->owner->id,
            'name' => 'Central Bistro',
            'slug' => 'central-bistro',
            'cuisine_type' => 'Continental',
            'address' => '50 Market Plaza',
            'city' => 'Metropolis',
            'area' => 'Midtown',
            'lat' => 31.5204,
            'lng' => 74.3587,
            'delivery_fee' => 100.00,
            'minimum_order' => 400.00,
            'service_radius_km' => 12.0,
            'status' => 'pending',
            'is_active' => false,
            'is_open' => false,
            'delivery_enabled' => true,
            'commission_rate' => 15.00,
        ]);
    }

    // 1. Role-Based Access Control (RBAC) & Authorization Tests
    public function test_admin_endpoints_require_super_admin_role(): void
    {
        // Unauthenticated -> 401
        $this->getJson('/api/v1/admin/dashboard')->assertStatus(401);

        // Customer -> 403 Forbidden
        $this->actingAs($this->customer, 'sanctum')
            ->getJson('/api/v1/admin/dashboard')
            ->assertStatus(403);

        // Restaurant Owner -> 403 Forbidden
        $this->actingAs($this->owner, 'sanctum')
            ->getJson('/api/v1/admin/dashboard')
            ->assertStatus(403);

        // Rider -> 403 Forbidden
        $this->actingAs($this->riderUser, 'sanctum')
            ->getJson('/api/v1/admin/dashboard')
            ->assertStatus(403);

        // Super Admin -> 200 OK
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/dashboard')
            ->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure([
                'data' => [
                    'metrics' => [
                        'total_gmv',
                        'total_commission',
                        'total_orders',
                        'total_restaurants',
                        'approved_restaurants',
                        'pending_restaurant_approvals',
                        'total_riders',
                        'total_customers',
                    ]
                ]
            ]);
    }

    // 2. Restaurant Lifecycle: Approval, Suspension, Rejection, Reactivation
    public function test_admin_can_approve_reject_suspend_and_reactivate_restaurant(): void
    {
        // Admin approves pending restaurant
        $approveRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/restaurants/{$this->restaurant->id}/approve");

        $approveRes->assertStatus(200)
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.is_active', true);

        $this->assertDatabaseHas('restaurants', [
            'id' => $this->restaurant->id,
            'status' => 'approved',
            'is_active' => true,
        ]);

        // Verify audit log recorded
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'admin.restaurant_approve',
            'record_id' => (string)$this->restaurant->id,
        ]);

        // Admin suspends restaurant
        $suspendRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/restaurants/{$this->restaurant->id}/suspend", [
                'reason' => 'Quality check audit required',
            ]);

        $suspendRes->assertStatus(200)
            ->assertJsonPath('data.status', 'suspended')
            ->assertJsonPath('data.is_open', false);

        // Admin reactivates restaurant
        $reactivateRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/restaurants/{$this->restaurant->id}/reactivate");

        $reactivateRes->assertStatus(200)
            ->assertJsonPath('data.status', 'approved');

        // Admin rejects restaurant
        $rejectRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/v1/admin/restaurants/{$this->restaurant->id}/reject", [
                'reason' => 'Failed compliance',
            ]);

        $rejectRes->assertStatus(200)
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.is_active', false);
    }

    // 3. Restaurant Listing with Search, Status Filter & Details
    public function test_admin_can_search_and_filter_restaurants(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/restaurants?status=pending&search=Central');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $detailRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/restaurants/{$this->restaurant->id}");

        $detailRes->assertStatus(200)
            ->assertJsonPath('data.restaurant.name', 'Central Bistro')
            ->assertJsonStructure([
                'data' => [
                    'restaurant',
                    'stats' => ['total_revenue', 'total_orders', 'total_products'],
                    'recent_orders',
                ]
            ]);
    }

    // 4. Customer Management: List, Search, Status Mutation & IDOR Protection
    public function test_admin_can_manage_customers_without_exposing_sensitive_credentials(): void
    {
        $listRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/customers?search=Regular');

        $listRes->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonMissing(['password', 'remember_token']);

        // Show customer details
        $detailRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/customers/{$this->customer->id}");

        $detailRes->assertStatus(200)
            ->assertJsonPath('data.customer.email', 'customer@fastflow.test')
            ->assertJsonMissing(['password', 'remember_token']);

        // Deactivate customer account
        $deactivateRes = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/admin/customers/{$this->customer->id}/status", [
                'status' => 'inactive',
            ]);

        $deactivateRes->assertStatus(200)
            ->assertJsonPath('data.status', 'inactive');

        $this->assertDatabaseHas('users', [
            'id' => $this->customer->id,
            'status' => 'inactive',
        ]);
    }

    // 5. Order Management: Search, Filter by Status, Details Inspection
    public function test_admin_can_inspect_orders_across_the_platform(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-ADM-99881',
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'customer_name' => 'Regular Customer',
            'customer_phone' => '123456789',
            'order_status' => 'pending',
            'payment_status' => 'pending',
            'payment_method' => 'cod',
            'subtotal' => 500.00,
            'delivery_fee' => 100.00,
            'tax' => 0.00,
            'discount' => 0.00,
            'grand_total' => 600.00,
        ]);

        $orderList = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/orders?search=99881&order_status=pending');

        $orderList->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $orderDetail = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/v1/admin/orders/{$order->id}");

        $orderDetail->assertStatus(200)
            ->assertJsonPath('data.order_number', 'ORD-ADM-99881');
    }

    // 6. Global Platform Settings Management
    public function test_admin_can_read_and_update_platform_settings(): void
    {
        Setting::set('app_name', 'Fastflow Marketplace');
        Setting::set('default_commission_rate', '15.0');

        $getRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/v1/admin/settings');

        $getRes->assertStatus(200)
            ->assertJsonPath('data.app_name', 'Fastflow Marketplace');

        $updateRes = $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/v1/admin/settings', [
                'settings' => [
                    'app_name' => 'Fastflow Enterprise',
                    'default_commission_rate' => '18.0',
                ]
            ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('data.app_name', 'Fastflow Enterprise')
            ->assertJsonPath('data.default_commission_rate', '18.0');

        $this->assertDatabaseHas('settings', [
            'key' => 'app_name',
            'value' => 'Fastflow Enterprise',
        ]);
    }

    // 7. Platform Delivery Zones CRUD
    public function test_admin_can_manage_delivery_zones(): void
    {
        $storeRes = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/v1/admin/delivery-zones', [
                'name' => 'Downtown Express Zone',
                'city' => 'Metropolis',
                'radius_km' => 8.5,
                'base_fee' => 150.00,
                'per_km_fee' => 20.00,
                'is_active' => true,
            ]);

        $storeRes->assertStatus(201)
            ->assertJsonPath('data.name', 'Downtown Express Zone');

        $zoneId = $storeRes->json('data.id');

        $updateRes = $this->actingAs($this->admin, 'sanctum')
            ->putJson("/api/v1/admin/delivery-zones/{$zoneId}", [
                'base_fee' => 160.00,
            ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('data.base_fee', 160.00);

        $deleteRes = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/v1/admin/delivery-zones/{$zoneId}");

        $deleteRes->assertStatus(200);
        $this->assertDatabaseMissing('delivery_zones', ['id' => $zoneId]);
    }
}

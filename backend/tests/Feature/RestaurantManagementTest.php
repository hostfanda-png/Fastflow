<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use App\Models\Restaurant;
use App\Models\RestaurantHour;
use App\Models\RestaurantDeliveryZone;
use App\Models\Order;
use App\Models\Product;
use App\Models\Category;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

class RestaurantManagementTest extends TestCase
{
    use RefreshDatabase;

    protected Role $ownerRole;
    protected Role $customerRole;
    protected Role $riderRole;
    protected Role $adminRole;

    protected function setUp(): void
    {
        parent::setUp();

        $this->ownerRole = Role::firstOrCreate(['name' => 'restaurant_owner'], ['display_name' => 'Restaurant Owner']);
        $this->customerRole = Role::firstOrCreate(['name' => 'customer'], ['display_name' => 'Customer']);
        $this->riderRole = Role::firstOrCreate(['name' => 'delivery_rider'], ['display_name' => 'Courier']);
        $this->adminRole = Role::firstOrCreate(['name' => 'super_admin'], ['display_name' => 'Administrator']);
    }

    public function test_owner_can_access_own_restaurant(): void
    {
        $owner = User::factory()->create(['role_id' => $this->ownerRole->id]);
        $restaurant = Restaurant::create([
            'owner_id' => $owner->id,
            'name' => 'Trattoria A',
            'slug' => 'trattoria-a',
            'address' => 'Mall Road',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.52,
            'lng' => 74.35,
            'status' => 'approved',
        ]);

        $response = $this->actingAs($owner, 'sanctum')
            ->getJson("/api/v1/owner/restaurants/{$restaurant->id}");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Trattoria A');
    }

    public function test_owner_cannot_access_another_restaurant(): void
    {
        $ownerA = User::factory()->create(['role_id' => $this->ownerRole->id]);
        $ownerB = User::factory()->create(['role_id' => $this->ownerRole->id]);

        $restaurantB = Restaurant::create([
            'owner_id' => $ownerB->id,
            'name' => 'Steakhouse B',
            'slug' => 'steakhouse-b',
            'address' => 'MM Alam Road',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.51,
            'lng' => 74.36,
            'status' => 'approved',
        ]);

        $response = $this->actingAs($ownerA, 'sanctum')
            ->getJson("/api/v1/owner/restaurants/{$restaurantB->id}");

        $response->assertStatus(403);
    }

    public function test_customer_cannot_access_owner_restaurant_endpoints(): void
    {
        $customer = User::factory()->create(['role_id' => $this->customerRole->id]);
        $owner = User::factory()->create(['role_id' => $this->ownerRole->id]);

        $restaurant = Restaurant::create([
            'owner_id' => $owner->id,
            'name' => 'Burger Joint',
            'slug' => 'burger-joint',
            'address' => 'Y Block DHA',
            'city' => 'Lahore',
            'area' => 'DHA',
            'lat' => 31.48,
            'lng' => 74.40,
            'status' => 'approved',
        ]);

        $response = $this->actingAs($customer, 'sanctum')
            ->getJson("/api/v1/owner/restaurants/{$restaurant->id}");

        $response->assertStatus(403);
    }

    public function test_rider_cannot_access_owner_restaurant_endpoints(): void
    {
        $rider = User::factory()->create(['role_id' => $this->riderRole->id]);
        $owner = User::factory()->create(['role_id' => $this->ownerRole->id]);

        $restaurant = Restaurant::create([
            'owner_id' => $owner->id,
            'name' => 'Pizza House',
            'slug' => 'pizza-house',
            'address' => 'F-6 Markaz',
            'city' => 'Islamabad',
            'area' => 'F-6',
            'lat' => 33.72,
            'lng' => 73.07,
            'status' => 'approved',
        ]);

        $response = $this->actingAs($rider, 'sanctum')
            ->getJson("/api/v1/owner/restaurants/{$restaurant->id}");

        $response->assertStatus(403);
    }

    public function test_owner_cannot_change_commission_or_approve_self(): void
    {
        $owner = User::factory()->create(['role_id' => $this->ownerRole->id]);
        $restaurant = Restaurant::create([
            'owner_id' => $owner->id,
            'name' => 'Taco Place',
            'slug' => 'taco-place',
            'address' => 'F-7 Markaz',
            'city' => 'Islamabad',
            'area' => 'F-7',
            'lat' => 33.72,
            'lng' => 73.06,
            'commission_rate' => 15.00,
            'status' => 'pending',
        ]);

        // Attempting to self-approve and set commission to 0%
        $response = $this->actingAs($owner, 'sanctum')
            ->putJson("/api/v1/owner/restaurants/{$restaurant->id}", [
                'name' => 'Taco Place Updated',
                'status' => 'approved',
                'commission_rate' => 0.00,
            ]);

        $response->assertStatus(200);

        $restaurant->refresh();
        $this->assertEquals('Taco Place Updated', $restaurant->name);
        // Status remains pending and commission rate remains untouched
        $this->assertEquals('pending', $restaurant->status);
        $this->assertEquals(15.00, $restaurant->commission_rate);
    }

    public function test_opening_hours_management_and_validation(): void
    {
        $owner = User::factory()->create(['role_id' => $this->ownerRole->id]);
        $restaurant = Restaurant::create([
            'owner_id' => $owner->id,
            'name' => 'Noodle Bar',
            'slug' => 'noodle-bar',
            'address' => 'Gulshan Block 4',
            'city' => 'Karachi',
            'area' => 'Gulshan',
            'lat' => 24.92,
            'lng' => 67.09,
            'status' => 'approved',
        ]);

        $validHours = [
            'hours' => [
                [
                    'day_of_week' => 'monday',
                    'is_closed' => false,
                    'open_time' => '10:00',
                    'close_time' => '15:00',
                    'open_time_2' => '18:00',
                    'close_time_2' => '23:00',
                ],
                [
                    'day_of_week' => 'tuesday',
                    'is_closed' => true,
                ],
            ]
        ];

        $response = $this->actingAs($owner, 'sanctum')
            ->putJson("/api/v1/owner/restaurants/{$restaurant->id}/hours", $validHours);

        $response->assertStatus(200)
            ->assertJsonPath('success', true);

        $mondayHour = RestaurantHour::where('restaurant_id', $restaurant->id)->where('day_of_week', 'monday')->first();
        $this->assertNotNull($mondayHour);
        $this->assertFalse((bool)$mondayHour->is_closed);
        $this->assertEquals('10:00:00', $mondayHour->open_time);
        $this->assertEquals('15:00:00', $mondayHour->close_time);
    }

    public function test_delivery_zones_crud_operations(): void
    {
        $owner = User::factory()->create(['role_id' => $this->ownerRole->id]);
        $restaurant = Restaurant::create([
            'owner_id' => $owner->id,
            'name' => 'Shawarma Station',
            'slug' => 'shawarma-station',
            'address' => 'Johar Town',
            'city' => 'Lahore',
            'area' => 'Johar Town',
            'lat' => 31.46,
            'lng' => 74.29,
            'status' => 'approved',
        ]);

        // Create Zone
        $createResponse = $this->actingAs($owner, 'sanctum')
            ->postJson("/api/v1/owner/restaurants/{$restaurant->id}/delivery-zones", [
                'zone_name' => 'Phase 1 Delivery (Within 3km)',
                'delivery_fee' => 100.00,
                'min_order' => 450.00,
                'is_active' => true,
            ]);

        $createResponse->assertStatus(201)
            ->assertJsonPath('data.zone_name', 'Phase 1 Delivery (Within 3km)');

        $zoneId = $createResponse->json('data.id');

        // Update Zone
        $updateResponse = $this->actingAs($owner, 'sanctum')
            ->putJson("/api/v1/owner/restaurants/{$restaurant->id}/delivery-zones/{$zoneId}", [
                'zone_name' => 'Phase 1 Delivery Extended',
                'delivery_fee' => 150.00,
                'min_order' => 500.00,
                'is_active' => true,
            ]);

        $updateResponse->assertStatus(200)
            ->assertJsonPath('data.delivery_fee', 150.00);

        // Delete Zone
        $deleteResponse = $this->actingAs($owner, 'sanctum')
            ->deleteJson("/api/v1/owner/restaurants/{$restaurant->id}/delivery-zones/{$zoneId}");

        $deleteResponse->assertStatus(200);
        $this->assertDatabaseMissing('restaurant_delivery_zones', ['id' => $zoneId]);
    }

    public function test_dashboard_metrics_isolated_to_own_restaurant(): void
    {
        $ownerA = User::factory()->create(['role_id' => $this->ownerRole->id]);
        $ownerB = User::factory()->create(['role_id' => $this->ownerRole->id]);

        $restaurantA = Restaurant::create([
            'owner_id' => $ownerA->id,
            'name' => 'Cafe A',
            'slug' => 'cafe-a',
            'address' => 'Street A',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
        ]);

        $restaurantB = Restaurant::create([
            'owner_id' => $ownerB->id,
            'name' => 'Cafe B',
            'slug' => 'cafe-b',
            'address' => 'Street B',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.5,
            'lng' => 74.3,
            'status' => 'approved',
        ]);

        // Create today order for Restaurant A
        Order::create([
            'order_number' => 'ORD-TEST-A-101',
            'customer_id' => $ownerA->id,
            'restaurant_id' => $restaurantA->id,
            'customer_name' => 'Customer A',
            'delivery_address' => 'Address A',
            'subtotal' => 1000.00,
            'delivery_fee' => 100.00,
            'tax' => 50.00,
            'discount' => 0.00,
            'tip' => 0.00,
            'grand_total' => 1150.00,
            'order_status' => 'confirmed',
            'payment_status' => 'paid',
            'payment_method' => 'cod',
            'created_at' => now(),
        ]);

        // Create high-value order for Restaurant B
        Order::create([
            'order_number' => 'ORD-TEST-B-999',
            'customer_id' => $ownerB->id,
            'restaurant_id' => $restaurantB->id,
            'customer_name' => 'Customer B',
            'delivery_address' => 'Address B',
            'subtotal' => 50000.00,
            'delivery_fee' => 500.00,
            'tax' => 2500.00,
            'discount' => 0.00,
            'tip' => 0.00,
            'grand_total' => 53000.00,
            'order_status' => 'confirmed',
            'payment_status' => 'paid',
            'payment_method' => 'cod',
            'created_at' => now(),
        ]);

        // Owner A requests dashboard
        $response = $this->actingAs($ownerA, 'sanctum')
            ->getJson("/api/v1/owner/restaurants/{$restaurantA->id}/dashboard");

        $response->assertStatus(200);
        // Today's revenue must be exactly 1150.00 and NOT include Restaurant B's 53000.00
        $this->assertEquals(1150.00, (float)$response->json('data.metrics.today_revenue'));
        $this->assertEquals(1, $response->json('data.metrics.today_orders'));
    }

    public function test_restaurant_is_open_authoritative_logic(): void
    {
        $owner = User::factory()->create(['role_id' => $this->ownerRole->id]);
        $restaurant = Restaurant::create([
            'owner_id' => $owner->id,
            'name' => 'Sushi Palace',
            'slug' => 'sushi-palace',
            'address' => 'Clifton Block 2',
            'city' => 'Karachi',
            'area' => 'Clifton',
            'lat' => 24.81,
            'lng' => 67.03,
            'status' => 'approved',
            'is_active' => true,
            'is_open' => true,
        ]);

        // Define Wednesday hours: 11:00 to 22:00
        RestaurantHour::create([
            'restaurant_id' => $restaurant->id,
            'day_of_week' => 'wednesday',
            'open_time' => '11:00:00',
            'close_time' => '22:00:00',
            'is_closed' => false,
        ]);

        // Test Wednesday at 14:00 (Should be open)
        $wednesdayOpen = Carbon::parse('2026-10-07 14:00:00'); // Wednesday
        $this->assertTrue($restaurant->isOpen($wednesdayOpen));

        // Test Wednesday at 08:00 (Before opening - Should be closed)
        $wednesdayEarly = Carbon::parse('2026-10-07 08:00:00');
        $this->assertFalse($restaurant->isOpen($wednesdayEarly));

        // Test when store toggle is manually off
        $restaurant->is_open = false;
        $restaurant->save();
        $this->assertFalse($restaurant->isOpen($wednesdayOpen));

        // Test when status is pending
        $restaurant->is_open = true;
        $restaurant->status = 'pending';
        $restaurant->save();
        $this->assertFalse($restaurant->isOpen($wednesdayOpen));
    }
}

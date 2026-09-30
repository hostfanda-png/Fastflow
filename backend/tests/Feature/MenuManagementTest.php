<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use App\Models\Restaurant;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Addon;
use Illuminate\Foundation\Testing\RefreshDatabase;

class MenuManagementTest extends TestCase
{
    use RefreshDatabase;

    protected User $ownerA;
    protected User $ownerB;
    protected User $customer;
    protected Restaurant $restaurantA;
    protected Restaurant $restaurantB;

    protected function setUp(): void
    {
        parent::setUp();

        $ownerRole = Role::firstOrCreate(['name' => 'restaurant_owner'], ['display_name' => 'Owner']);
        $customerRole = Role::firstOrCreate(['name' => 'customer'], ['display_name' => 'Customer']);

        $this->ownerA = User::factory()->create(['role_id' => $ownerRole->id]);
        $this->ownerB = User::factory()->create(['role_id' => $ownerRole->id]);
        $this->customer = User::factory()->create(['role_id' => $customerRole->id]);

        $this->restaurantA = Restaurant::create([
            'owner_id' => $this->ownerA->id,
            'name' => 'Spice Garden A',
            'slug' => 'spice-garden-a',
            'address' => 'Mall Road',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.52,
            'lng' => 74.35,
            'delivery_fee' => 100.00,
            'minimum_order' => 300.00,
            'status' => 'approved',
            'is_open' => true,
        ]);

        $this->restaurantB = Restaurant::create([
            'owner_id' => $this->ownerB->id,
            'name' => 'Burger Hub B',
            'slug' => 'burger-hub-b',
            'address' => 'MM Alam Road',
            'city' => 'Lahore',
            'area' => 'Gulberg',
            'lat' => 31.53,
            'lng' => 74.36,
            'delivery_fee' => 150.00,
            'minimum_order' => 400.00,
            'status' => 'approved',
            'is_open' => true,
        ]);
    }

    public function test_owner_can_create_menu_category(): void
    {
        $response = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/owner/restaurants/{$this->restaurantA->id}/categories", [
                'name' => 'Special Appetizers',
                'description' => 'Crispy and savory starters',
                'sort_order' => 1,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Special Appetizers')
            ->assertJsonPath('data.restaurant_id', $this->restaurantA->id);

        $this->assertDatabaseHas('categories', [
            'restaurant_id' => $this->restaurantA->id,
            'name' => 'Special Appetizers',
        ]);
    }

    public function test_category_idor_protection_blocks_other_restaurant_owners(): void
    {
        $categoryA = Category::create([
            'restaurant_id' => $this->restaurantA->id,
            'name' => 'Private Menu A',
            'slug' => 'private-menu-a',
        ]);

        // Owner B tries to update Owner A's category
        $response = $this->actingAs($this->ownerB, 'sanctum')
            ->putJson("/api/v1/owner/restaurants/{$this->restaurantA->id}/categories/{$categoryA->id}", [
                'name' => 'Hacked Name',
            ]);

        $response->assertStatus(403);

        // Owner B tries to update via their own restaurant URL route parameter
        $response2 = $this->actingAs($this->ownerB, 'sanctum')
            ->putJson("/api/v1/owner/restaurants/{$this->restaurantB->id}/categories/{$categoryA->id}", [
                'name' => 'Hacked Name 2',
            ]);

        $response2->assertStatus(404);
    }

    public function test_cannot_delete_category_with_attached_products(): void
    {
        $category = Category::create([
            'restaurant_id' => $this->restaurantA->id,
            'name' => 'Mains',
            'slug' => 'mains-a',
        ]);

        Product::create([
            'restaurant_id' => $this->restaurantA->id,
            'category_id' => $category->id,
            'name' => 'Chicken Karahi',
            'slug' => 'chicken-karahi-1',
            'price' => 1400.00,
            'is_available' => true,
        ]);

        $response = $this->actingAs($this->ownerA, 'sanctum')
            ->deleteJson("/api/v1/owner/restaurants/{$this->restaurantA->id}/categories/{$category->id}");

        $response->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertDatabaseHas('categories', ['id' => $category->id]);
    }

    public function test_owner_can_create_product_with_variants_and_addons(): void
    {
        $category = Category::create([
            'restaurant_id' => $this->restaurantA->id,
            'name' => 'Gourmet Burgers',
            'slug' => 'gourmet-burgers',
        ]);

        $addon = Addon::create([
            'restaurant_id' => $this->restaurantA->id,
            'name' => 'Extra Melted Cheddar',
            'price' => 150.00,
            'is_available' => true,
        ]);

        $response = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/owner/restaurants/{$this->restaurantA->id}/products", [
                'name' => 'Smash Beef Burger',
                'category_id' => $category->id,
                'description' => 'Double smashed patty with secret sauce',
                'price' => 850.00,
                'discount_price' => 750.00,
                'preparation_time' => 20,
                'variants' => [
                    ['name' => 'Single Patty', 'price_modifier' => 0.00],
                    ['name' => 'Double Patty', 'price_modifier' => 250.00],
                ],
                'addons' => [$addon->id],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'Smash Beef Burger')
            ->assertJsonPath('data.price', 850);

        $this->assertDatabaseHas('products', [
            'restaurant_id' => $this->restaurantA->id,
            'name' => 'Smash Beef Burger',
            'price' => 850.00,
        ]);

        $this->assertDatabaseHas('product_variants', [
            'name' => 'Double Patty',
            'price_modifier' => 250.00,
        ]);
    }

    public function test_product_idor_protection_and_category_mismatch_rejected(): void
    {
        $categoryB = Category::create([
            'restaurant_id' => $this->restaurantB->id,
            'name' => 'Restaurant B Category',
            'slug' => 'rest-b-cat',
        ]);

        // Owner A tries to assign Restaurant B's category to Owner A's product
        $response = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/owner/restaurants/{$this->restaurantA->id}/products", [
                'name' => 'Cross Category Item',
                'category_id' => $categoryB->id,
                'price' => 500.00,
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_owner_can_toggle_product_availability(): void
    {
        $category = Category::create([
            'restaurant_id' => $this->restaurantA->id,
            'name' => 'Beverages',
            'slug' => 'beverages-a',
        ]);

        $product = Product::create([
            'restaurant_id' => $this->restaurantA->id,
            'category_id' => $category->id,
            'name' => 'Fresh Lemonade',
            'slug' => 'fresh-lemonade',
            'price' => 250.00,
            'is_available' => true,
        ]);

        $response = $this->actingAs($this->ownerA, 'sanctum')
            ->patchJson("/api/v1/owner/restaurants/{$this->restaurantA->id}/products/{$product->id}/toggle");

        $response->assertStatus(200)
            ->assertJsonPath('data.is_available', false);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'is_available' => false,
        ]);
    }

    public function test_public_menu_endpoint_returns_structured_active_menu(): void
    {
        $category = Category::create([
            'restaurant_id' => $this->restaurantA->id,
            'name' => 'Pizzas',
            'slug' => 'pizzas',
            'is_active' => true,
        ]);

        $product = Product::create([
            'restaurant_id' => $this->restaurantA->id,
            'category_id' => $category->id,
            'name' => 'Fajita Sicilian',
            'slug' => 'fajita-sicilian',
            'price' => 1200.00,
            'is_available' => true,
        ]);

        ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Large',
            'price_modifier' => 400.00,
            'is_active' => true,
        ]);

        $response = $this->getJson("/api/v1/restaurants/{$this->restaurantA->id}/menu");

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'restaurant',
                    'categories',
                    'products',
                ]
            ]);
    }

    public function test_cross_restaurant_addon_sync_is_strictly_rejected(): void
    {
        $category = Category::create([
            'restaurant_id' => $this->restaurantA->id,
            'name' => 'Fast Food',
            'slug' => 'fast-food-a',
        ]);

        $productA = Product::create([
            'restaurant_id' => $this->restaurantA->id,
            'category_id' => $category->id,
            'name' => 'Club Sandwich',
            'slug' => 'club-sandwich-a',
            'price' => 600.00,
            'is_available' => true,
        ]);

        $addonB = Addon::create([
            'restaurant_id' => $this->restaurantB->id,
            'name' => 'Foreign Dip B',
            'price' => 100.00,
        ]);

        $response = $this->actingAs($this->ownerA, 'sanctum')
            ->postJson("/api/v1/owner/restaurants/{$this->restaurantA->id}/products/{$productA->id}/addons/sync", [
                'addon_ids' => [$addonB->id],
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_owner_cannot_modify_or_delete_global_system_categories(): void
    {
        $globalCategory = Category::create([
            'restaurant_id' => null,
            'name' => 'Global Category',
            'slug' => 'global-category',
        ]);

        // Attempt update
        $updateRes = $this->actingAs($this->ownerA, 'sanctum')
            ->putJson("/api/v1/owner/restaurants/{$this->restaurantA->id}/categories/{$globalCategory->id}", [
                'name' => 'Hijacked Global Name',
            ]);

        $updateRes->assertStatus(404);

        // Attempt delete
        $deleteRes = $this->actingAs($this->ownerA, 'sanctum')
            ->deleteJson("/api/v1/owner/restaurants/{$this->restaurantA->id}/categories/{$globalCategory->id}");

        $deleteRes->assertStatus(404);
    }
}

<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Restaurant;
use App\Models\Category;
use App\Models\Product;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Refund;
use App\Models\Commission;
use App\Models\FinancialTransaction;
use App\Models\Settlement;
use App\Models\PaymentWebhookEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PaymentFinancialTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $customer;
    protected User $customer2;
    protected User $owner;
    protected User $owner2;
    protected Restaurant $restaurant;
    protected Restaurant $restaurant2;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'super_admin']);
        $this->customer = User::factory()->create(['role' => 'customer']);
        $this->customer2 = User::factory()->create(['role' => 'customer']);
        $this->owner = User::factory()->create(['role' => 'restaurant_owner']);
        $this->owner2 = User::factory()->create(['role' => 'restaurant_owner']);

        $this->restaurant = Restaurant::factory()->create([
            'owner_id' => $this->owner->id,
            'name' => 'Gourmet Bistro',
            'status' => 'approved',
            'is_open' => true,
            'minimum_order' => 200.00,
            'delivery_fee' => 100.00,
            'commission_rate' => 15.00,
        ]);

        $this->restaurant2 = Restaurant::factory()->create([
            'owner_id' => $this->owner2->id,
            'name' => 'Spice Haven',
            'status' => 'approved',
            'is_open' => true,
            'minimum_order' => 300.00,
            'delivery_fee' => 150.00,
            'commission_rate' => 20.00,
        ]);

        $category = Category::factory()->create(['restaurant_id' => $this->restaurant->id]);
        $this->product = Product::factory()->create([
            'restaurant_id' => $this->restaurant->id,
            'category_id' => $category->id,
            'price' => 500.00,
            'is_available' => true,
        ]);
    }

    /**
     * Test 1: COD checkout generates order, payment record in 'pending' status, and immutable ledger snapshot.
     */
    public function test_cod_checkout_creates_pending_payment_and_immutable_financial_snapshot(): void
    {
        $response = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/orders/checkout', [
            'restaurant_id' => $this->restaurant->id,
            'payment_method' => 'cod',
            'delivery_address' => [
                'street' => '45 Commercial Zone',
                'area' => 'Gulberg',
                'city' => 'Lahore',
            ],
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 2,
                ]
            ],
            'tip' => 50.00,
        ]);

        $response->assertStatus(200);
        $orderData = $response->json('data');

        $this->assertEquals('pending', $orderData['payment_status']);
        $this->assertEquals('cod', $orderData['payment_method']);

        // Assert database records
        $this->assertDatabaseHas('payments', [
            'order_id' => $orderData['id'],
            'gateway' => 'cod',
            'status' => 'pending',
        ]);

        $this->assertDatabaseHas('commissions', [
            'order_id' => $orderData['id'],
            'restaurant_id' => $this->restaurant->id,
            'order_subtotal' => 1000.00,
            'commission_rate' => 15.00,
            'commission_amount' => 150.00,
            'restaurant_net_payout' => 850.00,
            'settlement_status' => 'pending',
        ]);

        $this->assertDatabaseHas('financial_transactions', [
            'order_id' => $orderData['id'],
            'restaurant_id' => $this->restaurant->id,
            'platform_commission' => 150.00,
            'restaurant_payout' => 850.00,
            'delivery_fee' => 100.00,
            'status' => 'pending',
        ]);
    }

    /**
     * Test 2: Authorized staff/admin can mark COD payment collected.
     */
    public function test_authorized_collection_of_cod_payment_updates_ledger(): void
    {
        $order = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'grand_total' => 1180.00,
            'payment_method' => 'cod',
            'payment_status' => 'pending',
            'order_status' => 'delivered',
        ]);

        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $this->customer->id,
            'gateway' => 'cod',
            'amount' => 1180.00,
            'currency' => 'PKR',
            'status' => 'pending',
        ]);

        FinancialTransaction::create([
            'order_id' => $order->id,
            'restaurant_id' => $this->restaurant->id,
            'order_number' => $order->order_number,
            'gross_amount' => 1180.00,
            'platform_commission' => 150.00,
            'restaurant_payout' => 850.00,
            'delivery_fee' => 100.00,
            'rider_payout' => 150.00,
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/collect-cod", [
            'reference' => 'COD-CASH-REC-001',
        ]);

        $response->assertStatus(200);

        $order->refresh();
        $this->assertEquals('paid', $order->payment_status);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'status' => 'completed',
        ]);

        $this->assertDatabaseHas('financial_transactions', [
            'order_id' => $order->id,
            'status' => 'settled',
        ]);
    }

    /**
     * Test 3: Refund processing with balance verification and partial refund support.
     */
    public function test_refund_processing_validates_balance_and_records_debit_ledger(): void
    {
        $order = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'grand_total' => 1000.00,
            'payment_method' => 'cod',
            'payment_status' => 'paid',
            'order_status' => 'delivered',
        ]);

        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $this->customer->id,
            'gateway' => 'cod',
            'amount' => 1000.00,
            'refunded_amount' => 0.00,
            'currency' => 'PKR',
            'status' => 'completed',
        ]);

        // Partial Refund 1: PKR 400
        $response1 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/refund", [
            'amount' => 400.00,
            'reason' => 'Damaged side dish',
        ]);

        $response1->assertStatus(200);

        $this->assertDatabaseHas('refunds', [
            'order_id' => $order->id,
            'amount' => 400.00,
            'status' => 'completed',
        ]);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'refunded_amount' => 400.00,
            'status' => 'completed',
        ]);

        // Attempting to refund PKR 700 (which exceeds remaining 600) must fail
        $responseOverRefund = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/refund", [
            'amount' => 700.00,
            'reason' => 'Exceeding remaining balance',
        ]);

        $responseOverRefund->assertStatus(422);

        // Second Refund: Remaining PKR 600 (full order refund)
        $response2 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/refund", [
            'amount' => 600.00,
            'reason' => 'Complete customer courtesy refund',
        ]);

        $response2->assertStatus(200);

        $order->refresh();
        $this->assertEquals('refunded', $order->payment_status);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'refunded_amount' => 1000.00,
            'status' => 'refunded',
        ]);
    }

    /**
     * Test 4: Restaurant Financial Tenant Isolation (IDOR Protection).
     */
    public function test_restaurant_financial_tenant_isolation_prevents_idor(): void
    {
        // Owner 1 cannot access Owner 2's financials
        $response = $this->actingAs($this->owner, 'sanctum')->getJson("/api/v1/owner/restaurants/{$this->restaurant2->id}/financials");
        $response->assertStatus(403);

        // Owner 1 can access own restaurant financials
        $responseOwn = $this->actingAs($this->owner, 'sanctum')->getJson("/api/v1/owner/restaurants/{$this->restaurant->id}/financials");
        $responseOwn->assertStatus(200);
        $responseOwn->assertJsonStructure([
            'data' => [
                'restaurant',
                'metrics' => [
                    'gross_sales',
                    'commission_deducted',
                    'net_earnings',
                    'pending_settlement',
                    'settled_payout',
                    'currency',
                ],
                'settlements',
                'recent_transactions',
            ]
        ]);
    }

    /**
     * Test 5: Customer Payment Privacy (Isolation).
     */
    public function test_customer_payment_history_isolation(): void
    {
        $order1 = Order::factory()->create(['customer_id' => $this->customer->id, 'restaurant_id' => $this->restaurant->id]);
        $order2 = Order::factory()->create(['customer_id' => $this->customer2->id, 'restaurant_id' => $this->restaurant->id]);

        Payment::create([
            'order_id' => $order1->id,
            'customer_id' => $this->customer->id,
            'gateway' => 'cod',
            'amount' => 500.00,
            'currency' => 'PKR',
            'status' => 'completed',
        ]);

        Payment::create([
            'order_id' => $order2->id,
            'customer_id' => $this->customer2->id,
            'gateway' => 'stripe',
            'amount' => 800.00,
            'currency' => 'PKR',
            'status' => 'completed',
        ]);

        $response = $this->actingAs($this->customer, 'sanctum')->getJson('/api/v1/payments/history');
        $response->assertStatus(200);

        $items = $response->json('data.data');
        $this->assertCount(1, $items);
        $this->assertEquals($order1->id, $items[0]['order_id']);
    }

    /**
     * Test 6: Settlement Batch Creation and Payout by Super Admin.
     */
    public function test_settlement_batch_creation_and_payout(): void
    {
        $order = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'subtotal' => 2000.00,
            'grand_total' => 2300.00,
            'payment_status' => 'paid',
        ]);

        Commission::create([
            'order_id' => $order->id,
            'restaurant_id' => $this->restaurant->id,
            'order_subtotal' => 2000.00,
            'commission_rate' => 15.00,
            'commission_amount' => 300.00,
            'restaurant_net_payout' => 1700.00,
            'settlement_status' => 'pending',
            'created_at' => now()->subDay(),
        ]);

        $createRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/admin/settlements', [
            'restaurant_id' => $this->restaurant->id,
            'period_start' => now()->subDays(7)->toDateString(),
            'period_end' => now()->toDateString(),
            'notes' => 'Weekly vendor settlement batch',
        ]);

        $createRes->assertStatus(200);
        $settlementId = $createRes->json('data.id');

        $this->assertDatabaseHas('settlements', [
            'id' => $settlementId,
            'restaurant_id' => $this->restaurant->id,
            'net_payout' => 1700.00,
            'status' => 'approved',
        ]);

        // Commission row marked as settled
        $this->assertDatabaseHas('commissions', [
            'order_id' => $order->id,
            'settlement_status' => 'settled',
        ]);

        // Mark settlement paid
        $payRes = $this->actingAs($this->admin, 'sanctum')->putJson("/api/v1/admin/settlements/{$settlementId}/pay", [
            'payment_reference' => 'BANK-TRF-2026-9988',
        ]);

        $payRes->assertStatus(200);
        $this->assertDatabaseHas('settlements', [
            'id' => $settlementId,
            'status' => 'paid',
            'payment_reference' => 'BANK-TRF-2026-9988',
        ]);
    }
}

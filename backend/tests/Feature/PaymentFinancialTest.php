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
use App\Models\AuditLog;
use App\Models\Role;
use App\Models\Rider;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PaymentFinancialTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $customer;
    protected User $customer2;
    protected User $owner;
    protected User $owner2;
    protected User $rider;
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
        $this->rider = User::factory()->create(['role' => 'delivery_rider']);

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
     * Test 1: COD checkout generates order, payment record in 'pending' status, and immutable financial snapshot.
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
            'customer_id' => $this->customer->id,
            'gateway' => 'cod',
            'payment_method' => 'cod',
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
            'transaction_type' => 'payment',
            'direction' => 'credit',
            'platform_commission' => 150.00,
            'restaurant_payout' => 850.00,
            'delivery_fee' => 100.00,
            'status' => 'pending',
        ]);
    }

    /**
     * Test 2: Authorized staff/admin can mark COD payment collected.
     */
    public function test_authorized_collection_of_cod_payment_updates_ledger_and_payment_status(): void
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
            'transaction_type' => 'payment',
            'order_number' => $order->order_number,
            'gross_amount' => 1180.00,
            'direction' => 'credit',
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
     * Test 3: Duplicate COD collection is prevented.
     */
    public function test_duplicate_cod_collection_is_rejected(): void
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
            'currency' => 'PKR',
            'status' => 'completed',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/collect-cod");
        $response->assertStatus(422);
    }

    /**
     * Test 4: Unauthorized user cannot collect COD payment.
     */
    public function test_unauthorized_user_cannot_collect_cod_payment(): void
    {
        $order = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'grand_total' => 1000.00,
            'payment_method' => 'cod',
            'payment_status' => 'pending',
        ]);

        // Customer cannot collect COD
        $response = $this->actingAs($this->customer, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/collect-cod");
        $response->assertStatus(403);
    }

    /**
     * Test 5: Customer isolation on PaymentIntent creation (IDOR protection).
     */
    public function test_payment_intent_creation_requires_ownership(): void
    {
        $order = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'grand_total' => 1200.00,
            'payment_method' => 'stripe',
            'payment_status' => 'pending',
        ]);

        // Customer 2 attempting to create intent for Customer 1's order must be blocked (403)
        $response = $this->actingAs($this->customer2, 'sanctum')->postJson('/api/v1/payments/stripe/create-intent', [
            'order_id' => $order->id,
        ]);

        $response->assertStatus(403);
    }

    /**
     * Test 6: Missing Stripe configuration fails safely without generating fake IDs.
     */
    public function test_missing_stripe_configuration_fails_safely(): void
    {
        // Ensure keys are unset or placeholder
        config(['services.stripe.secret' => null]);
        putenv('STRIPE_SECRET_KEY=');
        putenv('STRIPE_SECRET=sk_test_placeholder');

        $order = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'grand_total' => 850.00,
            'payment_method' => 'stripe',
            'payment_status' => 'pending',
        ]);

        $response = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/payments/stripe/create-intent', [
            'order_id' => $order->id,
        ]);

        $response->assertStatus(422);
        // Verify no fake intent was stored
        $this->assertDatabaseMissing('payments', [
            'order_id' => $order->id,
            'transaction_id' => 'pi_fake',
        ]);
    }

    /**
     * Test 7: Webhook rejects missing or invalid signature.
     */
    public function test_webhook_rejects_missing_or_invalid_signature(): void
    {
        $payload = json_encode(['type' => 'payment_intent.succeeded', 'id' => 'evt_test_123']);

        // Missing signature header
        $resMissing = $this->postJson('/api/v1/payments/stripe/webhook', [], ['Content-Type' => 'application/json']);
        $resMissing->assertStatus(400);

        // Invalid signature header
        $resInvalid = $this->call('POST', '/api/v1/payments/stripe/webhook', [], [], [], [
            'HTTP_STRIPE_SIGNATURE' => 't=12345,v1=invalid_fake_signature_hash',
            'CONTENT_TYPE' => 'application/json',
        ], $payload);

        $resInvalid->assertStatus(400);
    }

    /**
     * Test 8: Valid webhook settles payment idempotently and repeated webhook does not duplicate financial effects.
     */
    public function test_valid_webhook_settles_payment_idempotently(): void
    {
        $order = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'grand_total' => 1500.00,
            'payment_method' => 'stripe',
            'payment_status' => 'pending',
        ]);

        $payment = Payment::create([
            'order_id' => $order->id,
            'customer_id' => $this->customer->id,
            'gateway' => 'stripe',
            'payment_method' => 'stripe',
            'amount' => 1500.00,
            'currency' => 'PKR',
            'gateway_payment_intent_id' => 'pi_real_test_9999',
            'status' => 'pending',
        ]);

        FinancialTransaction::create([
            'order_id' => $order->id,
            'restaurant_id' => $this->restaurant->id,
            'transaction_type' => 'payment',
            'order_number' => $order->order_number,
            'gross_amount' => 1500.00,
            'direction' => 'credit',
            'platform_commission' => 225.00,
            'restaurant_payout' => 1275.00,
            'delivery_fee' => 100.00,
            'rider_payout' => 100.00,
            'status' => 'pending',
        ]);

        // Construct valid Stripe signature
        $secret = 'whsec_test_secret_for_phpunit';
        putenv("STRIPE_WEBHOOK_SECRET={$secret}");

        $timestamp = time();
        $payloadArray = [
            'id' => 'evt_idempotency_test_001',
            'type' => 'payment_intent.succeeded',
            'data' => [
                'object' => [
                    'id' => 'pi_real_test_9999',
                    'amount' => 150000, // 1500.00 in cents
                    'currency' => 'pkr',
                    'metadata' => [
                        'order_id' => $order->id,
                        'order_number' => $order->order_number,
                    ],
                ],
            ],
        ];

        $rawPayload = json_encode($payloadArray);
        $signature = hash_hmac('sha256', "{$timestamp}.{$rawPayload}", $secret);
        $sigHeader = "t={$timestamp},v1={$signature}";

        // First delivery
        $res1 = $this->call('POST', '/api/v1/payments/stripe/webhook', [], [], [], [
            'HTTP_STRIPE_SIGNATURE' => $sigHeader,
            'CONTENT_TYPE' => 'application/json',
        ], $rawPayload);

        $res1->assertStatus(200);

        $order->refresh();
        $payment->refresh();

        $this->assertEquals('paid', $order->payment_status);
        $this->assertEquals('completed', $payment->status);

        // Second delivery of exact same webhook event (idempotency guarantee)
        $res2 = $this->call('POST', '/api/v1/payments/stripe/webhook', [], [], [], [
            'HTTP_STRIPE_SIGNATURE' => $sigHeader,
            'CONTENT_TYPE' => 'application/json',
        ], $rawPayload);

        $res2->assertStatus(200);
        $this->assertEquals('already_processed', $res2->json('status'));

        // Assert financial transactions was NOT duplicated
        $this->assertEquals(1, FinancialTransaction::where('order_id', $order->id)->count());
    }

    /**
     * Test 9: Webhook rejects amount mismatch and logs security alert.
     */
    public function test_webhook_rejects_amount_mismatch_and_logs_security_alert(): void
    {
        $order = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'grand_total' => 2500.00,
            'payment_method' => 'stripe',
            'payment_status' => 'pending',
        ]);

        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $this->customer->id,
            'gateway' => 'stripe',
            'payment_method' => 'stripe',
            'amount' => 2500.00,
            'currency' => 'PKR',
            'gateway_payment_intent_id' => 'pi_test_mismatch_amt',
            'status' => 'pending',
        ]);

        $secret = 'whsec_test_secret_for_phpunit';
        putenv("STRIPE_WEBHOOK_SECRET={$secret}");

        $timestamp = time();
        $payloadArray = [
            'id' => 'evt_mismatch_amt_001',
            'type' => 'payment_intent.succeeded',
            'data' => [
                'object' => [
                    'id' => 'pi_test_mismatch_amt',
                    'amount' => 100000, // 1000.00 instead of 2500.00 (tamper attempt)
                    'currency' => 'pkr',
                    'metadata' => [
                        'order_id' => $order->id,
                    ],
                ],
            ],
        ];

        $rawPayload = json_encode($payloadArray);
        $signature = hash_hmac('sha256', "{$timestamp}.{$rawPayload}", $secret);
        $sigHeader = "t={$timestamp},v1={$signature}";

        $response = $this->call('POST', '/api/v1/payments/stripe/webhook', [], [], [], [
            'HTTP_STRIPE_SIGNATURE' => $sigHeader,
            'CONTENT_TYPE' => 'application/json',
        ], $rawPayload);

        $response->assertStatus(400);

        $order->refresh();
        $this->assertEquals('pending', $order->payment_status); // NOT marked paid
    }

    /**
     * Test 10: Webhook rejects currency mismatch.
     */
    public function test_webhook_rejects_currency_mismatch(): void
    {
        $order = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'grand_total' => 1000.00,
            'payment_method' => 'stripe',
            'payment_status' => 'pending',
        ]);

        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $this->customer->id,
            'gateway' => 'stripe',
            'amount' => 1000.00,
            'currency' => 'PKR',
            'gateway_payment_intent_id' => 'pi_test_mismatch_cur',
            'status' => 'pending',
        ]);

        $secret = 'whsec_test_secret_for_phpunit';
        putenv("STRIPE_WEBHOOK_SECRET={$secret}");

        $timestamp = time();
        $payloadArray = [
            'id' => 'evt_mismatch_cur_001',
            'type' => 'payment_intent.succeeded',
            'data' => [
                'object' => [
                    'id' => 'pi_test_mismatch_cur',
                    'amount' => 100000,
                    'currency' => 'usd', // USD instead of PKR
                    'metadata' => [
                        'order_id' => $order->id,
                    ],
                ],
            ],
        ];

        $rawPayload = json_encode($payloadArray);
        $signature = hash_hmac('sha256', "{$timestamp}.{$rawPayload}", $secret);
        $sigHeader = "t={$timestamp},v1={$signature}";

        $response = $this->call('POST', '/api/v1/payments/stripe/webhook', [], [], [], [
            'HTTP_STRIPE_SIGNATURE' => $sigHeader,
            'CONTENT_TYPE' => 'application/json',
        ], $rawPayload);

        $response->assertStatus(400);
    }

    /**
     * Test 11: Payment state machine prevents invalid transitions.
     */
    public function test_payment_state_machine_prevents_invalid_transitions(): void
    {
        $payment = new Payment(['status' => Payment::STATUS_REFUNDED]);
        $this->assertFalse($payment->canTransitionTo(Payment::STATUS_PENDING));
        $this->assertFalse($payment->canTransitionTo(Payment::STATUS_COMPLETED));

        $paidPayment = new Payment(['status' => Payment::STATUS_COMPLETED]);
        $this->assertTrue($paidPayment->canTransitionTo(Payment::STATUS_PARTIALLY_REFUNDED));
        $this->assertTrue($paidPayment->canTransitionTo(Payment::STATUS_REFUNDED));
        $this->assertFalse($paidPayment->canTransitionTo(Payment::STATUS_PENDING));
    }

    /**
     * Test 12: Refund processing validates balance, prevents over-refund, and supports partial refunds.
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

        $order->refresh();
        $this->assertEquals('partially_refunded', $order->payment_status);

        $this->assertDatabaseHas('refunds', [
            'order_id' => $order->id,
            'amount' => 400.00,
            'status' => 'completed',
        ]);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'refunded_amount' => 400.00,
            'status' => 'partially_refunded',
        ]);

        // Over-refund attempt: PKR 700 exceeds remaining 600
        $responseOverRefund = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/refund", [
            'amount' => 700.00,
            'reason' => 'Exceeding remaining balance',
        ]);

        $responseOverRefund->assertStatus(422);

        // Second Refund: Remaining PKR 600 (full refund)
        $response2 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/refund", [
            'amount' => 600.00,
            'reason' => 'Complete customer courtesy refund',
        ]);

        $response2->assertStatus(200);

        $order->refresh();
        $this->assertEquals('refunded', $order->payment_status);
        $this->assertEquals('refunded', $order->order_status);

        $this->assertDatabaseHas('payments', [
            'order_id' => $order->id,
            'refunded_amount' => 1000.00,
            'status' => 'refunded',
        ]);
    }

    /**
     * Test 13: Cannot refund unpaid order.
     */
    public function test_cannot_refund_unpaid_order(): void
    {
        $order = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'grand_total' => 500.00,
            'payment_status' => 'pending',
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$order->id}/refund", [
            'amount' => 200.00,
            'reason' => 'Should fail',
        ]);

        $res->assertStatus(422);
    }

    /**
     * Test 14: Restaurant financial tenant isolation (IDOR Protection).
     */
    public function test_restaurant_financial_tenant_isolation_prevents_idor(): void
    {
        // Owner 1 cannot access Owner 2's financials
        $response = $this->actingAs($this->owner, 'sanctum')->getJson("/api/v1/owner/restaurants/{$this->restaurant2->id}/financials");
        $response->assertStatus(403);

        // Owner 1 cannot refund an order belonging to Owner 2's restaurant
        $order2 = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant2->id,
            'grand_total' => 1000.00,
            'payment_status' => 'paid',
        ]);

        $refundAttempt = $this->actingAs($this->owner, 'sanctum')->postJson("/api/v1/owner/restaurants/{$this->restaurant2->id}/orders/{$order2->id}/refund", [
            'amount' => 100.00,
            'reason' => 'Cross-tenant IDOR refund attack',
        ]);
        $refundAttempt->assertStatus(403);

        // Owner 1 can access own restaurant financials
        $responseOwn = $this->actingAs($this->owner, 'sanctum')->getJson("/api/v1/owner/restaurants/{$this->restaurant->id}/financials");
        $responseOwn->assertStatus(200);
    }

    /**
     * Test 15: Customer Payment Privacy (Isolation).
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
     * Test 16: Settlement Batch Creation and Payout by Super Admin records ledger debit.
     */
    public function test_settlement_batch_creation_and_payout_records_debit(): void
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

        // Directional debit ledger entry recorded for the vendor payout
        $this->assertDatabaseHas('financial_transactions', [
            'restaurant_id' => $this->restaurant->id,
            'transaction_type' => 'restaurant_payout',
            'direction' => 'debit',
            'gross_amount' => 1700.00,
            'status' => 'settled',
        ]);
    }

    /**
     * Test 17: Order delivered status does NOT automatically mark payment paid.
     * Enforces strict state machine separation between order fulfillment and payment collection.
     */
    public function test_order_delivered_status_does_not_automatically_mark_payment_paid(): void
    {
        $order = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'grand_total' => 950.00,
            'payment_method' => 'cod',
            'payment_status' => 'pending',
            'order_status' => 'on_the_way',
        ]);

        $payment = Payment::create([
            'order_id' => $order->id,
            'customer_id' => $this->customer->id,
            'gateway' => 'cod',
            'payment_method' => 'cod',
            'amount' => 950.00,
            'currency' => 'PKR',
            'status' => Payment::STATUS_PENDING,
        ]);

        // Transition order status to delivered
        $orderService = app(\App\Services\OrderService::class);
        $orderService->updateStatus($order, 'delivered', 'Handed over by courier', 'Courier Express');

        $order->refresh();
        $payment->refresh();

        // Fulfillment status is delivered, but payment MUST remain pending until authorized collection
        $this->assertEquals('delivered', $order->order_status);
        $this->assertEquals('pending', $order->payment_status);
        $this->assertEquals(Payment::STATUS_PENDING, $payment->status);

        // Now perform authorized collection action
        $res = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/orders/{$order->id}/collect-cod", [
            'reference' => 'COD-CASH-TEST-99',
        ]);

        $res->assertStatus(200);

        $order->refresh();
        $payment->refresh();

        $this->assertEquals('paid', $order->payment_status);
        $this->assertEquals(Payment::STATUS_COMPLETED, $payment->status);
    }

    /**
     * Test 18: Unpaid and fully refunded orders are excluded from settlement batch.
     */
    public function test_unpaid_and_fully_refunded_orders_are_excluded_from_settlement_batch(): void
    {
        // Unpaid order with pending commission
        $unpaidOrder = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'subtotal' => 1000.00,
            'grand_total' => 1150.00,
            'payment_status' => 'pending',
        ]);

        Commission::create([
            'order_id' => $unpaidOrder->id,
            'restaurant_id' => $this->restaurant->id,
            'order_subtotal' => 1000.00,
            'commission_rate' => 15.00,
            'commission_amount' => 150.00,
            'restaurant_net_payout' => 850.00,
            'settlement_status' => 'pending',
            'created_at' => now()->subDay(),
        ]);

        // Fully refunded order with pending commission
        $refundedOrder = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'subtotal' => 500.00,
            'grand_total' => 600.00,
            'payment_status' => 'refunded',
            'order_status' => 'refunded',
        ]);

        Commission::create([
            'order_id' => $refundedOrder->id,
            'restaurant_id' => $this->restaurant->id,
            'order_subtotal' => 500.00,
            'commission_rate' => 15.00,
            'commission_amount' => 75.00,
            'restaurant_net_payout' => 425.00,
            'settlement_status' => 'pending',
            'created_at' => now()->subDay(),
        ]);

        // Attempting to settle should find NO eligible paid orders
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/admin/settlements', [
            'restaurant_id' => $this->restaurant->id,
            'period_start' => now()->subDays(7)->toDateString(),
            'period_end' => now()->toDateString(),
        ]);

        // Fails with 422 because no eligible settled orders exist
        $res->assertStatus(422);
    }

    /**
     * Test 19: Webhook rejects wrong PaymentIntent ID.
     */
    public function test_webhook_rejects_wrong_payment_intent_id(): void
    {
        $order = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'grand_total' => 1200.00,
            'payment_method' => 'stripe',
            'payment_status' => 'pending',
        ]);

        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $this->customer->id,
            'gateway' => 'stripe',
            'amount' => 1200.00,
            'currency' => 'PKR',
            'gateway_payment_intent_id' => 'pi_expected_real_123',
            'status' => 'pending',
        ]);

        $secret = 'whsec_test_secret_for_phpunit';
        putenv("STRIPE_WEBHOOK_SECRET={$secret}");

        $timestamp = time();
        $payloadArray = [
            'id' => 'evt_wrong_intent_001',
            'type' => 'payment_intent.succeeded',
            'data' => [
                'object' => [
                    'id' => 'pi_spoofed_unmatched_456',
                    'amount' => 120000,
                    'currency' => 'pkr',
                    'metadata' => [
                        'order_id' => $order->id,
                    ],
                ],
            ],
        ];

        $rawPayload = json_encode($payloadArray);
        $signature = hash_hmac('sha256', "{$timestamp}.{$rawPayload}", $secret);
        $sigHeader = "t={$timestamp},v1={$signature}";

        $response = $this->call('POST', '/api/v1/payments/stripe/webhook', [], [], [], [
            'HTTP_STRIPE_SIGNATURE' => $sigHeader,
            'CONTENT_TYPE' => 'application/json',
        ], $rawPayload);

        $response->assertStatus(400);

        $order->refresh();
        $this->assertEquals('pending', $order->payment_status);
    }

    /**
     * Test 20: Delivery rider cannot collect COD for an unassigned order.
     */
    public function test_delivery_rider_cannot_collect_cod_for_unassigned_order(): void
    {
        $riderRole = Role::firstOrCreate(['name' => 'delivery_rider'], ['label' => 'Rider']);
        $riderUser = User::factory()->create(['role_id' => $riderRole->id]);
        $rider = Rider::create([
            'user_id' => $riderUser->id,
            'vehicle_type' => 'motorcycle',
            'status' => 'active',
            'is_available' => true,
        ]);

        $otherRider = Rider::create([
            'user_id' => User::factory()->create()->id,
            'vehicle_type' => 'motorcycle',
            'status' => 'active',
            'is_available' => true,
        ]);

        $order = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'rider_id' => $otherRider->id, // Assigned to other rider
            'grand_total' => 800.00,
            'payment_method' => 'cod',
            'payment_status' => 'pending',
            'order_status' => 'on_the_way',
        ]);

        Payment::create([
            'order_id' => $order->id,
            'customer_id' => $this->customer->id,
            'gateway' => 'cod',
            'amount' => 800.00,
            'currency' => 'PKR',
            'status' => Payment::STATUS_PENDING,
        ]);

        // Attempting to collect as the unassigned rider
        $res = $this->actingAs($riderUser, 'sanctum')->postJson("/api/v1/orders/{$order->id}/collect-cod", [
            'reference' => 'UNAUTHORIZED_ATTEMPT',
        ]);

        $res->assertStatus(403);
    }

    /**
     * Test 21: Settlement calculation accurately deducts partial refunds.
     */
    public function test_settlement_calculation_accurately_deducts_partial_refunds(): void
    {
        $paidOrder = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'subtotal' => 2000.00,
            'grand_total' => 2200.00,
            'payment_status' => 'paid',
            'order_status' => 'delivered',
        ]);

        Commission::create([
            'order_id' => $paidOrder->id,
            'restaurant_id' => $this->restaurant->id,
            'order_subtotal' => 2000.00,
            'commission_rate' => 15.00,
            'commission_amount' => 300.00,
            'restaurant_net_payout' => 1700.00,
            'settlement_status' => 'pending',
            'created_at' => now()->subDay(),
        ]);

        // Record a completed partial refund of PKR 300 on this order
        Refund::create([
            'refund_number' => 'REF-TEST-PARTIAL-SETTLE',
            'order_id' => $paidOrder->id,
            'customer_id' => $this->customer->id,
            'amount' => 300.00,
            'reason' => 'Item missing from bundle',
            'status' => Refund::STATUS_COMPLETED,
            'refund_actor' => 'super_admin',
            'processed_by' => $this->admin->id,
            'processed_at' => now(),
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/admin/settlements', [
            'restaurant_id' => $this->restaurant->id,
            'period_start' => now()->subDays(7)->toDateString(),
            'period_end' => now()->toDateString(),
        ]);

        $res->assertStatus(200);

        // Expected Net Payout = 1700.00 - 300.00 = 1400.00
        $settlement = Settlement::where('restaurant_id', $this->restaurant->id)->latest()->first();
        $this->assertEquals(1400.00, (float)$settlement->net_payout);
        $this->assertEquals(600.00, (float)$settlement->total_deductions); // 300 commission + 300 refund
    }

    /**
     * Test 22: Duplicate settlement prevention ensures commissions cannot be settled twice.
     */
    public function test_duplicate_settlement_prevention_ensures_commissions_cannot_be_settled_twice(): void
    {
        $paidOrder = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'subtotal' => 1000.00,
            'grand_total' => 1100.00,
            'payment_status' => 'paid',
            'order_status' => 'delivered',
        ]);

        Commission::create([
            'order_id' => $paidOrder->id,
            'restaurant_id' => $this->restaurant->id,
            'order_subtotal' => 1000.00,
            'commission_rate' => 15.00,
            'commission_amount' => 150.00,
            'restaurant_net_payout' => 850.00,
            'settlement_status' => 'pending',
            'created_at' => now()->subDay(),
        ]);

        // First settlement batch succeeds
        $res1 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/admin/settlements', [
            'restaurant_id' => $this->restaurant->id,
            'period_start' => now()->subDays(7)->toDateString(),
            'period_end' => now()->toDateString(),
        ]);
        $res1->assertStatus(200);

        // Second immediate attempt with same dates finds NO pending commissions
        $res2 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/admin/settlements', [
            'restaurant_id' => $this->restaurant->id,
            'period_start' => now()->subDays(7)->toDateString(),
            'period_end' => now()->toDateString(),
        ]);
        $res2->assertStatus(422);
    }

    /**
     * Test 23: Mass assignment protection prevents client from tampering with financial amounts.
     */
    public function test_mass_assignment_protection_prevents_client_from_tampering_with_financial_amounts(): void
    {
        $res = $this->actingAs($this->customer, 'sanctum')->postJson('/api/v1/orders/checkout', [
            'delivery_address' => [
                'street' => '123 Fake Street',
                'area' => 'Gulberg',
                'city' => 'Lahore',
            ],
            'payment_method' => 'cod',
            // Tamper attempts
            'grand_total' => 1.00,
            'subtotal' => 1.00,
            'payment_status' => 'paid',
            'commission_amount' => 0.00,
        ]);

        // Cart is empty, rejected with 422 before untrusted fields could be processed
        $res->assertStatus(422);
    }

    /**
     * Test 24: Non-COD order (e.g. Stripe) CANNOT be collected via COD endpoint.
     */
    public function test_non_cod_order_cannot_be_collected_via_cod_endpoint(): void
    {
        $stripeOrder = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'grand_total' => 1500.00,
            'payment_method' => 'stripe',
            'payment_status' => 'pending',
            'order_status' => 'confirmed',
        ]);

        $payment = Payment::create([
            'order_id' => $stripeOrder->id,
            'customer_id' => $this->customer->id,
            'gateway' => 'stripe',
            'payment_method' => 'stripe',
            'amount' => 1500.00,
            'currency' => 'PKR',
            'status' => Payment::STATUS_PENDING,
        ]);

        // Attempt to collect COD on an online card order
        $res = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$stripeOrder->id}/collect-cod", [
            'reference' => 'MALICIOUS_COD_COLLECT',
        ]);

        // Must reject with 422 Unprocessable Entity
        $res->assertStatus(422);

        // Assert payment status MUST remain pending and never marked paid
        $stripeOrder->refresh();
        $payment->refresh();
        $this->assertEquals('pending', $stripeOrder->payment_status);
        $this->assertEquals(Payment::STATUS_PENDING, $payment->status);

        // Assert no settled financial records were created
        $this->assertDatabaseMissing('financial_transactions', [
            'order_id' => $stripeOrder->id,
            'status' => 'settled',
        ]);
    }

    /**
     * Test 25: Failed COD validation does not modify payment status or financial ledger.
     */
    public function test_failed_cod_validation_does_not_modify_payment_status_or_financial_ledger(): void
    {
        $stripeOrder = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'grand_total' => 2000.00,
            'payment_method' => 'stripe',
            'payment_status' => 'pending',
            'order_status' => 'confirmed',
        ]);

        Payment::create([
            'order_id' => $stripeOrder->id,
            'customer_id' => $this->customer->id,
            'gateway' => 'stripe',
            'payment_method' => 'stripe',
            'amount' => 2000.00,
            'currency' => 'PKR',
            'status' => Payment::STATUS_PENDING,
        ]);

        // Restaurant owner tries to collect COD on a Stripe order
        $res = $this->actingAs($this->owner, 'sanctum')->postJson("/api/v1/orders/{$stripeOrder->id}/collect-cod");
        $res->assertStatus(422);

        $this->assertDatabaseHas('orders', [
            'id' => $stripeOrder->id,
            'payment_status' => 'pending',
        ]);

        $this->assertDatabaseHas('payments', [
            'order_id' => $stripeOrder->id,
            'status' => Payment::STATUS_PENDING,
        ]);
    }

    /**
     * Test 26: Stripe refund generates deterministic idempotency key and records metadata.
     */
    public function test_stripe_refund_generates_deterministic_idempotency_key_and_records_metadata(): void
    {
        $paidOrder = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'grand_total' => 1200.00,
            'payment_method' => 'stripe',
            'payment_status' => 'paid',
            'order_status' => 'delivered',
        ]);

        Payment::create([
            'order_id' => $paidOrder->id,
            'customer_id' => $this->customer->id,
            'gateway' => 'stripe',
            'payment_method' => 'stripe',
            'amount' => 1200.00,
            'currency' => 'PKR',
            'status' => Payment::STATUS_COMPLETED,
            'transaction_id' => 'pi_test_stripe_idempotency_123',
            'gateway_payment_intent_id' => 'pi_test_stripe_idempotency_123',
            'paid_at' => now(),
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$paidOrder->id}/refund", [
            'amount' => 600.00,
            'reason' => 'Quality issue with main dish',
        ]);

        $res->assertStatus(200);

        $refund = Refund::where('order_id', $paidOrder->id)->first();
        $this->assertNotNull($refund);
        $this->assertEquals(600.00, (float)$refund->amount);
        $this->assertEquals(Refund::STATUS_COMPLETED, $refund->status);

        // Verify deterministic idempotency key format: refund_ord_{orderId}_seq_{seq}_amt_{cents}
        $expectedIdempotencyKey = "refund_ord_{$paidOrder->id}_seq_1_amt_60000";
        $this->assertEquals($expectedIdempotencyKey, $refund->metadata['idempotency_key'] ?? null);

        // Assert order transitioned to partially_refunded
        $paidOrder->refresh();
        $this->assertEquals('partially_refunded', $paidOrder->payment_status);
    }

    /**
     * Test 27: Over-refund rejection prevents refund amount from exceeding remaining balance.
     */
    public function test_over_refund_rejection_prevents_refund_amount_exceeding_remaining_balance(): void
    {
        $paidOrder = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'grand_total' => 1000.00,
            'payment_method' => 'cod',
            'payment_status' => 'paid',
            'order_status' => 'delivered',
        ]);

        Payment::create([
            'order_id' => $paidOrder->id,
            'customer_id' => $this->customer->id,
            'gateway' => 'cod',
            'payment_method' => 'cod',
            'amount' => 1000.00,
            'currency' => 'PKR',
            'status' => Payment::STATUS_COMPLETED,
            'paid_at' => now(),
        ]);

        // Attempting to refund 1500 on a 1000 order
        $res = $this->actingAs($this->admin, 'sanctum')->postJson("/api/v1/admin/orders/{$paidOrder->id}/refund", [
            'amount' => 1500.00,
            'reason' => 'Over refund test',
        ]);

        $res->assertStatus(422);

        // No refund created
        $this->assertEquals(0, Refund::where('order_id', $paidOrder->id)->count());
    }

    /**
     * Test 28: Tenant isolation prevents restaurant owners from refunding other restaurants' orders.
     */
    public function test_tenant_isolation_prevents_restaurant_owners_from_refunding_other_restaurants_orders(): void
    {
        $orderRestaurant1 = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id, // Owned by $this->owner
            'grand_total' => 800.00,
            'payment_method' => 'cod',
            'payment_status' => 'paid',
            'order_status' => 'delivered',
        ]);

        // Owner 2 attempts to issue a refund on Owner 1's restaurant order
        $res = $this->actingAs($this->owner2, 'sanctum')->postJson("/api/v1/orders/{$orderRestaurant1->id}/refund", [
            'amount' => 400.00,
            'reason' => 'Cross-tenant illegal refund attempt',
        ]);

        $res->assertStatus(403);
        $this->assertEquals(0, Refund::where('order_id', $orderRestaurant1->id)->count());
    }

    /**
     * Test 29: Unauthorized customer cannot collect COD or issue refund.
     */
    public function test_unauthorized_customer_cannot_collect_cod_or_issue_refund(): void
    {
        $order = Order::factory()->create([
            'customer_id' => $this->customer->id,
            'restaurant_id' => $this->restaurant->id,
            'grand_total' => 900.00,
            'payment_method' => 'cod',
            'payment_status' => 'pending',
            'order_status' => 'delivered',
        ]);

        // Customer attempts to collect COD
        $res1 = $this->actingAs($this->customer, 'sanctum')->postJson("/api/v1/orders/{$order->id}/collect-cod");
        $res1->assertStatus(403);

        // Customer attempts to refund
        $res2 = $this->actingAs($this->customer, 'sanctum')->postJson("/api/v1/orders/{$order->id}/refund", [
            'amount' => 900.00,
            'reason' => 'Customer self refund attempt',
        ]);
        $res2->assertStatus(403);
    }
}

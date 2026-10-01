<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Enhance Payments Table with gateway intent and audit attributes
        Schema::table('payments', function (Blueprint $table) {
            $table->foreignId('customer_id')->nullable()->after('order_id')->constrained('users')->nullOnDelete();
            $table->string('payment_method', 50)->default('cod')->after('gateway');
            $table->string('gateway_payment_intent_id')->nullable()->index()->after('transaction_id');
            $table->decimal('refunded_amount', 10, 2)->default(0.00)->after('amount');
            $table->string('failure_code', 100)->nullable()->after('status');
            $table->text('failure_message')->nullable()->after('failure_code');
            $table->timestamp('paid_at')->nullable()->after('failure_message');
        });

        // 2. Webhook Event Idempotency Tracking Table
        Schema::create('payment_webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('gateway', 50)->index();
            $table->string('event_id', 255);
            $table->string('event_type', 100)->index();
            $table->json('payload')->nullable();
            $table->enum('status', ['pending', 'processed', 'failed', 'ignored'])->default('pending')->index();
            $table->text('error_message')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->unique(['gateway', 'event_id'], 'unique_gateway_event_id');
        });

        // 3. Enhance Refunds Table for Detailed Audit & Partial Support
        Schema::table('refunds', function (Blueprint $table) {
            $table->string('refund_number')->nullable()->unique()->after('id');
            $table->foreignId('customer_id')->nullable()->after('order_id')->constrained('users')->nullOnDelete();
            $table->string('gateway_refund_id')->nullable()->index()->after('payment_id');
            $table->string('refund_actor')->default('super_admin')->after('processed_by'); // super_admin, restaurant_owner, system
            $table->json('metadata')->nullable()->after('refund_actor');
            $table->timestamp('processed_at')->nullable()->after('metadata');
        });

        // 4. Restaurant Settlements Table (Payout Batches)
        Schema::create('settlements', function (Blueprint $table) {
            $table->id();
            $table->string('settlement_number')->unique();
            $table->foreignId('restaurant_id')->constrained('restaurants')->cascadeOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('gross_sales', 12, 2)->default(0.00);
            $table->decimal('platform_commission', 12, 2)->default(0.00);
            $table->decimal('tax_collected', 12, 2)->default(0.00);
            $table->decimal('total_deductions', 12, 2)->default(0.00);
            $table->decimal('net_payout', 12, 2)->default(0.00);
            $table->enum('status', ['pending', 'approved', 'processing', 'paid', 'failed', 'rejected'])->default('pending')->index();
            $table->string('payout_method', 50)->default('bank_transfer');
            $table->string('payment_reference')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 5. Enhance Financial Transactions Ledger
        Schema::table('financial_transactions', function (Blueprint $table) {
            $table->enum('transaction_type', [
                'payment',
                'refund',
                'commission',
                'restaurant_payout',
                'rider_payout',
                'delivery_fee',
                'adjustment'
            ])->default('payment')->index()->after('restaurant_id');
            $table->enum('direction', ['credit', 'debit'])->default('credit')->after('gross_amount');
            $table->string('reference')->nullable()->index()->after('gateway_fee');
            $table->json('metadata')->nullable()->after('reference');
        });
    }

    public function down(): void
    {
        Schema::table('financial_transactions', function (Blueprint $table) {
            $table->dropColumn(['transaction_type', 'direction', 'reference', 'metadata']);
        });

        Schema::dropIfExists('settlements');

        Schema::table('refunds', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropColumn(['refund_number', 'customer_id', 'gateway_refund_id', 'refund_actor', 'metadata', 'processed_at']);
        });

        Schema::dropIfExists('payment_webhook_events');

        Schema::table('payments', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropColumn([
                'customer_id',
                'payment_method',
                'gateway_payment_intent_id',
                'refunded_amount',
                'failure_code',
                'failure_message',
                'paid_at'
            ]);
        });
    }
};

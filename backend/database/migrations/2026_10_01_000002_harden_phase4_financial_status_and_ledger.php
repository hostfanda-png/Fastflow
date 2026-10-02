<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Harmonize Payments table status and idempotency key
        Schema::table('payments', function (Blueprint $table) {
            if (!Schema::hasColumn('payments', 'idempotency_key')) {
                $table->string('idempotency_key')->nullable()->index()->after('gateway_payment_intent_id');
            }
        });

        // 2. Harmonize Refunds table status vocabulary
        // Recommended statuses: pending, processing, completed, failed, cancelled
        // Using string type with index to guarantee cross-database compatibility (MySQL, SQLite, PostgreSQL)
        Schema::table('refunds', function (Blueprint $table) {
            $table->string('status', 30)->default('pending')->change();
        });

        // 3. Harmonize Payments table status vocabulary
        // Recommended statuses: pending, processing, completed, failed, cancelled, partially_refunded, refunded
        Schema::table('payments', function (Blueprint $table) {
            $table->string('status', 30)->default('pending')->change();
        });

        // 4. Harmonize Settlements table status vocabulary
        // Recommended statuses: pending, approved, processing, paid, failed, cancelled
        Schema::table('settlements', function (Blueprint $table) {
            $table->string('status', 30)->default('pending')->change();
        });

        // 5. Make order_id nullable on financial_transactions to allow non-order payouts and adjustments
        Schema::table('financial_transactions', function (Blueprint $table) {
            $table->foreignId('order_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            if (Schema::hasColumn('payments', 'idempotency_key')) {
                $table->dropColumn('idempotency_key');
            }
        });
    }
};

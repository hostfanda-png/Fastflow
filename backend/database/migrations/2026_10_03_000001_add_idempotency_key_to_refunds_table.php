<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('refunds', function (Blueprint $table) {
            if (!Schema::hasColumn('refunds', 'idempotency_key')) {
                $table->string('idempotency_key', 191)->nullable()->unique('refunds_idempotency_key_unique')->after('gateway_refund_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('refunds', function (Blueprint $table) {
            if (Schema::hasColumn('refunds', 'idempotency_key')) {
                $table->dropUnique('refunds_idempotency_key_unique');
                $table->dropColumn('idempotency_key');
            }
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations for Phase 3: Rider & Delivery Management.
     */
    public function up(): void
    {
        Schema::table('riders', function (Blueprint $table) {
            if (!Schema::hasColumn('riders', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('status')->index();
            }
            if (!Schema::hasColumn('riders', 'deleted_at')) {
                $table->softDeletes()->after('updated_at');
            }
            // Ensure status column accommodates all Phase 3 states (offline, available, busy, on_delivery, suspended, inactive)
            $table->string('status', 30)->default('offline')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('riders', function (Blueprint $table) {
            if (Schema::hasColumn('riders', 'is_active')) {
                $table->dropColumn('is_active');
            }
            if (Schema::hasColumn('riders', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('restaurants', function (Blueprint $table) {
            if (!Schema::hasColumn('restaurants', 'delivery_enabled')) {
                $table->boolean('delivery_enabled')->default(true)->after('is_open');
            }
            if (!Schema::hasColumn('restaurants', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('delivery_enabled');
            }
        });

        Schema::table('restaurant_hours', function (Blueprint $table) {
            if (!Schema::hasColumn('restaurant_hours', 'open_time_2')) {
                $table->time('open_time_2')->nullable()->after('close_time');
            }
            if (!Schema::hasColumn('restaurant_hours', 'close_time_2')) {
                $table->time('close_time_2')->nullable()->after('open_time_2');
            }
        });

        Schema::table('restaurant_delivery_zones', function (Blueprint $table) {
            if (!Schema::hasColumn('restaurant_delivery_zones', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('min_order');
            }
        });
    }

    public function down(): void
    {
        Schema::table('restaurant_delivery_zones', function (Blueprint $table) {
            if (Schema::hasColumn('restaurant_delivery_zones', 'is_active')) {
                $table->dropColumn('is_active');
            }
        });

        Schema::table('restaurant_hours', function (Blueprint $table) {
            if (Schema::hasColumn('restaurant_hours', 'close_time_2')) {
                $table->dropColumn('close_time_2');
            }
            if (Schema::hasColumn('restaurant_hours', 'open_time_2')) {
                $table->dropColumn('open_time_2');
            }
        });

        Schema::table('restaurants', function (Blueprint $table) {
            if (Schema::hasColumn('restaurants', 'is_active')) {
                $table->dropColumn('is_active');
            }
            if (Schema::hasColumn('restaurants', 'delivery_enabled')) {
                $table->dropColumn('delivery_enabled');
            }
        });
    }
};

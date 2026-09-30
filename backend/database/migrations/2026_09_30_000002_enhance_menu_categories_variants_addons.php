<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Enhance categories table with restaurant_id and description
        Schema::table('categories', function (Blueprint $table) {
            if (!Schema::hasColumn('categories', 'restaurant_id')) {
                $table->foreignId('restaurant_id')->nullable()->after('id')->constrained('restaurants')->cascadeOnDelete();
            }
            if (!Schema::hasColumn('categories', 'description')) {
                $table->text('description')->nullable()->after('slug');
            }
        });

        // 2. Enhance products table with sort_order and compare_at_price
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'sort_order')) {
                $table->unsignedInteger('sort_order')->default(0)->after('is_available');
            }
            if (!Schema::hasColumn('products', 'compare_at_price')) {
                $table->decimal('compare_at_price', 10, 2)->nullable()->after('price');
            }
        });

        // 3. Enhance product_variants table with is_active and sort_order
        Schema::table('product_variants', function (Blueprint $table) {
            if (!Schema::hasColumn('product_variants', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('price_modifier');
            }
            if (!Schema::hasColumn('product_variants', 'sort_order')) {
                $table->unsignedInteger('sort_order')->default(0)->after('is_active');
            }
        });

        // 4. Enhance addons table with sort_order and is_active
        Schema::table('addons', function (Blueprint $table) {
            if (!Schema::hasColumn('addons', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('is_available');
            }
            if (!Schema::hasColumn('addons', 'sort_order')) {
                $table->unsignedInteger('sort_order')->default(0)->after('is_active');
            }
        });
    }

    public function down(): void
    {
        Schema::table('addons', function (Blueprint $table) {
            if (Schema::hasColumn('addons', 'sort_order')) {
                $table->dropColumn('sort_order');
            }
            if (Schema::hasColumn('addons', 'is_active')) {
                $table->dropColumn('is_active');
            }
        });

        Schema::table('product_variants', function (Blueprint $table) {
            if (Schema::hasColumn('product_variants', 'sort_order')) {
                $table->dropColumn('sort_order');
            }
            if (Schema::hasColumn('product_variants', 'is_active')) {
                $table->dropColumn('is_active');
            }
        });

        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'compare_at_price')) {
                $table->dropColumn('compare_at_price');
            }
            if (Schema::hasColumn('products', 'sort_order')) {
                $table->dropColumn('sort_order');
            }
        });

        Schema::table('categories', function (Blueprint $table) {
            if (Schema::hasColumn('categories', 'description')) {
                $table->dropColumn('description');
            }
            if (Schema::hasColumn('categories', 'restaurant_id')) {
                $table->dropForeign(['restaurant_id']);
                $table->dropColumn('restaurant_id');
            }
        });
    }
};

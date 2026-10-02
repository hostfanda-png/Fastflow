<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Enhance customer_addresses with recipient name and phone
        if (Schema::hasTable('customer_addresses')) {
            Schema::table('customer_addresses', function (Blueprint $table) {
                if (!Schema::hasColumn('customer_addresses', 'recipient_name')) {
                    $table->string('recipient_name')->nullable()->after('label');
                }
                if (!Schema::hasColumn('customer_addresses', 'phone')) {
                    $table->string('phone')->nullable()->after('recipient_name');
                }
            });
        }

        // 2. Enhance order_items with separate product and variant price snapshots
        if (Schema::hasTable('order_items')) {
            Schema::table('order_items', function (Blueprint $table) {
                if (!Schema::hasColumn('order_items', 'product_price')) {
                    $table->decimal('product_price', 10, 2)->nullable()->after('quantity');
                }
                if (!Schema::hasColumn('order_items', 'variant_price')) {
                    $table->decimal('variant_price', 10, 2)->nullable()->after('product_price');
                }
            });
        }

        // 3. Product favorites table for dish bookmarking
        if (!Schema::hasTable('product_favorites')) {
            Schema::create('product_favorites', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
                $table->timestamps();
                $table->unique(['user_id', 'product_id']);
            });
        }

        // 4. Ensure customer orders composite indexing for fast order history queries
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                // Add index on customer_id and created_at if not present
                $table->index(['customer_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('product_favorites')) {
            Schema::dropIfExists('product_favorites');
        }

        if (Schema::hasTable('order_items')) {
            Schema::table('order_items', function (Blueprint $table) {
                if (Schema::hasColumn('order_items', 'variant_price')) {
                    $table->dropColumn('variant_price');
                }
                if (Schema::hasColumn('order_items', 'product_price')) {
                    $table->dropColumn('product_price');
                }
            });
        }

        if (Schema::hasTable('customer_addresses')) {
            Schema::table('customer_addresses', function (Blueprint $table) {
                if (Schema::hasColumn('customer_addresses', 'phone')) {
                    $table->dropColumn('phone');
                }
                if (Schema::hasColumn('customer_addresses', 'recipient_name')) {
                    $table->dropColumn('recipient_name');
                }
            });
        }
    }
};

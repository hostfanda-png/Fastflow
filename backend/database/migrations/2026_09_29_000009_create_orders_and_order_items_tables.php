<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->string('idempotency_key')->nullable()->unique();
            $table->foreignId('customer_id')->constrained('users');
            $table->foreignId('restaurant_id')->constrained('restaurants');
            $table->foreignId('rider_id')->nullable()->constrained('riders')->nullOnDelete();
            
            // Customer snapshots
            $table->string('customer_name');
            $table->string('customer_phone');
            $table->text('delivery_address_json');
            $table->text('delivery_instructions')->nullable();

            // Status
            $table->enum('order_status', [
                'pending',
                'confirmed',
                'preparing',
                'ready_for_pickup',
                'assigned_to_rider',
                'picked_up',
                'on_the_way',
                'delivered',
                'cancelled',
                'refunded'
            ])->default('pending')->index();

            // Financials (recalculated server-side)
            $table->decimal('subtotal', 10, 2);
            $table->decimal('discount', 10, 2)->default(0.00);
            $table->string('coupon_code')->nullable();
            $table->decimal('delivery_fee', 10, 2)->default(0.00);
            $table->decimal('tax', 10, 2)->default(0.00);
            $table->decimal('service_fee', 10, 2)->default(0.00);
            $table->decimal('tip', 10, 2)->default(0.00);
            $table->decimal('grand_total', 10, 2);

            // Payment info
            $table->enum('payment_method', ['cod', 'stripe', 'wallet'])->default('cod');
            $table->enum('payment_status', ['pending', 'paid', 'failed', 'refunded'])->default('pending');
            $table->string('payment_reference')->nullable();

            $table->string('estimated_delivery_time')->default('25-35 min');
            $table->text('cancellation_reason')->nullable();
            $table->boolean('has_been_reviewed')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products');
            $table->string('product_name');
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('total_price', 10, 2);
            $table->string('variant_name')->nullable();
            $table->text('special_instructions')->nullable();
            $table->timestamps();
        });

        Schema::create('order_item_addons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_item_id')->constrained('order_items')->cascadeOnDelete();
            $table->foreignId('addon_id')->nullable()->constrained('addons')->nullOnDelete();
            $table->string('addon_name');
            $table->decimal('price', 10, 2);
            $table->timestamps();
        });

        Schema::create('order_status_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('status');
            $table->text('note')->nullable();
            $table->string('actor')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_status_histories');
        Schema::dropIfExists('order_item_addons');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};

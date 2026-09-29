<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restaurants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->onDelete('cascade');
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->string('logo')->nullable();
            $table->string('cover_image')->nullable();
            $table->string('address');
            $table->string('city')->index();
            $table->string('area')->index();
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->decimal('rating', 3, 1)->default(5.0);
            $table->unsignedInteger('review_count')->default(0);
            $table->decimal('delivery_fee', 10, 2)->default(120.00);
            $table->decimal('minimum_order', 10, 2)->default(500.00);
            $table->string('estimated_delivery_time')->default('25-35 min');
            $table->decimal('service_radius_km', 5, 2)->default(10.00);
            $table->boolean('is_open')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->string('discount_badge')->nullable();
            $table->enum('commission_type', ['percentage', 'fixed'])->default('percentage');
            $table->decimal('commission_rate', 5, 2)->default(15.00);
            $table->decimal('fixed_commission_amount', 10, 2)->nullable();
            $table->enum('status', ['pending', 'approved', 'suspended', 'rejected'])->default('pending');
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['status', 'is_open']);
        });

        Schema::create('restaurant_staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained('restaurants')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->json('permissions')->nullable(); // e.g. ["manage_orders", "manage_menu"]
            $table->timestamps();
            $table->unique(['restaurant_id', 'user_id']);
        });

        Schema::create('restaurant_hours', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained('restaurants')->onDelete('cascade');
            $table->string('day_of_week'); // monday, tuesday, etc.
            $table->time('open_time');
            $table->time('close_time');
            $table->boolean('is_closed')->default(false);
            $table->timestamps();
            $table->unique(['restaurant_id', 'day_of_week']);
        });

        Schema::create('restaurant_delivery_zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained('restaurants')->onDelete('cascade');
            $table->string('zone_name');
            $table->decimal('delivery_fee', 10, 2);
            $table->decimal('min_order', 10, 2);
            $table->timestamps();
        });

        Schema::create('restaurant_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('restaurant_id')->constrained('restaurants')->onDelete('cascade');
            $table->string('document_type'); // food_license, tax_certificate, etc.
            $table->string('file_path');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restaurant_documents');
        Schema::dropIfExists('restaurant_delivery_zones');
        Schema::dropIfExists('restaurant_hours');
        Schema::dropIfExists('restaurant_staff');
        Schema::dropIfExists('restaurants');
    }
};

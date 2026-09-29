<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('riders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('vehicle_type')->default('Motorcycle'); // Motorcycle, Bicycle, Scooter
            $table->string('vehicle_number')->nullable();
            $table->enum('status', ['available', 'busy', 'offline', 'suspended'])->default('offline')->index();
            $table->decimal('current_lat', 10, 7)->nullable();
            $table->decimal('current_lng', 10, 7)->nullable();
            $table->unsignedInteger('assigned_order_count')->default(0);
            $table->unsignedInteger('total_deliveries')->default(0);
            $table->decimal('rating', 3, 1)->default(5.0);
            $table->decimal('commission_per_delivery', 10, 2)->default(100.00);
            $table->decimal('today_earnings', 10, 2)->default(0.00);
            $table->decimal('total_earnings', 10, 2)->default(0.00);
            $table->timestamps();
        });

        Schema::create('rider_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rider_id')->constrained('riders')->cascadeOnDelete();
            $table->string('document_type'); // driving_license, cnic, vehicle_reg
            $table->string('file_path');
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rider_documents');
        Schema::dropIfExists('riders');
    }
};

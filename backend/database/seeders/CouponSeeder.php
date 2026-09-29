<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Coupon;

class CouponSeeder extends Seeder
{
    public function run(): void
    {
        $coupons = [
            [
                'code' => 'WELCOME50',
                'discount_type' => 'percentage',
                'discount_value' => 50.00,
                'min_order_amount' => 800.00,
                'max_discount_amount' => 400.00,
                'usage_limit' => 1000,
                'used_count' => 142,
                'is_active' => true,
                'description' => '50% off on your first order up to Rs. 400',
            ],
            [
                'code' => 'FEAST100',
                'discount_type' => 'fixed',
                'discount_value' => 100.00,
                'min_order_amount' => 1000.00,
                'usage_limit' => 2500,
                'used_count' => 593,
                'is_active' => true,
                'description' => 'Flat Rs. 100 discount on orders over Rs. 1,000',
            ],
            [
                'code' => 'FREEDEL',
                'discount_type' => 'fixed',
                'discount_value' => 120.00,
                'min_order_amount' => 1200.00,
                'usage_limit' => 500,
                'used_count' => 89,
                'is_active' => true,
                'description' => 'Free delivery voucher for orders above Rs. 1,200',
            ],
        ];

        foreach ($coupons as $c) {
            Coupon::firstOrCreate(['code' => $c['code']], $c);
        }
    }
}

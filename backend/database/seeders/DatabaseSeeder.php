<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            UserSeeder::class,
            CategoryProductSeeder::class,
            RestaurantSeeder::class,
            RiderSeeder::class,
            CouponSeeder::class,
            OrderSeeder::class,
            SettingSeeder::class,
        ]);
    }
}

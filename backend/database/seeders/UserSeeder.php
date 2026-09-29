<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use App\Models\Customer;
use App\Models\CustomerAddress;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $adminRole = Role::where('name', 'super_admin')->first();
        $ownerRole = Role::where('name', 'restaurant_owner')->first();
        $staffRole = Role::where('name', 'restaurant_staff')->first();
        $riderRole = Role::where('name', 'delivery_rider')->first();
        $customerRole = Role::where('name', 'customer')->first();

        // 1. Super Admin (DEMO)
        User::firstOrCreate(
            ['email' => 'admin@fastflow.app'],
            [
                'name' => 'Eleanor Vance (DEMO Admin)',
                'password' => Hash::make('demo_password_123'),
                'phone' => '+92 300 1234567',
                'role_id' => $adminRole->id,
                'avatar' => 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120',
                'status' => 'active',
            ]
        );

        // 2. Restaurant Owner (DEMO)
        $owner = User::firstOrCreate(
            ['email' => 'owner@fuegotrattoria.com'],
            [
                'name' => 'Marco Rossi (DEMO Owner)',
                'password' => Hash::make('demo_password_123'),
                'phone' => '+92 321 8899001',
                'role_id' => $ownerRole->id,
                'avatar' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120',
                'status' => 'active',
            ]
        );

        // 3. Restaurant Staff (DEMO)
        User::firstOrCreate(
            ['email' => 'staff@fuegotrattoria.com'],
            [
                'name' => 'Sofia Chen (DEMO Staff)',
                'password' => Hash::make('demo_password_123'),
                'phone' => '+92 333 4455667',
                'role_id' => $staffRole->id,
                'avatar' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120',
                'status' => 'active',
            ]
        );

        // 4. Riders (DEMO - 3 Riders)
        $ridersData = [
            ['email' => 'rider1@fastflow.app', 'name' => 'Tariq Mansoor (DEMO Rider 1)', 'phone' => '+92 312 9988776'],
            ['email' => 'rider2@fastflow.app', 'name' => 'Bilal Ahmed (DEMO Rider 2)', 'phone' => '+92 322 1122334'],
            ['email' => 'rider3@fastflow.app', 'name' => 'Hamza Farooq (DEMO Rider 3)', 'phone' => '+92 334 7788990'],
        ];

        foreach ($ridersData as $rd) {
            User::firstOrCreate(
                ['email' => $rd['email']],
                [
                    'name' => $rd['name'],
                    'password' => Hash::make('demo_password_123'),
                    'phone' => $rd['phone'],
                    'role_id' => $riderRole->id,
                    'status' => 'active',
                ]
            );
        }

        // 5. Customers (DEMO - 10 Customers)
        $primaryCustomer = User::firstOrCreate(
            ['email' => 'customer@fastflow.app'],
            [
                'name' => 'Sarah Jenkins (DEMO Customer)',
                'password' => Hash::make('demo_password_123'),
                'phone' => '+92 301 5556677',
                'role_id' => $customerRole->id,
                'avatar' => 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120',
                'status' => 'active',
            ]
        );

        Customer::firstOrCreate(['user_id' => $primaryCustomer->id]);

        CustomerAddress::firstOrCreate(
            ['user_id' => $primaryCustomer->id, 'street' => 'House 44-B, Street 12, Sector Y'],
            [
                'label' => 'Home',
                'area' => 'DHA Phase 3',
                'city' => 'Lahore',
                'lat' => 31.4812,
                'lng' => 74.3821,
                'delivery_instructions' => 'Ring doorbell, leave with gate security if unanswered.',
                'is_default' => true,
            ]
        );

        for ($i = 2; $i <= 10; $i++) {
            $cust = User::firstOrCreate(
                ['email' => "customer{$i}@fastflow.app"],
                [
                    'name' => "Fastflow Customer {$i} (DEMO)",
                    'password' => Hash::make('demo_password_123'),
                    'phone' => "+92 300 555000{$i}",
                    'role_id' => $customerRole->id,
                    'status' => 'active',
                ]
            );
            Customer::firstOrCreate(['user_id' => $cust->id]);
        }
    }
}

<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Rider;
use App\Models\User;

class RiderSeeder extends Seeder
{
    public function run(): void
    {
        $riderUsers = [
            ['email' => 'rider1@dineflow.app', 'vehicle' => 'Motorcycle', 'number' => 'LEK-2024-81', 'status' => 'available'],
            ['email' => 'rider2@dineflow.app', 'vehicle' => 'Motorcycle', 'number' => 'LEB-2023-19', 'status' => 'available'],
            ['email' => 'rider3@dineflow.app', 'vehicle' => 'Scooter', 'number' => 'KHI-2025-04', 'status' => 'busy'],
        ];

        foreach ($riderUsers as $ru) {
            $user = User::where('email', $ru['email'])->first();
            if ($user) {
                Rider::firstOrCreate(
                    ['user_id' => $user->id],
                    [
                        'vehicle_type' => $ru['vehicle'],
                        'vehicle_number' => $ru['number'],
                        'status' => $ru['status'],
                        'current_lat' => 31.5204 + (random_int(-100, 100) / 10000),
                        'current_lng' => 74.3587 + (random_int(-100, 100) / 10000),
                        'assigned_order_count' => $ru['status'] === 'busy' ? 1 : 0,
                        'total_deliveries' => random_int(150, 450),
                        'rating' => 4.9,
                        'commission_per_delivery' => 100.00,
                        'today_earnings' => 2840.00,
                        'total_earnings' => 94800.00,
                    ]
                );
            }
        }
    }
}

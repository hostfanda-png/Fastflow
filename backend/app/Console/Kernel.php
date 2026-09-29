<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // 1. Daily reconciliation of restaurant payouts and commissions at midnight
        $schedule->call(function () {
            Log::info("Running daily marketplace financial reconciliation & commission auditing.");
            $settledCount = DB::table('commissions')
                ->where('status', 'pending')
                ->where('created_at', '<=', Carbon::now()->subHours(24))
                ->update(['status' => 'settled', 'updated_at' => Carbon::now()]);
            Log::info("Reconciled {$settledCount} pending restaurant commission entries.");
        })->dailyAt('00:00');

        // 2. Auto-cancel unconfirmed pending orders older than 30 minutes
        $schedule->call(function () {
            $staleOrders = DB::table('orders')
                ->where('status', 'pending')
                ->where('created_at', '<=', Carbon::now()->subMinutes(30))
                ->get();

            foreach ($staleOrders as $order) {
                DB::table('orders')->where('id', $order->id)->update([
                    'status' => 'cancelled',
                    'updated_at' => Carbon::now()
                ]);
                DB::table('order_status_histories')->insert([
                    'order_id' => $order->id,
                    'status' => 'cancelled',
                    'note' => 'System auto-cancelled: Restaurant did not confirm order within 30 minutes.',
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now()
                ]);
                Log::info("Auto-cancelled stale Order #{$order->order_number}");
            }
        })->everyFifteenMinutes();

        // 3. Mark expired coupons as inactive
        $schedule->call(function () {
            $expiredCoupons = DB::table('coupons')
                ->where('is_active', true)
                ->where('expires_at', '<', Carbon::now())
                ->update(['is_active' => false, 'updated_at' => Carbon::now()]);
            if ($expiredCoupons > 0) {
                Log::info("Deactivated {$expiredCoupons} expired promotion coupons.");
            }
        })->hourly();

        // 4. Prune abandoned cart items older than 7 days
        $schedule->call(function () {
            DB::table('cart_items')
                ->where('updated_at', '<', Carbon::now()->subDays(7))
                ->delete();
        })->daily();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');
    }
}

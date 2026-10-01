<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Commission;
use App\Models\FinancialTransaction;
use App\Models\Settlement;
use App\Models\Restaurant;
use App\Models\Refund;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Support\Facades\DB;
use Exception;

class FinancialService
{
    /**
     * Server-side aggregated platform financial analytics for Admin Dashboard
     */
    public function getAdminFinancialAnalytics(array $filters = []): array
    {
        $ftQuery = FinancialTransaction::query();
        $orderQuery = Order::query();
        $refundQuery = Refund::query();
        $settlementQuery = Settlement::query();

        // Optional date range filtering
        if (!empty($filters['start_date'])) {
            $ftQuery->whereDate('created_at', '>=', $filters['start_date']);
            $orderQuery->whereDate('created_at', '>=', $filters['start_date']);
            $refundQuery->whereDate('created_at', '>=', $filters['start_date']);
            $settlementQuery->whereDate('created_at', '>=', $filters['start_date']);
        }

        if (!empty($filters['end_date'])) {
            $ftQuery->whereDate('created_at', '<=', $filters['end_date']);
            $orderQuery->whereDate('created_at', '<=', $filters['end_date']);
            $refundQuery->whereDate('created_at', '<=', $filters['end_date']);
            $settlementQuery->whereDate('created_at', '<=', $filters['end_date']);
        }

        if (!empty($filters['restaurant_id'])) {
            $ftQuery->where('restaurant_id', $filters['restaurant_id']);
            $orderQuery->where('restaurant_id', $filters['restaurant_id']);
            $settlementQuery->where('restaurant_id', $filters['restaurant_id']);
        }

        // Aggregate statistics directly on database engine
        $totalGrossVolume = (float)(clone $orderQuery)->where('payment_status', 'paid')->sum('grand_total');
        $totalPlatformCommission = (float)(clone $ftQuery)->where('direction', 'credit')->sum('platform_commission');
        $totalRestaurantPayouts = (float)(clone $ftQuery)->where('direction', 'credit')->sum('restaurant_payout');
        $totalDeliveryFees = (float)(clone $ftQuery)->where('direction', 'credit')->sum('delivery_fee');
        $totalRiderPayouts = (float)(clone $ftQuery)->where('direction', 'credit')->sum('rider_payout');
        $totalRefundedAmount = (float)(clone $refundQuery)->where('status', 'completed')->sum('amount');
        
        $totalPaidOrders = (int)(clone $orderQuery)->where('payment_status', 'paid')->count();
        $totalPendingCodOrders = (int)(clone $orderQuery)->where('payment_method', 'cod')->where('payment_status', 'pending')->count();
        $totalRefundedOrders = (int)(clone $orderQuery)->where('payment_status', 'refunded')->count();

        $totalSettledAmount = (float)(clone $settlementQuery)->where('status', 'paid')->sum('net_payout');
        $totalPendingSettlementAmount = (float)(clone $settlementQuery)->whereIn('status', ['pending', 'approved', 'processing'])->sum('net_payout');

        // Paginated ledger transactions
        $transactions = (clone $ftQuery)
            ->with(['restaurant:id,name,city', 'order:id,order_number,payment_method,payment_status'])
            ->orderByDesc('created_at')
            ->paginate($filters['per_page'] ?? 20);

        return [
            'metrics' => [
                'total_gross_volume' => $totalGrossVolume,
                'total_platform_commission' => $totalPlatformCommission,
                'total_restaurant_payouts' => $totalRestaurantPayouts,
                'total_delivery_fees' => $totalDeliveryFees,
                'total_rider_payouts' => $totalRiderPayouts,
                'total_refunded_amount' => $totalRefundedAmount,
                'total_settled_amount' => $totalSettledAmount,
                'total_pending_settlement_amount' => $totalPendingSettlementAmount,
                'total_paid_orders' => $totalPaidOrders,
                'total_pending_cod_orders' => $totalPendingCodOrders,
                'total_refunded_orders' => $totalRefundedOrders,
                'currency' => env('DEFAULT_CURRENCY_CODE', 'PKR'),
            ],
            'transactions' => $transactions,
        ];
    }

    /**
     * Isolated financial summary for Restaurant Owner Dashboard
     */
    public function getRestaurantFinancialSummary(int $restaurantId, array $filters = []): array
    {
        $restaurant = Restaurant::findOrFail($restaurantId);

        $orderQuery = Order::where('restaurant_id', $restaurantId);
        $ftQuery = FinancialTransaction::where('restaurant_id', $restaurantId);
        $commQuery = Commission::where('restaurant_id', $restaurantId);
        $settlementQuery = Settlement::where('restaurant_id', $restaurantId);

        if (!empty($filters['start_date'])) {
            $orderQuery->whereDate('created_at', '>=', $filters['start_date']);
            $ftQuery->whereDate('created_at', '>=', $filters['start_date']);
            $commQuery->whereDate('created_at', '>=', $filters['start_date']);
        }

        if (!empty($filters['end_date'])) {
            $orderQuery->whereDate('created_at', '<=', $filters['end_date']);
            $ftQuery->whereDate('created_at', '<=', $filters['end_date']);
            $commQuery->whereDate('created_at', '<=', $filters['end_date']);
        }

        $grossSales = (float)(clone $orderQuery)->where('payment_status', 'paid')->sum('subtotal');
        $commissionDeducted = (float)(clone $commQuery)->sum('commission_amount');
        $netEarnings = (float)(clone $commQuery)->sum('restaurant_net_payout');
        
        $pendingSettlement = (float)(clone $commQuery)->where('settlement_status', 'pending')->sum('restaurant_net_payout');
        $settledPayout = (float)(clone $settlementQuery)->where('status', 'paid')->sum('net_payout');

        $recentSettlements = (clone $settlementQuery)->orderByDesc('created_at')->take(10)->get();
        $recentTransactions = (clone $ftQuery)->with('order:id,order_number,order_status,payment_method,payment_status')->orderByDesc('created_at')->take(15)->get();

        return [
            'restaurant' => [
                'id' => $restaurant->id,
                'name' => $restaurant->name,
                'commission_rate' => (float)$restaurant->commission_rate,
            ],
            'metrics' => [
                'gross_sales' => $grossSales,
                'commission_deducted' => $commissionDeducted,
                'net_earnings' => $netEarnings,
                'pending_settlement' => $pendingSettlement,
                'settled_payout' => $settledPayout,
                'currency' => env('DEFAULT_CURRENCY_CODE', 'PKR'),
            ],
            'settlements' => $recentSettlements,
            'recent_transactions' => $recentTransactions,
        ];
    }

    /**
     * Create a settlement batch for a restaurant
     */
    public function createSettlementBatch(int $restaurantId, string $periodStart, string $periodEnd, User $admin, ?string $notes = null): Settlement
    {
        return DB::transaction(function () use ($restaurantId, $periodStart, $periodEnd, $admin, $notes) {
            $restaurant = Restaurant::findOrFail($restaurantId);

            $pendingCommissions = Commission::where('restaurant_id', $restaurantId)
                ->where('settlement_status', 'pending')
                ->whereDate('created_at', '>=', $periodStart)
                ->whereDate('created_at', '<=', $periodEnd)
                ->lockForUpdate()
                ->get();

            if ($pendingCommissions->isEmpty()) {
                throw new Exception("No unsettled orders found for {$restaurant->name} between {$periodStart} and {$periodEnd}.");
            }

            $grossSales = (float)$pendingCommissions->sum('order_subtotal');
            $platformCommission = (float)$pendingCommissions->sum('commission_amount');
            $netPayout = (float)$pendingCommissions->sum('restaurant_net_payout');

            $settlementNumber = 'SETTLE-' . date('Ymd') . '-' . strtoupper(bin2hex(random_bytes(3)));

            $settlement = Settlement::create([
                'settlement_number' => $settlementNumber,
                'restaurant_id' => $restaurantId,
                'period_start' => $periodStart,
                'period_end' => $periodEnd,
                'gross_sales' => $grossSales,
                'platform_commission' => $platformCommission,
                'tax_collected' => 0.00,
                'total_deductions' => $platformCommission,
                'net_payout' => $netPayout,
                'status' => 'approved',
                'payout_method' => 'bank_transfer',
                'processed_by' => $admin->id,
                'notes' => $notes,
            ]);

            // Mark commission rows as settled
            Commission::whereIn('id', $pendingCommissions->pluck('id'))->update([
                'settlement_status' => 'settled',
            ]);

            AuditService::log('financial.settlement_created', 'Settlements', (string)$settlement->id, "Generated settlement batch {$settlementNumber} for {$restaurant->name} (PKR {$netPayout})", $admin);

            return $settlement;
        });
    }

    /**
     * Mark a settlement batch as paid with bank reference
     */
    public function markSettlementPaid(int $settlementId, string $paymentReference, User $admin): Settlement
    {
        return DB::transaction(function () use ($settlementId, $paymentReference, $admin) {
            $settlement = Settlement::where('id', $settlementId)->lockForUpdate()->firstOrFail();

            if ($settlement->status === 'paid') {
                throw new Exception("Settlement #{$settlement->settlement_number} has already been marked as paid.");
            }

            $settlement->status = 'paid';
            $settlement->payment_reference = $paymentReference;
            $settlement->paid_at = now();
            $settlement->processed_by = $admin->id;
            $settlement->save();

            AuditService::log('financial.settlement_paid', 'Settlements', (string)$settlement->id, "Marked settlement {$settlement->settlement_number} as paid with ref: {$paymentReference}", $admin);

            return $settlement;
        });
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\Order;
use App\Models\Rider;
use App\Models\User;
use App\Models\Role;
use App\Models\Coupon;
use App\Models\Review;
use App\Models\FinancialTransaction;
use App\Models\AuditLog;
use App\Models\Setting;
use App\Models\DeliveryZone;
use App\Models\Page;
use App\Models\OrderStatusHistory;
use App\Services\AuditService;
use App\Services\OrderService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $totalOrders = Order::count();
        $totalGMV = Order::where('order_status', '!=', 'cancelled')->sum('grand_total');
        $totalCommission = FinancialTransaction::sum('platform_commission');
        $restaurantsCount = Restaurant::count();
        $approvedRestaurantsCount = Restaurant::where('status', 'approved')->count();
        $ridersCount = Rider::count();
        $activeRidersCount = Rider::where('status', 'available')->where('is_active', true)->count();
        $customersCount = User::whereHas('role', fn($q) => $q->where('name', 'customer'))->count();

        return $this->sendResponse([
            'metrics' => [
                'total_gmv' => (float)$totalGMV,
                'total_commission' => (float)$totalCommission,
                'total_orders' => $totalOrders,
                'total_restaurants' => $restaurantsCount,
                'approved_restaurants' => $approvedRestaurantsCount,
                'total_riders' => $ridersCount,
                'active_riders' => $activeRidersCount,
                'total_customers' => $customersCount,
            ]
        ], 'Admin dashboard metrics');
    }

    public function getRestaurants(): JsonResponse
    {
        $restaurants = Restaurant::with(['owner', 'cuisines'])->orderByDesc('created_at')->get();
        return $this->sendResponse($restaurants, 'All restaurants retrieved');
    }

    public function setRestaurantStatus(Request $request, int $restaurantId): JsonResponse
    {
        $restaurant = Restaurant::findOrFail($restaurantId);
        $status = $request->validate([
            'status' => ['required', 'in:pending,approved,suspended,rejected'],
        ])['status'];

        $restaurant->status = $status;
        $restaurant->save();

        AuditService::log('admin.restaurant_status', 'Restaurants', (string)$restaurant->id, "Changed status of {$restaurant->name} to {$status}");

        return $this->sendResponse($restaurant, "Restaurant status updated to {$status}");
    }

    public function updateCommission(Request $request, int $restaurantId): JsonResponse
    {
        $restaurant = Restaurant::findOrFail($restaurantId);
        $validated = $request->validate([
            'commission_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'commission_type' => ['required', 'in:percentage,fixed'],
            'fixed_commission_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $restaurant->update($validated);

        AuditService::log('admin.commission_update', 'Commissions', (string)$restaurant->id, "Updated commission rate to {$validated['commission_rate']}%");

        return $this->sendResponse($restaurant, 'Restaurant commission updated');
    }

    /**
     * Admin Rider Fleet Listing with Filter & Search
     */
    public function getRiders(Request $request): JsonResponse
    {
        $query = Rider::with('user')->orderByDesc('created_at');

        if ($status = $request->query('status')) {
            if ($status !== 'all') {
                $query->where('status', $status);
            }
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('vehicle_number', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('name', 'like', "%{$search}%")
                         ->orWhere('phone', 'like', "%{$search}%")
                         ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $riders = $query->get()->map(function ($rider) {
            return [
                'id' => $rider->id,
                'user_id' => $rider->user_id,
                'name' => $rider->user?->name ?? 'Courier',
                'email' => $rider->user?->email,
                'phone' => $rider->user?->phone,
                'vehicle_type' => $rider->vehicle_type,
                'vehicle_number' => $rider->vehicle_number,
                'status' => $rider->status,
                'is_active' => (bool)$rider->is_active,
                'rating' => (float)$rider->rating,
                'assigned_order_count' => (int)$rider->assigned_order_count,
                'total_deliveries' => (int)$rider->total_deliveries,
                'commission_per_delivery' => (float)$rider->commission_per_delivery,
                'today_earnings' => (float)$rider->today_earnings,
                'total_earnings' => (float)$rider->total_earnings,
                'created_at' => $rider->created_at?->toIso8601String(),
            ];
        });

        return $this->sendResponse($riders, 'Rider fleet retrieved');
    }

    /**
     * Store / Create a new Delivery Courier
     */
    public function storeRider(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:30'],
            'password' => ['required', 'string', 'min:8'],
            'vehicle_type' => ['required', 'string', 'in:Motorcycle,Bicycle,Scooter,Car'],
            'vehicle_number' => ['required', 'string', 'max:50'],
            'commission_per_delivery' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'string', 'in:available,busy,offline,suspended,inactive'],
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $role = Role::firstOrCreate(['name' => 'delivery_rider'], ['display_name' => 'Delivery Rider']);

            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'password' => Hash::make($validated['password']),
                'role_id' => $role->id,
            ]);

            $rider = Rider::create([
                'user_id' => $user->id,
                'vehicle_type' => $validated['vehicle_type'],
                'vehicle_number' => $validated['vehicle_number'],
                'status' => $validated['status'] ?? 'offline',
                'is_active' => true,
                'commission_per_delivery' => $validated['commission_per_delivery'] ?? 100.00,
            ]);

            AuditService::log('rider.create', 'Riders', (string)$rider->id, "Created courier account for {$user->name} ({$rider->vehicle_type})", $request->user());

            return $this->sendResponse([
                'id' => $rider->id,
                'user_id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'vehicle_type' => $rider->vehicle_type,
                'vehicle_number' => $rider->vehicle_number,
                'status' => $rider->status,
                'is_active' => (bool)$rider->is_active,
                'rating' => (float)$rider->rating,
                'assigned_order_count' => (int)$rider->assigned_order_count,
                'total_deliveries' => (int)$rider->total_deliveries,
                'commission_per_delivery' => (float)$rider->commission_per_delivery,
                'today_earnings' => (float)$rider->today_earnings,
                'total_earnings' => (float)$rider->total_earnings,
            ], 'Rider created successfully', 201);
        });
    }

    /**
     * Show Courier Details
     */
    public function showRider(int $riderId): JsonResponse
    {
        $rider = Rider::with(['user', 'orders' => fn($q) => $q->latest()->limit(10)])->findOrFail($riderId);

        $activeOrders = Order::where('rider_id', $rider->id)
            ->whereIn('order_status', ['assigned_to_rider', 'picked_up', 'on_the_way'])
            ->with(['restaurant'])
            ->get();

        return $this->sendResponse([
            'rider' => [
                'id' => $rider->id,
                'user_id' => $rider->user_id,
                'name' => $rider->user?->name,
                'email' => $rider->user?->email,
                'phone' => $rider->user?->phone,
                'vehicle_type' => $rider->vehicle_type,
                'vehicle_number' => $rider->vehicle_number,
                'status' => $rider->status,
                'is_active' => (bool)$rider->is_active,
                'rating' => (float)$rider->rating,
                'assigned_order_count' => (int)$rider->assigned_order_count,
                'total_deliveries' => (int)$rider->total_deliveries,
                'commission_per_delivery' => (float)$rider->commission_per_delivery,
                'today_earnings' => (float)$rider->today_earnings,
                'total_earnings' => (float)$rider->total_earnings,
            ],
            'active_orders' => $activeOrders,
            'recent_orders' => $rider->orders,
        ], 'Rider details retrieved');
    }

    /**
     * Update Courier Details / Status / Activation
     */
    public function updateRider(Request $request, int $riderId): JsonResponse
    {
        $rider = Rider::with('user')->findOrFail($riderId);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'string', 'max:30'],
            'vehicle_type' => ['sometimes', 'string', 'in:Motorcycle,Bicycle,Scooter,Car'],
            'vehicle_number' => ['sometimes', 'string', 'max:50'],
            'status' => ['sometimes', 'string', 'in:available,busy,offline,suspended,inactive'],
            'is_active' => ['sometimes', 'boolean'],
            'commission_per_delivery' => ['sometimes', 'numeric', 'min:0'],
        ]);

        DB::transaction(function () use ($rider, $validated, $request) {
            $oldStatus = $rider->status;

            if (isset($validated['name']) || isset($validated['phone'])) {
                $rider->user->update(array_filter([
                    'name' => $validated['name'] ?? null,
                    'phone' => $validated['phone'] ?? null,
                ]));
            }

            $riderUpdateFields = [];
            foreach (['vehicle_type', 'vehicle_number', 'status', 'is_active', 'commission_per_delivery'] as $field) {
                if (array_key_exists($field, $validated)) {
                    $riderUpdateFields[$field] = $validated[$field];
                }
            }

            if (!empty($riderUpdateFields)) {
                $rider->update($riderUpdateFields);
            }

            // Log appropriate audit action based on changes
            if (isset($validated['status']) && $validated['status'] !== $oldStatus) {
                if ($validated['status'] === 'suspended') {
                    AuditService::log('rider.suspend', 'Riders', (string)$rider->id, "Courier {$rider->user->name} suspended by admin", $request->user());
                } elseif ($validated['status'] === 'inactive' || (isset($validated['is_active']) && !$validated['is_active'])) {
                    AuditService::log('rider.deactivate', 'Riders', (string)$rider->id, "Courier {$rider->user->name} deactivated by admin", $request->user());
                } elseif ($oldStatus === 'suspended' || $oldStatus === 'inactive') {
                    AuditService::log('rider.activate', 'Riders', (string)$rider->id, "Courier {$rider->user->name} activated by admin", $request->user());
                } else {
                    AuditService::log('rider.status_change', 'Riders', (string)$rider->id, "Status changed from {$oldStatus} to {$validated['status']}", $request->user());
                }
            } else {
                AuditService::log('rider.update', 'Riders', (string)$rider->id, "Updated courier profile for {$rider->user->name}", $request->user());
            }
        });

        $rider->load('user');

        return $this->sendResponse([
            'id' => $rider->id,
            'name' => $rider->user?->name,
            'email' => $rider->user?->email,
            'phone' => $rider->user?->phone,
            'vehicle_type' => $rider->vehicle_type,
            'vehicle_number' => $rider->vehicle_number,
            'status' => $rider->status,
            'is_active' => (bool)$rider->is_active,
            'commission_per_delivery' => (float)$rider->commission_per_delivery,
        ], 'Rider updated successfully');
    }

    /**
     * Delete / Deactivate Courier
     * Preserves historical orders and financial ledger integrity.
     */
    public function deleteRider(Request $request, int $riderId): JsonResponse
    {
        $rider = Rider::with('user')->findOrFail($riderId);

        // Check if courier has in-progress active deliveries
        $hasActiveDeliveries = Order::where('rider_id', $rider->id)
            ->whereIn('order_status', ['assigned_to_rider', 'picked_up', 'on_the_way'])
            ->exists();

        if ($hasActiveDeliveries) {
            return $this->sendError('Cannot delete or deactivate a courier with active deliveries in progress.', [], 422);
        }

        // If rider has historical completed orders, do NOT physically delete. Deactivate to preserve historical integrity.
        $hasHistoricalOrders = Order::where('rider_id', $rider->id)->exists();

        if ($hasHistoricalOrders) {
            $rider->is_active = false;
            $rider->status = 'inactive';
            $rider->save();
            $rider->delete(); // Soft delete

            AuditService::log('rider.deactivate', 'Riders', (string)$rider->id, "Courier {$rider->user->name} deactivated (soft-deleted) to preserve historical order records", $request->user());

            return $this->sendResponse(null, "Courier {$rider->user->name} deactivated and archived successfully.");
        }

        // Safe physical deletion if never had an order
        $riderName = $rider->user?->name ?? 'Courier';
        $user = $rider->user;
        $rider->delete();
        if ($user) {
            $user->delete();
        }

        AuditService::log('rider.deactivate', 'Riders', (string)$riderId, "Courier {$riderName} deleted", $request->user());

        return $this->sendResponse(null, "Courier {$riderName} removed successfully.");
    }

    /**
     * Assign / Reassign Rider to an Order with Strict Eligibility Verification.
     */
    public function assignRider(Request $request, int $orderId): JsonResponse
    {
        $order = Order::findOrFail($orderId);

        // Order eligibility check
        $unassignableStates = ['cancelled', 'delivered', 'refunded'];
        if (in_array($order->order_status, $unassignableStates)) {
            return $this->sendError("Order cannot be assigned in '{$order->order_status}' status.", [], 422);
        }

        $riderId = $request->validate([
            'rider_id' => ['required', 'exists:riders,id']
        ])['rider_id'];

        $rider = Rider::with('user')->findOrFail($riderId);

        // Rider eligibility check
        if (!$rider->is_active || in_array($rider->status, ['suspended', 'inactive', 'offline'])) {
            return $this->sendError("Courier '{$rider->user->name}' is currently {$rider->status} or inactive and cannot receive orders.", [], 422);
        }

        $isReassignment = !empty($order->rider_id) && $order->rider_id != $rider->id;
        $prevRiderId = $order->rider_id;

        DB::transaction(function () use ($order, $rider, $isReassignment, $prevRiderId, $request) {
            if ($isReassignment) {
                // Decrement workload on previous rider
                $prevRider = Rider::find($prevRiderId);
                if ($prevRider) {
                    $prevRider->assigned_order_count = max(0, $prevRider->assigned_order_count - 1);
                    $prevRider->save();
                }
            }

            $order->rider_id = $rider->id;
            if (in_array($order->order_status, ['pending', 'confirmed', 'preparing', 'ready_for_pickup'])) {
                $order->order_status = 'assigned_to_rider';
            }
            $order->save();

            $rider->increment('assigned_order_count');

            // Log status history
            OrderStatusHistory::create([
                'order_id' => $order->id,
                'status' => $order->order_status,
                'note' => $isReassignment 
                    ? "Order reassigned to courier {$rider->user->name}" 
                    : "Courier {$rider->user->name} assigned to delivery",
                'actor' => $request->user()->name,
                'created_at' => now(),
            ]);

            $auditAction = $isReassignment ? 'delivery.reassign' : 'delivery.assign';
            AuditService::log($auditAction, 'Orders', (string)$order->id, "Assigned courier {$rider->user->name} ({$rider->vehicle_number}) to order {$order->order_number}", $request->user());
        });

        return $this->sendResponse($order->load('rider.user'), "Order successfully assigned to {$rider->user->name}");
    }

    /**
     * Server-Authoritative Automated Courier Dispatch
     * Never falls back to client mock data or fake riders.
     */
    public function autoDispatch(Request $request, int $orderId): JsonResponse
    {
        $order = Order::findOrFail($orderId);

        $unassignableStates = ['cancelled', 'delivered', 'refunded', 'on_the_way'];
        if (in_array($order->order_status, $unassignableStates)) {
            return $this->sendError("Order in '{$order->order_status}' status cannot be auto-dispatched.", [], 422);
        }

        // Find best eligible courier (available, active, lowest active workload)
        $bestRider = Rider::with('user')
            ->where('status', 'available')
            ->where('is_active', true)
            ->orderBy('assigned_order_count', 'asc')
            ->first();

        if (!$bestRider) {
            return $this->sendError('No active couriers are currently online and available for dispatch.', [], 404);
        }

        DB::transaction(function () use ($order, $bestRider, $request) {
            $order->rider_id = $bestRider->id;
            $order->order_status = 'assigned_to_rider';
            $order->save();

            $bestRider->increment('assigned_order_count');

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'status' => 'assigned_to_rider',
                'note' => "Automated dispatch assigned courier {$bestRider->user->name}",
                'actor' => 'Auto-Dispatch System',
                'created_at' => now(),
            ]);

            AuditService::log('delivery.assign', 'Dispatch', (string)$order->id, "System auto-dispatched order {$order->order_number} to courier {$bestRider->user->name}", $request->user());
        });

        return $this->sendResponse($order->load('rider.user'), "Auto-dispatched to courier {$bestRider->user->name} ({$bestRider->vehicle_number})");
    }

    public function getFinancials(): JsonResponse
    {
        $financials = FinancialTransaction::orderByDesc('created_at')->get();
        return $this->sendResponse($financials, 'Financial transactions ledger');
    }

    public function getAuditLogs(): JsonResponse
    {
        $logs = AuditLog::orderByDesc('created_at')->limit(100)->get();
        return $this->sendResponse($logs, 'Platform audit trail');
    }
}

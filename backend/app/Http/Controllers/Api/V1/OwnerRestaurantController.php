<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Restaurant;
use App\Models\Order;
use App\Models\Product;
use App\Models\RestaurantHour;
use App\Models\RestaurantDeliveryZone;
use App\Models\Role;
use App\Models\Rider;
use App\Models\OrderStatusHistory;
use App\Http\Requests\RestaurantUpdateRequest;
use App\Http\Requests\RestaurantApplicationRequest;
use App\Http\Requests\RestaurantHoursUpdateRequest;
use App\Http\Requests\RestaurantDeliveryZoneRequest;
use App\Http\Requests\RestaurantMediaRequest;
use App\Services\OrderService;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OwnerRestaurantController extends Controller
{
    protected OrderService $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    /**
     * List all restaurants owned by or assigned to the authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasRole('restaurant_owner')) {
            $restaurants = Restaurant::where('owner_id', $user->id)
                ->with(['cuisines', 'hours', 'deliveryZones'])
                ->get();
        } elseif ($user->hasRole('restaurant_staff')) {
            $restaurants = Restaurant::where('id', $user->restaurant_id)
                ->with(['cuisines', 'hours', 'deliveryZones'])
                ->get();
        } elseif ($user->hasRole('super_admin')) {
            $restaurants = Restaurant::with(['cuisines', 'hours', 'deliveryZones'])->get();
        } else {
            return $this->sendError('Access denied: not a restaurant owner or staff', [], 403);
        }

        $formatted = $restaurants->map(function ($rest) {
            $data = $rest->toArray();
            $data['is_currently_open'] = $rest->isOpen();
            return $data;
        });

        return $this->sendResponse($formatted, 'Owner restaurants retrieved');
    }

    /**
     * Submit an application to register a new restaurant.
     */
    public function apply(RestaurantApplicationRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $slugBase = Str::slug($validated['name']);
        $slug = $slugBase;
        $counter = 1;
        while (Restaurant::where('slug', $slug)->exists()) {
            $slug = "{$slugBase}-{$counter}";
            $counter++;
        }

        return DB::transaction(function () use ($user, $validated, $slug) {
            $restaurant = Restaurant::create([
                'owner_id' => $user->id,
                'name' => $validated['name'],
                'slug' => $slug,
                'description' => $validated['description'] ?? null,
                'phone' => $validated['phone'],
                'email' => $validated['email'],
                'address' => $validated['address'],
                'city' => $validated['city'],
                'area' => $validated['area'],
                'lat' => $validated['lat'] ?? 31.5204,
                'lng' => $validated['lng'] ?? 74.3587,
                'delivery_fee' => $validated['delivery_fee'] ?? 120.00,
                'minimum_order' => $validated['minimum_order'] ?? 500.00,
                'estimated_delivery_time' => $validated['estimated_delivery_time'] ?? '25-35 min',
                'is_open' => false,
                'is_active' => true,
                'delivery_enabled' => true,
                'status' => 'pending', // Strictly pending, requires admin approval
                'commission_type' => 'percentage',
                'commission_rate' => 15.00,
            ]);

            // Sync cuisines if provided
            if (!empty($validated['cuisines'])) {
                $restaurant->cuisines()->sync($validated['cuisines']);
            }

            // Create default opening hours (Monday-Sunday 09:00 - 23:00)
            $days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            foreach ($days as $day) {
                RestaurantHour::create([
                    'restaurant_id' => $restaurant->id,
                    'day_of_week' => $day,
                    'open_time' => '09:00:00',
                    'close_time' => '23:00:00',
                    'is_closed' => false,
                ]);
            }

            // Create standard initial delivery zone
            RestaurantDeliveryZone::create([
                'restaurant_id' => $restaurant->id,
                'zone_name' => 'Standard Delivery Zone (Within 5km)',
                'delivery_fee' => $restaurant->delivery_fee,
                'min_order' => $restaurant->minimum_order,
                'is_active' => true,
            ]);

            // Ensure user has restaurant_owner role
            if (!$user->hasRole('restaurant_owner') && !$user->hasRole('super_admin')) {
                $ownerRole = Role::firstOrCreate(['name' => 'restaurant_owner']);
                $user->role_id = $ownerRole->id;
                $user->restaurant_id = $restaurant->id;
                $user->save();
            }

            AuditService::log(
                'restaurant_application_submitted',
                'Restaurants',
                (string)$restaurant->id,
                "Partner {$user->name} submitted application for restaurant '{$restaurant->name}'",
                $user
            );

            $restaurant->load(['cuisines', 'hours', 'deliveryZones']);

            return $this->sendResponse(
                $restaurant,
                'Restaurant application submitted successfully and is pending administrative approval.',
                201
            );
        });
    }

    /**
     * Show detailed restaurant details for management.
     */
    public function show(Request $request, int $restaurantId): JsonResponse
    {
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $restaurant = Restaurant::with([
            'cuisines',
            'hours',
            'deliveryZones',
            'products.variants',
            'products.addons',
            'staff.user',
        ])->findOrFail($restaurantId);

        $data = $restaurant->toArray();
        $data['is_currently_open'] = $restaurant->isOpen();

        return $this->sendResponse($data, 'Restaurant dashboard details');
    }

    /**
     * Update restaurant profile settings (cannot change commission, approval, or active status).
     */
    public function update(RestaurantUpdateRequest $request, int $restaurantId): JsonResponse
    {
        $user = $request->user();
        $this->authorizeOwnerAccess($user, $restaurantId);

        $restaurant = Restaurant::findOrFail($restaurantId);
        $validated = $request->validated();

        // Strictly omit administrative/governance fields from mass-assignment
        $allowedFields = [
            'name',
            'description',
            'phone',
            'email',
            'address',
            'city',
            'area',
            'lat',
            'lng',
            'minimum_order',
            'min_order_amount',
            'delivery_fee',
            'estimated_delivery_time',
            'delivery_enabled',
            'is_open',
            'service_radius_km',
            'logo',
            'cover_image',
        ];

        $updateData = [];
        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $validated)) {
                if ($field === 'min_order_amount') {
                    $updateData['minimum_order'] = $validated[$field];
                } else {
                    $updateData[$field] = $validated[$field];
                }
            }
        }

        $restaurant->update($updateData);

        // Update cuisine associations if passed
        if (isset($validated['cuisines'])) {
            $restaurant->cuisines()->sync($validated['cuisines']);
        }

        AuditService::log(
            'restaurant_updated',
            'Restaurants',
            (string)$restaurant->id,
            "Updated restaurant profile for {$restaurant->name}",
            $user
        );

        $restaurant->load(['cuisines', 'hours', 'deliveryZones']);
        $result = $restaurant->toArray();
        $result['is_currently_open'] = $restaurant->isOpen();

        return $this->sendResponse($result, 'Restaurant profile updated successfully');
    }

    /**
     * Upload and update restaurant media (logo, cover image).
     */
    public function uploadMedia(RestaurantMediaRequest $request, int $restaurantId): JsonResponse
    {
        $user = $request->user();
        $this->authorizeOwnerAccess($user, $restaurantId);

        $restaurant = Restaurant::findOrFail($restaurantId);
        $validated = $request->validated();
        $type = $validated['type']; // logo or cover_image

        $imageUrl = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');

            // Explicit extension and mime verification (strictly raster images)
            $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
            $allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];

            $extension = strtolower($file->getClientOriginalExtension());
            $mime = $file->getMimeType();

            if (!in_array($extension, $allowedExtensions) || !in_array($mime, $allowedMimes)) {
                return $this->sendError('Invalid image file format or MIME type. Allowed formats: JPG, PNG, WEBP', [], 422);
            }

            // Safe filename without path traversal
            $safeName = sprintf('rest_%d_%s_%d_%s.%s', $restaurant->id, $type, time(), Str::random(8), $extension);
            $destinationDir = public_path('uploads/restaurants');
            if (!file_exists($destinationDir)) {
                @mkdir($destinationDir, 0755, true);
            }

            $file->move($destinationDir, $safeName);
            $imageUrl = "/uploads/restaurants/{$safeName}";
        } elseif (!empty($validated['image_url'])) {
            // URL provided directly (must be http/https or /uploads/)
            $candidateUrl = trim(strip_tags($validated['image_url']));
            if (!preg_match('/^(https?:\/\/|\/uploads\/)/i', $candidateUrl)) {
                return $this->sendError('Invalid image URL protocol. Only HTTP, HTTPS, or local upload paths allowed.', [], 422);
            }
            $imageUrl = $candidateUrl;
        } else {
            return $this->sendError('No image file or URL provided', [], 422);
        }

        if ($type === 'logo') {
            $restaurant->logo = $imageUrl;
            $restaurant->save();
        } elseif ($type === 'cover_image') {
            $restaurant->cover_image = $imageUrl;
            $restaurant->save();
        } elseif ($type === 'gallery') {
            \App\Models\RestaurantDocument::create([
                'restaurant_id' => $restaurant->id,
                'document_type' => 'gallery',
                'file_path' => $imageUrl,
                'status' => 'approved',
            ]);
        }

        AuditService::log(
            'restaurant_media_updated',
            'Restaurants',
            (string)$restaurant->id,
            "Updated {$type} for restaurant {$restaurant->name}",
            $user
        );

        return $this->sendResponse([
            'type' => $type,
            'url' => $imageUrl,
            'restaurant' => $restaurant,
        ], ucfirst(str_replace('_', ' ', $type)) . ' updated successfully');
    }

    /**
     * Get configured opening hours for the restaurant.
     */
    public function getHours(Request $request, int $restaurantId): JsonResponse
    {
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $restaurant = Restaurant::findOrFail($restaurantId);
        $hours = RestaurantHour::where('restaurant_id', $restaurantId)->get();

        // Standardize output to ensure all 7 days are represented
        $days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        $mapped = [];

        foreach ($days as $day) {
            $existing = $hours->firstWhere('day_of_week', $day);
            if ($existing) {
                $mapped[] = $existing;
            } else {
                $mapped[] = [
                    'restaurant_id' => $restaurantId,
                    'day_of_week' => $day,
                    'open_time' => '10:00:00',
                    'close_time' => '22:00:00',
                    'open_time_2' => null,
                    'close_time_2' => null,
                    'is_closed' => false,
                ];
            }
        }

        return $this->sendResponse([
            'hours' => $mapped,
            'is_currently_open' => $restaurant->isOpen(),
        ], 'Opening hours retrieved');
    }

    /**
     * Update configured opening hours for all 7 days with split shifts.
     */
    public function updateHours(RestaurantHoursUpdateRequest $request, int $restaurantId): JsonResponse
    {
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $restaurant = Restaurant::findOrFail($restaurantId);
        $hoursData = $request->validated()['hours'];

        DB::transaction(function () use ($restaurantId, $hoursData) {
            foreach ($hoursData as $slot) {
                $isClosed = filter_var($slot['is_closed'], FILTER_VALIDATE_BOOLEAN);

                RestaurantHour::updateOrCreate(
                    [
                        'restaurant_id' => $restaurantId,
                        'day_of_week' => strtolower($slot['day_of_week']),
                    ],
                    [
                        'open_time' => $isClosed ? '00:00:00' : ($slot['open_time'] ?? '10:00:00'),
                        'close_time' => $isClosed ? '00:00:00' : ($slot['close_time'] ?? '22:00:00'),
                        'open_time_2' => $isClosed ? null : ($slot['open_time_2'] ?? null),
                        'close_time_2' => $isClosed ? null : ($slot['close_time_2'] ?? null),
                        'is_closed' => $isClosed,
                    ]
                );
            }
        });

        AuditService::log(
            'restaurant_hours_updated',
            'Restaurants',
            (string)$restaurant->id,
            "Updated opening hours schedule for {$restaurant->name}",
            $user
        );

        $updatedHours = RestaurantHour::where('restaurant_id', $restaurantId)->get();

        return $this->sendResponse([
            'hours' => $updatedHours,
            'is_currently_open' => $restaurant->fresh()->isOpen(),
        ], 'Opening hours updated successfully');
    }

    /**
     * Get delivery zones for the restaurant.
     */
    public function getDeliveryZones(Request $request, int $restaurantId): JsonResponse
    {
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $zones = RestaurantDeliveryZone::where('restaurant_id', $restaurantId)->orderBy('id')->get();
        return $this->sendResponse($zones, 'Delivery zones retrieved');
    }

    /**
     * Add a new delivery zone for the restaurant.
     */
    public function storeDeliveryZone(RestaurantDeliveryZoneRequest $request, int $restaurantId): JsonResponse
    {
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $validated = $request->validated();
        $zone = RestaurantDeliveryZone::create([
            'restaurant_id' => $restaurantId,
            'zone_name' => $validated['zone_name'],
            'delivery_fee' => $validated['delivery_fee'],
            'min_order' => $validated['min_order'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        AuditService::log(
            'restaurant_delivery_settings_updated',
            'Restaurants',
            (string)$restaurantId,
            "Created delivery zone '{$zone->zone_name}' for restaurant #{$restaurantId}",
            $user
        );

        return $this->sendResponse($zone, 'Delivery zone created successfully', 201);
    }

    /**
     * Update an existing delivery zone.
     */
    public function updateDeliveryZone(RestaurantDeliveryZoneRequest $request, $restaurantId, $zoneId): JsonResponse
    {
        $user = $request->user();
        $restaurantId = $restaurantId instanceof Restaurant ? $restaurantId->id : (int)$restaurantId;
        $zoneId = $zoneId instanceof RestaurantDeliveryZone ? $zoneId->id : (int)$zoneId;
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $zone = RestaurantDeliveryZone::where('restaurant_id', $restaurantId)->findOrFail($zoneId);
        $zone->update($request->validated());

        AuditService::log(
            'restaurant_delivery_settings_updated',
            'Restaurants',
            (string)$restaurantId,
            "Updated delivery zone '{$zone->zone_name}'",
            $user
        );

        return $this->sendResponse($zone, 'Delivery zone updated successfully');
    }

    /**
     * Delete an existing delivery zone.
     */
    public function deleteDeliveryZone(Request $request, $restaurantId, $zoneId): JsonResponse
    {
        $user = $request->user();
        $restaurantId = $restaurantId instanceof Restaurant ? $restaurantId->id : (int)$restaurantId;
        $zoneId = $zoneId instanceof RestaurantDeliveryZone ? $zoneId->id : (int)$zoneId;
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $zone = RestaurantDeliveryZone::where('restaurant_id', $restaurantId)->findOrFail($zoneId);
        $zoneName = $zone->zone_name;
        $zone->delete();

        AuditService::log(
            'restaurant_delivery_settings_updated',
            'Restaurants',
            (string)$restaurantId,
            "Deleted delivery zone '{$zoneName}'",
            $user
        );

        return $this->sendResponse(null, "Delivery zone '{$zoneName}' removed successfully");
    }

    /**
     * Authoritative backend restaurant statistics & dashboard summary.
     */
    public function dashboard(Request $request, int $restaurantId): JsonResponse
    {
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $restaurant = Restaurant::with(['cuisines', 'hours'])->findOrFail($restaurantId);

        // Calculate authoritative metrics
        $today = now()->startOfDay();
        $todayOrdersQuery = Order::where('restaurant_id', $restaurantId)->where('created_at', '>=', $today);

        $todayOrders = $todayOrdersQuery->count();
        $todayRevenue = (float) Order::where('restaurant_id', $restaurantId)
            ->where('created_at', '>=', $today)
            ->where('order_status', '!=', 'cancelled')
            ->sum('grand_total');

        $pendingOrders = Order::where('restaurant_id', $restaurantId)
            ->whereIn('order_status', ['pending', 'confirmed'])
            ->count();

        $preparingOrders = Order::where('restaurant_id', $restaurantId)
            ->where('order_status', 'preparing')
            ->count();

        $readyOrders = Order::where('restaurant_id', $restaurantId)
            ->where('order_status', 'ready_for_pickup')
            ->count();

        $completedOrders = Order::where('restaurant_id', $restaurantId)
            ->where('order_status', 'delivered')
            ->count();

        $cancelledOrders = Order::where('restaurant_id', $restaurantId)
            ->where('order_status', 'cancelled')
            ->count();

        $totalNonCancelled = Order::where('restaurant_id', $restaurantId)
            ->where('order_status', '!=', 'cancelled')
            ->count();
        $totalLifetimeRevenue = (float) Order::where('restaurant_id', $restaurantId)
            ->where('order_status', '!=', 'cancelled')
            ->sum('grand_total');

        $averageOrderValue = $totalNonCancelled > 0 ? round($totalLifetimeRevenue / $totalNonCancelled, 2) : 0.00;

        $activeMenuItems = Product::where('restaurant_id', $restaurantId)
            ->where('is_available', true)
            ->count();

        $isCurrentlyOpen = $restaurant->isOpen();

        // Recent 5 orders for quick action
        $recentOrders = Order::where('restaurant_id', $restaurantId)
            ->with(['customer', 'items'])
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(function ($o) {
                return [
                    'id' => $o->id,
                    'order_number' => $o->order_number,
                    'customer_name' => $o->customer?->name ?? 'Guest Customer',
                    'order_status' => $o->order_status,
                    'payment_status' => $o->payment_status,
                    'items_count' => $o->items->sum('quantity'),
                    'grand_total' => (float)$o->grand_total,
                    'created_at' => $o->created_at->toIso8601String(),
                ];
            });

        return $this->sendResponse([
            'restaurant' => [
                'id' => $restaurant->id,
                'name' => $restaurant->name,
                'status' => $restaurant->status,
                'is_open' => (bool)$restaurant->is_open,
                'is_active' => (bool)$restaurant->is_active,
                'delivery_enabled' => (bool)$restaurant->delivery_enabled,
                'is_currently_open' => $isCurrentlyOpen,
                'rating' => (float)$restaurant->rating,
                'review_count' => (int)$restaurant->review_count,
            ],
            'metrics' => [
                'today_orders' => $todayOrders,
                'today_revenue' => $todayRevenue,
                'pending_orders' => $pendingOrders,
                'preparing_orders' => $preparingOrders,
                'ready_orders' => $readyOrders,
                'completed_orders' => $completedOrders,
                'cancelled_orders' => $cancelledOrders,
                'average_order_value' => $averageOrderValue,
                'active_menu_items' => $activeMenuItems,
            ],
            'recent_orders' => $recentOrders,
        ], 'Restaurant dashboard statistics');
    }

    /**
     * Get restaurant orders with safe customer display summary.
     */
    public function getOrders(Request $request, int $restaurantId): JsonResponse
    {
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $query = Order::where('restaurant_id', $restaurantId)
            ->with(['items.addons', 'statusHistories', 'customer'])
            ->orderByDesc('created_at');

        if ($status = $request->query('status')) {
            if ($status !== 'all') {
                $query->where('order_status', $status);
            }
        }

        $orders = $query->get()->map(function ($order) {
            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'customer_display_name' => $order->customer?->name ?? 'Customer',
                'delivery_address' => $order->delivery_address,
                'order_status' => $order->order_status,
                'payment_status' => $order->payment_status,
                'payment_method' => $order->payment_method,
                'subtotal' => (float)$order->subtotal,
                'delivery_fee' => (float)$order->delivery_fee,
                'tax' => (float)$order->tax,
                'discount' => (float)$order->discount,
                'tip' => (float)$order->tip,
                'grand_total' => (float)$order->grand_total,
                'items' => $order->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'product_name' => $item->product_name,
                        'variant_name' => $item->variant_name,
                        'unit_price' => (float)$item->unit_price,
                        'quantity' => $item->quantity,
                        'subtotal' => (float)$item->subtotal,
                        'addons' => $item->addons->map(fn($a) => [
                            'addon_name' => $a->addon_name,
                            'unit_price' => (float)$a->unit_price,
                            'quantity' => $a->quantity,
                            'subtotal' => (float)$a->subtotal,
                        ]),
                    ];
                }),
                'status_history' => $order->statusHistories->map(fn($h) => [
                    'status' => $h->status,
                    'note' => $h->note,
                    'created_at' => $h->created_at->toIso8601String(),
                ]),
                'created_at' => $order->created_at->toIso8601String(),
            ];
        });

        return $this->sendResponse($orders, 'Restaurant orders retrieved');
    }

    /**
     * Transition kitchen order status.
     */
    public function updateOrderStatus(Request $request, $restaurantId, $orderId): JsonResponse
    {
        $user = $request->user();
        $restaurantId = $restaurantId instanceof Restaurant ? $restaurantId->id : (int)$restaurantId;
        $orderId = $orderId instanceof Order ? $orderId->id : (int)$orderId;
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $order = Order::where('restaurant_id', $restaurantId)->findOrFail($orderId);
        $status = $request->input('status');
        $note = $request->input('note', 'Updated by kitchen staff');

        $allowedTransitions = ['confirmed', 'preparing', 'ready_for_pickup', 'cancelled'];
        if (!in_array($status, $allowedTransitions)) {
            return $this->sendError("Restaurant cannot transition order to '{$status}'", [], 422);
        }

        $this->orderService->updateStatus($order, $status, $note, $user->name);
        AuditService::log('order.status_update', 'Kitchen', (string)$order->id, "Kitchen marked order as {$status}", $user);

        return $this->sendResponse($order, "Order status transitioned to {$status}");
    }

    /**
     * Get eligible online couriers for restaurant assignment.
     */
    public function getEligibleRiders(Request $request, $restaurantId): JsonResponse
    {
        $user = $request->user();
        $restaurantId = $restaurantId instanceof Restaurant ? $restaurantId->id : (int)$restaurantId;
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $riders = Rider::with('user')
            ->where('status', 'available')
            ->where('is_active', true)
            ->orderBy('assigned_order_count', 'asc')
            ->get()
            ->map(function ($r) {
                return [
                    'id' => $r->id,
                    'name' => $r->user?->name ?? 'Courier',
                    'phone' => $r->user?->phone,
                    'vehicle_type' => $r->vehicle_type,
                    'vehicle_number' => $r->vehicle_number,
                    'rating' => (float)$r->rating,
                    'assigned_order_count' => (int)$r->assigned_order_count,
                ];
            });

        return $this->sendResponse($riders, 'Eligible available couriers retrieved');
    }

    /**
     * Restaurant manual courier assignment with strict multi-tenant IDOR protection.
     */
    public function assignRider(Request $request, $restaurantId, $orderId): JsonResponse
    {
        $user = $request->user();
        $restaurantId = $restaurantId instanceof Restaurant ? $restaurantId->id : (int)$restaurantId;
        $orderId = $orderId instanceof Order ? $orderId->id : (int)$orderId;
        $this->authorizeRestaurantAccess($user, $restaurantId);

        // Strict multi-tenant verification: Order MUST belong to this restaurant
        $order = Order::where('restaurant_id', $restaurantId)->findOrFail($orderId);

        $unassignableStates = ['cancelled', 'delivered', 'refunded'];
        if (in_array($order->order_status, $unassignableStates)) {
            return $this->sendError("Order cannot be assigned in '{$order->order_status}' status.", [], 422);
        }

        $riderId = $request->validate([
            'rider_id' => ['required', 'exists:riders,id']
        ])['rider_id'];

        $rider = Rider::with('user')->findOrFail($riderId);

        // Eligibility validation
        if (!$rider->is_active || in_array($rider->status, ['suspended', 'inactive', 'offline'])) {
            return $this->sendError("Courier '{$rider->user->name}' is currently {$rider->status} or inactive and cannot accept orders.", [], 422);
        }

        $isReassignment = !empty($order->rider_id) && $order->rider_id != $rider->id;
        $prevRiderId = $order->rider_id;

        DB::transaction(function () use ($order, $rider, $isReassignment, $prevRiderId, $user) {
            if ($isReassignment) {
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

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'status' => $order->order_status,
                'note' => $isReassignment 
                    ? "Order reassigned to courier {$rider->user->name}" 
                    : "Kitchen assigned courier {$rider->user->name}",
                'actor' => $user->name,
                'created_at' => now(),
            ]);

            $auditAction = $isReassignment ? 'delivery.reassign' : 'delivery.assign';
            AuditService::log($auditAction, 'Orders', (string)$order->id, "Kitchen assigned courier {$rider->user->name} to order {$order->order_number}", $user);
        });

        return $this->sendResponse($order->load('rider.user'), "Order successfully assigned to {$rider->user->name}");
    }

    /**
     * Multi-tenant IDOR protection: Verify user owns or works at the restaurant.
     */
    protected function authorizeRestaurantAccess($user, int $restaurantId): void
    {
        if ($user->hasRole('super_admin')) {
            return;
        }

        $isOwner = Restaurant::where('id', $restaurantId)->where('owner_id', $user->id)->exists();
        $isStaff = ($user->restaurant_id == $restaurantId);

        if (!$isOwner && !$isStaff) {
            abort(403, 'Unauthorized access to this restaurant. IDOR protection enforced.');
        }
    }

    /**
     * Multi-tenant IDOR protection: Verify user owns the restaurant (or is super admin).
     * Staff cannot modify restaurant profile, financials, or upload media.
     */
    protected function authorizeOwnerAccess($user, int $restaurantId): void
    {
        if ($user->hasRole('super_admin')) {
            return;
        }

        $isOwner = Restaurant::where('id', $restaurantId)->where('owner_id', $user->id)->exists();

        if (!$isOwner) {
            abort(403, 'Unauthorized access: only the restaurant owner or administrator can modify restaurant settings.');
        }
    }
}

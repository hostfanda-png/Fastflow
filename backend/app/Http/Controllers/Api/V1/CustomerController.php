<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CustomerAddress;
use App\Models\Favorite;
use App\Models\ProductFavorite;
use App\Models\Notification;
use App\Models\Review;
use App\Models\Restaurant;
use App\Models\Product;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class CustomerController extends Controller
{
    public function getProfile(Request $request): JsonResponse
    {
        $user = $request->user()->load(['role.permissions', 'addresses']);

        return $this->sendResponse([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar' => $user->avatar,
            'role' => $user->role->name,
            'addresses' => $user->addresses,
        ], 'Customer profile retrieved');
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'string', 'max:30'],
            'avatar' => ['nullable', 'string', 'max:500'],
        ]);

        $user->update($validated);

        AuditService::log('customer.update_profile', 'Customer', (string)$user->id, 'Updated profile information', $user);

        return $this->sendResponse([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar' => $user->avatar,
            'role' => $user->role->name,
        ], 'Profile updated successfully');
    }

    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (!Hash::check($validated['current_password'], $user->password)) {
            return $this->sendError('Current password does not match our records.', [], 422);
        }

        $user->password = Hash::make($validated['password']);
        $user->save();

        AuditService::log('customer.change_password', 'Customer', (string)$user->id, 'Changed account password', $user);

        return $this->sendResponse(null, 'Password updated successfully');
    }

    public function deactivateAccount(Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (!Hash::check($request->password, $user->password)) {
            return $this->sendError('Incorrect password verification.', [], 422);
        }

        $user->status = 'inactive';
        $user->save();

        // Revoke all tokens
        $user->tokens()->delete();

        AuditService::log('customer.deactivate_account', 'Customer', (string)$user->id, 'Deactivated account', $user);

        return $this->sendResponse(null, 'Account deactivated successfully');
    }

    // Address Management
    public function getAddresses(Request $request): JsonResponse
    {
        $user = $request->user();
        $addresses = CustomerAddress::where('user_id', $user->id)
            ->orderByDesc('is_default')
            ->orderByDesc('created_at')
            ->get();

        return $this->sendResponse($addresses, 'Customer addresses retrieved');
    }

    public function storeAddress(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'label' => ['required', 'string', 'max:50'],
            'recipient_name' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30'],
            'street' => ['required', 'string', 'max:255'],
            'area' => ['required', 'string', 'max:100'],
            'city' => ['required', 'string', 'max:100'],
            'lat' => ['nullable', 'numeric'],
            'lng' => ['nullable', 'numeric'],
            'delivery_instructions' => ['nullable', 'string', 'max:500'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        if (!empty($validated['is_default'])) {
            CustomerAddress::where('user_id', $user->id)->update(['is_default' => false]);
        } else {
            // First address created defaults to default
            if (CustomerAddress::where('user_id', $user->id)->count() === 0) {
                $validated['is_default'] = true;
            }
        }

        // Strict derivation: never trust client-supplied customer_id
        $validated['user_id'] = $user->id;
        $address = CustomerAddress::create($validated);

        AuditService::log('customer.add_address', 'Customer', (string)$address->id, "Added address {$address->label}", $user);

        return $this->sendResponse($address, 'Delivery address added successfully', 201);
    }

    public function updateAddress(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $address = CustomerAddress::where('user_id', $user->id)->findOrFail($id);

        $validated = $request->validate([
            'label' => ['sometimes', 'string', 'max:50'],
            'recipient_name' => ['nullable', 'string', 'max:100'],
            'phone' => ['nullable', 'string', 'max:30'],
            'street' => ['sometimes', 'string', 'max:255'],
            'area' => ['sometimes', 'string', 'max:100'],
            'city' => ['sometimes', 'string', 'max:100'],
            'lat' => ['nullable', 'numeric'],
            'lng' => ['nullable', 'numeric'],
            'delivery_instructions' => ['nullable', 'string', 'max:500'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        if (!empty($validated['is_default'])) {
            CustomerAddress::where('user_id', $user->id)->where('id', '!=', $id)->update(['is_default' => false]);
        }

        $address->update($validated);

        return $this->sendResponse($address, 'Address updated successfully');
    }

    public function deleteAddress(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $address = CustomerAddress::where('user_id', $user->id)->findOrFail($id);
        $wasDefault = $address->is_default;
        $address->delete();

        // If default address was deleted, promote another address if one exists
        if ($wasDefault) {
            $next = CustomerAddress::where('user_id', $user->id)->first();
            if ($next) {
                $next->update(['is_default' => true]);
            }
        }

        AuditService::log('customer.delete_address', 'Customer', (string)$id, 'Deleted delivery address', $user);

        return $this->sendResponse(null, 'Address removed successfully');
    }

    public function setDefaultAddress(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $address = CustomerAddress::where('user_id', $user->id)->findOrFail($id);

        CustomerAddress::where('user_id', $user->id)->update(['is_default' => false]);
        $address->update(['is_default' => true]);

        return $this->sendResponse($address, 'Default delivery address updated');
    }

    // Favorites Management
    public function getFavorites(Request $request): JsonResponse
    {
        $user = $request->user();

        $restaurantFavorites = Favorite::where('user_id', $user->id)
            ->with(['restaurant.cuisines'])
            ->get()
            ->map(function ($fav) {
                return [
                    'id' => $fav->id,
                    'type' => 'restaurant',
                    'restaurant' => $fav->restaurant,
                    'created_at' => $fav->created_at,
                ];
            });

        $productFavorites = ProductFavorite::where('user_id', $user->id)
            ->with(['product.restaurant', 'product.category'])
            ->get()
            ->map(function ($fav) {
                return [
                    'id' => $fav->id,
                    'type' => 'product',
                    'product' => $fav->product,
                    'created_at' => $fav->created_at,
                ];
            });

        return $this->sendResponse([
            'restaurants' => $restaurantFavorites,
            'products' => $productFavorites,
        ], 'Customer favorites retrieved');
    }

    public function toggleRestaurantFavorite(Request $request, int $restaurantId): JsonResponse
    {
        $user = $request->user();
        $restaurant = Restaurant::findOrFail($restaurantId);

        $existing = Favorite::where('user_id', $user->id)->where('restaurant_id', $restaurant->id)->first();

        if ($existing) {
            $existing->delete();
            return $this->sendResponse(['is_favorite' => false], "Removed {$restaurant->name} from favorites");
        } else {
            Favorite::create([
                'user_id' => $user->id,
                'restaurant_id' => $restaurant->id,
            ]);
            return $this->sendResponse(['is_favorite' => true], "Added {$restaurant->name} to favorites", 201);
        }
    }

    public function toggleProductFavorite(Request $request, int $productId): JsonResponse
    {
        $user = $request->user();
        $product = Product::findOrFail($productId);

        $existing = ProductFavorite::where('user_id', $user->id)->where('product_id', $product->id)->first();

        if ($existing) {
            $existing->delete();
            return $this->sendResponse(['is_favorite' => false], "Removed {$product->name} from saved dishes");
        } else {
            ProductFavorite::create([
                'user_id' => $user->id,
                'product_id' => $product->id,
            ]);
            return $this->sendResponse(['is_favorite' => true], "Saved {$product->name} to favorites", 201);
        }
    }

    // Notifications Management
    public function getNotifications(Request $request): JsonResponse
    {
        $user = $request->user();

        $notifications = Notification::where('notifiable_type', get_class($user))
            ->where('notifiable_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate((int)$request->query('per_page', 20));

        $unreadCount = Notification::where('notifiable_type', get_class($user))
            ->where('notifiable_id', $user->id)
            ->whereNull('read_at')
            ->count();

        return $this->sendResponse([
            'notifications' => $notifications->items(),
            'unread_count' => $unreadCount,
            'pagination' => [
                'current_page' => $notifications->currentPage(),
                'total' => $notifications->total(),
                'per_page' => $notifications->perPage(),
            ],
        ], 'Customer notifications retrieved');
    }

    public function markNotificationRead(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $notification = Notification::where('notifiable_type', get_class($user))
            ->where('notifiable_id', $user->id)
            ->where('id', $id)
            ->firstOrFail();

        $notification->update(['read_at' => now()]);

        return $this->sendResponse($notification, 'Notification marked as read');
    }

    public function markAllNotificationsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        Notification::where('notifiable_type', get_class($user))
            ->where('notifiable_id', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return $this->sendResponse(null, 'All notifications marked as read');
    }

    public function deleteNotification(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $notification = Notification::where('notifiable_type', get_class($user))
            ->where('notifiable_id', $user->id)
            ->where('id', $id)
            ->firstOrFail();

        $notification->delete();

        return $this->sendResponse(null, 'Notification removed');
    }

    // Customer Reviews
    public function getReviews(Request $request): JsonResponse
    {
        $user = $request->user();
        $reviews = Review::where('customer_id', $user->id)
            ->with(['restaurant', 'order'])
            ->orderByDesc('created_at')
            ->get();

        return $this->sendResponse($reviews, 'Customer reviews retrieved');
    }
}

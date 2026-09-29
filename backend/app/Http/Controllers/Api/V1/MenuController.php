<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use App\Models\Restaurant;
use App\Models\ProductVariant;
use App\Models\Addon;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class MenuController extends Controller
{
    public function getCategories(): JsonResponse
    {
        $categories = Category::where('is_active', true)->orderBy('sort_order')->get();
        return $this->sendResponse($categories, 'Categories retrieved');
    }

    public function storeProduct(Request $request, int $restaurantId): JsonResponse
    {
        $user = $request->user();
        $this->authorizeRestaurant($user, $restaurantId);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'category_id' => ['required', 'exists:categories,id'],
            'description' => ['nullable', 'string'],
            'image' => ['nullable', 'string'],
            'price' => ['required', 'numeric', 'min:0'],
            'discount_price' => ['nullable', 'numeric', 'min:0'],
            'preparation_time' => ['nullable', 'integer', 'min:1'],
            'variants' => ['nullable', 'array'],
            'variants.*.name' => ['required', 'string'],
            'variants.*.price_modifier' => ['required', 'numeric'],
            'addons' => ['nullable', 'array'],
        ]);

        $slug = \Illuminate\Support\Str::slug($validated['name']) . '-' . time();

        $product = Product::create([
            'restaurant_id' => $restaurantId,
            'category_id' => $validated['category_id'],
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'image' => $validated['image'] ?? null,
            'price' => $validated['price'],
            'discount_price' => $validated['discount_price'] ?? null,
            'is_available' => true,
            'preparation_time' => $validated['preparation_time'] ?? 15,
        ]);

        if (!empty($validated['variants'])) {
            foreach ($validated['variants'] as $v) {
                ProductVariant::create([
                    'product_id' => $product->id,
                    'name' => $v['name'],
                    'price_modifier' => $v['price_modifier'],
                ]);
            }
        }

        AuditService::log('menu.product_create', 'Menu', (string)$product->id, "Created dish {$product->name}", $user);

        return $this->sendResponse($product->load(['variants', 'addons']), 'Product created successfully', 201);
    }

    public function updateProduct(Request $request, int $restaurantId, int $productId): JsonResponse
    {
        $user = $request->user();
        $this->authorizeRestaurant($user, $restaurantId);

        $product = Product::where('restaurant_id', $restaurantId)->findOrFail($productId);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'category_id' => ['sometimes', 'exists:categories,id'],
            'description' => ['nullable', 'string'],
            'price' => ['sometimes', 'numeric', 'min:0'],
            'discount_price' => ['nullable', 'numeric', 'min:0'],
            'is_available' => ['sometimes', 'boolean'],
            'preparation_time' => ['sometimes', 'integer', 'min:1'],
        ]);

        $product->update($validated);

        AuditService::log('menu.product_update', 'Menu', (string)$product->id, "Updated dish {$product->name}", $user);

        return $this->sendResponse($product->load(['variants', 'addons']), 'Product updated');
    }

    public function deleteProduct(Request $request, int $restaurantId, int $productId): JsonResponse
    {
        $user = $request->user();
        $this->authorizeRestaurant($user, $restaurantId);

        $product = Product::where('restaurant_id', $restaurantId)->findOrFail($productId);
        $product->delete();

        AuditService::log('menu.product_delete', 'Menu', (string)$productId, "Deleted dish {$product->name}", $user);

        return $this->sendResponse(null, 'Product removed from menu');
    }

    public function toggleAvailability(Request $request, int $restaurantId, int $productId): JsonResponse
    {
        $user = $request->user();
        $this->authorizeRestaurant($user, $restaurantId);

        $product = Product::where('restaurant_id', $restaurantId)->findOrFail($productId);
        $product->is_available = !$product->is_available;
        $product->save();

        return $this->sendResponse(['is_available' => $product->is_available], 'Product availability toggled');
    }

    protected function authorizeRestaurant($user, int $restaurantId): void
    {
        if ($user->hasRole('super_admin')) {
            return;
        }

        $isOwner = Restaurant::where('id', $restaurantId)->where('owner_id', $user->id)->exists();
        $isStaff = ($user->restaurant_id == $restaurantId);

        if (!$isOwner && !$isStaff) {
            abort(403, 'Unauthorized access to this restaurant menu');
        }
    }
}

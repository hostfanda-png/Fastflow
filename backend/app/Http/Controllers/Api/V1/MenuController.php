<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\MenuCategoryRequest;
use App\Http\Requests\ProductRequest;
use App\Http\Requests\ProductVariantRequest;
use App\Http\Requests\AddonRequest;
use App\Models\Product;
use App\Models\Category;
use App\Models\Restaurant;
use App\Models\ProductVariant;
use App\Models\Addon;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MenuController extends Controller
{
    // ==========================================
    // PUBLIC / STOREFRONT ENDPOINTS
    // ==========================================

    /**
     * Get active categories (optionally scoped to a restaurant).
     */
    public function getCategories(Request $request): JsonResponse
    {
        $restaurantId = $request->query('restaurant_id');

        $query = Category::where('is_active', true);

        if ($restaurantId) {
            $query->where(function ($q) use ($restaurantId) {
                $q->where('restaurant_id', $restaurantId)
                  ->orWhereNull('restaurant_id');
            });
        }

        $categories = $query->orderBy('sort_order')->orderBy('name')->get();
        return $this->sendResponse($categories, 'Categories retrieved successfully');
    }

    /**
     * Get structured menu for a restaurant (Categories -> Active Products -> Variants & Addons).
     */
    public function getPublicMenu(string $restaurantIdentifier): JsonResponse
    {
        $restaurant = Restaurant::where('id', $restaurantIdentifier)
            ->orWhere('slug', $restaurantIdentifier)
            ->firstOrFail();

        $categories = Category::where(function ($q) use ($restaurant) {
                $q->where('restaurant_id', $restaurant->id)
                  ->orWhereNull('restaurant_id');
            })
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->with(['products' => function ($q) use ($restaurant) {
                $q->where('restaurant_id', $restaurant->id)
                  ->where('is_available', true)
                  ->orderBy('sort_order')
                  ->with([
                      'activeVariants',
                      'availableAddons',
                  ]);
            }])
            ->get();

        // Also fetch any un-categorized or all products for this restaurant
        $allProducts = Product::where('restaurant_id', $restaurant->id)
            ->where('is_available', true)
            ->orderBy('sort_order')
            ->with(['category', 'activeVariants', 'availableAddons'])
            ->get();

        return $this->sendResponse([
            'restaurant' => [
                'id' => $restaurant->id,
                'name' => $restaurant->name,
                'slug' => $restaurant->slug,
                'is_open' => $restaurant->isOpen(),
                'delivery_fee' => (float)$restaurant->delivery_fee,
                'minimum_order' => (float)$restaurant->minimum_order,
            ],
            'categories' => $categories,
            'products' => $allProducts,
        ], 'Restaurant menu retrieved successfully');
    }

    /**
     * Search/List products publicly.
     */
    public function getPublicProducts(Request $request): JsonResponse
    {
        $query = Product::where('is_available', true)
            ->whereHas('restaurant', function ($q) {
                $q->activeAndApproved();
            })
            ->with(['restaurant:id,name,slug,rating,delivery_fee,is_open', 'category:id,name,slug', 'activeVariants', 'availableAddons']);

        if ($restaurantId = $request->query('restaurant_id')) {
            $query->where('restaurant_id', $restaurantId);
        }

        if ($categoryId = $request->query('category_id')) {
            $query->where('category_id', $categoryId);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $products = $query->orderBy('sort_order')->paginate($request->integer('per_page', 24));
        return $this->sendResponse($products, 'Products retrieved');
    }

    // ==========================================
    // OWNER: CATEGORIES MANAGEMENT
    // ==========================================

    /**
     * List categories belonging to the restaurant (and global categories).
     */
    public function getOwnerCategories(Request $request, $restaurantId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $categories = Category::where('restaurant_id', $restaurantId)
            ->orWhereNull('restaurant_id')
            ->withCount(['products' => function ($q) use ($restaurantId) {
                $q->where('restaurant_id', $restaurantId);
            }])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return $this->sendResponse($categories, 'Owner categories retrieved');
    }

    /**
     * Store a new category for the restaurant.
     */
    public function storeCategory(MenuCategoryRequest $request, $restaurantId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $validated = $request->validated();
        $baseSlug = !empty($validated['slug']) ? Str::slug($validated['slug']) : Str::slug($validated['name']);
        $slug = $this->generateUniqueCategorySlug($baseSlug, $restaurantId);

        $category = Category::create([
            'restaurant_id' => $restaurantId,
            'name' => $validated['name'],
            'slug' => $slug,
            'description' => $validated['description'] ?? null,
            'icon' => $validated['icon'] ?? null,
            'image' => $validated['image'] ?? null,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? (Category::where('restaurant_id', $restaurantId)->max('sort_order') + 1),
        ]);

        AuditService::log('menu.category_create', 'MenuCategory', (string)$category->id, "Created menu category {$category->name} for restaurant #{$restaurantId}", $user);

        return $this->sendResponse($category, 'Menu category created successfully', 201);
    }

    /**
     * Show single category.
     */
    public function showCategory(Request $request, $restaurantId, $categoryId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $category = Category::where(function ($q) use ($restaurantId) {
                $q->where('restaurant_id', $restaurantId)->orWhereNull('restaurant_id');
            })
            ->with(['products' => function ($q) use ($restaurantId) {
                $q->where('restaurant_id', $restaurantId);
            }])
            ->findOrFail($categoryId);

        return $this->sendResponse($category, 'Category details retrieved');
    }

    /**
     * Update a category.
     */
    public function updateCategory(MenuCategoryRequest $request, $restaurantId, $categoryId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $category = Category::where('restaurant_id', $restaurantId)->findOrFail($categoryId);
        $validated = $request->validated();

        if (!empty($validated['slug']) && $validated['slug'] !== $category->slug) {
            $validated['slug'] = $this->generateUniqueCategorySlug(Str::slug($validated['slug']), $restaurantId, $category->id);
        }

        $category->update($validated);

        AuditService::log('menu.category_update', 'MenuCategory', (string)$category->id, "Updated category {$category->name} for restaurant #{$restaurantId}", $user);

        return $this->sendResponse($category, 'Category updated successfully');
    }

    /**
     * Safe category deletion (prevents deleting if products are assigned).
     */
    public function deleteCategory(Request $request, $restaurantId, $categoryId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $category = Category::where('restaurant_id', $restaurantId)->findOrFail($categoryId);

        $productsCount = Product::where('restaurant_id', $restaurantId)->where('category_id', $categoryId)->count();
        if ($productsCount > 0) {
            return $this->sendError("Cannot delete category '{$category->name}'. It contains {$productsCount} active products. Please reassign or remove products first.", [], 422);
        }

        $categoryName = $category->name;
        $category->delete();

        AuditService::log('menu.category_delete', 'MenuCategory', (string)$categoryId, "Deleted category {$categoryName} for restaurant #{$restaurantId}", $user);

        return $this->sendResponse(null, "Category '{$categoryName}' deleted successfully");
    }

    /**
     * Batch reorder categories.
     */
    public function reorderCategories(Request $request, $restaurantId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $validated = $request->validate([
            'orders' => ['required', 'array'],
            'orders.*.id' => ['required', 'integer'],
            'orders.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($validated, $restaurantId) {
            foreach ($validated['orders'] as $item) {
                Category::where('restaurant_id', $restaurantId)
                    ->where('id', $item['id'])
                    ->update(['sort_order' => $item['sort_order']]);
            }
        });

        return $this->sendResponse(null, 'Categories reordered successfully');
    }

    // ==========================================
    // OWNER: PRODUCTS MANAGEMENT
    // ==========================================

    /**
     * List owner products with relations and filters.
     */
    public function getOwnerProducts(Request $request, $restaurantId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $query = Product::where('restaurant_id', $restaurantId)
            ->with(['category', 'variants', 'addons']);

        if ($categoryId = $request->query('category_id')) {
            $query->where('category_id', $categoryId);
        }

        if ($request->has('is_available')) {
            $query->where('is_available', $request->boolean('is_available'));
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $products = $query->orderBy('sort_order')->orderByDesc('id')->get();
        return $this->sendResponse($products, 'Products retrieved successfully');
    }

    /**
     * Create product for restaurant.
     */
    public function storeProduct(ProductRequest $request, $restaurantId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $validated = $request->validated();

        // Validate Category Belongs to Same Restaurant or is Global
        $category = Category::where('id', $validated['category_id'])
            ->where(function ($q) use ($restaurantId) {
                $q->where('restaurant_id', $restaurantId)->orWhereNull('restaurant_id');
            })
            ->first();

        if (!$category) {
            return $this->sendError('Selected category is invalid or belongs to another restaurant.', [], 422);
        }

        $baseSlug = Str::slug($validated['name']);
        $slug = $this->generateUniqueProductSlug($baseSlug, $restaurantId);

        $product = DB::transaction(function () use ($validated, $restaurantId, $slug) {
            $product = Product::create([
                'restaurant_id' => $restaurantId,
                'category_id' => $validated['category_id'],
                'name' => $validated['name'],
                'slug' => $slug,
                'description' => $validated['description'] ?? null,
                'image' => $validated['image'] ?? null,
                'price' => $validated['price'],
                'discount_price' => $validated['discount_price'] ?? null,
                'compare_at_price' => $validated['compare_at_price'] ?? null,
                'is_available' => $validated['is_available'] ?? true,
                'sort_order' => $validated['sort_order'] ?? (Product::where('restaurant_id', $restaurantId)->max('sort_order') + 1),
                'preparation_time' => $validated['preparation_time'] ?? 15,
                'tax_rate' => $validated['tax_rate'] ?? 5.00,
            ]);

            // Create Variants if passed
            if (!empty($validated['variants'])) {
                foreach ($validated['variants'] as $v) {
                    ProductVariant::create([
                        'product_id' => $product->id,
                        'name' => $v['name'],
                        'price_modifier' => $v['price_modifier'],
                        'is_active' => $v['is_active'] ?? true,
                        'sort_order' => $v['sort_order'] ?? 0,
                    ]);
                }
            }

            // Sync Addons if passed
            if (!empty($validated['addons'])) {
                // Ensure all addons belong strictly to this restaurant
                $validAddonIds = Addon::where('restaurant_id', $restaurantId)
                    ->whereIn('id', $validated['addons'])
                    ->pluck('id')
                    ->toArray();

                if (count($validAddonIds) !== count($validated['addons'])) {
                    throw new \InvalidArgumentException('One or more selected add-ons do not belong to this restaurant.');
                }
                $product->addons()->sync($validAddonIds);
            }

            return $product;
        });

        AuditService::log('menu.product_create', 'Product', (string)$product->id, "Created dish '{$product->name}' at PKR {$product->price} for restaurant #{$restaurantId}", $user);

        return $this->sendResponse($product->load(['category', 'variants', 'addons']), 'Product created successfully', 201);
    }

    /**
     * Show single product details.
     */
    public function showProduct(Request $request, $restaurantId, $productId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $product = Product::where('restaurant_id', $restaurantId)
            ->with(['category', 'variants', 'addons'])
            ->findOrFail($productId);

        return $this->sendResponse($product, 'Product details retrieved');
    }

    /**
     * Update product details.
     */
    public function updateProduct(ProductRequest $request, $restaurantId, $productId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $product = Product::where('restaurant_id', $restaurantId)->findOrFail($productId);
        $validated = $request->validated();

        if (!empty($validated['category_id'])) {
            $category = Category::where('id', $validated['category_id'])
                ->where(function ($q) use ($restaurantId) {
                    $q->where('restaurant_id', $restaurantId)->orWhereNull('restaurant_id');
                })
                ->first();

            if (!$category) {
                return $this->sendError('Selected category is invalid or belongs to another restaurant.', [], 422);
            }
        }

        $oldPrice = $product->price;

        DB::transaction(function () use ($product, $validated, $restaurantId) {
            $product->update([
                'category_id' => $validated['category_id'] ?? $product->category_id,
                'name' => $validated['name'] ?? $product->name,
                'description' => $validated['description'] ?? $product->description,
                'image' => array_key_exists('image', $validated) ? $validated['image'] : $product->image,
                'price' => $validated['price'] ?? $product->price,
                'discount_price' => array_key_exists('discount_price', $validated) ? $validated['discount_price'] : $product->discount_price,
                'compare_at_price' => array_key_exists('compare_at_price', $validated) ? $validated['compare_at_price'] : $product->compare_at_price,
                'is_available' => array_key_exists('is_available', $validated) ? $validated['is_available'] : $product->is_available,
                'sort_order' => $validated['sort_order'] ?? $product->sort_order,
                'preparation_time' => $validated['preparation_time'] ?? $product->preparation_time,
                'tax_rate' => $validated['tax_rate'] ?? $product->tax_rate,
            ]);

            // Sync Variants if passed
            if (array_key_exists('variants', $validated)) {
                $existingVariantIds = [];
                if (!empty($validated['variants'])) {
                    foreach ($validated['variants'] as $v) {
                        if (!empty($v['id'])) {
                            $var = ProductVariant::where('product_id', $product->id)->find($v['id']);
                            if ($var) {
                                $var->update([
                                    'name' => $v['name'],
                                    'price_modifier' => $v['price_modifier'],
                                    'is_active' => $v['is_active'] ?? true,
                                    'sort_order' => $v['sort_order'] ?? 0,
                                ]);
                                $existingVariantIds[] = $var->id;
                            }
                        } else {
                            $newVar = ProductVariant::create([
                                'product_id' => $product->id,
                                'name' => $v['name'],
                                'price_modifier' => $v['price_modifier'],
                                'is_active' => $v['is_active'] ?? true,
                                'sort_order' => $v['sort_order'] ?? 0,
                            ]);
                            $existingVariantIds[] = $newVar->id;
                        }
                    }
                }
                // Delete removed variants
                ProductVariant::where('product_id', $product->id)
                    ->whereNotIn('id', $existingVariantIds)
                    ->delete();
            }

            // Sync Addons if passed
            if (array_key_exists('addons', $validated)) {
                $submittedAddons = $validated['addons'] ?? [];
                $validAddonIds = Addon::where('restaurant_id', $restaurantId)
                    ->whereIn('id', $submittedAddons)
                    ->pluck('id')
                    ->toArray();

                if (count($validAddonIds) !== count($submittedAddons)) {
                    throw new \InvalidArgumentException('One or more selected add-ons do not belong to this restaurant.');
                }
                $product->addons()->sync($validAddonIds);
            }
        });

        AuditService::log('menu.product_update', 'Product', (string)$product->id, "Updated dish '{$product->name}' (Price: {$oldPrice} -> {$product->price}) for restaurant #{$restaurantId}", $user);

        return $this->sendResponse($product->fresh(['category', 'variants', 'addons']), 'Product updated successfully');
    }

    /**
     * Delete product.
     */
    public function deleteProduct(Request $request, $restaurantId, $productId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $product = Product::where('restaurant_id', $restaurantId)->findOrFail($productId);
        $productName = $product->name;
        $product->delete();

        AuditService::log('menu.product_delete', 'Product', (string)$productId, "Deleted dish '{$productName}' from restaurant #{$restaurantId}", $user);

        return $this->sendResponse(null, "Dish '{$productName}' removed from menu");
    }

    /**
     * Toggle product availability.
     */
    public function toggleAvailability(Request $request, $restaurantId, $productId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $product = Product::where('restaurant_id', $restaurantId)->findOrFail($productId);
        $product->is_available = !$product->is_available;
        $product->save();

        AuditService::log('menu.product_availability', 'Product', (string)$product->id, "Toggled availability for '{$product->name}' to " . ($product->is_available ? 'Available' : 'Sold Out'), $user);

        return $this->sendResponse([
            'id' => $product->id,
            'is_available' => $product->is_available,
        ], "Product is now " . ($product->is_available ? 'available' : 'marked as sold out'));
    }

    /**
     * Upload product image.
     */
    public function uploadProductImage(Request $request, $restaurantId, $productId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $product = Product::where('restaurant_id', $restaurantId)->findOrFail($productId);

        $request->validate([
            'image_url' => ['nullable', 'string', 'url', 'max:1000'],
            'file' => ['nullable', 'file', 'mimes:jpeg,png,jpg,webp,avif', 'max:5120'], // 5MB max
        ]);

        $imageUrl = null;
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $filename = 'product_' . $product->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('public/products/' . $restaurantId, $filename);
            $imageUrl = Storage::url($path);
        } elseif ($request->filled('image_url')) {
            $imageUrl = $request->input('image_url');
        } else {
            return $this->sendError('Please provide an image file or URL.', [], 422);
        }

        $product->image = $imageUrl;
        $product->save();

        AuditService::log('menu.product_image', 'Product', (string)$product->id, "Updated image for dish '{$product->name}'", $user);

        return $this->sendResponse([
            'id' => $product->id,
            'image' => $product->image,
        ], 'Product image uploaded and updated successfully');
    }

    /**
     * Batch reorder products.
     */
    public function reorderProducts(Request $request, $restaurantId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $validated = $request->validate([
            'orders' => ['required', 'array'],
            'orders.*.id' => ['required', 'integer'],
            'orders.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($validated, $restaurantId) {
            foreach ($validated['orders'] as $item) {
                Product::where('restaurant_id', $restaurantId)
                    ->where('id', $item['id'])
                    ->update(['sort_order' => $item['sort_order']]);
            }
        });

        return $this->sendResponse(null, 'Products reordered successfully');
    }

    // ==========================================
    // OWNER: PRODUCT VARIANTS MANAGEMENT
    // ==========================================

    /**
     * List variants of a product.
     */
    public function getVariants(Request $request, $restaurantId, $productId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $product = Product::where('restaurant_id', $restaurantId)->findOrFail($productId);
        $variants = $product->variants()->orderBy('sort_order')->get();

        return $this->sendResponse($variants, 'Variants retrieved');
    }

    /**
     * Store a variant.
     */
    public function storeVariant(ProductVariantRequest $request, $restaurantId, $productId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $product = Product::where('restaurant_id', $restaurantId)->findOrFail($productId);
        $validated = $request->validated();

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => $validated['name'],
            'price_modifier' => $validated['price_modifier'],
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? ($product->variants()->max('sort_order') + 1),
        ]);

        AuditService::log('menu.variant_create', 'ProductVariant', (string)$variant->id, "Created variant '{$variant->name}' for dish '{$product->name}'", $user);

        return $this->sendResponse($variant, 'Variant created successfully', 201);
    }

    /**
     * Update variant.
     */
    public function updateVariant(ProductVariantRequest $request, $restaurantId, $productId, $variantId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $product = Product::where('restaurant_id', $restaurantId)->findOrFail($productId);
        $variant = ProductVariant::where('product_id', $product->id)->findOrFail($variantId);

        $variant->update($request->validated());

        AuditService::log('menu.variant_update', 'ProductVariant', (string)$variant->id, "Updated variant '{$variant->name}' for dish '{$product->name}'", $user);

        return $this->sendResponse($variant, 'Variant updated successfully');
    }

    /**
     * Delete variant.
     */
    public function deleteVariant(Request $request, $restaurantId, $productId, $variantId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $product = Product::where('restaurant_id', $restaurantId)->findOrFail($productId);
        $variant = ProductVariant::where('product_id', $product->id)->findOrFail($variantId);
        $variantName = $variant->name;
        $variant->delete();

        AuditService::log('menu.variant_delete', 'ProductVariant', (string)$variantId, "Deleted variant '{$variantName}' for dish '{$product->name}'", $user);

        return $this->sendResponse(null, "Variant '{$variantName}' removed");
    }

    // ==========================================
    // OWNER: ADDONS MANAGEMENT
    // ==========================================

    /**
     * List all addons for a restaurant.
     */
    public function getAddons(Request $request, $restaurantId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $addons = Addon::where('restaurant_id', $restaurantId)
            ->withCount('products')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return $this->sendResponse($addons, 'Addons retrieved successfully');
    }

    /**
     * Store addon for restaurant.
     */
    public function storeAddon(AddonRequest $request, $restaurantId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $validated = $request->validated();

        $addon = Addon::create([
            'restaurant_id' => $restaurantId,
            'name' => $validated['name'],
            'price' => $validated['price'],
            'is_available' => $validated['is_available'] ?? true,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? (Addon::where('restaurant_id', $restaurantId)->max('sort_order') + 1),
        ]);

        AuditService::log('menu.addon_create', 'Addon', (string)$addon->id, "Created addon '{$addon->name}' at PKR {$addon->price} for restaurant #{$restaurantId}", $user);

        return $this->sendResponse($addon, 'Add-on created successfully', 201);
    }

    /**
     * Update addon.
     */
    public function updateAddon(AddonRequest $request, $restaurantId, $addonId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $addon = Addon::where('restaurant_id', $restaurantId)->findOrFail($addonId);
        $addon->update($request->validated());

        AuditService::log('menu.addon_update', 'Addon', (string)$addon->id, "Updated addon '{$addon->name}' for restaurant #{$restaurantId}", $user);

        return $this->sendResponse($addon, 'Add-on updated successfully');
    }

    /**
     * Delete addon.
     */
    public function deleteAddon(Request $request, $restaurantId, $addonId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $addon = Addon::where('restaurant_id', $restaurantId)->findOrFail($addonId);
        $addonName = $addon->name;

        // Detach from all products before deleting
        $addon->products()->detach();
        $addon->delete();

        AuditService::log('menu.addon_delete', 'Addon', (string)$addonId, "Deleted addon '{$addonName}' for restaurant #{$restaurantId}", $user);

        return $this->sendResponse(null, "Add-on '{$addonName}' deleted");
    }

    /**
     * Sync addons attached to a specific product.
     */
    public function syncProductAddons(Request $request, $restaurantId, $productId): JsonResponse
    {
        $restaurantId = $this->resolveRestaurantId($restaurantId);
        $user = $request->user();
        $this->authorizeRestaurantAccess($user, $restaurantId);

        $product = Product::where('restaurant_id', $restaurantId)->findOrFail($productId);

        $validated = $request->validate([
            'addon_ids' => ['required', 'array'],
            'addon_ids.*' => ['integer', 'exists:addons,id'],
        ]);

        // Filter addon IDs to ensure they belong to this restaurant
        $validAddonIds = Addon::where('restaurant_id', $restaurantId)
            ->whereIn('id', $validated['addon_ids'])
            ->pluck('id')
            ->toArray();

        if (count($validAddonIds) !== count($validated['addon_ids'])) {
            return $this->sendError('One or more selected add-ons do not belong to this restaurant.', [], 422);
        }

        $product->addons()->sync($validAddonIds);

        AuditService::log('menu.product_addons_sync', 'Product', (string)$product->id, "Synced " . count($validAddonIds) . " addons for dish '{$product->name}'", $user);

        return $this->sendResponse($product->addons()->get(), 'Product addons synced successfully');
    }

    // ==========================================
    // HELPERS & AUTHORIZATION
    // ==========================================

    protected function resolveRestaurantId($restaurant): int
    {
        return $restaurant instanceof Restaurant ? $restaurant->id : (int)$restaurant;
    }

    protected function authorizeRestaurantAccess($user, int $restaurantId): void
    {
        if ($user->hasRole('super_admin')) {
            return;
        }

        $isOwner = Restaurant::where('id', $restaurantId)->where('owner_id', $user->id)->exists();
        $isStaff = ($user->restaurant_id == $restaurantId);

        if (!$isOwner && !$isStaff) {
            abort(403, 'Unauthorized access to this restaurant menu. Multi-tenant IDOR protection enforced.');
        }
    }

    protected function generateUniqueCategorySlug(string $baseSlug, int $restaurantId, ?int $ignoreId = null): string
    {
        $slug = $baseSlug ?: 'category';
        $original = $slug;
        $count = 1;

        while (Category::where('restaurant_id', $restaurantId)
            ->where('slug', $slug)
            ->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = "{$original}-{$count}";
            $count++;
        }

        return $slug;
    }

    protected function generateUniqueProductSlug(string $baseSlug, int $restaurantId, ?int $ignoreId = null): string
    {
        $slug = $baseSlug ?: 'dish';
        $original = $slug;
        $count = 1;

        while (Product::where('restaurant_id', $restaurantId)
            ->where('slug', $slug)
            ->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))
            ->exists()) {
            $slug = "{$original}-{$count}";
            $count++;
        }

        return $slug;
    }
}

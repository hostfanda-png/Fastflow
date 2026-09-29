# Fastflow System Architecture & Design Patterns

---

## 1. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------+
|                            CLIENT BROWSER                             |
|  React 19 SPA + Vite + Tailwind CSS + Lucide Icons + TypeScript       |
+-----------------------------------------------------------------------+
                                  |
                   HTTP JSON Requests / Bearer Token
                                  v
+-----------------------------------------------------------------------+
|                           LARAVEL REST API                            |
|                            Prefix: /api/v1                            |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  | Middleware Pipeline: CheckRole, CheckPermission, Sanctum Auth   |  |
|  +-----------------------------------------------------------------+  |
|                                  |                                    |
|  +-----------------------------------------------------------------+  |
|  | Controllers: Auth, Restaurant, Menu, Cart, Order, Rider, Admin  |  |
|  +-----------------------------------------------------------------+  |
|                                  |                                    |
|  +-----------------------------------------------------------------+  |
|  | Services & Gateways: OrderService, AuditService, Payments       |  |
|  +-----------------------------------------------------------------+  |
|                                  |                                    |
|  +-----------------------------------------------------------------+  |
|  | Eloquent ORM & Policies (IDOR & Multi-tenant Authorization)      |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
                                  |
                                  v
+-----------------------------------------------------------------------+
|                            DATABASE LAYER                             |
|             MySQL / MariaDB with Foreign Key Constraints              |
+-----------------------------------------------------------------------+
```

---

## 2. Key Architectural Guarantees

### A. Authoritative Server-Side Truth
- **Zero Frontend Financial Trust**: Subtotals, voucher discounts, taxes, delivery fees, tips, and vendor payouts are always calculated on the server from database entities during cart mutation and checkout transactions.
- **Single-Restaurant Cart Enforcement**: The database prevents cart mixing across multiple kitchens. Attempting to add an item from Restaurant B while Cart contains items from Restaurant 1 returns HTTP `409 Conflict` with restaurant metadata, allowing the frontend to prompt for explicit replacement.

### B. IDOR Protection & Multi-Tenant Isolation
- **Tenant Scope Enforcement**: In `OwnerRestaurantController` and `MenuController`, restaurants are resolved against the authenticated user's ownership records (`owner_id === auth()->id()`) or staff assignment (`restaurant_id === auth()->user()->restaurant_id`).
- **Target Mismatch Prevention**: All mutations on products or orders require both the parent restaurant ID and child resource ID to match within the database query (`where('restaurant_id', $restaurantId)->findOrFail($productId)`).
- **Multi-Restaurant Support**: Owners with multiple venues can explicitly switch active venues; authorization verifies the selected ID rather than defaulting to primary records.

### C. Role-Based Access Control (RBAC)
- Five distinct roles: `super_admin`, `restaurant_owner`, `restaurant_staff`, `delivery_rider`, `customer`.
- Granular permission strings attached to roles (`restaurant.create`, `menu.update`, `order.cancel`, `rider.assign`, etc.).
- Public self-registration permits only `customer` (and `restaurant_owner` pending admin review). Staff, couriers, and administrators cannot be self-provisioned.

### D. Transactional Checkout & Ledger
- Orders are processed inside atomic database transactions (`DB::beginTransaction()` / `DB::commit()` / `DB::rollback()`).
- Financial ledgers record immutable transaction snapshots (`gross_amount`, `platform_commission`, `restaurant_payout`, `delivery_fee`, `rider_payout`, `gateway_fee`) that remain historically intact even if global commission settings change in the future.

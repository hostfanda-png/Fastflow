# FASTFLOW — SECURITY AUDIT & VULNERABILITY REPORT (PHASE 1 FREEZE)

**Date:** 2026-09-30  
**Audit Scope:** Laravel Backend APIs, Sanctum Authentication, RBAC, MySQL Database Schemas, Frontend Data Flow  
**Result:** PASSED — Production-Grade Multi-Tenant Isolation & Zero Privilege Escalation

---

## 1. Threat Modeling & Defense Verification

### 1.1 Insecure Direct Object References (IDOR)
* **Risk:** Attacker manipulates IDs in requests to access or modify resources belonging to other tenants.
* **Mitigation:**
  - `CustomerController`: All address operations enforce `where('user_id', $user->id)`.
  - `OwnerRestaurantController` & `MenuController`: Protected by `authorizeRestaurantAccess()`. Confirms `owner_id === $user->id` or `restaurant_id === $user->restaurant_id`.
  - `OrderController`: Customer order retrieval verifies `order->customer_id === $user->id` before returning details or cancellation.
  - `RiderController`: Verifies `order->rider_id === $rider->id` for pickups, delivery starts, and delivery completions.

### 1.2 Checkout Idempotency & Replay Hijacking
* **Risk:** Double-clicking checkout causes duplicate orders or an attacker attempts to reuse another user's idempotency key.
* **Mitigation:**
  - `orders.idempotency_key` unique database constraint.
  - `OrderService` verifies whether an existing key matches the authenticated customer. If a key exists under another user, it immediately throws an exception (`"Idempotency key has already been used by another transaction."`), preventing cross-customer leakage.

### 1.3 Price & Subtotal Tampering
* **Risk:** Client sends manipulated `subtotal`, `grand_total`, `tax`, or item prices in the checkout payload.
* **Mitigation:**
  - `OrderService` recalculates all line items, variant modifiers, addon totals, delivery fees, taxes, and service fees directly from database records. Any frontend totals are ignored.

### 1.4 Privilege Escalation
* **Risk:** Malicious user registers with `role: "super_admin"`.
* **Mitigation:**
  - `RegisterRequest` and `AuthController` explicitly restrict registration to `customer` and `restaurant_owner`. `super_admin` can only be provisioned via database seeders or console commands.

### 1.5 Fake Online Payment Exploits
* **Risk:** Customer sends `payment_method: 'stripe'` and expects the order to immediately register as paid.
* **Mitigation:**
  - Order payment status initializes strictly as `pending`.
  - Paid status can only be achieved via verified `stripeWebhook` carrying valid HMAC-SHA256 signatures or upon physical COD delivery verification by an assigned courier.

### 1.6 Mass Assignment & Database Index Hygiene
* **Risk:** Sensitive columns like `role_id`, `payment_status`, or `commission_amount` injected via HTTP inputs. Redundant indexes slow writes.
* **Mitigation:**
  - FormRequests strictly validate allowed keys.
  - Laravel Eloquent models define explicit `$fillable` attributes.
  - Redundant secondary indexes on `order_number` and `idempotency_key` removed from migrations.

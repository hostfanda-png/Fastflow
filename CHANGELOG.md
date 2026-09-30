# Changelog

All notable changes to the Fastflow Marketplace project will be documented in this file.

---

## [2.0.0-phase2a] - 2026-09-30

### Added - Restaurant Management Foundation (Phase 2A)
- **Authoritative `isOpen()` Evaluation**: Implemented backend open/closed determination considering administrative approval, active state, manual store pause, and 7-day operating hours including split shifts and overnight schedules.
- **Partner Application Onboarding**: Added `POST /api/v1/restaurant/apply` endpoint for authenticated applicants with automatic `pending` status initialization.
- **Strict Merchant IDOR Protection**: Enforced tenant scoping on all `/api/v1/owner/*` routes via `OwnerRestaurantController` and `RestaurantPolicy`, rejecting customer and courier access with HTTP 403.
- **7-Day Operating Hours Management**: Added endpoints and validation for managing weekly opening hours with split shift support (`open_time_2`, `close_time_2`) and overlap prevention.
- **Delivery Zone Management**: Implemented full CRUD for restaurant delivery zones with localized delivery fees and minimum order amounts.
- **Central Cuisines Management**: Added `GET /api/v1/cuisines` endpoint seeded with standard marketplace cuisines and many-to-many relationship syncing.
- **Secure Media Assets Upload**: Supported validated logo and cover image uploads with strict MIME checks, size limits, and safe filename hashing.
- **Live Restaurant Dashboard Metrics**: Authoritative database queries for today's orders, revenue, preparing/ready tickets, average order value, and active items.
- **Comprehensive Feature Test Suite**: Added `backend/tests/Feature/RestaurantManagementTest.php` covering authorization, isolation, status immutability, and opening hours.

### Fixed & Stabilized (Phase 2A Audit & Stabilization)
- **Implemented `authorizeOwnerAccess()` in `OwnerRestaurantController`**: Fixed critical runtime exception where missing method broke profile and media updates, ensuring staff cannot modify owner settings.
- **Normalized Time Comparison in `Restaurant::isOpen()`**: Standardized all opening/closing hour timestamps to `HH:MM:SS` format, resolving subtle lexicographical comparison failures with variable length time strings.
- **Overnight Schedule Spanning Midnight**: Correctly handled overnight shifts extending into the subsequent day across both primary and split shift configurations.
- **Multi-Tenant Zone Isolation**: Hardened delivery zone update and delete endpoints with strict restaurant ownership verification, returning 404 on cross-restaurant zone IDOR tampering.
- **Kitchen Order Status Protection**: Enforced strict state transitions preventing restaurants from prematurely marking orders as `delivered` or `refunded`.
- **Media Upload Sanitization**: Added gallery document storage, rejected unsafe protocols, and enforced raster MIME types (JPEG, PNG, WEBP).
- **Test Suite Expansion**: Added comprehensive tests for split shifts, overnight schedules, zone isolation, staff restriction, and order status boundaries.

---

## [1.1.0] - 2026-09-29

### Security & Hardening (Phase 1 Final Completion)
- **Authoritative Checkout Idempotency**: Added database-backed `idempotency_key` with automatic deduplication for checkout requests and double-click prevention.
- **Strict Cart Validation**: Enforced rejection of mismatched variants, invalid addons, or sold-out dishes across all cart and order flows.
- **Privilege Escalation Closure**: Hardened `AuthController` to prevent unauthorized role assignment during registration.
- **Sanctum Production Session Flow**: Cleared all demo user auto-login fallbacks and unified auth state with real `/api/v1/auth/me` endpoints.
- **Stripe Webhook & Payment Safeguards**: Strictly enforced `pending` status initialization for online transactions pending webhook signature verification.

## [1.0.0] - 2026-09-29

### Added
- **Sanctum Authentication System**: Integrated `AuthController` with token creation, secure password hashing, and user role validation.
- **AuthModal Component**: Added reactive modal for Customer registration, Partner onboarding, and user sign in with demo autofill.
- **Customer Profile & Addresses API**: Created `CustomerController.php` with full CRUD for customer delivery addresses and profile updates.
- **Multi-Restaurant Kitchen Management**: Support for restaurant owners managing multiple venues with scoped IDOR verification.
- **Single-Restaurant Cart Engine**: Server-side enforcement with HTTP 409 Conflict handling and item replacement confirmation.
- **Financial Ledger & Commissions**: Immutable `financial_transactions` recording platform commissions, courier fees, and merchant payouts.
- **Courier Dispatch Portal**: Real-time delivery queue with status transitions (`pickup`, `deliver`) and online/offline toggle.
- **Super Admin Governance Center**: Analytics dashboard, restaurant application vetting, rider assignment, and system settings.
- **Full Documentation Suite**: Architecture diagrams, database schemas, REST API documentation, audit reports, and license terms.

### Fixed
- Replaced all outdated brand placeholders with unified **Fastflow** commercial identity.
- Removed privilege escalation vulnerabilities during registration.
- Added 401 Unauthorized handling in `client.ts` with automated session invalidation.
- Fixed voucher validation to verify expiration dates, minimum spends, and maximum discount caps.

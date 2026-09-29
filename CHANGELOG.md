# Changelog

All notable changes to the Fastflow Marketplace project will be documented in this file.

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

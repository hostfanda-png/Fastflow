# Changelog

All notable changes to the Fastflow Marketplace project will be documented in this file.

---

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

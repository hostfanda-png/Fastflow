# Fastflow — Multi-Vendor Food Delivery Marketplace

**Fastflow** is a full-stack, enterprise-grade multi-vendor food delivery and restaurant management platform tailored for commercial CodeCanyon/Envato distribution.

---

## 1. System Overview

Fastflow is built as a decoupled modern web application consisting of:
- **Frontend**: React 19 SPA running on Vite 8, TypeScript, and Tailwind CSS.
- **Backend**: Laravel 11 REST API operating on PHP 8.2+ with MySQL/MariaDB database storage and Laravel Sanctum token-based authentication.
- **Architecture**: `React Frontend → REST API (/api/v1) → Laravel Sanctum/Controllers/Services → MySQL Database`.

---

## 2. Core User Workspaces & Roles

1. **Customer Storefront (`/`)**:
   - Location-aware restaurant discovery, cuisine and category filters, live text search, dynamic promotional banners.
   - Single-kitchen cart enforcement with server-calculated subtotals, delivery fees, taxes, and service fees.
   - Voucher code validation with minimum spends and discount caps.
   - Real-time order tracking with step-by-step progress and status history logs.
   - Post-delivery rating and reviews.
   - Address book management and personal profile settings.

2. **Restaurant Owner & Kitchen Portal (`/restaurant_portal`)**:
   - Multi-restaurant dashboard allowing owners with multiple outlets to select and manage specific kitchens.
   - Real-time kitchen order board (Accept, Prepare, Mark Ready for Pickup, Reject).
   - Full menu catalog CRUD (Categories, Products, Size Variants, Addons, Availability toggle).
   - Restaurant operational settings, delivery radius, preparation times, and commission rates.

3. **Delivery Rider Dispatch Console (`/rider_portal`)**:
   - Status toggle (`available`, `busy`, `offline`).
   - Assigned delivery queue with pickup navigation, customer dropoff address, special instructions, and cash collection totals.
   - One-click workflow: Accept Dispatch → Confirm Order Pickup → Mark Delivered.
   - Earnings history and tip tracking.

4. **Super Admin Governance Center (`/admin_portal`)**:
   - System-wide KPIs: Gross Merchandise Volume (GMV), platform commission earnings, total orders, active restaurants, fleet availability.
   - Restaurant onboarding queue: Review licensing, approve, reject, or suspend venues.
   - Manual & automated rider dispatch assigner.
   - Financial ledger & immutable transaction audits.
   - Global system settings: Tax rates, default delivery base fees, platform commission percentages, multi-currency configuration.
   - CMS content and legal policy editor.

---

## 3. Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19.0.1 with TypeScript 7.0 |
| **Build Tooling** | Vite 8.3 |
| **Styling** | Tailwind CSS 4.3 |
| **Icons & Motion** | Lucide React, Motion 12.23 |
| **Backend Engine** | Laravel 11 running on PHP 8.2+ |
| **Authentication** | Laravel Sanctum (Bearer Token) |
| **Database** | MySQL / MariaDB (InnoDB, UTF8mb4) |
| **Payment Layer** | Gateway Interface Abstraction (COD & Stripe) |

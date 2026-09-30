# Fastflow — Multi-Vendor Food Delivery Marketplace

[![Production Ready](https://img.shields.io/badge/status-production--ready-success.svg)](https://github.com/hostfanda-png/Fastflow)
[![Laravel](https://img.shields.io/badge/backend-Laravel-red.svg)](https://laravel.com)
[![React](https://img.shields.io/badge/frontend-React_%2B_Vite-blue.svg)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/styling-Tailwind_CSS-cyan.svg)](https://tailwindcss.com)

Fastflow is an enterprise-grade, multi-vendor food delivery marketplace engineered with strict security, robust multi-tenant data isolation, server-authoritative pricing, and complete lifecycle support for customers, restaurant partners, delivery couriers, and super administrators.

---

## Architecture Overview

Fastflow adopts a decoupled architecture:
- **Backend**: Laravel REST API service (`/backend`) featuring role-based access control (RBAC), multi-tenant isolation, Sanctum authentication, automated dispatching, and secure payment processing.
- **Frontend**: Modern React SPA (`/src`) built with Vite, TypeScript, Tailwind CSS, and Lucide icons, providing dedicated portals for Customers, Restaurant Owners, Delivery Riders, and Super Admins.

---

## Core Modules & Implementation Phases

1. **Phase 1 — Customer Foundation**:
   - Customer authentication, profile management, and multi-address book.
   - Restaurant browsing, search, cuisines, and public menu exploration.
   - Secure cart management with single-restaurant enforcement and server-side pricing.
   - Checkout flow and order placement.

2. **Phase 2 — Restaurant Partner & Menu Management (Phase 2A & 2B)**:
   - Restaurant registration, kitchen hours, delivery zones, and media uploads.
   - Advanced menu management: Categories (with global system category protection), Products, Variants, and Add-ons.
   - Cross-tenant security & IDOR protection ensuring restaurant isolation.
   - Server-authoritative price calculation and order price snapshots.

3. **Phase 3 — Rider & Delivery Management**:
   - Delivery rider registration, profile management, and status lifecycle (`offline`, `available`, `busy`, `on_delivery`).
   - Secure manual and automated order assignment to eligible active riders.
   - Real-time delivery status updates (`pickup`, `start_delivery`, `deliver`) with strict cross-tenant authorization.

4. **Phase 4 & Beyond — Admin Governance & Financials**:
   - Super admin dashboard, restaurant approvals, commission management, audit logs, and financial reconciliation.

---

## Getting Started

### Prerequisites
- Node.js (v18+) & Bun / npm
- PHP (v8.2+) & Composer (for Laravel backend)

### Installation & Development

1. **Frontend Setup**:
   ```bash
   npm install
   npm run dev
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   composer install
   cp .env.example .env
   php artisan key:generate
   php artisan migrate --seed
   php artisan serve
   ```

---

## Documentation

Comprehensive documentation files are available in the repository root:
- `API_DOCUMENTATION.md`
- `ARCHITECTURE.md`
- `DATABASE_SCHEMA.md`
- `PAYMENT_FLOW.md`
- `SECURITY_AUDIT_REPORT.md`
- `ENVATO_READINESS_REPORT.md`

# FASTFLOW — PAYMENT FLOW & LIFECYCLE SPECIFICATION

---

## 1. Overview of Payment Gateways

Fastflow supports two core payment mechanisms in Phase 1:
1. **Cash on Delivery (COD)**
2. **Stripe Online Card Payments (PaymentIntents & Webhooks)**

---

## 2. Cash on Delivery (COD) Lifecycle

```
[Customer Checkout]
       │
       ▼
[Order Created: payment_method='cod', payment_status='pending']
       │
       ▼
[Restaurant Confirms & Prepares Order]
       │
       ▼
[Courier Assigned & Picks Up]
       │
       ▼
[Courier Hands Order to Customer & Collects Cash]
       │
       ▼
[Courier Calls: POST /api/v1/rider/orders/{id}/deliver]
       │
       ▼
[Order Status -> 'delivered', Payment Status -> 'paid', Financial Transaction -> 'settled']
```

---

## 3. Stripe Online Payment Lifecycle

```
[Customer Checkout]
       │
       ▼
[Order Created: payment_method='stripe', payment_status='pending']
       │
       ▼
[Client Requests: POST /api/v1/payments/stripe/create-intent]
       │
       ▼ (Validates STRIPE_SECRET & STRIPE_KEY in environment)
[Backend Returns: client_secret & publishable_key]
       │
       ▼
[Frontend Mounts Stripe Elements & Customer Submits Card]
       │
       ▼
[Stripe Processes Charge on Card Network]
       │
       ▼
[Stripe Dispatches Webhook Event to /api/v1/payments/stripe/webhook]
       │
       ▼
[Backend Verifies Stripe-Signature Header & Metadata]
       │
       ▼
[Order Status -> 'confirmed', Payment Status -> 'paid', Financial Record -> 'settled']
```

---

## 4. Error Handling & Gateway Fallbacks

- **Missing Configuration:** If `STRIPE_SECRET` is not set or equals placeholder values, `createIntent` returns `422 Unprocessable Entity` with a clear message: `"Stripe payment gateway is currently disabled or not configured in environment settings."`
- **Webhook Replay Protection:** If an event for an already `paid` order is re-delivered, the controller responds with HTTP `200 { status: 'already_processed' }` without duplicating ledger entries.

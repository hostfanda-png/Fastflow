# Fastflow REST API Documentation

Base URL: `http://localhost:8000/api/v1` (or configured `VITE_API_URL`)

---

## 1. Authentication Endpoints

### `POST /auth/register`
- **Request Body**:
  ```json
  {
    "name": "Alex Morgan",
    "email": "alex@example.com",
    "password": "Password123!",
    "phone": "+92 300 1234567",
    "role": "customer"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": 1, "name": "Alex Morgan", "email": "alex@example.com", "role": "customer", "permissions": [] },
      "token": "1|sanctum_token_string"
    },
    "message": "Registration successful"
  }
  ```

### `POST /auth/login`
- **Request Body**: `{ "email": "customer@fastflow.app", "password": "demo_password_123" }`
- **Response `200 OK`**: `{ "success": true, "data": { "user": { ... }, "token": "..." } }`

### `POST /auth/logout`
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: `{ "success": true, "message": "Logged out successfully" }`

### `GET /auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: `{ "success": true, "data": { "id": 1, "name": "...", "role": "...", "permissions": [...] } }`

---

## 2. Customer Profile & Addresses

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/customer/profile` | `GET` | Retrieve customer profile & address list |
| `/customer/profile` | `PUT` | Update profile details / password |
| `/customer/addresses` | `GET` | Retrieve customer saved addresses |
| `/customer/addresses` | `POST` | Add a new delivery address |
| `/customer/addresses/{id}` | `PUT` | Update existing address |
| `/customer/addresses/{id}` | `DELETE` | Remove delivery address |

---

## 3. Public Marketplace & Browsing

| Endpoint | Method | Query Parameters / Payload | Description |
| :--- | :--- | :--- | :--- |
| `/restaurants` | `GET` | `city`, `area`, `search`, `category`, `cuisine` | Approved and active restaurant list |
| `/restaurants/{id}` | `GET` | - | Details with menu products, variants, addons |
| `/categories` | `GET` | - | Active menu categories |
| `/cuisines` | `GET` | - | Centrally managed cuisine categories |
| `/coupons` | `GET` | - | Public promotional vouchers |
| `/coupons/validate` | `POST` | `{ "code": "FAST50", "subtotal": 1200 }` | Server-authoritative coupon check |

---

## 4. Server-Side Cart & Checkout

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/cart` | `GET` | Fetch authenticated user's cart with recalculations |
| `/cart/items` | `POST` | Add dish item (returns 409 if restaurant conflict) |
| `/cart/items/{id}` | `PUT` | Update quantity or delete if 0 |
| `/cart/clear` | `DELETE` | Flush shopping bag |
| `/orders/checkout` | `POST` | Atomic checkout calculation & order creation |
| `/orders` | `GET` | Customer order history |
| `/orders/{id}` | `GET` | Real-time order progress & status timeline |
| `/orders/{id}/cancel` | `POST` | Cancel pending order |
| `/restaurant/apply` | `POST` | Submit restaurant partner application (pending status) |

---

## 5. Restaurant Management (`/owner/*`)

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/owner/restaurants` | `GET` | Outlets owned by or assigned to authenticated user |
| `/owner/restaurants` | `POST` | Submit partner registration application |
| `/owner/restaurants/{id}` | `GET` | Operational dashboard and venue details |
| `/owner/restaurants/{id}` | `PUT` | Update store profile, location, and delivery settings |
| `/owner/restaurants/{id}/dashboard` | `GET` | Authoritative KPI stats, today's revenue, active tickets |
| `/owner/restaurants/{id}/media` | `POST` | Upload and assign logo or cover banner image |
| `/owner/restaurants/{id}/hours` | `GET` | 7-day operating hours schedule |
| `/owner/restaurants/{id}/hours` | `PUT` | Update 7-day operating hours and split shifts |
| `/owner/restaurants/{id}/delivery-zones` | `GET` | List configured localized delivery zones |
| `/owner/restaurants/{id}/delivery-zones` | `POST` | Create new delivery zone |
| `/owner/restaurants/{id}/delivery-zones/{zid}` | `PUT` | Update delivery zone parameters |
| `/owner/restaurants/{id}/delivery-zones/{zid}` | `DELETE` | Remove delivery zone |
| `/owner/restaurants/{id}/orders` | `GET` | Kitchen orders queue |
| `/owner/restaurants/{id}/orders/{oid}/status` | `PUT` | Status transition (`confirmed`, `preparing`, `ready_for_pickup`) |
| `/owner/restaurants/{id}/products` | `POST` | Create menu item |
| `/owner/restaurants/{id}/products/{pid}` | `PUT` / `DELETE` | Update / Delete menu item |
| `/owner/restaurants/{id}/products/{pid}/toggle` | `PATCH` | Toggle dish stock availability |

---

## 6. Courier Dispatch (`/rider/*`)

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/rider/orders` | `GET` | Delivery jobs assigned to courier |
| `/rider/status` | `PUT` | Set online status (`available`, `busy`, `offline`) |
| `/rider/orders/{id}/pickup` | `POST` | Mark order picked up from kitchen |
| `/rider/orders/{id}/deliver` | `POST` | Mark order delivered to customer dropoff |

---

## 7. Admin Governance (`/admin/*`)

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/admin/dashboard` | `GET` | Aggregated GMV, commissions, active couriers |
| `/admin/restaurants` | `GET` | Vendor listing & application queue |
| `/admin/restaurants/{id}/status` | `PUT` | Approve, reject, or suspend restaurant |
| `/admin/restaurants/{id}/commission` | `PUT` | Set vendor-specific commission tier |
| `/admin/riders` | `GET` | Courier fleet management |
| `/admin/orders/{id}/assign-rider` | `POST` | Manually assign courier to order |
| `/admin/orders/{id}/auto-dispatch` | `POST` | Auto-match available courier |
| `/admin/financials` | `GET` | Immutable platform transaction ledgers |
| `/admin/audit-logs` | `GET` | Security audit trail |

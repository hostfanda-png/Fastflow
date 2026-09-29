# Fastflow Database Schema Documentation

Fastflow uses a 3NF-normalized relational schema managed by 14 sequential Laravel migrations.

---

## Migration Index

| Migration File | Primary Tables Created | Description |
| :--- | :--- | :--- |
| `000001_create_roles_and_permissions_tables.php` | `roles`, `permissions`, `permission_role` | RBAC role definitions and granular permission mapping |
| `000002_create_users_table.php` | `users`, `password_reset_tokens`, `personal_access_tokens` | User accounts with hashed passwords and Sanctum tokens |
| `000003_create_restaurants_tables.php` | `restaurants`, `restaurant_hours`, `restaurant_staff` | Vendor profiles, operating hours, and staff mappings |
| `000004_create_categories_and_cuisines_tables.php` | `categories`, `cuisines`, `cuisine_restaurant` | Product categories and restaurant cuisine tags |
| `000005_create_products_and_variants_tables.php` | `products`, `product_variants`, `addons`, `addon_product` | Menu items, size modifiers, and customizable addons |
| `000006_create_customers_and_addresses_tables.php` | `customers`, `customer_addresses` | Customer profile details and saved delivery coordinates |
| `000007_create_riders_table.php` | `riders` | Courier fleet details, vehicle metadata, and online status |
| `000008_create_carts_and_cart_items_tables.php` | `carts`, `cart_items` | Server-authoritative shopping bags with single-kitchen lock |
| `000009_create_orders_and_order_items_tables.php` | `orders`, `order_items`, `order_item_addons`, `order_status_histories` | Full order lifecycle state machines and audit timelines |
| `000010_create_payments_and_financials_tables.php` | `payments`, `commissions`, `financial_transactions`, `refunds` | Immutable financial ledger and settlement records |
| `000011_create_coupons_and_promotions_tables.php` | `coupons`, `coupon_usages` | Promotional discount vouchers with usage constraints |
| `000012_create_reviews_and_ratings_table.php` | `reviews` | Customer ratings on food and restaurant delivery |
| `000013_create_cms_banners_notifications_tables.php` | `banners`, `pages`, `notifications` | Promotional banners, CMS legal pages, and system notices |
| `000014_create_settings_and_audit_logs_tables.php` | `settings`, `audit_logs` | Platform parameters and security audit trail |

---

## Core Table Schemas

### `orders`
```sql
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(32) UNIQUE NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    restaurant_id BIGINT UNSIGNED NOT NULL,
    rider_id BIGINT UNSIGNED NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0.00,
    coupon_code VARCHAR(50) NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0.00,
    tax DECIMAL(10,2) DEFAULT 0.00,
    service_fee DECIMAL(10,2) DEFAULT 0.00,
    tip DECIMAL(10,2) DEFAULT 0.00,
    grand_total DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cod', 'stripe', 'wallet') NOT NULL,
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    order_status ENUM('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'assigned_to_rider', 'picked_up', 'on_the_way', 'delivered', 'cancelled', 'refunded') DEFAULT 'pending',
    delivery_street VARCHAR(255) NOT NULL,
    delivery_area VARCHAR(100) NOT NULL,
    delivery_city VARCHAR(100) NOT NULL,
    delivery_instructions TEXT NULL,
    cancellation_reason TEXT NULL,
    estimated_delivery_time VARCHAR(50) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE RESTRICT,
    FOREIGN KEY (rider_id) REFERENCES riders(id) ON DELETE SET NULL,
    INDEX idx_orders_status (order_status),
    INDEX idx_orders_customer (customer_id),
    INDEX idx_orders_restaurant (restaurant_id)
);
```

### `financial_transactions`
```sql
CREATE TABLE financial_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    order_number VARCHAR(32) NOT NULL,
    restaurant_id BIGINT UNSIGNED NOT NULL,
    gross_amount DECIMAL(10,2) NOT NULL,
    platform_commission DECIMAL(10,2) NOT NULL,
    restaurant_payout DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) NOT NULL,
    rider_payout DECIMAL(10,2) NOT NULL,
    payment_gateway_fee DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('pending', 'settled', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE RESTRICT
);
```

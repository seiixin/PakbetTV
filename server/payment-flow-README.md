# Payment and Order Fulfillment Flow

This document explains the payment and order fulfillment flow for the FengShui E-Commerce application using Dragonpay and NinjaVan for shipping.

## Overview of the Flow

1. Customer adds items to cart
2. Customer checks out and is redirected to Dragonpay for payment
3. Dragonpay sends a postback notification when payment is initiated
4. System updates order status to "processing" and payment status to "awaiting_for_confirmation"
5. Admin manually confirms payment status via API (or admin panel in the future)
6. System updates order status to "for_packing" and payment status to "paid"
7. Shipping order is created with NinjaVan
8. Order fulfillment continues (packing, shipping, etc.)

## Setting Up the System

Ensure your database has the correct order status and payment status enums:

```sql
ALTER TABLE orders MODIFY order_status ENUM('pending_payment','processing','for_packing','packed','for_shipping','picked_up','delivered','completed','returned','cancelled') NOT NULL DEFAULT 'pending_payment';

ALTER TABLE orders MODIFY payment_status ENUM('pending','paid','failed','refunded','awaiting_for_confirmation') NOT NULL DEFAULT 'pending';

ALTER TABLE payments MODIFY status ENUM('pending','completed','failed','refunded','waiting_for_confirmation') NOT NULL DEFAULT 'pending';
```

## Testing the Flow

To test the payment confirmation flow, you can use the provided scripts.

### 1. Create a Test Order or Use an Existing One

First, create a test order through the application, or use an existing order from the database.

### 2. Simulate Dragonpay Payment Notification

Use the `confirm-payment.js` script to update the order and payment status to simulate a Dragonpay payment notification:

```bash
node confirm-payment.js <order_id>
```

This will update the order status to "processing" and set the payment status to "awaiting_for_confirmation".

### 3. Test Admin Payment Confirmation

Use Postman or any API testing tool to confirm the payment via the admin API:

```
POST /api/admin/confirm-payment/<order_id>
```

Headers:
```
x-auth-token: <admin_token>
Content-Type: application/json
```

The API will update the order status to "for_packing", payment status to "paid", and create a shipping order with NinjaVan.

### 4. Check Order Status

You can verify the order status has been updated by querying the orders table:

```sql
SELECT order_id, order_status, payment_status FROM orders WHERE order_id = <order_id>;
```

## Using NinjaVan Shipping API

The system automatically creates a shipping order with NinjaVan when payment is confirmed. The NinjaVan order includes:

- Service type (Parcel)
- Service level (Standard)
- Pickup and delivery details
- Shipment origin (shop address)
- Destination (customer address)
- Parcel information (weight, items)

If you need to manually create a shipping order, you can use the following API:

```
POST /api/admin/create-shipping/<order_id>
```

With the shipping details in the request body following the NinjaVan API format.

## Order Status Flow

The complete order status flow is as follows:

1. **pending_payment**: Initial state when order is created
2. **processing**: When payment is initiated with Dragonpay
3. **for_packing**: When payment is confirmed by admin
4. **packed**: When order is packed and ready for shipping
5. **for_shipping**: When order is handed over to NinjaVan for delivery
6. **picked_up**: When order is picked up by NinjaVan
7. **delivered**: When order is delivered to customer
8. **completed**: When order is confirmed received by customer
9. **returned**: If order is returned by customer
10. **cancelled**: If order is cancelled

## Payment Status Flow

The payment status flow is as follows:

1. **pending**: Initial state when order is created
2. **awaiting_for_confirmation**: When payment is initiated but needs admin confirmation
3. **paid**: When payment is confirmed by admin
4. **failed**: If payment fails
5. **refunded**: If payment is refunded 
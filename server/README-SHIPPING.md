# Shipping and Payment Flow

This document explains the payment confirmation and shipping flow for the FengShui E-Commerce application.

## Overview

The application follows this general flow:

1. User adds items to cart and proceeds to checkout
2. User makes a payment through Dragonpay
3. Dragonpay sends a postback notification to update the order status
4. Order status is set to "processing" and payment status to "awaiting_for_confirmation"
5. Admin confirms the payment via the admin API
6. Order status is updated to "for_packing" and payment status to "paid"
7. Shipping order is created with NinjaVan
8. Order fulfillment continues (packing, shipping, etc.)

## Setting Up User Shipping Address

### User Side (Frontend)

Users can manage their shipping addresses through the "My Account" page. The shipping address form includes:

- Address Lines 1 & 2
- Area/District/Barangay
- City
- State/Province
- Postal Code
- Country (default: Malaysia)
- Address Type (home, office, other)
- Default Address option

This ensures we have all the necessary information for shipping via NinjaVan.

### Server Side (Backend)

The shipping address data is stored in the `user_shipping_details` table with the following structure:

```sql
CREATE TABLE user_shipping_details (
  id bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id bigint(20) UNSIGNED NOT NULL,
  address1 varchar(255) NOT NULL,
  address2 varchar(255) DEFAULT NULL,
  area varchar(255) DEFAULT NULL,
  city varchar(255) DEFAULT NULL,
  state varchar(255) DEFAULT NULL,
  postcode varchar(20) DEFAULT NULL,
  country varchar(2) DEFAULT 'MY',
  address_type varchar(20) DEFAULT 'home',
  is_default tinyint(1) DEFAULT 0,
  created_at timestamp NULL DEFAULT current_timestamp(),
  updated_at timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
)
```

## Payment Confirmation Flow

### 1. Dragonpay Payment Flow

When a user makes a payment:

1. User is redirected to Dragonpay with order details
2. Dragonpay processes the payment and sends a postback notification
3. The system updates the order status to "processing" and payment status to "awaiting_for_confirmation"

### 2. Admin Payment Confirmation

Admins confirm payments through the `/api/admin/confirm-payment/:orderId` endpoint:

```
POST /api/admin/confirm-payment/:orderId
Headers:
x-auth-token: <admin_token>
```

This endpoint:
1. Verifies the order is in "processing" status with "awaiting_for_confirmation" payment status
2. Updates order status to "for_packing" and payment status to "paid"
3. Creates a shipping order with NinjaVan using the user's shipping address

## NinjaVan Integration

### Shipping Order Creation

When payment is confirmed, the system automatically creates a shipping order with NinjaVan. The shipping payload follows this structure:

```json
{
  "service_type": "Parcel",
  "service_level": "Standard",
  "requested_tracking_number": "ORD-{orderId}",
  "reference": {
    "merchant_order_number": "SHIP-{orderId}-{timestamp}"
  },
  "from": {
    "name": "FengShui E-Commerce",
    "phone_number": "+60138201527",
    "email": "store@fengshui-ecommerce.com",
    "address": {
      "address1": "17 Lorong Jambu 3",
      "address2": "",
      "area": "Taman Sri Delima",
      "city": "Simpang Ampat",
      "state": "Pulau Pinang",
      "address_type": "office",
      "country": "MY",
      "postcode": "51200"
    }
  },
  "to": {
    "name": "{customerName}",
    "phone_number": "{customerPhone}",
    "email": "{customerEmail}",
    "address": {
      "address1": "{customerAddress1}",
      "address2": "{customerAddress2}",
      "area": "{customerArea}",
      "city": "{customerCity}",
      "state": "{customerState}",
      "address_type": "{customerAddressType}",
      "country": "MY",
      "postcode": "{customerPostcode}"
    }
  },
  "parcel_job": {
    "is_pickup_required": true,
    "pickup_service_type": "Scheduled",
    "pickup_service_level": "Standard",
    "pickup_date": "{tomorrow}",
    "pickup_timeslot": {
      "start_time": "09:00",
      "end_time": "12:00",
      "timezone": "Asia/Kuala_Lumpur"
    },
    "pickup_instructions": "Pickup with care!",
    "delivery_instructions": "If recipient is not around, leave parcel in power riser.",
    "delivery_start_date": "{oneWeekLater}",
    "delivery_timeslot": {
      "start_time": "09:00",
      "end_time": "12:00",
      "timezone": "Asia/Kuala_Lumpur"
    },
    "dimensions": {
      "weight": "{calculatedWeight}"
    },
    "items": [
      {
        "item_description": "{productName}",
        "quantity": "{quantity}",
        "is_dangerous_good": false
      }
    ]
  }
}
```

### Shipping Address Fallbacks

The system implements a robust fallback mechanism for shipping addresses:

1. First, it tries to use the user's default shipping address from `user_shipping_details`
2. If not found, it tries to parse the shipping address from the `shipping` table
3. As a last resort, it uses default values to ensure the NinjaVan API call succeeds

All required fields (address1, city, state, postcode) are guaranteed to have values to avoid API errors.

## Manual Shipping Order Creation

If the automatic shipping order creation fails, admins can manually create shipping orders through:

```
POST /api/admin/create-shipping/:orderId
Headers:
x-auth-token: <admin_token>
Content-Type: application/json

{
  // NinjaVan shipping payload
}
```

## Order Status Flow

The complete order status flow is:

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

The payment status flow is:

1. **pending**: Initial state when order is created
2. **awaiting_for_confirmation**: When payment is initiated but needs admin confirmation
3. **paid**: When payment is confirmed by admin
4. **failed**: If payment fails
5. **refunded**: If payment is refunded

## Error Handling

- If shipping order creation fails, the system still updates the order and payment status
- Detailed error logs are generated with API responses for debugging
- Admins can manually create shipping orders if needed 
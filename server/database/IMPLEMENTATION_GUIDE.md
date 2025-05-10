# Shipping Details Implementation Guide

This guide outlines how to implement the structured shipping details system for PakbetTV E-Commerce, ensuring compatibility with NinjaVan delivery requirements while avoiding data redundancy.

## Overview

The implementation consists of:

1. New database tables for structured shipping information
2. Migration scripts to convert existing shipping data
3. Integration with NinjaVan delivery API
4. Backward compatibility with existing code

## Implementation Steps

### Step 1: Database Updates

Run the SQL script to create the necessary tables:

```bash
# MySQL CLI
mysql -u username -p pakbettv < server/database/shipping_details_implementation.sql

# OR with Node.js (recommended)
node server/database/run_shipping_migration.js
```

This will:
- Create the `shipping_details` table for structured address information
- Create `webhook_logs` table for delivery event tracking
- Create `tracking_events` table for order tracking
- Update the `shipping` table with a carrier field if needed
- Set up a trigger to automatically convert generic addresses to structured format
- Migrate existing shipping addresses to the structured format

### Step 2: Code Integration

The implementation is designed to work with the existing codebase with minimal changes.

1. **In Orders Creation Endpoint**:
   - The existing code already handles both string and object address formats
   - When an address is provided as an object, it will continue to be stored properly

2. **For NinjaVan Integration**:
   - The existing `ninjaVanService.createDeliveryOrder` function already supports both string and structured address formats
   - No changes are required to this function as it will now access the structured data through the `shipping_details` table when available

### Step 3: Testing

1. **Test with String Addresses**:
   ```
   "address": "123 Main Street, City Name, 50000, State Name"
   ```
   The system will automatically parse this and create an entry in the `shipping_details` table.

2. **Test with Object Addresses**:
   ```json
   "address": {
     "address1": "123 Main Street",
     "address2": "Building A",
     "area": "District Name",
     "city": "City Name",
     "state": "State Name",
     "postcode": "50000",
     "country": "MY"
   }
   ```
   This will be stored directly in the structured format.

### Step 4: Using Structured Addresses with NinjaVan

The NinjaVan service already supports the structured data format. When creating a delivery:

1. It will first look for a `shipping_details` record
2. If not found, it will fall back to parsing the string address in the `shipping` table
3. Address components are then passed to the NinjaVan API in the required format

## Benefits

- **No Data Redundancy**: The `shipping_details` table only stores structured data for orders
- **Backward Compatibility**: Existing code continues to work without modifications
- **Easy Migration**: Automated conversion of existing addresses
- **NinjaVan Compatibility**: Structured data format matches NinjaVan API requirements

## Database Schema

### shipping_details
- Stores structured address components
- Linked to orders via `order_id`
- Contains fields required by NinjaVan: address1, address2, area, city, state, postcode, country

### webhook_logs
- Records delivery provider webhook events
- Useful for debugging and auditing

### tracking_events
- Stores delivery tracking events
- Links tracking numbers to orders

## Automatic Trigger

A database trigger automatically creates structured shipping details from string addresses whenever a new shipping record is created.

## Important Notes

1. The implementation preserves all existing functionality
2. No changes to existing API endpoints are required
3. The migration is non-destructive and can be safely applied to the production database
4. Existing shipping data will be automatically converted to the structured format 
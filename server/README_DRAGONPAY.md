# Dragonpay Payment Gateway Integration

This document outlines the implementation of Dragonpay Payment Switch (PS) API in the FengShui E-Commerce application.

## Implementation Details

### Server Configuration

1. **Environment Variables**:
   - `DRAGONPAY_MERCHANT_ID`: Your merchant ID assigned by Dragonpay
   - `DRAGONPAY_API_KEY`: Your collection API key assigned by Dragonpay
   - `DRAGONPAY_SECRET_KEY_SHA256`: Your secret key for HMAC-SHA256 verification

2. **Database Changes**:
   - Added `reference_number` column to the `payments` table
   - Added `dragonpay` as a payment method option
   - Added `payment_status` column to the `orders` table

3. **API Endpoints**:
   - `/api/transactions/orders`: Create new order
   - `/api/transactions/payment`: Process payment through Dragonpay
   - `/api/transactions/verify`: Verify transaction status
   - `/api/transactions/postback`: Handle postback from Dragonpay (webhook)

### Payment Flow

1. User initiates payment in the client application
2. Server creates an order in the database
3. Server makes a request to Dragonpay API with order details
4. User is redirected to Dragonpay payment page
5. After payment completion, Dragonpay sends a postback to our server
6. Server verifies the payment status and updates the order accordingly

### Dragonpay Configuration

To complete the setup, you need to configure your Dragonpay merchant account:

1. Log in to the Dragonpay Admin Portal
2. Go to Admin > Maintain Merchant Settings
3. Set your Postback URL to: `https://your-server.com/api/transactions/postback`
4. Set your Return URL to: `https://your-website.com/transaction-complete`

## Testing

For testing, use the test environment:
- Test gateway URL: `https://test.dragonpay.ph/Pay.aspx`
- Test merchant ID: "TEST"

Use the following payment methods for testing:
- Test Bank Online (BOG)
- Test Bank Over-the-counter (BOGX)

## Going Live

When ready for production:
1. Update environment variables with production credentials
2. Change the BASE_URL to the production endpoint
3. Ensure proper error handling and logging are in place

## Security Considerations

- All API calls to Dragonpay are made from the server-side
- Payment verification uses HMAC-SHA256 for enhanced security
- API credentials are stored as environment variables, not hardcoded
- Input validation is performed on all payment-related data 
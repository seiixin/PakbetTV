# Facebook Chat Widget Setup Guide

This guide will help you set up the Facebook Customer Chat integration for your e-commerce website.

## Overview

The chat widget has been updated to integrate directly with your Facebook page, allowing customers to chat with you through Facebook Messenger directly from your website.

## Required Facebook Configuration

You'll need to provide two Facebook credentials:

### 1. Facebook App ID
This is the App ID from your Facebook Developer account.

### 2. Facebook Page ID  
This is the unique identifier for your Facebook business page.

## Environment Variables Setup

### Client-side Configuration (.env file in /client directory)

Create or update your `.env` file in the `client` directory with these variables:

```env
# Facebook Configuration
VITE_FACEBOOK_APP_ID=your-facebook-app-id-here
VITE_FACEBOOK_PAGE_ID=your-facebook-page-id-here
```

### Server-side Configuration (.env file in /server directory)

Update your `.env` file in the `server` directory (this should already have FACEBOOK_APP_ID):

```env
# Facebook Configuration
FACEBOOK_APP_ID=your-facebook-app-id-here
FACEBOOK_APP_SECRET=your-facebook-app-secret-here
```

## How to Find Your Facebook IDs

### Finding Your Facebook App ID and App Secret:
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Navigate to your app or create a new one
3. In your app dashboard, you'll find:
   - **App ID**: Displayed prominently in the app dashboard
   - **App Secret**: Found in Settings > Basic (click "Show" to reveal)

### Finding Your Facebook Page ID:
1. Go to your Facebook business page
2. Click "About" in the left sidebar
3. Scroll down to find "Page ID" or "Facebook Page ID"

**Alternative method:**
1. Go to your Facebook page
2. Click on "About"
3. Scroll down to "More Info" 
4. Look for "Page ID"

**Or using Facebook's Graph API Explorer:**
1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Enter your page username (e.g., if your page is facebook.com/pakbettv, enter "pakbettv")
3. The ID will be returned in the response

## Features Included

The new Facebook chat widget includes:

- **Direct Facebook Messenger Integration**: Customers can chat directly through Facebook
- **Custom Branding**: Matches your website's color scheme (#A2201A)
- **Mobile Responsive**: Works perfectly on all device sizes
- **Loading States**: Shows loading animation while connecting
- **Fallback Support**: Provides alternative contact options if Facebook fails to load
- **Custom Greetings**: 
  - Logged in users: "Hello Ka-Pakbet! Ano po ang maipaglilingkod namin sa inyo?"
  - Logged out users: "Hello Ka-Pakbet! Please log in to Facebook to start chatting with us!"

## Testing the Integration

1. Set up your environment variables
2. Restart your development server (`npm run dev`)
3. Click the chat button (Facebook Messenger icon)
4. The Facebook Customer Chat should load within the widget
5. Test sending a message (it will go directly to your Facebook page)

## Production Considerations

- Ensure your website domain is added to your Facebook App's domain whitelist
- Update the App ID and Page ID in your production environment variables
- Test the integration on your production domain before going live

## Troubleshooting

### Chat widget doesn't load:
- Check that your Facebook App ID is correct
- Verify that your domain is whitelisted in your Facebook App settings
- Ensure you're using HTTPS in production (Facebook requires HTTPS)

### Messages not appearing on Facebook:
- Verify your Facebook Page ID is correct
- Check that your Facebook App has the necessary permissions
- Ensure your page is published and not in draft mode

### Console errors:
- Check browser console for specific error messages
- Verify all environment variables are properly set
- Ensure Facebook SDK is loading correctly

## Support

If you need help finding your Facebook App ID, App Secret, or Page ID, please provide:
1. Your Facebook page URL
2. Your Facebook App name or ID (if you have one)
3. Any error messages you're seeing

The integration is now ready - just provide your Facebook credentials and we'll get it connected! 
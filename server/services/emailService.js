const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const https = require('https');
const http = require('http');
const db = require('../config/db');

// Create reusable transporter object using SMTP transport with connection pooling
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // Enable connection pooling for better performance
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  // Keep connections alive
  connectionTimeout: 60000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
});

// Enhanced caching with TTL and size limits
class EnhancedImageCache {
  constructor(maxSize = 100, ttl = 3600000) { // 1 hour TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key, value) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if item has expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check if item has expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  clear() {
    this.cache.clear();
  }
}

// Enhanced cache instance
const imageCache = new EnhancedImageCache(100, 3600000); // 100 items, 1 hour TTL

// Connection pool for database connections
let connectionPool = null;

const getConnectionPool = async () => {
  return db; // Use the existing db configuration instead of creating a new pool
};

// Optimized batch image fetching
const getBatchProductImages = async (productIds) => {
  if (!productIds.length) return new Map();
  
  const results = new Map();
  const uncachedIds = [];
  
  // First, check cache for all product IDs
  for (const id of productIds) {
    if (imageCache.has(id)) {
      results.set(id, imageCache.get(id));
    } else {
      uncachedIds.push(id);
    }
  }
  
  // If all images are cached, return immediately
  if (uncachedIds.length === 0) {
    return results;
  }
  
  // Fetch uncached images in a single query
  try {
    const placeholders = uncachedIds.map(() => '?').join(',');
    const [images] = await db.query(
      `SELECT DISTINCT product_id, image_url 
       FROM product_images 
       WHERE product_id IN (${placeholders}) 
       ORDER BY product_id, sort_order`,
      uncachedIds
    );
    
    // Group images by product_id and take the first one
    const imageMap = new Map();
    for (const image of images) {
      if (!imageMap.has(image.product_id)) {
        imageMap.set(image.product_id, image.image_url);
      }
    }
    
    // Cache and add to results
    for (const id of uncachedIds) {
      const imageUrl = imageMap.get(id) || null;
      imageCache.set(id, imageUrl);
      results.set(id, imageUrl);
    }
    
  } catch (error) {
    console.error('Error fetching batch product images:', error);
    // For failed IDs, set null in cache to avoid repeated queries
    for (const id of uncachedIds) {
      if (!results.has(id)) {
        imageCache.set(id, null);
        results.set(id, null);
      }
    }
  }
  
  return results;
};

// Function to format price with right alignment
const formatPrice = (price) => {
  return `₱${Number(price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Dynamic API base URL based on environment
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.michaeldemesa.com'
  : process.env.API_BASE_URL || 'http://localhost:5000';

// Function to get full image URL
const getImageUrl = (productId) => {
  return `${API_BASE_URL}/api/products/image/${productId}`;
};

// Function to generate common footer HTML
const generateFooterHtml = () => `
  <div class="footer" style="background-color:#162447; text-align:center; margin-top:30px; padding:25px 15px; font-size:12px; color:#ffffff;">
    <h3 style="color:#ffffff; margin:0 0 10px 0;">Get in Touch</h3>
    <p style="margin:0 0 20px 0; color:#ffffff;">For any questions please send an email to <a href="mailto:hello@michaeldemesa.com" style="color:#ffffff; text-decoration:underline;">hello@michaeldemesa.com</a></p>
    <p style="margin:0;">
      <a href="https://www.facebook.com/pakbettv" style="color:#ffffff; text-decoration:none; margin:0 10px;">Facebook</a> |
      <a href="https://www.tiktok.com/@pakbettv.com?is_from_webapp=1&sender_device=pc" style="color:#ffffff; text-decoration:none; margin:0 10px;">TikTok</a> |
      <a href="https://www.instagram.com/pakbettv/" style="color:#ffffff; text-decoration:none; margin:0 10px;">Instagram</a> |
      <a href="https://www.youtube.com/@PakBetTV" style="color:#ffffff; text-decoration:none; margin:0 10px;">YouTube</a>
    </p>
  </div>
`;

// Update all email templates to use the common footer
const generateEmailTemplate = (content) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta name="x-apple-disable-message-reformatting" />
      <title>Email</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin:0; padding:0;">
      <div style="max-width:600px; margin:0 auto; padding:20px;">
        <div style="text-align:center; margin-bottom:30px;">
          <img src="cid:emailHeader" alt="Email Header" style="width:100%; max-width:600px; height:auto;" />
        </div>
        <div style="margin-bottom:30px;">
          ${content}
        </div>
        ${generateFooterHtml()}
      </div>
    </body>
  </html>
`;

// Function to sanitize filename
const sanitizeFilename = (name) => {
  return name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
};

// Function to get email header attachment
const getEmailHeaderAttachment = () => ({
  filename: 'Michael De Mesa Feng Shui Consultancy-header.png',
  path: path.join(__dirname, '../../client/public/Emailheader-Latest.png'),
  cid: 'emailHeader',
  contentDisposition: 'inline'
});

// Function to create image attachment
const createImageAttachment = (imageData, name, cid) => ({
  filename: `Michael De Mesa Feng Shui Consultancy-${sanitizeFilename(name)}.jpg`,
  content: imageData,
  cid: cid,
  encoding: 'base64',
  contentType: 'image/jpeg',
  contentDisposition: 'inline'
});

// Optimized function to send order confirmation email
const sendOrderConfirmationEmail = async (orderDetails) => {
  const {
    orderNumber,
    customerName,
    customerEmail,
    customerPhone,
    items,
    totalAmount,
    shippingFee = 0,
    discount = 0,
    shippingAddress,
    paymentMethod,
    paymentReference,
    trackingNumber
  } = orderDetails;

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Prepare attachments array with header image
  const attachments = [getEmailHeaderAttachment()];

  // Get all product IDs that have images
  const productIds = items
    .filter(item => item.product_id)
    .map(item => item.product_id);

  // Batch fetch all images at once
  const imageMap = await getBatchProductImages(productIds);

  // Generate items HTML using pre-fetched images
  const itemsHtml = items.map(item => {
    let imageHtml = `<div style="width:50px; height:50px; background-color:#f5f5f5; margin-right:10px; border-radius:4px; display:flex; align-items:center; justify-content:center;"><span style="color:#999; font-size:10px;">No Image</span></div>`;
    
    if (item.product_id && imageMap.has(item.product_id)) {
      const imageData = imageMap.get(item.product_id);
      if (imageData) {
        const imageCid = `product-${item.product_id}`;
        attachments.push(createImageAttachment(imageData, item.name, imageCid));
        imageHtml = `<img src="cid:${imageCid}" alt="${item.name}" style="width:50px; height:50px; object-fit:cover; margin-right:10px; border-radius:4px;" />`;
      }
    }

    return `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">
          <div style="display: flex; align-items: center;">
            ${imageHtml}
            <span style="flex: 1;">${item.name}</span>
          </div>
        </td>
        <td style="padding: 8px; text-align: right; border: 1px solid #ddd; width: 100px;">${item.quantity}</td>
        <td style="padding: 8px; text-align: right; border: 1px solid #ddd; width: 120px;">${formatPrice(item.price)}</td>
      </tr>
    `;
  });

  const content = `
    <h2>Order Confirmation</h2>
    <p>Dear ${customerName},</p>
    <p>Thank you for your order! We're pleased to confirm that your order has been received and is being processed.</p>
    
    <h3>Order Information:</h3>
    <p><strong>Order Number:</strong> ${orderNumber}</p>
    <p><strong>Payment Method:</strong> ${paymentMethod}</p>
    <p><strong>Payment Reference:</strong> ${paymentReference}</p>
    
    <h3>Items Ordered:</h3>
    <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
      <thead>
        <tr style="background-color:#f5f5f5;">
          <th style="text-align:left; padding:8px; border:1px solid #ddd;">Product</th>
          <th style="text-align:right; padding:8px; border:1px solid #ddd; width: 100px;">Quantity</th>
          <th style="text-align:right; padding:8px; border:1px solid #ddd; width: 120px;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml.join('')}
      </tbody>
    </table>

    <div style="max-width:300px; margin-left:auto; margin-bottom:20px;">
      <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #eee;">
        <span>Subtotal:</span>
        <span style="text-align:right; min-width:120px;">${formatPrice(subtotal)}</span>
      </div>
      ${discount > 0 ? `
        <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #eee;">
          <span>Discount:</span>
          <span style="text-align:right; min-width:120px;">-${formatPrice(discount)}</span>
        </div>
      ` : ''}
      <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #eee;">
        <span>Shipping:</span>
        <span style="text-align:right; min-width:120px;">${formatPrice(shippingFee)}</span>
      </div>
      <div style="display:flex; justify-content:space-between; padding:8px 0; font-weight:bold; font-size:16px; border-top:2px solid #333;">
        <span>Total:</span>
        <span style="text-align:right; min-width:120px;">${formatPrice(totalAmount)}</span>
      </div>
    </div>

    <div class="shipping-info">
      <h3>Shipping Details:</h3>
      <p><strong>Delivery Address:</strong><br/>${shippingAddress}</p>
      ${trackingNumber ? `
        <div class="tracking-info" style="background-color: #f9f9f9; padding: 15px; margin: 20px 0;">
          <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
          <p>You can track your order using this tracking number on our website.</p>
        </div>
      ` : ''}
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"MICHAEL DE MESA - BAZI & FENG SHUI CONSULTANCY" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `Order Confirmation #${orderNumber}`,
      html: generateEmailTemplate(content),
      attachments: attachments
    });

    console.log('Order confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Order confirmation email error:', error.message);
    return { success: false, error: error.message };
  }
};

// Optimized review request email
const sendReviewRequestEmail = async (details) => {
  const {
    orderNumber,
    customerName,
    customerEmail,
    items = []
  } = details;

  const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'https://michaeldemesa.com';
  const attachments = [getEmailHeaderAttachment()];

  // Get all product IDs that have images
  const productIds = items
    .filter(item => item.product_id)
    .map(item => item.product_id);

  // Batch fetch all images at once
  const imageMap = await getBatchProductImages(productIds);

  // Generate items HTML using pre-fetched images
  const itemsHtml = items.map(item => {
    let imageHtml = `<div style="width:100%; height:100%; background-color:#e0e0e0; display:flex; align-items:center; justify-content:center; font-size:10px; color:#666;">No Image</div>`;
    
    if (item.product_id && imageMap.has(item.product_id)) {
      const imageData = imageMap.get(item.product_id);
      if (imageData) {
        const imageCid = `product-${item.product_id}`;
        attachments.push(createImageAttachment(imageData, item.name, imageCid));
        imageHtml = `<img src="cid:${imageCid}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover; display:block;" />`;
      }
    }

    return `
      <li style="display:flex; align-items:center; margin-bottom:16px; background-color:#ffffff; border-radius:6px; box-shadow:0 1px 3px rgba(0,0,0,0.08); padding:12px;">
        <div style="flex-shrink:0; width:64px; height:64px; border-radius:4px; overflow:hidden; margin-right:12px; background-color:#f5f5f5;">
          ${imageHtml}
        </div>
        <div style="flex:1;">
          <p style="margin:0 0 8px 0; font-weight:600; color:#333333; font-size:14px;">${item.name}</p>
          <a href="${FRONTEND_BASE_URL}/product/${item.product_id}" target="_blank" style="background-color:#FEC16E; color:#000000; padding:6px 14px; text-decoration:none; border-radius:4px; font-size:12px; display:inline-block;">Leave a Review</a>
        </div>
      </li>
    `;
  });

  const content = `
    <h2>Order Review Request</h2>
    <p>Hi ${customerName},</p>
    <p>Once again, thanks for ordering online from PakBet TV and we look forward to serving you again soon!</p>
    
    <div class="review-request" style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p>Please rate your overall satisfaction with your experience online and spare a moment to leave some product review and feedback.</p>
      <p style="color: #666;"><em>As a token of our appreciation, PakBet TV will give you a surprise coupon code that you can use on your next purchase!</em></p>
    </div>

    <h3>Your Products:</h3>
    <ul style="padding-left: 0; list-style: none;">
      ${itemsHtml.join('')}
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${FRONTEND_BASE_URL}" 
         target="_blank" 
         style="background-color: #FEC16E; 
                color: #000000; 
                padding: 12px 28px; 
                text-decoration: none; 
                border-radius: 6px; 
                font-weight: bold; 
                display: inline-block;">
        Shop More Feng Shui Items
      </a>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"MICHAEL DE MESA - BAZI & FENG SHUI CONSULTANCY" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `How was your order #${orderNumber}? Leave a review`,
      html: generateEmailTemplate(content),
      attachments: attachments
    });
    
    console.log('Review request email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('Review email error:', err.message);
    return { success: false, error: err.message };
  }
};

// Other email functions remain the same but with optimized transporter
const sendContactFormEmail = async (contactDetails) => {
  const { name, email, phone, message } = contactDetails;

  const content = `
    <h2>New Contact Form Submission</h2>
    <p>Dear Admin,</p>
    <p>You have received a new message from your website contact form.</p>
    
    <h3>Contact Information:</h3>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Phone:</strong> ${phone}</p>
    
    <div class="tracking-info" style="background-color: #f9f9f9; padding: 15px; margin: 20px 0;">
      <h3>Message:</h3>
      <p>${message.replace(/\n/g, '<br>')}</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"MICHAEL DE MESA - BAZI & FENG SHUI CONSULTANCY" <${process.env.SMTP_USER}>`,
      to: 'consultation@michaeldemesa.com',
      replyTo: email,
      subject: `New Contact Form Message from ${name}`,
      html: generateEmailTemplate(content),
      attachments: [getEmailHeaderAttachment()]
    });

    console.log('Contact form email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Contact form email error:', error.message);
    return { success: false, error: error.message };
  }
};

const sendPasswordResetEmail = async (email, resetToken, origin) => {
  const resetUrl = `${origin}/reset-password/${resetToken}`;
  
  const content = `
    <h2>Reset Your Password</h2>
    <p>Dear Valued Customer,</p>
    <p>You recently requested to reset your password. We're here to help you regain access to your account.</p>
    
    <h3>Reset Information:</h3>
    <p><strong>Request Time:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Expires In:</strong> 1 hour</p>
    
    <div class="tracking-info" style="background-color: #f9f9f9; padding: 15px; margin: 20px 0;">
      <h3>Reset Instructions:</h3>
      <p>Click the button below to proceed with your password reset:</p>
      <div style="text-align: center; margin: 20px 0;">
        <a href="${resetUrl}" 
           style="background-color: #FEC16E; 
                  color: #000000; 
                  padding: 12px 28px; 
                  text-decoration: none; 
                  border-radius: 6px; 
                  font-weight: bold;">
          Reset Password
        </a>
      </div>
      <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      <p>Alternatively, you can copy and paste this URL into your browser:</p>
      <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 4px;">${resetUrl}</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"MICHAEL DE MESA - BAZI & FENG SHUI CONSULTANCY" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: generateEmailTemplate(content),
      attachments: [getEmailHeaderAttachment()]
    });

    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Password reset email error:', error.message);
    return { success: false, error: error.message };
  }
};

const sendOrderDispatchedEmail = async (details) => {
  const { customerName, customerEmail, trackingNumber } = details;

  const trackingLink = `https://www.ninjavan.co/en-ph/tracking?id=${encodeURIComponent(trackingNumber)}`;

  const content = `
    <h2>Your Order is On Its Way!</h2>
    <p>Hi ${customerName},</p>
    <p>Get excited — your order is on its way Ka-PakBet!</p>
    <p>We are pleased to inform you that your order has been dispatched today and you'll receive it soon.</p>

    <div class="tracking-info" style="background-color: #f9f9f9; padding: 15px; margin: 20px 0; text-align: center;">
      <p><strong>Tracking Number:</strong><br/>
        <a href="${trackingLink}" target="_blank" style="color: #0066cc; text-decoration: none;">${trackingNumber}</a>
      </p>
    </div>

    <h3>Estimated Delivery Time:</h3>
    <ul style="padding-left: 20px; margin: 0;">
      <li style="margin-bottom: 8px;">Metro Manila – 1-4 working days</li>
      <li style="margin-bottom: 8px;">Luzon – 2-7 working days</li>
      <li style="margin-bottom: 8px;">Visayas – 4-8 working days</li>
      <li style="margin-bottom: 8px;">Mindanao – 7-12 working days</li>
    </ul>

    <div class="important-note" style="background-color: #fff3e0; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0;"><strong>Important Note:</strong></p>
      <p style="margin: 10px 0 0 0;">The courier will notify you via SMS once your order is out for delivery that day.</p>
      <p style="margin: 10px 0 0 0;">The courier will <u>only</u> attempt to deliver your order twice. Make sure someone can receive the parcel once the courier notifies you.</p>
      <p style="margin: 10px 0 0 0;">Please coordinate directly with the rider for status updates and faster delivery.</p>
    </div>

    <p>Thanks for shopping with us Ka-PakBet!</p>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"MICHAEL DE MESA - BAZI & FENG SHUI CONSULTANCY" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: 'Your order is on its way!',
      html: generateEmailTemplate(content),
      attachments: [getEmailHeaderAttachment()]
    });

    console.log('Dispatched email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Dispatched email error:', error.message);
    return { success: false, error: error.message };
  }
};

// Test function remains the same
const sendTestEmail = async (recipientEmail) => {
  const sampleOrderDetails = {
    orderNumber: "TEST123",
    customerName: "John Doe",
    customerEmail: recipientEmail,
    customerPhone: "+63 912 345 6789",
    items: [
      { name: "Lucky Bamboo Plant", quantity: 2, price: 250.00 },
      { name: "Crystal Ball", quantity: 1, price: 599.00 }
    ],
    totalAmount: 1099.00,
    shippingFee: 150.00,
    shippingAddress: "123 Test Street, Makati City, Metro Manila, Philippines, 1234",
    paymentMethod: "DragonPay",
    paymentReference: "DP123456789",
    trackingNumber: "TRACK123456789"
  };

  return sendOrderConfirmationEmail(sampleOrderDetails);
};

// Cleanup function to close connections gracefully
const cleanup = async () => {
  try {
    transporter.close();
    imageCache.clear();
    console.log('Email service cleanup completed');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

// Handle process termination
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

module.exports = {
  sendOrderConfirmationEmail,
  sendTestEmail,
  sendContactFormEmail,
  sendPasswordResetEmail,
  sendOrderDispatchedEmail,
  sendReviewRequestEmail,
  cleanup
}; 
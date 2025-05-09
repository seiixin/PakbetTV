const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Function to format price
const formatPrice = (price) => {
  return `₱${Number(price).toFixed(2)}`;
};

// Function to generate order items HTML
const generateOrderItemsHtml = (items) => {
  return items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.price)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.price * item.quantity)}</td>
    </tr>
  `).join('');
};

// Function to send order confirmation email
const sendOrderConfirmationEmail = async (orderDetails) => {
  const {
    orderNumber,
    customerName,
    customerEmail,
    customerPhone,
    items,
    totalAmount,
    shippingFee = 0,
    shippingAddress,
    paymentMethod,
    paymentReference,
    trackingNumber
  } = orderDetails;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 0;
          background-color: #ffffff;
        }
        .header { 
          background-color: #A2201A; 
          color: white; 
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          margin-bottom: 10px;
        }
        .tracking-section {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          border-bottom: 2px solid #eee;
        }
        .tracking-button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #A2201A;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin-top: 10px;
          font-weight: bold;
        }
        .content { 
          padding: 30px 20px;
        }
        .order-summary {
          background-color: #f8f9fa;
          padding: 20px;
          margin-bottom: 20px;
          border-radius: 5px;
        }
        .order-summary h2 {
          margin-top: 0;
          color: #A2201A;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 20px 0;
          background-color: white;
        }
        th { 
          background-color: #f8f9fa;
          padding: 12px;
          text-align: left;
          border-bottom: 2px solid #eee;
        }
        .total-section {
          margin-top: 20px;
          border-top: 2px solid #eee;
          padding-top: 20px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .total-row.final {
          font-size: 18px;
          font-weight: bold;
          color: #A2201A;
          border-top: 2px solid #eee;
          padding-top: 10px;
          margin-top: 10px;
        }
        .footer { 
          background-color: #2d2d2d;
          color: white;
          padding: 30px 20px;
          text-align: center;
        }
        .footer p {
          margin: 5px 0;
          font-size: 14px;
        }
        .contact-info {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your Order is on its way...</h1>
          <p>Order #${orderNumber}</p>
        </div>
        
        <div class="tracking-section">
          <h2>Track Your Order</h2>
          <p>Tracking Number: ${trackingNumber || 'Will be provided soon'}</p>
          ${trackingNumber ? `<a href="#" class="tracking-button">Track Package</a>` : ''}
        </div>
        
        <div class="content">
          <div class="order-summary">
            <h2>Order Summary</h2>
            <p><strong>Name:</strong> ${customerName}</p>
            <p><strong>Contact No:</strong> ${customerPhone || 'Not provided'}</p>
            <p><strong>Shipping Address:</strong><br>${shippingAddress}</p>
          </div>

          <h3>Items Shipped</h3>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">QTY</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${generateOrderItemsHtml(items)}
            </tbody>
          </table>
          
          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${formatPrice(totalAmount)}</span>
            </div>
            <div class="total-row">
              <span>Shipping Fee:</span>
              <span>${formatPrice(shippingFee)}</span>
            </div>
            <div class="total-row final">
              <span>Total:</span>
              <span>${formatPrice(totalAmount + shippingFee)}</span>
            </div>
          </div>

          <div class="payment-info">
            <p><strong>Payment Method:</strong> ${paymentMethod}</p>
            <p><strong>Reference Number:</strong> ${paymentReference}</p>
          </div>
        </div>
        
        <div class="footer">
          <h3>Feng Shui E-Commerce</h3>
          <div class="contact-info">
            <p>📍 123 Feng Shui Plaza, Makati City, Philippines</p>
            <p>📞 Customer Service: +63 (2) 8888-9999</p>
            <p>📧 Email: support@fengshuiecommerce.com</p>
            <p>🌐 Website: www.fengshuiecommerce.com</p>
            <p>⏰ Business Hours: Monday - Friday, 9:00 AM - 6:00 PM PHT</p>
          </div>
          <p style="margin-top: 20px; font-size: 12px;">© ${new Date().getFullYear()} Feng Shui E-Commerce. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Feng Shui E-Commerce" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `Your Order #${orderNumber} is on its way!`,
      html: emailHtml,
    });

    console.log('Order confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return { success: false, error: error.message };
  }
};

// Test function to send a sample order confirmation email
const sendTestEmail = async (recipientEmail) => {
  const sampleOrderDetails = {
    orderNumber: "TEST123",
    customerName: "John Doe",
    customerEmail: recipientEmail,
    customerPhone: "+63 912 345 6789",
    items: [
      {
        name: "Lucky Bamboo Plant",
        quantity: 2,
        price: 250.00
      },
      {
        name: "Crystal Ball",
        quantity: 1,
        price: 599.00
      }
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

module.exports = {
  sendOrderConfirmationEmail,
  sendTestEmail
}; 
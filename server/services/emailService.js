const nodemailer = require('nodemailer');
const path = require('path');

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
      <td style="padding: 8px 0;">${item.name}</td>
      <td style="padding: 8px 0; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px 0; text-align: right;">${formatPrice(item.price)}</td>
      <td style="padding: 8px 0; text-align: right;">${formatPrice(item.price * item.quantity)}</td>
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

  // Construct email HTML template
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header img { width: 100%; max-width: 600px; height: auto; }
        .order-details { margin-bottom: 30px; }
        .tracking-info { background-color: #f9f9f9; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="cid:emailHeader" alt="Email Header"/>
          <h2>Order Confirmation</h2>
        </div>
        
        <div class="order-details">
          <p>Dear ${customerName},</p>
          <p>Thank you for your order! We're pleased to confirm that your order has been received and is being processed.</p>
          
          <h3>Order Information:</h3>
          <p><strong>Order Number:</strong> ${orderNumber}</p>
          <p><strong>Total Amount:</strong> ₱${Number(totalAmount).toFixed(2)}</p>
          ${shippingFee ? `<p><strong>Shipping Fee:</strong> ₱${Number(shippingFee).toFixed(2)}</p>` : ''}
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Payment Reference:</strong> ${paymentReference}</p>
          
          <div class="shipping-info">
            <h3>Shipping Details:</h3>
            <p><strong>Delivery Address:</strong><br/>${shippingAddress}</p>
            ${trackingNumber ? `
              <div class="tracking-info">
                <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
                <p>You can track your order using this tracking number on our website.</p>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="footer">
          <p>If you have any questions about your order, please contact our customer service.</p>
          <p>Thank you for shopping with us!</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"MICHAEL DE MESA - BAZI & FENG SHUI CONSULTANCY" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `Order Confirmation #${orderNumber}`,
      html: emailHtml,
      attachments: [
        {
          filename: 'emailheader.png',
          path: path.join(__dirname, '../../client/public/Emailheader.png'),
          cid: 'emailHeader'
        }
      ]
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
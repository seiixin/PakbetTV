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
    console.error('Order confirmation email error:', error.message);
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

// Function to send contact form email
const sendContactFormEmail = async (contactDetails) => {
  const {
    name,
    email,
    phone,
    message
  } = contactDetails;

  // Email template for contact form
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
          <h2>New Contact Form Submission</h2>
        </div>
        
        <div class="order-details">
          <p>Dear Admin,</p>
          <p>You have received a new message from your website contact form.</p>
          
          <h3>Contact Information:</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          
          <div class="tracking-info">
            <h3>Message:</h3>
            <p>${message.replace(/\n/g, '<br>')}</p>
          </div>
        </div>
        
        <div class="footer">
          <p>This message was sent from the contact form on your website.</p>
          <p>Please respond directly to the sender's email address: ${email}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Website Contact Form" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to the admin email
      replyTo: email, // Set reply-to as the sender's email
      subject: `New Contact Form Message from ${name}`,
      html: emailHtml,
      attachments: [
        {
          filename: 'emailheader.png',
          path: path.join(__dirname, '../../client/public/Emailheader.png'),
          cid: 'emailHeader'
        }
      ]
    });

    console.log('Contact form email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Contact form email error:', error.message);
    return { success: false, error: error.message };
  }
};

// Function to send password reset email
const sendPasswordResetEmail = async (email, resetToken, origin) => {
  const resetUrl = `${origin}/reset-password/${resetToken}`;
  
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
          <h2>Reset Your Password</h2>
        </div>
        
        <div class="order-details">
          <p>Dear Valued Customer,</p>
          <p>You recently requested to reset your password. We're here to help you regain access to your account.</p>
          
          <h3>Reset Information:</h3>
          <p><strong>Request Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Expires In:</strong> 1 hour</p>
          
          <div class="tracking-info">
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
        </div>
        
        <div class="footer">
          <p>If you have any questions, please contact our customer service.</p>
          <p>© 2025 PakBet TV - Feng Shui by Michael de Mesa. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"PakBet TV - Feng Shui" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: emailHtml,
      attachments: [
        {
          filename: 'emailheader.png',
          path: path.join(__dirname, '../../client/public/Emailheader.png'),
          cid: 'emailHeader'
        }
      ]
    });

    console.log('Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Password reset email error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOrderConfirmationEmail,
  sendTestEmail,
  sendContactFormEmail,
  sendPasswordResetEmail
}; 
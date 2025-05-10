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

  

  try {
    const info = await transporter.sendMail({
      from: `"MICHAEL DE MESA - BAZI & FENG SHUI CONSULTANCY" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `Order Confirmation #${orderNumber}`,
      html: emailHtml,
      attachments: [
        {
          filename: 'logo.png',
          path: path.join(__dirname, '../../client/public/Logo.png'),
          cid: 'logoImage'
        },
        {
          filename: 'cover.png',
          path: path.join(__dirname, '../../client/public/cover.png'),
          cid: 'coverImage'
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
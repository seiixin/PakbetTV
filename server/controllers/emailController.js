const { sendOrderConfirmationEmail, sendContactFormEmail, sendAppointmentRequestEmail } = require('../services/emailService');

// Handler for POST /api/email/test
async function sendTestEmail(req, res) {
  const { recipientEmail } = req.body;
  if (!recipientEmail) {
    return res.status(400).json({ 
      success: false, 
      message: 'Recipient email is required' 
    });
  }
  try {
    const testOrderDetails = {
      orderNumber: 'TEST-123',
      customerName: 'Test Customer',
      customerEmail: recipientEmail,
      customerPhone: '+1234567890',
      items: [
        { name: 'Lucky Bamboo Plant', quantity: 2, price: 29.99 },
        { name: 'Crystal Ball', quantity: 1, price: 49.99 }
      ],
      totalAmount: 109.97,
      shippingFee: 10.00,
      shippingAddress: '123 Test Street, Test City, Test Country 12345',
      paymentMethod: 'Credit Card',
      paymentReference: 'TEST-PAY-123',
      trackingNumber: 'TEST-TRACK-123'
    };
    const result = await sendOrderConfirmationEmail(testOrderDetails);
    return res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    return res.status(500).json({
      success: false,
      message: 'Error sending test email',
      error: error.message
    });
  }
}

// Handler for POST /api/email/order-confirmation
async function sendOrderConfirmation(req, res) {
  const {
    orderNumber,
    customerName,
    customerEmail,
    customerPhone,
    items,
    totalAmount,
    shippingFee,
    shippingAddress,
    paymentMethod,
    paymentReference,
    trackingNumber
  } = req.body;
  if (!orderNumber || !customerEmail || !items || !totalAmount) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields'
    });
  }
  try {
    const result = await sendOrderConfirmationEmail({
      orderNumber,
      customerName,
      customerEmail,
      customerPhone,
      items,
      totalAmount,
      shippingFee,
      shippingAddress,
      paymentMethod,
      paymentReference,
      trackingNumber
    });
    return res.status(200).json({
      success: true,
      message: 'Order confirmation email sent successfully',
      messageId: result.messageId
    });
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return res.status(500).json({
      success: false,
      message: 'Error sending order confirmation email',
      error: error.message
    });
  }
}

// Handler for POST /api/email/contact
async function sendContactForm(req, res) {
  const { name, email, phone, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and message are required fields'
    });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }
  try {
    const result = await sendContactFormEmail({
      name,
      email,
      phone: phone || 'Not provided',
      message
    });
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Your message has been sent successfully! We will get back to you soon.'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send message. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Error processing contact form:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while sending your message. Please try again later.'
    });
  }
}

// Handler for POST /api/email/appointment
async function sendAppointmentRequest(req, res) {
  const { name, email, phone, message, subject } = req.body;
  if (!name || !email || !phone || !message) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, phone, and message are required fields'
    });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }
  try {
    const result = await sendAppointmentRequestEmail({
      name,
      email,
      phone,
      message,
      subject: subject || 'Appointment Request'
    });
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Your appointment request has been sent successfully! We will get back to you soon with available schedules.'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send appointment request. Please try again later.'
      });
    }
  } catch (error) {
    console.error('Error processing appointment request:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while sending your appointment request. Please try again later.'
    });
  }
}

module.exports = {
  sendTestEmail,
  sendOrderConfirmation,
  sendContactForm,
  sendAppointmentRequest
};

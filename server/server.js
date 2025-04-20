const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import database migration handler
const { runMigrations } = require('./config/db-migrations');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add this logging middleware
app.use((req, res, next) => {
  console.log(`Incoming Request: ${req.method} ${req.path}`); // Log method and path
  next(); // Pass control to the next middleware/route
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const reviewRoutes = require('./routes/reviews');
const paymentRoutes = require('./routes/payments');

// API routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);

// Redirect route for Dragonpay returns
app.get('/transaction-complete', (req, res) => {
  console.log('Received Dragonpay return request:', req.query);
  
  // Extract relevant parameters
  const { txnid, refno, status, message } = req.query;
  
  // Build a simple HTML page to show transaction result
  const htmlResponse = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transaction Complete</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      .transaction-box {
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 20px;
        margin-top: 20px;
        background-color: #f9f9f9;
      }
      .success {
        color: #2e7d32;
        font-weight: bold;
      }
      .failure {
        color: #c62828;
        font-weight: bold;
      }
      .pending {
        color: #f57c00;
        font-weight: bold;
      }
      .status-circle {
        display: inline-block;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        margin-right: 8px;
        vertical-align: middle;
      }
      .home-button {
        display: inline-block;
        background-color: #6e4b36;
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        text-decoration: none;
        margin-top: 20px;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <h1>Transaction Complete</h1>
    
    <div class="transaction-box">
      <h2>Payment Status: 
        <span class="${status === 'S' ? 'success' : status === 'P' ? 'pending' : 'failure'}">
          <span class="status-circle" style="background-color: ${status === 'S' ? '#2e7d32' : status === 'P' ? '#f57c00' : '#c62828'};"></span>
          ${status === 'S' ? 'Success' : status === 'P' ? 'Pending' : 'Failed'}
        </span>
      </h2>
      
      <p><strong>Transaction ID:</strong> ${txnid || 'Not available'}</p>
      <p><strong>Reference No:</strong> ${refno || 'Not available'}</p>
      <p><strong>Message:</strong> ${message || 'No message'}</p>
      
      ${status === 'S' ? 
        `<p>Thank you for your purchase! Your order is now being processed.</p>
         <p>You will receive an email confirmation shortly.</p>` : 
        status === 'P' ? 
        `<p>Your payment is pending. We'll update your order status once the payment is confirmed.</p>` :
        `<p>There was an issue with your payment. Please try again or contact customer support.</p>`
      }
    </div>
    
    <a href="/" class="home-button">Return to Home</a>
  </body>
  </html>
  `;
  
  // Send the HTML response
  res.set('Content-Type', 'text/html');
  res.send(htmlResponse);
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to FengShui E-Commerce API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Set port and start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Run database migrations after server starts
  try {
    await runMigrations();
  } catch (err) {
    console.error('Failed to run database migrations:', err);
  }
}); 
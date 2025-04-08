const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Import routes
const productRoutes = require('./routes/productRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const authRoutes = require('./routes/authRoutes');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database initialization
const initialConnection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'GGH123'
});

initialConnection.query('CREATE DATABASE IF NOT EXISTS fengshui_ecommerce', (err) => {
  if (err) {
    console.error('Error creating database:', err);
    return;
  }
  console.log('Database created or already exists');
  
  const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'GGH123',
    database: process.env.DB_NAME || 'fengshui_ecommerce'
  });
  
  db.connect(err => {
    if (err) {
      console.error('Error connecting to MySQL database:', err);
      return;
    }
    console.log('Connected to MySQL database');
    
    const sqlFilePath = path.join(__dirname, 'database.sql');
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8')
      .split(';')
      .filter(query => query.trim() !== '')
      .map(query => query.trim() + ';');
      
    const tableSqlQueries = sqlScript.slice(2);
    
    tableSqlQueries.forEach(query => {
      db.query(query, (err) => {
        if (err) {
          console.error('Error executing query:', query, err);
        }
      });
    });
  });
});

// Routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

// Use routes
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/auth', authRoutes);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
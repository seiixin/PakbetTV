const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Database connection configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Set increased timeout for remote database connections
  connectTimeout: 60000, // 60 seconds
  // Enable SSL for secure connections (may be required by Hostinger)
  ssl: process.env.DB_SSL === 'true' ? {rejectUnauthorized: false} : false
});

// Test database connection
const testConnection = async () => {
  try {
    console.log('Attempting to connect to database...');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Database: ${process.env.DB_DATABASE}`);
    console.log(`User: ${process.env.DB_USERNAME}`);
    
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(`Error Code: ${error.code}`);
    console.error(`Error Number: ${error.errno}`);
    console.error(`SQL State: ${error.sqlState}`);
    console.error(`Error Message: ${error.message}`);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nAccess denied error detected. Possible solutions:');
      console.error('1. Check username and password in .env file');
      console.error('2. Make sure your IP is whitelisted in Hostinger');
      console.error('3. Verify remote access is enabled for your database user');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.error('\nConnection timeout or refused. Possible solutions:');
      console.error('1. Verify the DB_HOST address is correct');
      console.error('2. Check if the database server is accessible from your network');
      console.error('3. Your ISP or firewall might be blocking the connection');
    }
    
    // Don't terminate the process as it prevents the rest of the app from starting
    console.error('\nStarting server without database connection...');
  }
};

// Run connection test on startup
testConnection();

module.exports = pool; 
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

// Use default local development values if environment variables are missing
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fengshui_ecommerce',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000, 
  ssl: process.env.DB_SSL === 'true' ? {rejectUnauthorized: false} : false
};

const pool = mysql.createPool(dbConfig);

const testConnection = async () => {
  try {
    console.log('Attempting to connect to database...');
    console.log(`Host: ${dbConfig.host}`);
    console.log(`Database: ${dbConfig.database}`);
    console.log(`User: ${dbConfig.user}`);
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
    console.error('\nStarting server without database connection...');
  }
};

testConnection();
module.exports = pool; 
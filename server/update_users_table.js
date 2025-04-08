const db = require('./config/db');

async function updateUsersTable() {
  try {
    console.log('Starting database schema update...');
    
    // Check if columns already exist
    const [columns] = await db.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'fengshui_ecommerce'
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME IN ('firstname', 'middlename', 'lastname')
    `);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    
    // Add firstname column if it doesn't exist
    if (!existingColumns.includes('firstname')) {
      console.log('Adding firstname column...');
      await db.query(`
        ALTER TABLE users
        ADD COLUMN firstname VARCHAR(50) NOT NULL DEFAULT ''
      `);
    }
    
    // Add middlename column if it doesn't exist
    if (!existingColumns.includes('middlename')) {
      console.log('Adding middlename column...');
      await db.query(`
        ALTER TABLE users
        ADD COLUMN middlename VARCHAR(50) DEFAULT NULL
      `);
    }
    
    // Add lastname column if it doesn't exist
    if (!existingColumns.includes('lastname')) {
      console.log('Adding lastname column...');
      await db.query(`
        ALTER TABLE users
        ADD COLUMN lastname VARCHAR(50) NOT NULL DEFAULT ''
      `);
    }
    
    console.log('Database schema update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating database schema:', error);
    process.exit(1);
  }
}

updateUsersTable(); 
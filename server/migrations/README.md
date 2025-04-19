# Database Migrations

This folder contains SQL migration scripts to update your database schema.

## How to Apply Migrations

### Using MySQL Command Line

1. Open your MySQL command line client
2. Connect to your database:
   ```
   mysql -u your_username -p pakbet_db
   ```
3. Run the migration script:
   ```
   source /path/to/add_reference_number_to_payments.sql
   ```

### Using phpMyAdmin

1. Login to phpMyAdmin
2. Select your database (pakbet_db)
3. Go to the "SQL" tab
4. Copy the contents of the migration file
5. Paste into the SQL query box
6. Click "Go" to execute

## Migration Files

- `add_reference_number_to_payments.sql`: Adds reference_number column to payments table for storing payment gateway transaction IDs.

## After Applying Migrations

After applying migrations, make sure to restart your Node.js application to ensure it recognizes the new schema changes. 
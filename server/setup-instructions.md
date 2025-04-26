# Database Connection Setup

To fix the database connection issue, you need to create or update your `.env` file with the correct environment variable names.

## Follow these steps:

1. Create or edit a `.env` file in the project root directory with these exact values:

```
# Database Configuration
DB_HOST=srv1786.hstgr.io
DB_USER=u590239395_fengshui_db
DB_PASSWORD=your-actual-password-here  # Replace with your actual password
DB_NAME=u590239395_fengshui_db
DB_PORT=3306
DB_SSL=false

# Server Configuration
PORT=5000
NODE_ENV=development
```

2. I've already updated the `server/config/db.js` file to use these environment variable names:
   - Changed `DB_USERNAME` to `DB_USER`
   - Changed `DB_DATABASE` to `DB_NAME`

3. After making these changes, restart your server to apply them.

## Important notes:

- Make sure the `.env` file is in the correct location (usually the project root directory)
- Never commit your `.env` file to version control
- Double-check that your password is correct
- Ensure your Hostinger database has remote access enabled (which you've already set up) 
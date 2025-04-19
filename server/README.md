# FengShui E-Commerce Backend Server

This is the backend server for the FengShui E-Commerce application.

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)

## Installation

1. Clone the repository
2. Navigate to the server directory:
   ```
   cd server
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Create a MySQL database named `pakbet_db`
5. Import the database schema:
   ```
   mysql -u root -p pakbet_db < pakbet_db.sql
   ```
6. Configure environment variables by creating a `.env` file based on the example below:
   ```
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=pakbet_db
   JWT_SECRET=your_secret_key
   NODE_ENV=development
   ```

## Running the Server

### Development Mode
```
npm run dev
```

### Production Mode
```
npm start
```

## API Endpoints

### Authentication
- POST `/api/auth/login` - Log in a user
- GET `/api/auth/me` - Get current user profile

### Users
- POST `/api/users` - Register a new user
- GET `/api/users` - Get all users (admin only)
- GET `/api/users/:id` - Get a user by ID
- PUT `/api/users/:id` - Update a user
- DELETE `/api/users/:id` - Delete a user (admin only)

### Categories
- POST `/api/categories` - Create a new category (admin only)
- GET `/api/categories` - Get all categories
- GET `/api/categories/tree` - Get categories as a hierarchical tree
- GET `/api/categories/:id` - Get a category by ID
- PUT `/api/categories/:id` - Update a category (admin only)
- DELETE `/api/categories/:id` - Delete a category (admin only)

### Products
- POST `/api/products` - Create a new product (admin only)
- GET `/api/products` - Get all products (with optional pagination and filtering)
- GET `/api/products/:id` - Get a product by ID
- PUT `/api/products/:id` - Update a product (admin only)
- DELETE `/api/products/:id` - Delete a product (admin only)
- POST `/api/products/:id/variants` - Add a variant to a product (admin only)
- PUT `/api/products/variants/:id` - Update a product variant (admin only)

### Cart
- GET `/api/cart` - Get user's cart items
- POST `/api/cart` - Add item to cart
- PUT `/api/cart/:id` - Update cart item quantity
- DELETE `/api/cart/:id` - Remove item from cart
- DELETE `/api/cart` - Clear user's cart

### Orders
- POST `/api/orders` - Create a new order from cart
- GET `/api/orders` - Get user's orders
- GET `/api/orders/:id` - Get an order by ID
- PUT `/api/orders/:id` - Update order status (admin only)
- DELETE `/api/orders/:id` - Cancel an order 
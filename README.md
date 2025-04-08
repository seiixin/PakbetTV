# FengShui E-Commerce

A full-stack e-commerce application for FengShui products built with React, Express, Node.js, and MySQL.

## Project Structure

```
project-root/
├── client/             # React frontend (Vite)
├── server/             # Express backend
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js (v18 or higher)
- MySQL
- npm or yarn

## Setup Instructions

### Database Setup

1. Install MySQL if you haven't already
2. Log in to MySQL and run the SQL commands from `server/database.sql`
3. Create a user or use the root user (for development only)

### Server Setup

1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   - Rename `.env.example` to `.env` (or create a new `.env` file)
   - Update the database credentials in the `.env` file

4. Start the server:
   ```
   npm run dev
   ```
   The server will run on `http://localhost:5000`

### Client Setup

1. Navigate to the client directory:
   ```
   cd client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```
   The client will run on `http://localhost:3000`

## Available Scripts

### Server

- `npm start`: Start the server in production mode
- `npm run dev`: Start the server with nodemon for development

### Client

- `npm run dev`: Start the development server
- `npm run build`: Build the production-ready app
- `npm run preview`: Preview the production build locally

## API Endpoints

- `GET /api/test`: Test API endpoint 
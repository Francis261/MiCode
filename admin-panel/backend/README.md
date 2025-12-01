# DevForge Admin Panel Backend

Backend server for the DevForge Admin Panel with authentication, dashboard, and product management.

## Features

- **Authentication System**: Super Admin key verification and JWT-based login
- **Role-Based Access Control**: Permissions system for different admin roles
- **Dashboard Analytics**: Stats, sales overview, and product performance
- **Product Management**: Full CRUD operations for products
- **MongoDB Integration**: Connects to the same database as the main backend

## Setup Instructions

### 1. Install Dependencies

```bash
cd admin-panel/backend
npm install
```

### 2. Configure Environment Variables

The `.env` file is already configured with:
- MongoDB connection (shared with main backend)
- Super Admin credentials
- JWT secret
- Port configuration (5001)

### 3. Start the Server

```bash
npm run dev
```

The server will run on `http://localhost:5001`

### 4. Initial Setup

On first run, the server will:
1. Create a Super Admin account automatically
2. Display the Super Admin ID in the console
3. You MUST copy this ID and update the `.env` file:

```
SUPER_ADMIN_ID=<paste_the_id_here>
```

### 5. Access the Admin Panel

1. Go to the admin frontend (http://localhost:8081)
2. Enter the Super Admin ID and Access Key (111111)
3. Login with:
   - Email: admin@devforge.io
   - Password: 111111

## API Endpoints

### Authentication
- `POST /verify-access` - Verify Super Admin key
- `POST /admin/login` - Admin login
- `GET /admin/verify-token` - Verify JWT token

### Dashboard (Protected)
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/sales-overview` - Get sales chart data
- `GET /api/dashboard/product-performance` - Get product performance data

### Products (Protected)
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

## Security

- All routes (except auth) require JWT token
- Role-based permissions enforced via middleware
- Passwords are hashed with bcrypt
- Blocked admins cannot access the system

## Models

### AdminUser
- email, password (hashed)
- role: superadmin | admin | editor | viewer
- permissions: Map of feature access levels
- isBlocked: Boolean

## Notes

- The admin backend shares the MongoDB database with the main backend
- Product management automatically updates AppStats
- Dashboard stats use mock data for sales/users (implement real collections as needed)

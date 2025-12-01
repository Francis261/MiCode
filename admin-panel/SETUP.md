# Admin Panel Setup Guide

Complete setup instructions for the DevForge Admin Panel (Backend + Frontend).

## 🚀 Quick Start

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd admin-panel/backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   - The `.env` file is already configured
   - Make sure your MongoDB URI is correct

4. **Start the backend server:**
   ```bash
   npm run dev
   ```

5. **Copy Super Admin ID:**
   - On first run, the console will display the Super Admin ID
   - Copy this ID and update it in `admin-panel/backend/.env`:
   ```
   SUPER_ADMIN_ID=<paste_id_here>
   ```

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd admin-panel/frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   - Create `.env` file (or use existing one):
   ```
   VITE_ADMIN_API_URL=http://localhost:5001
   ```

4. **Start the frontend:**
   ```bash
   npm run dev
   ```
   - Frontend will run on `http://localhost:8081`

## 🔐 First Login

1. **Access Verification Page:**
   - Go to `http://localhost:8081`
   - Enter your Super Admin ID (from backend console)
   - Enter Access Key: `111111`

2. **Login Page:**
   - Email: `admin@devforge.io`
   - Password: `111111`

3. **Important:** Change these default credentials in production!

## 📋 Features

### Implemented
✅ Authentication system with Super Admin key
✅ JWT-based session management
✅ Dashboard with stats and charts
✅ Product management (CRUD operations)
✅ Role-based permissions
✅ Hide/show products
✅ Product filtering and search

### To Be Implemented
- Services management
- Testimonials management
- Custom orders management
- Orders & payments tracking
- User management
- Admin user management
- Support center

## 🔧 API Configuration

The admin panel backend runs on port **5001** while the main backend runs on port **5000**.

Both backends share the same MongoDB database.

## 🛡️ Security

- All passwords are hashed with bcrypt
- JWT tokens expire after 7 days
- Role-based access control (RBAC)
- Blocked admins cannot access the system
- Super Admin key required for initial access

## 📝 Default Credentials

**Super Admin:**
- Email: `admin@devforge.io`
- Password: `111111`
- Access Key: `111111`

**⚠️ IMPORTANT:** Change these in production by updating the `.env` file before first run!

## 🗄️ Database Models

### AdminUser
- email (unique)
- password (hashed)
- role: superadmin | admin | editor | viewer
- permissions: Map of feature permissions
- isBlocked: Boolean

### Permissions Levels
- `*` = Full access (read/write/delete)
- `+` = Read/write access
- `-` = No access

## 🔌 API Endpoints

### Authentication
- `POST /verify-access` - Verify Super Admin key
- `POST /admin/login` - Login
- `GET /admin/verify-token` - Verify JWT

### Dashboard
- `GET /api/dashboard/stats`
- `GET /api/dashboard/sales-overview`
- `GET /api/dashboard/product-performance`

### Products
- `GET /api/products` - List all
- `GET /api/products/:id` - Get one
- `POST /api/products` - Create
- `PUT /api/products/:id` - Update
- `DELETE /api/products/:id` - Delete

## 🐛 Troubleshooting

### Backend won't start
- Check MongoDB connection string
- Ensure port 5001 is not in use
- Check Node.js version (14+ required)

### Frontend can't connect to backend
- Verify backend is running on port 5001
- Check VITE_ADMIN_API_URL in frontend `.env`
- Check CORS settings in backend

### Can't login
- Verify Super Admin was seeded (check console logs)
- Ensure correct credentials
- Check JWT_SECRET is set in backend `.env`

### Products not showing
- Check MongoDB connection
- Verify products exist in database
- Check browser console for errors

## 📦 Project Structure

```
admin-panel/
├── backend/
│   ├── models/
│   │   └── AdminUser.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── dashboard.js
│   │   └── adminProducts.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── server.js
│   └── .env
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── context/
    │   │   └── AuthContext.tsx
    │   ├── hooks/
    │   ├── pages/
    │   └── lib/
    │       └── api.ts
    └── .env
```

## 🚢 Production Deployment

1. Update all credentials in `.env`
2. Use strong JWT_SECRET (32+ random characters)
3. Change Super Admin password
4. Use environment-specific URLs
5. Enable HTTPS
6. Configure proper CORS origins
7. Set up MongoDB security (whitelist IPs)
8. Use production MongoDB cluster

## 📚 Next Steps

1. ✅ Set up the backend and frontend
2. ✅ Login and explore the dashboard
3. ✅ Test product management
4. 🔲 Implement remaining features (services, testimonials, etc.)
5. 🔲 Create additional admin users
6. 🔲 Configure production environment

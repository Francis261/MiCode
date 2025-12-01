const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const AdminUser = require('./models/AdminUser');
const Product = require('../backend/models/Product'); // Corrected path

// Import admin routes
const adminProductRoutes = require('./routes/product');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.ADMIN_FRONTEND_URL || 'http://localhost:8081',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the React build directory
app.use('/admin-app', express.static(path.join(__dirname, 'frontend/dist')));

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Data Seeding Function for Admin Users
const seedAdminUsers = async () => {
  try {
    let superAdmin = await AdminUser.findOne({ email: process.env.SUPER_ADMIN_EMAIL });

    if (!superAdmin) {
      console.log('Seeding initial Super Admin...');
      superAdmin = new AdminUser({
        email: process.env.SUPER_ADMIN_EMAIL,
        password: process.env.SUPER_ADMIN_PASSWORD,
        role: 'superadmin',
        permissions: {
          dashboard: '*',
          manageAdmins: '*',
          products: '*',
          services: '*',
          testimonials: '*',
          support: '*',
          customOrders: '*',
          ordersPayments: '*',
          users: '*',
        },
      });
      await superAdmin.save();
      console.log('Super Admin seeded successfully.');
      console.log(`IMPORTANT: Super Admin ID is: ${superAdmin._id}. Please add this to your admin-panel/.env file as SUPER_ADMIN_ID.`);
    } else {
      console.log(`Super Admin already exists. ID: ${superAdmin._id}`);
    }
  } catch (error) {
    console.error('Error seeding admin users:', error);
  }
};

// Admin API routes (example)
app.get('/v1/adm/health', (req, res) => {
  res.json({ status: 'ok', message: 'Admin backend is running' });
});

// Redirect root to the React app
app.get('/', (req, res) => {
  res.redirect('/admin-app');
});

// Handle Initial Access Key Verification (now returns JSON only)
app.post('/verify-access', async (req, res) => {
  const { adminId, accessKey } = req.body;

  if (!adminId || !accessKey) {
    return res.status(400).json({ success: false, message: 'Please enter both Admin ID and Access Key.' });
  }

  // Verify the provided Admin ID against the SUPER_ADMIN_ID from .env
  if (adminId !== process.env.SUPER_ADMIN_ID) {
    return res.status(401).json({ success: false, message: 'Invalid Admin ID.' });
  }

  // Verify the provided Access Key against the SUPER_ADMIN_KEY from .env
  if (accessKey !== process.env.SUPER_ADMIN_KEY) {
    return res.status(401).json({ success: false, message: 'Invalid Access Key.' });
  }

  try {
    // If both ID and Key are valid, fetch the super admin user to generate a token
    const admin = await AdminUser.findOne({ email: process.env.SUPER_ADMIN_EMAIL });
    if (!admin) {
      return res.status(500).json({ success: false, message: 'Super Admin user not found in database.' });
    }

    const tempToken = jwt.sign({ id: admin._id, role: admin.role, verified: true }, process.env.JWT_SECRET, { expiresIn: '15m' });
    
    res.json({ success: true, message: 'Access key verified. Proceed to login.', tempToken, adminId: admin._id });

  } catch (error) {
    console.error('Error during access key verification:', error);
    res.status(500).json({ success: false, message: 'An error occurred during verification.' });
  }
});

// Admin Login API (for the React frontend)
app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await AdminUser.findOne({ email });
    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (admin.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked. Please contact support.' });
    }

    const token = jwt.sign({ id: admin._id, email: admin.email, role: admin.role, permissions: admin.permissions }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ success: true, token, admin: { id: admin._id, email: admin.email, role: admin.role, permissions: admin.permissions } });

  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Mount product routes for admin panel, protected by authentication
app.use('/api/products', authenticateToken, adminProductRoutes);

// Dashboard Data Endpoints (Protected)
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    console.log('Dashboard stats: Product model available:', !!Product); // Log Product model availability
    console.log('Fetching dashboard stats. Mongoose connection state:', mongoose.connection.readyState);
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isHidden: false });
    
    // Dummy data for sales and users as we don't have these models
    const totalSales = (Math.random() * 100000 + 50000).toFixed(2); // $50k - $150k
    const newUsers = Math.floor(Math.random() * 1000 + 100); // 100 - 1100 new users

    res.json({
      totalSales: `$${totalSales}`,
      newUsers: `+${newUsers}`,
      activeProducts: activeProducts,
      totalProducts: totalProducts,
      salesChange: `+${(Math.random() * 10 + 10).toFixed(1)}% from last month`, // 10-20%
      usersChange: `+${(Math.random() * 100 + 50).toFixed(1)}% from last month`, // 50-150%
      productsChange: `+${Math.floor(Math.random() * 5 + 1)} since last month`, // 1-5 products
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/dashboard/sales-overview', authenticateToken, async (req, res) => {
  // Simulate sales data over time
  const salesData = [
    { name: 'Jan', sales: Math.floor(Math.random() * 3000 + 2000) },
    { name: 'Feb', sales: Math.floor(Math.random() * 3000 + 2000) },
    { name: 'Mar', sales: Math.floor(Math.random() * 3000 + 2000) },
    { name: 'Apr', sales: Math.floor(Math.random() * 3000 + 2000) },
    { name: 'May', sales: Math.floor(Math.random() * 3000 + 2000) },
    { name: 'Jun', sales: Math.floor(Math.random() * 3000 + 2000) },
    { name: 'Jul', sales: Math.floor(Math.random() * 3000 + 2000) },
  ];
  res.json(salesData);
});

app.get('/api/dashboard/product-performance', authenticateToken, async (req, res) => {
  try {
    console.log('Product performance: Product model available:', !!Product); // Log Product model availability
    console.log('Fetching product performance. Mongoose connection state:', mongoose.connection.readyState);
    // Fetch top 5 products by reviews (as a proxy for performance)
    const topProducts = await Product.find().sort({ reviews: -1 }).limit(5);
    const productPerformanceData = topProducts.map(p => ({
      name: p.title,
      sales: Math.floor(Math.random() * 100 + 50), // Simulate sales count for each product
    }));
    res.json(productPerformanceData);
  } catch (error) {
    console.error('Error fetching product performance:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// Catch-all for the React app: any route not matched by API will serve the React app's index.html
app.get('/admin-app/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist', 'index.html'));
});


// Connect to MongoDB and start server
const PORT = process.env.ADMIN_BACKEND_PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace';

const connectWithRetry = () => {
  console.log('Attempting to connect to MongoDB with URI:', MONGODB_URI); // Log the URI
  mongoose.connect(MONGODB_URI, {
    bufferTimeoutMS: 30000, // Increased buffer timeout to 30 seconds
    serverSelectionTimeoutMS: 60000, // Increased server selection timeout to 1 minute
    connectTimeoutMS: 30000, // New: Timeout for initial connection
    socketTimeoutMS: 45000, // New: Timeout for socket operations after connection
    // Removed maxTimeMS as it's a query option, not a connection option
  })
    .then(() => {
      console.log('Connected to MongoDB for Admin Panel');
      // Removed the log for maxTimeMS as it's no longer a connection option
      seedAdminUsers(); // Seed admin data after successful connection
      app.listen(PORT, () => {
        console.log(`Admin backend running on port ${PORT}`);
      });
    })
    .catch(err => {
      console.error('MongoDB connection error for Admin Panel:', err.message);
      console.log('Retrying MongoDB connection in 5 seconds...');
      setTimeout(connectWithRetry, 5000); // Retry after 5 seconds
    });
};

connectWithRetry(); // Initiate the connection process

// Add more explicit error handling for the Mongoose connection
mongoose.connection.on('error', err => {
  console.error('Mongoose connection error AFTER initial connection:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('Mongoose disconnected from MongoDB. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('Mongoose reconnected to MongoDB.');
});
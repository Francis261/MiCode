const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const AdminUser = require('./models/AdminUser');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.ADMIN_FRONTEND_URL || 'http://localhost:8081',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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

// Initial Access Page (Server-Side Rendered)
app.get('/', (req, res) => {
  res.render('access-key', { message: null });
});

// Handle Initial Access Key Verification
app.post('/verify-access', async (req, res) => {
  const { adminId, accessKey } = req.body;

  if (!adminId || !accessKey) {
    return res.render('access-key', { message: 'Please enter both Admin ID and Access Key.' });
  }

  // Verify the provided Admin ID against the SUPER_ADMIN_ID from .env
  if (adminId !== process.env.SUPER_ADMIN_ID) {
    return res.render('access-key', { message: 'Invalid Admin ID.' });
  }

  // Verify the provided Access Key against the SUPER_ADMIN_KEY from .env
  if (accessKey !== process.env.SUPER_ADMIN_KEY) {
    return res.render('access-key', { message: 'Invalid Access Key.' });
  }

  try {
    // If both ID and Key are valid, fetch the super admin user to generate a token
    const admin = await AdminUser.findOne({ email: process.env.SUPER_ADMIN_EMAIL });
    if (!admin) {
      // This case should ideally not happen if seeding worked, but good for robustness
      return res.render('access-key', { message: 'Super Admin user not found in database.' });
    }

    const tempToken = jwt.sign({ id: admin._id, role: admin.role, verified: true }, process.env.JWT_SECRET, { expiresIn: '15m' });
    
    // In a real scenario, you would redirect to the React admin frontend with this token
    // For now, we'll send a JSON response indicating success.
    res.json({ success: true, message: 'Access key verified. Proceed to login.', tempToken, adminId: admin._id });

  } catch (error) {
    console.error('Error during access key verification:', error);
    res.render('access-key', { message: 'An error occurred during verification.' });
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

// Example Protected Admin Route
app.get('/admin/dashboard-data', authenticateToken, (req, res) => {
  // In a real app, you'd check req.user.permissions here
  if (req.user.permissions.dashboard === '-' && req.user.role !== 'superadmin') {
    return res.status(403).json({ message: 'Access denied' });
  }
  res.json({ message: `Welcome to the dashboard, ${req.user.email}!`, data: 'Some sensitive dashboard data.' });
});


// Connect to MongoDB and start server
const PORT = process.env.ADMIN_BACKEND_PORT || 5001;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace')
  .then(() => {
    console.log('Connected to MongoDB for Admin Panel');
    seedAdminUsers(); // Seed admin data after successful connection
    app.listen(PORT, () => {
      console.log(`Admin backend running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error for Admin Panel:', err);
    process.exit(1);
  });
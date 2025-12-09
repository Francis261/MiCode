const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.ADMIN_FRONTEND_URL || 'http://localhost:8081',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' })); // Increased limit to 50mb
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Also add urlencoded for safety

// Models
const AdminUser = require('./models/AdminUser');
const ChatUser = require('../../backend/models/ChatUser'); // Corrected import path for ChatUser

// Seed Super Admin (Run once on startup)
const seedSuperAdmin = async () => {
  try {
    const existingSuperAdmin = await AdminUser.findOne({ role: 'superadmin' });
    if (!existingSuperAdmin) {
      const superAdmin = new AdminUser({
        email: process.env.SUPER_ADMIN_EMAIL || 'admin@devforge.io',
        password: process.env.SUPER_ADMIN_PASSWORD || '111111',
        role: 'superadmin',
        permissions: new Map([
          ['dashboard', '*'],
          ['manageAdmins', '*'],
          ['products', '*'],
          ['services', '*'],
          ['testimonials', '*'],
          ['support', '*'],
          ['customOrders', '*'],
          ['ordersPayments', '*'],
          ['users', '*'],
        ]),
      });
      await superAdmin.save();
      console.log('✅ Super Admin seeded successfully!');
      console.log('📧 Super Admin Email:', superAdmin.email);
      console.log('🆔 Super Admin ID:', superAdmin._id.toString());
      console.log('⚠️  IMPORTANT: Copy the Super Admin ID above and add it to your .env file as SUPER_ADMIN_ID');
    } else {
      console.log('✅ Super Admin already exists');
    }
  } catch (error) {
    console.error('❌ Error seeding super admin:', error);
  }
};

// Routes (defined here but applied after DB connection)
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const productRoutes = require('./routes/adminProducts');
const serviceRoutes = require('./routes/adminServices');
const testimonialRoutes = require('./routes/adminTestimonials');
const adminUserRoutes = require('./routes/adminUsers');
const customOrderRoutes = require('./routes/adminCustomOrders');
const projectTypeRoutes = require('./routes/adminProjectTypes');
const taskRoutes = require('./routes/adminTasks');
const productOrderRoutes = require('./routes/adminProductOrders');

const PORT = process.env.ADMIN_BACKEND_PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace';

// Connect to MongoDB and start server
const connectWithRetry = () => {
  console.log('Attempting to connect to MongoDB for admin backend with URI:', MONGODB_URI);
  mongoose.connect(MONGODB_URI, {
    bufferTimeoutMS: 60000, // Increased buffer timeout to 1 minute
    serverSelectionTimeoutMS: 60000, // Increased server selection timeout to 1 minute
    connectTimeoutMS: 30000, // Timeout for initial connection
    socketTimeoutMS: 45000, // Timeout for socket operations after connection
  })
  .then(() => {
    console.log('✅ Admin Panel MongoDB Connected');
    seedSuperAdmin(); // Seed data after successful connection

    // Apply routes after DB connection
    app.use('/', authRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/services', serviceRoutes);
    app.use('/api/testimonials', testimonialRoutes);
    app.use('/api/admin-users', adminUserRoutes);
    app.use('/api/custom-orders', customOrderRoutes);
    app.use('/api/project-types', projectTypeRoutes);
    app.use('/api/tasks', taskRoutes);
    app.use('/api/product-orders', productOrderRoutes);

    // Health check
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', message: 'Admin Panel Backend is running' });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('Error:', err);
      res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
    });

    app.listen(PORT, () => {
      console.log(`🚀 Admin Panel Backend running on port ${PORT}`);
      console.log(`📍 Admin Frontend URL: ${process.env.ADMIN_FRONTEND_URL || 'http://localhost:8081'}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error for admin backend:', err.message);
    console.log('Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000); // Retry after 5 seconds
  });
};

connectWithRetry(); // Initiate the connection process

// Add more explicit error handling for the Mongoose connection
mongoose.connection.on('error', err => {
  console.error('Mongoose connection error AFTER initial connection for admin backend:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('Mongoose disconnected from MongoDB for admin backend. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('Mongoose reconnected to MongoDB for admin backend.');
});
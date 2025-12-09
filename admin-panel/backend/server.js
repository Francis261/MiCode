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

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Admin Panel MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Models
const AdminUser = require('./models/AdminUser');
const ChatUser = require('../../../backend/models/ChatUser'); // Corrected import path for ChatUser

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

seedSuperAdmin();

// Routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const productRoutes = require('./routes/adminProducts');
const serviceRoutes = require('./routes/adminServices');
const testimonialRoutes = require('./routes/adminTestimonials');
const adminUserRoutes = require('./routes/adminUsers');
const customOrderRoutes = require('./routes/adminCustomOrders');
const projectTypeRoutes = require('./routes/adminProjectTypes');
const taskRoutes = require('./routes/adminTasks');
const productOrderRoutes = require('./routes/adminProductOrders'); // New import

app.use('/', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/admin-users', adminUserRoutes);
app.use('/api/custom-orders', customOrderRoutes);
app.use('/api/project-types', projectTypeRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/product-orders', productOrderRoutes); // New route registration

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Admin Panel Backend is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const PORT = process.env.ADMIN_BACKEND_PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Admin Panel Backend running on port ${PORT}`);
  console.log(`📍 Admin Frontend URL: ${process.env.ADMIN_FRONTEND_URL || 'http://localhost:8081'}`);
});
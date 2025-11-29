const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models for seeding
const Product = require('./models/Product');
const Service = require('./models/Service');
const Testimonial = require('./models/Testimonial');

// Import data from frontend (for seeding)
const { products } = require('../src/data/products');
const { services } = require('../src/data/services');
const { testimonials } = require('../src/data/testimonials');

// Import routes
const productRoutes = require('./routes/product');
const serviceRoutes = require('./routes/service');
const testimonialRoutes = require('./routes/testimonial');
const paymentRoutes = require('./routes/payment');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/products', productRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/payment', paymentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Data Seeding Function
const seedDatabase = async () => {
  try {
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log('Seeding products...');
      // Map LucideIcon components to string names for storage
      const productsToInsert = products.map(p => ({
        ...p,
        // Ensure 'id' is explicitly set for products as it's used for lookup
        id: p.id 
      }));
      await Product.insertMany(productsToInsert);
      console.log('Products seeded successfully.');
    }

    const serviceCount = await Service.countDocuments();
    if (serviceCount === 0) {
      console.log('Seeding services...');
      // Map LucideIcon components to string names for storage
      const servicesToInsert = services.map(s => ({
        ...s,
        icon: s.icon.displayName || s.icon.name // Store icon name as string
      }));
      await Service.insertMany(servicesToInsert);
      console.log('Services seeded successfully.');
    }

    const testimonialCount = await Testimonial.countDocuments();
    if (testimonialCount === 0) {
      console.log('Seeding testimonials...');
      await Testimonial.insertMany(testimonials);
      console.log('Testimonials seeded successfully.');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace')
  .then(() => {
    console.log('Connected to MongoDB');
    seedDatabase(); // Seed data after successful connection
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
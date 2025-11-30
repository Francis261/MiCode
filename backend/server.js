const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models for seeding
const Product = require('./models/Product');
const Service = require('./models/Service');
const Testimonial = require('./models/Testimonial');

// Import data from backend/data (for seeding)
const { products } = require('./data/products');
const { services } = require('./data/services');
const { testimonials } = require('./data/testimonials');

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
      const productsToInsert = products.map(p => ({
        ...p,
        id: p.id 
      }));
      await Product.insertMany(productsToInsert);
      console.log('Products seeded successfully.');
    }

    const serviceCount = await Service.countDocuments();
    if (serviceCount === 0) {
      console.log('Seeding services...');
      const servicesToInsert = services.map(s => ({
        ...s,
        // The icon name is already a string in backend/data/services.js
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
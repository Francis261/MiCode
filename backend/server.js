const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models for seeding
const Product = require('./models/Product');
const Service = require('./models/Service');
const Testimonial = require('./models/Testimonial');
const AppStats = require('./models/AppStats'); // Import AppStats

// Import data from backend/data (for seeding)
const { products } = require('./data/products');
const { services } = require('./data/services');
const { testimonials } = require('./data/testimonials');

// Import routes
const productRoutes = require('./routes/product');
const serviceRoutes = require('./routes/service');
const testimonialRoutes = require('./routes/testimonial');
const paymentRoutes = require('./routes/payment');

// Import AppStats utility
const { initializeAppStats } = require('./utils/appStatsUpdater');

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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace';

const connectWithRetry = () => {
  console.log('Attempting to connect to MongoDB for main backend with URI:', MONGODB_URI);
  mongoose.connect(MONGODB_URI, {
    bufferTimeoutMS: 60000, // Increased buffer timeout to 1 minute
    serverSelectionTimeoutMS: 60000, // Increased server selection timeout to 1 minute
    connectTimeoutMS: 30000, // Timeout for initial connection
    socketTimeoutMS: 45000, // Timeout for socket operations after connection
  })
  .then(() => {
    console.log('Connected to MongoDB for main backend');
    seedDatabase(); // Seed data after successful connection
    initializeAppStats(); // Initialize AppStats after seeding
    app.listen(PORT, () => {
      console.log(`Main backend running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error for main backend:', err.message);
    console.log('Retrying MongoDB connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000); // Retry after 5 seconds
  });
};

connectWithRetry(); // Initiate the connection process

// Add more explicit error handling for the Mongoose connection
mongoose.connection.on('error', err => {
  console.error('Mongoose connection error AFTER initial connection for main backend:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('Mongoose disconnected from MongoDB for main backend. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('Mongoose reconnected to MongoDB for main backend.');
});
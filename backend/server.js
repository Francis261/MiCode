const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
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
const chatRoutes = require('./routes/chat');
const customOrderRoutes = require('./routes/customOrder');

// Import AppStats utility
const { initializeAppStats } = require('./utils/appStatsUpdater');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:8080',
      process.env.ADMIN_FRONTEND_URL || 'http://localhost:8081'
    ],
    credentials: true
  }
});

// Socket.IO handlers
const socketHandlers = require('./socketHandlers');
socketHandlers(io);

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:8080',
    process.env.ADMIN_FRONTEND_URL || 'http://localhost:8081'
  ],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/products', productRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/testimonials', testimonialRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/custom-orders', customOrderRoutes);

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

// Set global buffering timeout for Mongoose
mongoose.set('bufferTimeoutMS', 60000); // Set to 60 seconds

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
    server.listen(PORT, () => {
      console.log(`Main backend running on port ${PORT}`);
      console.log(`Socket.IO server is ready`);
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
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
// const passport = require('passport'); // Removed passport
require('dotenv').config();

// const authRoutes = require('./routes/auth'); // Removed auth routes
const paymentRoutes = require('./routes/payment');
// require('./config/passport'); // Removed passport config
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));
app.use(express.json());
// app.use(passport.initialize()); // Removed passport initialization

// Routes
// app.use('/api/auth', authRoutes); // Removed auth routes
app.use('/api/payment', paymentRoutes);
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
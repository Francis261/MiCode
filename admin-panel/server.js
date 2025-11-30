const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.ADMIN_FRONTEND_URL || 'http://localhost:8081', // Assuming admin frontend runs on 8081
  credentials: true
}));
app.use(express.json());

// Admin API routes (example)
app.get('/v1/adm/health', (req, res) => {
  res.json({ status: 'ok', message: 'Admin backend is running' });
});

// Connect to MongoDB (re-use existing connection or create a new one if needed)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/marketplace')
  .then(() => {
    console.log('Connected to MongoDB for Admin Panel');
    const PORT = process.env.ADMIN_BACKEND_PORT || 5001; // Admin backend on a different port
    app.listen(PORT, () => {
      console.log(`Admin backend running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error for Admin Panel:', err);
    process.exit(1);
  });
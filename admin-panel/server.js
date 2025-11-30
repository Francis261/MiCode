const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path'); // Import path module
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.ADMIN_FRONTEND_URL || 'http://localhost:8081', // Assuming admin frontend runs on 8081
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing form data

// Configure EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Set the views directory

// Admin API routes (example)
app.get('/v1/adm/health', (req, res) => {
  res.json({ status: 'ok', message: 'Admin backend is running' });
});

// Admin Login Page (Server-Side Rendered)
app.get('/', (req, res) => {
  res.render('login', { message: null }); // Render the login.ejs template
});

// Handle Admin Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Basic placeholder authentication
  if (username === 'admin' && password === 'password') {
    // In a real application, you would issue a JWT or session cookie
    // For now, we'll just redirect to a success page or dashboard (which doesn't exist yet)
    res.send('Admin Login Successful! (Redirect to dashboard would go here)');
  } else {
    res.render('login', { message: 'Invalid username or password' });
  }
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
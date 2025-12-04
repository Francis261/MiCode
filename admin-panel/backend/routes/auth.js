const express = require('express');
const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');
const mongoose = require('mongoose'); // Import mongoose to use Types.ObjectId

const router = express.Router();

// Verify Initial Access (Super Admin Key)
router.post('/verify-access', async (req, res) => {
  try {
    const { adminId, accessKey } = req.body;

    // Validate adminId format
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return res.status(400).json({ success: false, message: 'Invalid Super Admin ID format.' });
    }

    // Verify the Super Admin Key
    if (accessKey !== process.env.SUPER_ADMIN_KEY) {
      return res.status(401).json({ success: false, message: 'Invalid Super Admin Key' });
    }

    // Verify the Admin ID exists
    const admin = await AdminUser.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin ID not found' });
    }

    if (admin.isBlocked) {
      return res.status(403).json({ success: false, message: 'This admin account is blocked' });
    }

    // Generate a temporary token for this admin to proceed to login
    const tempToken = jwt.sign(
      { adminId: admin._id },
      process.env.JWT_SECRET,
      { expiresIn: '10m' } // Valid for 10 minutes
    );

    res.json({
      success: true,
      message: 'Access verified! You can now log in.',
      tempToken,
    });
  } catch (error) {
    console.error('Verify access error:', error);
    res.status(500).json({ success: false, message: 'Server error during access verification' });
  }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin by email
    const admin = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if admin is blocked
    if (admin.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account has been blocked' });
    }

    // Verify password
    const isMatch = await admin.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { adminId: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' } // Valid for 7 days
    );

    // Convert permissions Map to Object for JSON response
    const permissionsObj = Object.fromEntries(admin.permissions);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        permissions: permissionsObj,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// Verify Token (Optional - for token refresh or validation)
router.get('/admin/verify-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await AdminUser.findById(decoded.adminId);

    if (!admin || admin.isBlocked) {
      return res.status(401).json({ success: false, message: 'Invalid or blocked admin' });
    }

    const permissionsObj = Object.fromEntries(admin.permissions);

    res.json({
      success: true,
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        permissions: permissionsObj,
      },
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

module.exports = router;
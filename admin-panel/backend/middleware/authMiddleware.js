const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await AdminUser.findById(decoded.adminId);

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Admin not found' });
    }

    if (admin.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account has been blocked' });
    }

    // Attach admin to request
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Permission checker middleware
const checkPermission = (feature) => {
  return (req, res, next) => {
    const admin = req.admin;
    
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Superadmin has all permissions
    if (admin.role === 'superadmin') {
      return next();
    }

    const permission = admin.permissions.get(feature);
    
    // '*' = full access, '+' = read/write access, '-' = no access
    if (permission === '*' || permission === '+') {
      return next();
    }

    res.status(403).json({ success: false, message: 'You do not have permission to access this resource' });
  };
};

module.exports = { authMiddleware, checkPermission };
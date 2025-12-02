const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const AdminUser = require('../models/AdminUser');
const { authMiddleware, checkPermission } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(authMiddleware);

// Default permissions based on role
const defaultPermissions = {
  superadmin: {
    dashboard: '*', manageAdmins: '*', products: '*', services: '*', testimonials: '*',
    support: '*', customOrders: '*', ordersPayments: '*', users: '*',
  },
  admin: {
    dashboard: '+', manageAdmins: '-', products: '+', services: '+', testimonials: '+',
    support: '+', customOrders: '+', ordersPayments: '+', users: '+',
  },
  editor: {
    dashboard: '+', manageAdmins: '-', products: '+', services: '+', testimonials: '+',
    support: '-', customOrders: '-', ordersPayments: '-', users: '-',
  },
  viewer: {
    dashboard: '+', manageAdmins: '-', products: '-', services: '-', testimonials: '-',
    support: '-', customOrders: '-', ordersPayments: '-', users: '-',
  },
};

// Get all admin users (Superadmin only)
router.get('/', checkPermission('manageAdmins'), async (req, res) => {
  try {
    const adminUsers = await AdminUser.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: adminUsers });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin users' });
  }
});

// Get single admin user by ID (Superadmin only)
router.get('/:id', checkPermission('manageAdmins'), async (req, res) => {
  try {
    const adminUser = await AdminUser.findById(req.params.id).select('-password');
    
    if (!adminUser) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }
    
    res.json({ success: true, data: adminUser });
  } catch (error) {
    console.error('Error fetching admin user:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin user' });
  }
});

// Create new admin user (Superadmin only)
router.post('/', checkPermission('manageAdmins'), async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Email, password, and role are required' });
    }

    const existingAdmin = await AdminUser.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ success: false, message: 'Admin with this email already exists' });
    }

    const newAdminUser = new AdminUser({
      email,
      password, // Password will be hashed by pre-save hook in model
      role,
      permissions: defaultPermissions[role] || defaultPermissions.viewer,
    });
    const savedAdminUser = await newAdminUser.save();
    
    // Return without password
    const { password: _, ...adminUserWithoutPassword } = savedAdminUser.toObject();
    res.status(201).json({ success: true, data: adminUserWithoutPassword });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ success: false, message: 'Failed to create admin user' });
  }
});

// Update admin user (Superadmin only)
router.put('/:id', checkPermission('manageAdmins'), async (req, res) => {
  try {
    const updateData = req.body;
    const adminIdToUpdate = req.params.id;
    const currentAdminId = req.admin._id.toString(); // ID of the admin making the request

    // Prevent changing MongoDB's _id
    delete updateData._id;

    // If password is provided, hash it
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    } else {
      // If password is not provided, ensure it's not set to undefined/null
      delete updateData.password;
    }

    // Fetch the admin user being updated to check their current role
    const existingAdminUser = await AdminUser.findById(adminIdToUpdate);
    if (!existingAdminUser) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    // Superadmin cannot block themselves
    if (adminIdToUpdate === currentAdminId && updateData.isBlocked === true) {
      return res.status(403).json({ success: false, message: 'Super Admin cannot block themselves' });
    }

    // Superadmin cannot change their own role to non-superadmin
    if (adminIdToUpdate === currentAdminId && existingAdminUser.role === 'superadmin' && updateData.role && updateData.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'Super Admin cannot change their own role' });
    }

    // If role is being changed, update permissions accordingly
    if (updateData.role && updateData.role !== existingAdminUser.role) {
      updateData.permissions = defaultPermissions[updateData.role] || defaultPermissions.viewer;
    }

    const adminUser = await AdminUser.findByIdAndUpdate(
      adminIdToUpdate,
      updateData,
      { new: true, runValidators: true }
    ).select('-password'); // Exclude password from response

    if (!adminUser) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    res.json({ success: true, data: adminUser });
  } catch (error) {
    console.error('Error updating admin user:', error);
    res.status(500).json({ success: false, message: 'Failed to update admin user' });
  }
});

// Delete admin user (Superadmin only)
router.delete('/:id', checkPermission('manageAdmins'), async (req, res) => {
  try {
    const adminIdToDelete = req.params.id;
    const currentAdminId = req.admin._id.toString(); // ID of the admin making the request

    if (adminIdToDelete === currentAdminId) {
      return res.status(403).json({ success: false, message: 'You cannot delete your own account' });
    }

    const adminUser = await AdminUser.findByIdAndDelete(adminIdToDelete);

    if (!adminUser) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    res.json({ success: true, message: 'Admin user deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    res.status(500).json({ success: false, message: 'Failed to delete admin user' });
  }
});

module.exports = router;
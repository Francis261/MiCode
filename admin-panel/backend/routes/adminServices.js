const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const { authMiddleware, checkPermission } = require('../middleware/authMiddleware'); // Changed 'authenticateToken' to 'authMiddleware'

// Apply authentication to all routes
router.use(authMiddleware);

// Get all services
router.get('/', checkPermission('services'), async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    res.json({ success: true, data: services });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch services' });
  }
});

// Get single service by ID
router.get('/:id', checkPermission('services'), async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    
    res.json({ success: true, data: service });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch service' });
  }
});

// Create new service
router.post('/', checkPermission('services'), async (req, res) => {
  try {
    const serviceData = req.body;
    
    // Normalize actionButton: if label or url are empty, set actionButton to null
    if (serviceData.actionButton && (!serviceData.actionButton.label || !serviceData.actionButton.url)) {
      serviceData.actionButton = null;
    }

    const newService = new Service(serviceData);
    const savedService = await newService.save();
    
    res.status(201).json({ success: true, data: savedService });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ success: false, message: 'Failed to create service' });
  }
});

// Update service
router.put('/:id', checkPermission('services'), async (req, res) => {
  try {
    const updateData = req.body;
    
    // Don't allow changing MongoDB's _id
    delete updateData._id;

    // Normalize actionButton: if label or url are empty, set actionButton to null
    if (updateData.actionButton && (!updateData.actionButton.label || !updateData.actionButton.url)) {
      updateData.actionButton = null;
    }

    const service = await Service.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.json({ success: true, data: service });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ success: false, message: 'Failed to update service' });
  }
});

// Delete service
router.delete('/:id', checkPermission('services'), async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ success: false, message: 'Failed to delete service' });
  }
});

module.exports = router;
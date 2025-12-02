const express = require('express');
const router = express.Router();
const Service = require('../models/Service');

// Get all services (only visible ones for public)
router.get('/', async (req, res) => {
  try {
    const services = await Service.find({ isHidden: false }).maxTimeMS(30000);
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a single service by ID
router.get('/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).maxTimeMS(30000);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    // Only return if not hidden
    if (service.isHidden) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.json(service);
  } catch (error) {
    console.error('Error fetching service by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
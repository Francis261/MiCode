const express = require('express');
const router = express.Router();
const Testimonial = require('../models/Testimonial'); // Assuming Testimonial model is in admin-panel/backend/models
const { authMiddleware, checkPermission } = require('../middleware/authMiddleware');

// Apply authentication to all routes
router.use(authMiddleware);

// Get all testimonials
router.get('/', checkPermission('testimonials'), async (req, res) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.json({ success: true, data: testimonials });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch testimonials' });
  }
});

// Get single testimonial by ID
router.get('/:id', checkPermission('testimonials'), async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);
    
    if (!testimonial) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }
    
    res.json({ success: true, data: testimonial });
  } catch (error) {
    console.error('Error fetching testimonial:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch testimonial' });
  }
});

// Create new testimonial
router.post('/', checkPermission('testimonials'), async (req, res) => {
  try {
    const newTestimonial = new Testimonial(req.body);
    const savedTestimonial = await newTestimonial.save();
    
    res.status(201).json({ success: true, data: savedTestimonial });
  } catch (error) {
    console.error('Error creating testimonial:', error);
    res.status(500).json({ success: false, message: 'Failed to create testimonial' });
  }
});

// Update testimonial
router.put('/:id', checkPermission('testimonials'), async (req, res) => {
  try {
    const updateData = req.body;
    
    // Don't allow changing MongoDB's _id
    delete updateData._id;

    const testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!testimonial) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }

    res.json({ success: true, data: testimonial });
  } catch (error) {
    console.error('Error updating testimonial:', error);
    res.status(500).json({ success: false, message: 'Failed to update testimonial' });
  }
});

// Delete testimonial
router.delete('/:id', checkPermission('testimonials'), async (req, res) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);

    if (!testimonial) {
      return res.status(404).json({ success: false, message: 'Testimonial not found' });
    }

    res.json({ success: true, message: 'Testimonial deleted successfully' });
  } catch (error) {
    console.error('Error deleting testimonial:', error);
    res.status(500).json({ success: false, message: 'Failed to delete testimonial' });
  }
});

module.exports = router;
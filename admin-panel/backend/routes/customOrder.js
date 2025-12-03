const express = require('express');
const router = express.Router();
const CustomOrder = require('../models/CustomOrder');
const ProjectType = require('../models/ProjectType'); // Ensure ProjectType model is imported

// Route to create a new custom order
router.post('/', async (req, res) => {
  try {
    const { projectType, customProjectType, ...rest } = req.body;
    let finalProjectType = projectType;

    // If projectType is 'other', use the customProjectType value
    if (projectType === 'other' && customProjectType) {
      finalProjectType = customProjectType;
    } else if (projectType === 'other' && !customProjectType) {
      return res.status(400).json({ message: 'Custom project type is required when "Other" is selected.' });
    }

    const order = new CustomOrder({ ...rest, projectType: finalProjectType });
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// New route to get active project types for client-side form
router.get('/project-types', async (req, res) => {
  try {
    const projectTypes = await ProjectType.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    res.json(projectTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
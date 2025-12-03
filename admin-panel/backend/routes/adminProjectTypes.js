const express = require('express');
const router = express.Router();
const ProjectType = require('../models/ProjectType');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Get all project types
router.get('/', async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const query = activeOnly === 'true' ? { isActive: true } : {};
    const projectTypes = await ProjectType.find(query).sort({ sortOrder: 1, name: 1 });
    res.json(projectTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single project type
router.get('/:id', async (req, res) => {
  try {
    const projectType = await ProjectType.findById(req.params.id);
    if (!projectType) {
      return res.status(404).json({ message: 'Project type not found' });
    }
    res.json(projectType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create project type
router.post('/', async (req, res) => {
  try {
    const projectType = new ProjectType(req.body);
    await projectType.save();
    res.status(201).json(projectType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update project type
router.put('/:id', async (req, res) => {
  try {
    const projectType = await ProjectType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!projectType) {
      return res.status(404).json({ message: 'Project type not found' });
    }
    res.json(projectType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete project type
router.delete('/:id', async (req, res) => {
  try {
    const projectType = await ProjectType.findByIdAndDelete(req.params.id);
    if (!projectType) {
      return res.status(404).json({ message: 'Project type not found' });
    }
    res.json({ message: 'Project type deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

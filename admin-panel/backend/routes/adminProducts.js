const express = require('express');
const { authMiddleware, checkPermission } = require('../middleware/authMiddleware');
const Product = require('../models/Product');
const AppStats = require('../models/AppStats');
const { updateAppStats } = require('../utils/appStatsUpdater');

const router = express.Router();

// All product routes require authentication and products permission
router.use(authMiddleware);
router.use(checkPermission('products'));

// Get all products (including hidden ones for admin)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Error fetching products' });
  }
});

// Get single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Error fetching product' });
  }
});

// Create new product
router.post('/', async (req, res) => {
  try {
    const productData = req.body;
    
    // Generate a unique ID if not provided
    if (!productData.id) {
      productData.id = `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Check if product with this ID already exists
    const existingProduct = await Product.findOne({ id: productData.id });
    if (existingProduct) {
      return res.status(400).json({ success: false, message: 'Product with this ID already exists' });
    }

    const product = new Product(productData);
    await product.save();

    // Update app stats
    await updateAppStats();

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error creating product' });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const updateData = req.body;
    
    // Don't allow changing MongoDB's _id
    delete updateData._id;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Update app stats
    await updateAppStats();

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error updating product' });
  }
});

// Delete product
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Update app stats
    await updateAppStats();

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Error deleting product' });
  }
});

module.exports = router;

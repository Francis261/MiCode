const express = require('express');
const router = express.Router();
const Product = require('../../../backend/models/Product'); // Corrected path
const { incrementProductCounts, decrementProductCounts, updateProductVisibilityCounts } = require('../../../backend/utils/appStatsUpdater'); // Corrected path

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().maxTimeMS(30000); // Added maxTimeMS
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get a single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id }).maxTimeMS(30000); // Added maxTimeMS
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create a new product
router.post('/', async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    await incrementProductCounts(newProduct.isHidden); // Update stats
    res.status(201).json(newProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Update an existing product
router.put('/:id', async (req, res) => {
  try {
    const existingProduct = await Product.findOne({ id: req.params.id }).maxTimeMS(30000); // Added maxTimeMS
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const updatedProduct = await Product.findOneAndUpdate({ id: req.params.id }, req.body, { new: true }).maxTimeMS(30000); // Added maxTimeMS
    
    // Update stats if visibility changed
    if (existingProduct.isHidden !== updatedProduct.isHidden) {
      await updateProductVisibilityCounts(existingProduct.isHidden, updatedProduct.isHidden);
    }

    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// Delete a product
router.delete('/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.findOneAndDelete({ id: req.params.id }).maxTimeMS(30000); // Added maxTimeMS
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    await decrementProductCounts(deletedProduct.isHidden); // Update stats
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

module.exports = router;
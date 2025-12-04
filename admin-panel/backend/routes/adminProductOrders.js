const express = require('express');
const router = express.Router();
const ProductOrder = require('../models/ProductOrder');
const { authMiddleware, checkPermission } = require('../middleware/authMiddleware');

// Apply auth middleware and permission check to all routes
router.use(authMiddleware);
router.use(checkPermission('ordersPayments'));

// Get all product orders
router.get('/', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status && status !== 'all') query.status = status;
    if (search) {
      query.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { clientEmail: { $regex: search, $options: 'i' } },
        { 'products.title': { $regex: search, $options: 'i' } },
      ];
    }

    const orders = await ProductOrder.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ProductOrder.countDocuments(query);

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching product orders:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product orders' });
  }
});

// Get a single product order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await ProductOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Product order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error fetching single product order:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch product order' });
  }
});

// Update a product order (e.g., status, admin notes, add manual payment)
router.put('/:id', async (req, res) => {
  try {
    const updateData = req.body;
    delete updateData._id; // Prevent _id from being updated

    const updatedOrder = await ProductOrder.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Product order not found' });
    }
    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error('Error updating product order:', error);
    res.status(500).json({ success: false, message: 'Failed to update product order' });
  }
});

// Delete a product order
router.delete('/:id', async (req, res) => {
  try {
    const deletedOrder = await ProductOrder.findByIdAndDelete(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({ success: false, message: 'Product order not found' });
    }
    res.json({ success: true, message: 'Product order deleted successfully' });
  } catch (error) {
    console.error('Error deleting product order:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product order' });
  }
});

module.exports = router;
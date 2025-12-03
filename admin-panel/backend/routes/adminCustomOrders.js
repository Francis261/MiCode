const express = require('express');
const router = express.Router();
const CustomOrder = require('../models/CustomOrder');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all custom orders
router.get('/', async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { clientName: { $regex: search, $options: 'i' } },
        { clientEmail: { $regex: search, $options: 'i' } },
        { orderId: { $regex: search, $options: 'i' } },
        { projectType: { $regex: search, $options: 'i' } }
      ];
    }
    
    const orders = await CustomOrder.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await CustomOrder.countDocuments(query);
    
    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single order
router.get('/:id', async (req, res) => {
  try {
    const order = await CustomOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Mark as viewed
    if (!order.viewedByAdmin) {
      order.viewedByAdmin = true;
      await order.save();
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new order (admin can create orders manually)
router.post('/', async (req, res) => {
  try {
    const order = new CustomOrder(req.body);
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update order
router.put('/:id', async (req, res) => {
  try {
    const order = await CustomOrder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete order
router.delete('/:id', async (req, res) => {
  try {
    const order = await CustomOrder.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add message to order
router.post('/:id/messages', async (req, res) => {
  try {
    const order = await CustomOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const message = {
      sender: 'admin',
      senderName: req.body.senderName || 'Admin',
      senderEmail: req.body.senderEmail,
      message: req.body.message,
      isEmail: req.body.isEmail || false,
      emailSubject: req.body.emailSubject
    };
    
    order.messages.push(message);
    order.lastContactedAt = new Date();
    await order.save();
    
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Send quote
router.post('/:id/quote', async (req, res) => {
  try {
    const order = await CustomOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    order.quotedAmount = req.body.amount;
    order.quotedTimeline = req.body.timeline;
    order.quoteNotes = req.body.notes;
    order.quoteSentAt = new Date();
    order.status = 'quoted';
    
    await order.save();
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get order statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await CustomOrder.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalOrders = await CustomOrder.countDocuments();
    const newOrders = await CustomOrder.countDocuments({ viewedByAdmin: false });
    
    res.json({
      byStatus: stats,
      total: totalOrders,
      new: newOrders
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

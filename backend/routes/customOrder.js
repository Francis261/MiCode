const express = require('express');
const router = express.Router();

// We'll use the admin panel's models since they share the same database
const mongoose = require('mongoose');

// Define schemas here to avoid circular dependencies
const orderMessageSchema = new mongoose.Schema({
  sender: { type: String, enum: ['admin', 'client'], required: true },
  senderName: String,
  senderEmail: String,
  message: { type: String, required: true },
  isEmail: { type: Boolean, default: false },
  emailSubject: String,
  readAt: Date
}, { timestamps: true });

const customOrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  clientName: { type: String, required: true },
  clientEmail: { type: String, required: true },
  clientCompany: String,
  clientPhone: String,
  projectType: { type: String, required: true },
  customProjectType: String,
  budget: { type: String, required: true },
  customBudget: { min: Number, max: Number, currency: { type: String, default: 'USD' } },
  timeline: { type: String, required: true },
  customTimeline: { value: Number, unit: { type: String, enum: ['days', 'weeks', 'months'] } },
  description: { type: String, required: true },
  features: String,
  techStack: [String],
  attachments: [{ name: String, url: String, type: String, size: Number }],
  status: { type: String, enum: ['pending', 'reviewing', 'quoted', 'accepted', 'in_progress', 'completed', 'cancelled', 'on_hold'], default: 'pending' },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  quotedAmount: Number,
  quotedTimeline: String,
  quoteNotes: String,
  quoteSentAt: Date,
  startDate: Date,
  expectedEndDate: Date,
  actualEndDate: Date,
  messages: [orderMessageSchema],
  assignedTo: String,
  adminNotes: String,
  lastContactedAt: Date,
  viewedByAdmin: { type: Boolean, default: false }
}, { timestamps: true });

customOrderSchema.pre('save', async function(next) {
  if (!this.orderId) {
    const count = await this.constructor.countDocuments();
    this.orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

const CustomOrder = mongoose.models.CustomOrder || mongoose.model('CustomOrder', customOrderSchema);

const projectTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' },
  budgetRanges: [{ label: String, minAmount: Number, maxAmount: Number, isCustom: { type: Boolean, default: false } }],
  timelines: [{ label: String, minDays: Number, maxDays: Number, isCustom: { type: Boolean, default: false } }],
  features: [String],
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

const ProjectType = mongoose.models.ProjectType || mongoose.model('ProjectType', projectTypeSchema);

// Public: Get active project types with their options
router.get('/project-types', async (req, res) => {
  try {
    const projectTypes = await ProjectType.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    res.json(projectTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Public: Submit a custom order
router.post('/submit', async (req, res) => {
  try {
    const order = new CustomOrder({
      ...req.body,
      status: 'pending',
      viewedByAdmin: false
    });
    await order.save();
    res.status(201).json({ 
      success: true, 
      orderId: order.orderId,
      message: 'Your order has been submitted successfully!'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Public: Get order status by orderId and email (for clients to check their order)
router.get('/status/:orderId', async (req, res) => {
  try {
    const { email } = req.query;
    const order = await CustomOrder.findOne({ 
      orderId: req.params.orderId,
      clientEmail: email 
    }).select('orderId status projectType budget timeline quotedAmount quotedTimeline createdAt');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

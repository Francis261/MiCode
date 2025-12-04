const mongoose = require('mongoose');

const orderMessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['admin', 'client'],
    required: true
  },
  senderName: String,
  senderEmail: String,
  message: {
    type: String,
    required: true
  },
  isEmail: {
    type: Boolean,
    default: false
  },
  emailSubject: String,
  readAt: Date
}, { timestamps: true });

const costItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  quantity: {
    type: Number,
    default: 1
  }
});

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true
  },
  method: String,
  transactionId: String,
  paidAt: {
    type: Date,
    default: Date.now
  },
  notes: String
});

const developerSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  rank: String,
  profilePhoto: String,
  skills: [String],
  bio: String
});

const customOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  // Client Information
  clientName: {
    type: String,
    required: true
  },
  clientEmail: {
    type: String,
    required: true
  },
  clientCompany: String,
  clientPhone: String,
  
  // Project Details
  projectType: {
    type: String,
    required: true
  },
  customProjectType: String,
  
  budget: {
    type: String,
    required: true
  },
  customBudget: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'USD' }
  },
  
  timeline: {
    type: String,
    required: true
  },
  customTimeline: {
    value: Number,
    unit: { type: String, enum: ['days', 'weeks', 'months'] }
  },
  
  description: {
    type: String,
    required: true
  },
  features: String,
  
  // Additional Project Info
  techStack: [String],
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number
  }],
  
  // Order Management
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'quoted', 'accepted', 'in_progress', 'completed', 'cancelled', 'on_hold'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // Quote Details
  quotedAmount: Number,
  quotedTimeline: String,
  quoteNotes: String,
  quoteSentAt: Date,
  
  // Dates
  startDate: Date,
  expectedEndDate: Date,
  actualEndDate: Date,
  
  // Communication
  messages: [orderMessageSchema],
  
  // Assignment
  assignedTo: String,
  
  // Developer Info (visible to client)
  developer: developerSchema,
  
  // Cost Breakdown
  costItems: [costItemSchema],
  totalCost: {
    type: Number,
    default: 0
  },
  
  // Payments
  payments: [paymentSchema],
  totalPaid: {
    type: Number,
    default: 0
  },
  
  // Notes
  adminNotes: String,
  
  // Tracking
  lastContactedAt: Date,
  viewedByAdmin: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Generate unique order ID
customOrderSchema.pre('save', async function(next) {
  if (!this.orderId) {
    const count = await this.constructor.countDocuments();
    this.orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('CustomOrder', customOrderSchema);

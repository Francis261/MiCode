const mongoose = require('mongoose');

const projectTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  budgetRanges: [{
    label: String,
    minAmount: Number,
    maxAmount: Number,
    isCustom: { type: Boolean, default: false }
  }],
  timelines: [{
    label: String,
    minDays: Number,
    maxDays: Number,
    isCustom: { type: Boolean, default: false }
  }],
  features: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('ProjectType', projectTypeSchema);

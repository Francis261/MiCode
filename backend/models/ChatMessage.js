const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  sender: {
    type: String,
    enum: ['user', 'admin'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for faster queries
chatMessageSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);

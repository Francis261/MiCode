const mongoose = require('mongoose');

const chatUserSchema = new mongoose.Schema({
  odUserId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  unreadCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('ChatUser', chatUserSchema);
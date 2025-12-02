const express = require('express');
const router = express.Router();
const ChatUser = require('../models/ChatUser');
const ChatMessage = require('../models/ChatMessage');

// Register or get chat user
router.post('/register', async (req, res) => {
  try {
    const { odUserId, userId, name, email } = req.body;
    const finalUserId = odUserId || userId;

    if (!finalUserId || !name || !email) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Check if user exists by odUserId or email
    let user = await ChatUser.findOne({ 
      $or: [{ odUserId: finalUserId }, { userId: finalUserId }, { email }] 
    });

    if (!user) {
      user = new ChatUser({
        odUserId: finalUserId,
        userId: finalUserId,
        name,
        email,
        isActive: true,
        lastSeen: new Date(),
      });
      await user.save();
    } else {
      user.isActive = true;
      user.lastSeen = new Date();
      if (!user.odUserId) {
        user.odUserId = finalUserId;
      }
      await user.save();
    }

    res.json({ success: true, user, isNew: !user._id });
  } catch (error) {
    console.error('Error registering chat user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get chat history for a user
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await ChatMessage.find({ userId }).sort({ timestamp: 1 }).limit(100);
    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all chat users for admin
router.get('/users', async (req, res) => {
  try {
    const users = await ChatUser.find().sort({ lastSeen: -1 });
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching chat users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Mark messages as read
router.post('/mark-read/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await ChatMessage.updateMany(
      { userId, sender: 'user', isRead: false },
      { isRead: true }
    );
    await ChatUser.findOneAndUpdate(
      { userId },
      { unreadCount: 0 }
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

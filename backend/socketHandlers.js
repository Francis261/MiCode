const ChatUser = require('./models/ChatUser');
const ChatMessage = require('./models/ChatMessage');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join user to their own room
    socket.on('join', async ({ odUserId, userId, isAdmin }) => {
      const finalUserId = odUserId || userId;
      if (isAdmin) {
        socket.join('admin-room');
        console.log('Admin joined:', socket.id);
      } else {
        socket.join(`user-${finalUserId}`);
        await ChatUser.findOneAndUpdate(
          { $or: [{ odUserId: finalUserId }, { userId: finalUserId }] },
          { isActive: true, lastSeen: new Date() }
        );
        // Notify admin of user activity
        io.to('admin-room').emit('user-active', { odUserId: finalUserId, odUserId: finalUserId });
        console.log('User joined:', finalUserId);
      }
    });

    // Handle new message
    socket.on('send-message', async ({ odUserId, userId, message, sender }) => {
      const finalUserId = odUserId || userId;
      try {
        const newMessage = new ChatMessage({
          odUserId: finalUserId,
          userId: finalUserId,
          sender,
          message,
          timestamp: new Date(),
        });
        await newMessage.save();

        // Update unread count if message is from user
        if (sender === 'user') {
          await ChatUser.findOneAndUpdate(
            { $or: [{ odUserId: finalUserId }, { userId: finalUserId }] },
            { $inc: { unreadCount: 1 }, lastSeen: new Date() }
          );
        }

        // Send message to user room
        io.to(`user-${finalUserId}`).emit('receive-message', {
          _id: newMessage._id,
          odUserId: finalUserId,
          userId: finalUserId,
          sender,
          message,
          timestamp: newMessage.timestamp,
          isRead: false,
        });

        // Send message to admin room
        io.to('admin-room').emit('receive-message', {
          _id: newMessage._id,
          odUserId: finalUserId,
          userId: finalUserId,
          sender,
          message,
          timestamp: newMessage.timestamp,
          isRead: false,
        });

        console.log('Message sent:', { odUserId: finalUserId, sender, message });
      } catch (error) {
        console.error('Error saving message:', error);
      }
    });

    // Handle typing indicator
    socket.on('typing', ({ userId, isTyping }) => {
      io.to('admin-room').emit('user-typing', { userId, isTyping });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);
      // Update user status to inactive
      // Note: We don't know which user this socket belongs to without tracking
      // In production, you'd want to track socket.id to userId mapping
    });
  });
};

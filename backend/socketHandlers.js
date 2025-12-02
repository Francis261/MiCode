const ChatUser = require('./models/ChatUser');
const ChatMessage = require('./models/ChatMessage');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Join user to their own room
    socket.on('join', async ({ userId, isAdmin }) => {
      if (isAdmin) {
        socket.join('admin-room');
        console.log('Admin joined:', socket.id);
      } else {
        socket.join(`user-${userId}`);
        await ChatUser.findOneAndUpdate(
          { userId },
          { isActive: true, lastSeen: new Date() }
        );
        // Notify admin of user activity
        io.to('admin-room').emit('user-active', { userId });
        console.log('User joined:', userId);
      }
    });

    // Handle new message
    socket.on('send-message', async ({ userId, message, sender }) => {
      try {
        const newMessage = new ChatMessage({
          userId,
          sender,
          message,
          timestamp: new Date(),
        });
        await newMessage.save();

        // Update unread count if message is from user
        if (sender === 'user') {
          await ChatUser.findOneAndUpdate(
            { userId },
            { $inc: { unreadCount: 1 }, lastSeen: new Date() }
          );
        }

        // Send message to user room
        io.to(`user-${userId}`).emit('receive-message', {
          _id: newMessage._id,
          userId,
          sender,
          message,
          timestamp: newMessage.timestamp,
          isRead: false,
        });

        // Send message to admin room
        io.to('admin-room').emit('receive-message', {
          _id: newMessage._id,
          userId,
          sender,
          message,
          timestamp: newMessage.timestamp,
          isRead: false,
        });

        console.log('Message sent:', { userId, sender, message });
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

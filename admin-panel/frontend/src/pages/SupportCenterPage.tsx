import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Send, Circle } from 'lucide-react';
import { adminFetcher } from '@/lib/api';
import { io, Socket } from 'socket.io-client';
import { motion } from 'framer-motion';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface ChatUser {
  userId: string;
  name: string;
  email: string;
  isActive: boolean;
  unreadCount: number;
  lastSeen: Date;
}

interface Message {
  _id: string;
  userId: string;
  sender: 'user' | 'admin';
  message: string;
  timestamp: Date;
  isRead: boolean;
}

const SupportCenterPage = () => {
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat users
  useEffect(() => {
    loadChatUsers();
  }, []);

  // Initialize Socket.IO
  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Admin connected to chat server');
      socket.emit('join', { isAdmin: true });
    });

    socket.on('receive-message', (message: Message) => {
      console.log('Admin received message:', message);
      
      // Update messages if this user is selected
      if (selectedUser && message.userId === selectedUser.userId) {
        setMessages((prev) => [...prev, message]);
      }

      // Update user list with unread count
      setChatUsers((prev) =>
        prev.map((user) =>
          user.userId === message.userId && message.sender === 'user'
            ? { ...user, unreadCount: user.unreadCount + 1 }
            : user
        )
      );
    });

    socket.on('user-active', ({ userId }: { userId: string }) => {
      setChatUsers((prev) =>
        prev.map((user) =>
          user.userId === userId ? { ...user, isActive: true } : user
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedUser]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChatUsers = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/users`);
      const data = await response.json();
      if (data.success) {
        setChatUsers(data.users);
      }
    } catch (error) {
      console.error('Error loading chat users:', error);
    }
  };

  const loadChatHistory = async (userId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/history/${userId}`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
        
        // Mark messages as read
        await fetch(`${BACKEND_URL}/api/chat/mark-read/${userId}`, {
          method: 'POST',
        });
        
        // Update unread count in UI
        setChatUsers((prev) =>
          prev.map((user) =>
            user.userId === userId ? { ...user, unreadCount: 0 } : user
          )
        );
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const handleUserSelect = (user: ChatUser) => {
    setSelectedUser(user);
    loadChatHistory(user.userId);
  };

  const handleSend = () => {
    if (!inputValue.trim() || !selectedUser || !socketRef.current) return;

    const message = {
      userId: selectedUser.userId,
      sender: 'admin' as const,
      message: inputValue,
    };

    socketRef.current.emit('send-message', message);
    setInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredUsers = chatUsers.filter((user) =>
    filter === 'unread' ? user.unreadCount > 0 : true
  );

  const truncateName = (name: string) => {
    return name.length > 20 ? name.substring(0, 20) + '...' : name;
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold">Support Center</h1>
          <p className="text-muted-foreground">Manage customer conversations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User List */}
          <Card className="lg:col-span-1 p-4">
            <div className="flex gap-2 mb-4">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                className="flex-1"
              >
                All Chats
              </Button>
              <Button
                variant={filter === 'unread' ? 'default' : 'outline'}
                onClick={() => setFilter('unread')}
                className="flex-1"
              >
                Unread
              </Button>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No conversations yet
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <motion.div
                    key={user.userId}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedUser?.userId === user.userId
                        ? 'bg-primary/10 border border-primary'
                        : 'bg-muted/50 hover:bg-muted'
                    }`}
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Circle
                            className={`w-2 h-2 ${
                              user.isActive ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'
                            }`}
                          />
                          <p className="font-medium text-sm truncate">
                            {truncateName(user.name)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      {user.unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {user.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2">
            {selectedUser ? (
              <>
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Circle
                      className={`w-3 h-3 ${
                        selectedUser.isActive ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'
                      }`}
                    />
                    <div>
                      <h2 className="font-semibold">{selectedUser.name}</h2>
                      <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                    </div>
                  </div>
                </div>

                <div className="h-[500px] overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p className="text-sm">No messages yet</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <motion.div
                        key={message._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${
                          message.sender === 'admin' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            message.sender === 'admin'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-foreground'
                          }`}
                        >
                          <p className="text-sm">{message.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              message.sender === 'admin'
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="flex-1"
                    />
                    <Button onClick={handleSend}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[600px] flex items-center justify-center text-muted-foreground">
                <p>Select a conversation to start chatting</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SupportCenterPage;

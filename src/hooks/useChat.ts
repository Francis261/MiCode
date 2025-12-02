import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { chatDB } from '@/utils/indexedDB';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Message {
  _id?: string;
  userId: string;
  sender: 'user' | 'admin';
  message: string;
  timestamp: Date;
  isRead?: boolean;
}

interface ChatUser {
  userId: string;
  name: string;
  email: string;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<ChatUser | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [needsRegistration, setNeedsRegistration] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Initialize user from localStorage
  useEffect(() => {
    const loadUser = async () => {
      const storedUserId = localStorage.getItem('chatUserId');
      const storedName = localStorage.getItem('chatUserName');
      const storedEmail = localStorage.getItem('chatUserEmail');

      if (storedUserId && storedName && storedEmail) {
        const userData = { userId: storedUserId, name: storedName, email: storedEmail };
        setUser(userData);
        
        // Load messages from IndexedDB
        try {
          const localMessages = await chatDB.getMessages(storedUserId);
          setMessages(localMessages);
        } catch (error) {
          console.error('Error loading messages from IndexedDB:', error);
        }

        // Verify with backend
        try {
          const response = await fetch(`${BACKEND_URL}/api/chat/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
          });
          const data = await response.json();
          if (data.success) {
            // Load chat history from server
            const historyResponse = await fetch(`${BACKEND_URL}/api/chat/history/${storedUserId}`);
            const historyData = await historyResponse.json();
            if (historyData.success && historyData.messages.length > 0) {
              setMessages(historyData.messages);
            }
          }
        } catch (error) {
          console.error('Error verifying user:', error);
        }
      } else {
        setNeedsRegistration(true);
      }
    };

    loadUser();
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!user) return;

    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
      socket.emit('join', { userId: user.userId, isAdmin: false });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
    });

    socket.on('receive-message', async (message: Message) => {
      console.log('Received message:', message);
      setMessages((prev) => [...prev, message]);
      
      // Save to IndexedDB
      try {
        await chatDB.saveMessage(message);
      } catch (error) {
        console.error('Error saving message to IndexedDB:', error);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const registerUser = async (name: string, email: string) => {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/chat/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name, email }),
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('chatUserId', userId);
        localStorage.setItem('chatUserName', name);
        localStorage.setItem('chatUserEmail', email);
        
        setUser({ userId, name, email });
        setNeedsRegistration(false);
        
        return { success: true };
      }
      
      return { success: false, message: 'Failed to register' };
    } catch (error) {
      console.error('Error registering user:', error);
      return { success: false, message: 'Server error' };
    }
  };

  const sendMessage = useCallback(async (messageText: string) => {
    if (!user || !socketRef.current || !messageText.trim()) return;

    const message: Message = {
      userId: user.userId,
      sender: 'user',
      message: messageText,
      timestamp: new Date(),
    };

    // Emit through Socket.IO
    socketRef.current.emit('send-message', message);

    // Save to IndexedDB immediately
    try {
      await chatDB.saveMessage(message);
    } catch (error) {
      console.error('Error saving message to IndexedDB:', error);
    }
  }, [user]);

  return {
    messages,
    user,
    isConnected,
    needsRegistration,
    registerUser,
    sendMessage,
  };
};

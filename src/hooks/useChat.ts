import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { fetcher } from '@/lib/api'; // Import fetcher

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'; // Still needed for socket.io
const LOCAL_STORAGE_KEY = 'chatMessages'; // Define this constant

interface Message {
  _id?: string; // MongoDB ID, optional for new messages
  odId?: string; // Our own generated ID for client-side tracking
  userId: string;
  sender: 'user' | 'admin' | 'system';
  message: string;
  timestamp: Date;
  isRead?: boolean;
  isRegistrationPrompt?: boolean; // For internal UI logic
}

interface ChatUser {
  odUserId: string; // Our own generated ID
  name: string;
  email: string;
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [user, setUser] = useState<ChatUser | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Check if user exists in localStorage on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('chatUserId');
    const storedName = localStorage.getItem('chatUserName');
    const storedEmail = localStorage.getItem('chatUserEmail');

    if (storedUserId && storedName && storedEmail) {
      const userData = { odUserId: storedUserId, name: storedName, email: storedEmail };
      setUser(userData);
      
      // Load messages from localStorage first
      const localMessages = getMessagesFromLocalStorage(storedUserId);
      if (localMessages.length > 0) {
        setMessages(localMessages);
      }

      // Sync with backend
      syncWithBackend(storedUserId);
    }
  }, []);

  const syncWithBackend = async (userId: string) => {
    try {
      // Use fetcher for API calls
      const data = await fetcher<{ success: boolean; messages: Message[] }>(`/chat/history/${userId}`);
      if (data.success && data.messages.length > 0) {
        setMessages(data.messages);
        saveMessagesToLocalStorage(userId, data.messages);
      }
    } catch (error) {
      console.error('Error syncing with backend:', error);
    }
  };

  // Initialize Socket.IO connection when user is set
  useEffect(() => {
    if (!user) return;

    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
      socket.emit('join', { odUserId: user.odUserId, isAdmin: false });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
    });

    socket.on('receive-message', (message: Message) => {
      console.log('Received message:', message);
      setMessages((prev) => {
        const newMessages = [...prev, message];
        if (user) {
          saveMessagesToLocalStorage(user.odUserId, newMessages);
        }
        return newMessages;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (user && messages.length > 0) {
      saveMessagesToLocalStorage(user.odUserId, messages);
    }
  }, [messages, user]);

  const registerUser = async (name: string, email: string) => {
    const odUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Use fetcher for API calls
      const data = await fetcher<{ success: boolean; message?: string; user?: ChatUser }>(`/chat/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ odUserId, name, email }),
      });
      
      if (data.success) {
        localStorage.setItem('chatUserId', odUserId);
        localStorage.setItem('chatUserName', name);
        localStorage.setItem('chatUserEmail', email);
        
        setUser({ odUserId, name, email });
        setShowRegistrationForm(false);
        
        // Remove the registration prompt message
        setMessages((prev) => prev.filter((m) => !m.isRegistrationPrompt));
        
        // Send the pending message if exists
        if (pendingMessage) {
          setTimeout(() => {
            sendMessageInternal(pendingMessage, odUserId);
            setPendingMessage(null);
          }, 500);
        }
        
        return { success: true };
      }
      
      return { success: false, message: data.message || 'Failed to register' };
    } catch (error) {
      console.error('Error registering user:', error);
      return { success: false, message: (error as Error).message || 'Server error' };
    }
  };

  const sendMessageInternal = useCallback((messageText: string, odUserId: string) => {
    if (!socketRef.current || !messageText.trim()) return;

    const message: Message = {
      odUserId,
      odId: `msg_${Date.now()}`,
      userId: odUserId,
      sender: 'user',
      message: messageText,
      timestamp: new Date(),
    };

    // Add message to local state immediately
    setMessages((prev) => {
      const newMessages = [...prev, message];
      saveMessagesToLocalStorage(odUserId, newMessages);
      return newMessages;
    });

    // Emit through Socket.IO
    socketRef.current.emit('send-message', message);
  }, []);

  const sendMessage = useCallback((messageText: string) => {
    if (!messageText.trim()) return;

    // Check if user is registered
    const storedUserId = localStorage.getItem('chatUserId');
    
    if (!storedUserId || !user) {
      // User is not registered, show registration form in chat
      setPendingMessage(messageText);
      setShowRegistrationForm(true);
      
      // Add a system message prompting registration
      const systemMessage: Message = {
        odId: `system_${Date.now()}`,
        userId: 'system',
        sender: 'system',
        message: 'Please provide your details to continue chatting.',
        timestamp: new Date(),
        isRegistrationPrompt: true,
      };
      
      setMessages((prev) => [...prev, systemMessage]);
      return;
    }

    sendMessageInternal(messageText, user.odUserId);
  }, [user, sendMessageInternal]);

  const cancelRegistration = useCallback(() => {
    setShowRegistrationForm(false);
    setPendingMessage(null);
    setMessages((prev) => prev.filter((m) => !m.isRegistrationPrompt));
  }, []);

  return {
    messages,
    user,
    isConnected,
    showRegistrationForm,
    registerUser,
    sendMessage,
    cancelRegistration,
  };
};
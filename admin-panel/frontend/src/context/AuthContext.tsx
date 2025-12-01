import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { adminFetcher } from '@/lib/api';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  permissions: Record<string, string>; // e.g., { dashboard: '*', products: '+' }
}

interface AuthContextType {
  admin: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkPermission: (feature: string, action?: string) => boolean;
  setTempToken: (tempToken: string) => void;
  tempToken: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('adminToken'));
  const [tempToken, setTempTokenState] = useState<string | null>(null); // For initial access key verification

  useEffect(() => {
    if (token) {
      // Optionally verify token on mount or refresh user data
      // For now, we'll assume if token exists, user is logged in.
      // In a real app, you'd have a /admin/me endpoint to fetch user details.
      const storedAdmin = localStorage.getItem('adminUser');
      if (storedAdmin) {
        setAdmin(JSON.parse(storedAdmin));
      }
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const response = await adminFetcher<{ success: boolean; message?: string; token: string; admin: AdminUser }>('/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (response.success && response.token && response.admin) {
        setToken(response.token);
        setAdmin(response.admin);
        localStorage.setItem('adminToken', response.token);
        localStorage.setItem('adminUser', JSON.stringify(response.admin));
        toast.success('Login successful!');
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Invalid credentials or server error');
      throw error;
    }
  };

  const logout = () => {
    setAdmin(null);
    setToken(null);
    setTempTokenState(null);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    toast.info('Logged out successfully.');
  };

  const checkPermission = (feature: string, action: string = '+') => {
    if (!admin || !admin.permissions) return false;

    const permission = admin.permissions[feature];

    if (admin.role === 'superadmin' || permission === '*') {
      return true; // Superadmin or full access to feature
    }
    if (permission === '+') {
      return true; // Can access the feature
    }
    // For more granular actions, you might extend 'action' to be more specific
    // e.g., { products: 'read,write,delete' }
    // For now, '+' means general access, '-' means no access.
    return false;
  };

  const setTempToken = (token: string) => {
    setTempTokenState(token);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ admin, token, isAuthenticated, login, logout, checkPermission, setTempToken, tempToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
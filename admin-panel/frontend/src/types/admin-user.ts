export interface AdminUser {
  _id: string;
  email: string;
  role: 'superadmin' | 'admin' | 'editor' | 'viewer';
  permissions: Record<string, string>; // e.g., { dashboard: '*', products: '+' }
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}
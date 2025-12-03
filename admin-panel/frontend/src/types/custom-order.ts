export interface OrderMessage {
  _id?: string;
  sender: 'admin' | 'client';
  senderName?: string;
  senderEmail?: string;
  message: string;
  isEmail?: boolean;
  emailSubject?: string;
  readAt?: string;
  createdAt?: string;
}

export interface CustomBudget {
  min?: number;
  max?: number;
  currency?: string;
}

export interface CustomTimeline {
  value?: number;
  unit?: 'days' | 'weeks' | 'months';
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface CustomOrder {
  _id: string;
  orderId: string;
  clientName: string;
  clientEmail: string;
  clientCompany?: string;
  clientPhone?: string;
  projectType: string;
  customProjectType?: string;
  budget: string;
  customBudget?: CustomBudget;
  timeline: string;
  customTimeline?: CustomTimeline;
  description: string;
  features?: string;
  techStack?: string[];
  attachments?: Attachment[];
  status: 'pending' | 'reviewing' | 'quoted' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  quotedAmount?: number;
  quotedTimeline?: string;
  quoteNotes?: string;
  quoteSentAt?: string;
  startDate?: string;
  expectedEndDate?: string;
  actualEndDate?: string;
  messages?: OrderMessage[];
  assignedTo?: string;
  adminNotes?: string;
  lastContactedAt?: string;
  viewedByAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetRange {
  _id?: string;
  label: string;
  minAmount: number;
  maxAmount: number;
  isCustom?: boolean;
}

export interface TimelineOption {
  _id?: string;
  label: string;
  minDays: number;
  maxDays: number;
  isCustom?: boolean;
}

export interface ProjectType {
  _id: string;
  name: string;
  description?: string;
  budgetRanges: BudgetRange[];
  timelines: TimelineOption[];
  features?: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  _id?: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface Task {
  _id: string;
  orderId: string | { _id: string; orderId: string; clientName: string; projectType: string };
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  subtasks?: Subtask[];
  tags?: string[];
  attachments?: Attachment[];
  completedAt?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersResponse {
  orders: CustomOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

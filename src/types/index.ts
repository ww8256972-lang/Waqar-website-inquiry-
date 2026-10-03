export interface User {
  id: number;
  username: string;
  role: string;
  created_at?: string;
}

export interface BusinessType {
  id: number;
  name: string;
  created_at?: string;
}

export interface WebsiteType {
  id: number;
  name: string;
  created_at?: string;
}

export type CustomerStatus =
  | 'New'
  | 'Call Back'
  | 'Interested'
  | 'Not Interested'
  | 'Agreed'
  | 'Pending'
  | 'Success'
  | 'Cancelled';

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'cancelled';

export interface Customer {
  id: number;
  inquiry_id: string;
  name: string;
  phone: string;
  email?: string;
  business_name?: string;
  business_type_id?: number;
  business_type_name?: string;
  address?: string;
  website_type_id?: number;
  website_type_name?: string;
  website_name?: string;
  quoted_price: number;
  total_price: number;
  advance_payment: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: PaymentStatus;
  status: CustomerStatus;
  lead_score?: number;
  lead_temperature?: 'Hot' | 'Warm' | 'Cold';
  tags?: string;
  last_contact_date?: string;
  ai_summary?: string;
  ai_suggested_followup?: string;
  ai_talking_points?: string;
  inquiry_date: string;
  follow_up_date?: string;
  follow_up_time?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  deleted_by?: string;
}

export interface QuotationItem {
  id?: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  business_name?: string;
  customer_address?: string;
  items_json?: string;
  items: QuotationItem[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  validity_date?: string;
  terms?: string;
  notes?: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  quotation_id?: number;
  customer_name?: string;
  customer_phone?: string;
  business_name?: string;
  customer_address?: string;
  items_json?: string;
  items: QuotationItem[];
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  due_date?: string;
  payment_method: string;
  notes?: string;
  status: 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplate {
  id: number;
  title: string;
  category: string;
  template_body: string;
  created_at?: string;
  updated_at?: string;
}

export interface SmartReminder {
  id: number;
  customer_id?: number;
  customer_name?: string;
  customer_phone?: string;
  business_name?: string;
  title: string;
  reminder_type: 'one-time' | 'daily' | 'weekly' | 'call' | 'payment' | 'meeting' | 'follow-up';
  remind_at: string;
  recurring_pattern?: string;
  note?: string;
  status: 'pending' | 'completed' | 'dismissed';
  created_at?: string;
}

export interface SavedFilter {
  id: number;
  name: string;
  filter_params_json: string;
  created_at?: string;
}

export interface CustomerNote {
  id: number;
  customer_id: number;
  category: 'General' | 'Call' | 'Payment' | 'Meeting' | 'Internal';
  content: string;
  author: string;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  author: string;
  meta?: any;
}

export interface RevenueAnalytics {
  totalQuoted: number;
  totalCollected: number;
  totalPending: number;
  todayCollection: number;
  weeklyCollection: number;
  monthlyCollection: number;
  yearlyCollection: number;
  paidCustomersCount: number;
  pendingCustomersCount: number;
  partialCustomersCount: number;
  totalCustomers: number;
  websiteDemand: Array<{ name: string; count: number; revenue: number }>;
  businessDemand: Array<{ name: string; count: number; revenue: number }>;
}

export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
  percentage: number;
}

export interface CallAnalytics {
  totalCalls: number;
  outcomes: Array<{ call_result: string; count: number }>;
  trends: Array<{ call_date: string; calls_count: number }>;
}

export interface SystemHealth {
  status: 'ONLINE' | 'OFFLINE' | 'WARNING' | 'ERROR';
  uptime_seconds: number;
  database: {
    engine: string;
    status: string;
    persistence: string;
    active_customers: number;
    recycle_bin_count: number;
    total_calls_logged: number;
    total_payments_recorded: number;
    total_audit_events: number;
  };
  system: {
    node_version: string;
    rss_memory_mb: number;
    heap_used_mb: number;
  };
  app_version: string;
}

export interface CallSchedule {
  id: number;
  customer_id: number;
  customer_name?: string;
  business_name?: string;
  customer_status?: string;
  inquiry_id?: string;
  phone: string;
  scheduled_date: string;
  scheduled_time: string;
  reminder_note?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'snoozed' | 'rescheduled';
  created_at: string;
  updated_at: string;
}

export interface CallNote {
  id: number;
  customer_id: number;
  admin_id?: number;
  call_result: string;
  note_text: string;
  next_follow_up_date?: string;
  next_follow_up_time?: string;
  new_status?: CustomerStatus;
  created_at: string;
}

export interface Payment {
  id: number;
  payment_id_str: string;
  customer_id: number;
  amount: number;
  payment_method: string;
  payment_date: string;
  transaction_ref?: string;
  note?: string;
  created_by: string;
  created_at: string;
}

export interface Receipt {
  id: number;
  receipt_number: string;
  customer_id: number;
  customer_name?: string;
  customer_phone?: string;
  business_name?: string;
  address?: string;
  website_name?: string;
  website_type_name?: string;
  payment_id?: number;
  payment_method?: string;
  transaction_ref?: string;
  payment_note?: string;
  created_by?: string;
  amount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  date: string;
  created_at: string;
}

export interface UploadedPhoto {
  id: number;
  customer_id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface CustomerActivity {
  id: number;
  customer_id: number;
  customer_name?: string;
  activity_type: string;
  title: string;
  description?: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  admin_username: string;
  action: string;
  target_type?: string;
  target_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export interface DashboardStats {
  totalCustomers: number;
  newInquiries: number;
  todayFollowUps: number;
  todayCalls: number;
  upcomingCalls: number;
  overdueCalls: number;
  interested: number;
  callBack: number;
  agreed: number;
  notInterested: number;
  pending: number;
  successProjects: number;
  cancelledProjects: number;
  totalRevenue: number;
  totalPaid: number;
  pendingPayments: number;
  recentInquiries: Customer[];
  recentActivities: CustomerActivity[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}


import {
  BusinessType,
  WebsiteType,
  Customer,
  CallSchedule,
  CallNote,
  Payment,
  Receipt,
  UploadedPhoto,
  CustomerActivity,
  DashboardStats,
  Pagination,
  AuditLog
} from '../types';

let authToken = localStorage.getItem('wwi_auth_token') || '';

export function setClientToken(token: string) {
  authToken = token;
  if (token) {
    localStorage.setItem('wwi_auth_token', token);
  } else {
    localStorage.removeItem('wwi_auth_token');
  }
}

export function getClientToken() {
  return authToken;
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');

  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  if (res.status === 401) {
    setClientToken('');
    window.dispatchEvent(new CustomEvent('auth:expired'));
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || 'Session expired. Please log in again.');
  }

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (data: any) => request<{ token: string; user: any }>('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<{ user: any }>('/api/auth/me'),
  changePassword: (data: any) => request('/api/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),

  // Dashboard
  getDashboardStats: () => request<DashboardStats>('/api/dashboard/stats'),

  // Metadata
  getBusinessTypes: () => request<BusinessType[]>('/api/business-types'),
  createBusinessType: (name: string) => request<{ success: boolean; id: number; name: string }>('/api/business-types', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteBusinessType: (id: number) => request(`/api/business-types/${id}`, { method: 'DELETE' }),

  getWebsiteTypes: () => request<WebsiteType[]>('/api/website-types'),
  createWebsiteType: (name: string) => request<{ success: boolean; id: number; name: string }>('/api/website-types', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteWebsiteType: (id: number) => request(`/api/website-types/${id}`, { method: 'DELETE' }),

  // Customers
  getCustomers: (params: Record<string, string | number | boolean | undefined>) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== '') {
        query.append(key, String(val));
      }
    });
    return request<{ data: Customer[]; pagination: Pagination }>(`/api/customers?${query.toString()}`);
  },
  getCustomer: (id: number) => request<{
    customer: Customer;
    notes: CallNote[];
    calls: CallSchedule[];
    payments: Payment[];
    receipts: Receipt[];
    photos: UploadedPhoto[];
    activities: CustomerActivity[];
  }>(`/api/customers/${id}`),
  createCustomer: (data: Partial<Customer>) => request<{ success: boolean; message: string; customer_id: number; inquiry_id: string; receipt_number?: string }>('/api/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: number, data: Partial<Customer>) => request<{ success: boolean; message: string }>(`/api/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  quickStatusUpdate: (id: number, status: string) => request<{ success: boolean; newStatus: string }>(`/api/customers/${id}/quick-status`, { method: 'POST', body: JSON.stringify({ status }) }),
  softDeleteCustomer: (id: number) => request<{ success: boolean; message: string }>(`/api/customers/${id}`, { method: 'DELETE' }),
  restoreCustomer: (id: number) => request<{ success: boolean; message: string }>(`/api/customers/${id}/restore`, { method: 'POST' }),
  permanentDeleteCustomer: (id: number) => request<{ success: boolean; message: string }>(`/api/customers/${id}/permanent`, { method: 'DELETE' }),

  // Call Notes & Schedules
  addCallNote: (customerId: number, data: { call_result: string; note_text: string; next_follow_up_date?: string; next_follow_up_time?: string; new_status?: string }) =>
    request<{ success: boolean; message: string }>(`/api/customers/${customerId}/notes`, { method: 'POST', body: JSON.stringify(data) }),
  getCalls: (filter: 'today' | 'upcoming' | 'overdue' | 'completed' | 'cancelled' | 'all') => request<CallSchedule[]>(`/api/calls?filter=${filter}`),
  scheduleCall: (data: { customer_id: number; scheduled_date: string; scheduled_time?: string; reminder_note?: string }) =>
    request<{ success: boolean; message: string }>('/api/calls', { method: 'POST', body: JSON.stringify(data) }),
  updateCallStatus: (callId: number, data: Partial<CallSchedule>) =>
    request<{ success: boolean; message: string }>(`/api/calls/${callId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Payments & Receipts
  recordPayment: (customerId: number, data: { amount: number; payment_method: string; transaction_ref?: string; note?: string }) =>
    request<{ success: boolean; message: string; receipt_number: string; receipt_id: number }>(`/api/customers/${customerId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  getReceipt: (receiptId: number) => request<Receipt>(`/api/receipts/${receiptId}`),

  // Photos
  uploadPhotos: (customerId: number, formData: FormData) =>
    request<{ success: boolean; photos: UploadedPhoto[] }>(`/api/customers/${customerId}/photos`, { method: 'POST', body: formData }),
  deletePhoto: (photoId: number) => request<{ success: boolean }>(`/api/photos/${photoId}`, { method: 'DELETE' }),

  // Audit Logs & Export & Seed
  getAuditLogs: (page = 1) => request<{ data: AuditLog[]; total: number; page: number; totalPages: number }>(`/api/audit-logs?page=${page}`),
  seedBenchmark: (count: number) => request<{ success: boolean; message: string; current_total: number }>('/api/test/generate-records', { method: 'POST', body: JSON.stringify({ count }) }),

  // ULTRA FEATURE 01 & 02: AI Lead Scoring & AI Follow-up Assistant
  calculateAiScore: (id: number) => request<{ success: boolean; lead_score: number; lead_temperature: 'Hot' | 'Warm' | 'Cold'; factors: any[] }>(`/api/customers/${id}/ai-score`, { method: 'POST' }),
  overrideAiScore: (id: number, data: { score: number; temperature: string; reason?: string }) => request<{ success: boolean; lead_score: number; lead_temperature: string }>(`/api/customers/${id}/override-score`, { method: 'PUT', body: JSON.stringify(data) }),
  getAiAssistant: (id: number) => request<{
    success: boolean;
    suggested_followup_date: string;
    suggested_message: string;
    talking_points: string[];
    next_action: string;
    summary: string;
  }>(`/api/customers/${id}/ai-assistant`, { method: 'POST' }),

  // ULTRA FEATURE 06: Quotations
  getQuotations: (params?: { customer_id?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.customer_id) q.append('customer_id', String(params.customer_id));
    if (params?.search) q.append('search', params.search);
    return request<any[]>(`/api/quotations?${q.toString()}`);
  },
  createQuotation: (data: any) => request<{ success: boolean; id: number; quotation_number: string; total_amount: number }>('/api/quotations', { method: 'POST', body: JSON.stringify(data) }),
  getQuotation: (id: number) => request<any>(`/api/quotations/${id}`),
  updateQuotation: (id: number, data: any) => request<{ success: boolean }>(`/api/quotations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuotation: (id: number) => request<{ success: boolean }>(`/api/quotations/${id}`, { method: 'DELETE' }),

  // ULTRA FEATURE 07: Invoices
  getInvoices: (params?: { customer_id?: number }) => {
    const q = new URLSearchParams();
    if (params?.customer_id) q.append('customer_id', String(params.customer_id));
    return request<any[]>(`/api/invoices?${q.toString()}`);
  },
  createInvoice: (data: any) => request<{ success: boolean; id: number; invoice_number: string; status: string }>('/api/invoices', { method: 'POST', body: JSON.stringify(data) }),
  getInvoice: (id: number) => request<any>(`/api/invoices/${id}`),
  deleteInvoice: (id: number) => request<{ success: boolean }>(`/api/invoices/${id}`, { method: 'DELETE' }),

  // ULTRA FEATURE 04 & 05: WhatsApp Templates
  getWhatsAppTemplates: () => request<any[]>('/api/whatsapp-templates'),
  createWhatsAppTemplate: (data: { title: string; category?: string; template_body: string }) => request<{ success: boolean; id: number }>('/api/whatsapp-templates', { method: 'POST', body: JSON.stringify(data) }),
  updateWhatsAppTemplate: (id: number, data: Partial<{ title: string; category: string; template_body: string }>) => request<{ success: boolean }>(`/api/whatsapp-templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWhatsAppTemplate: (id: number) => request<{ success: boolean }>(`/api/whatsapp-templates/${id}`, { method: 'DELETE' }),

  // ULTRA FEATURE 03: Smart Reminders
  getReminders: (params?: { timeframe?: 'all' | 'due_now' | 'upcoming' | 'overdue'; customer_id?: number }) => {
    const q = new URLSearchParams();
    if (params?.timeframe) q.append('timeframe', params.timeframe);
    if (params?.customer_id) q.append('customer_id', String(params.customer_id));
    return request<any[]>(`/api/reminders?${q.toString()}`);
  },
  createReminder: (data: any) => request<{ success: boolean; id: number }>('/api/reminders', { method: 'POST', body: JSON.stringify(data) }),
  updateReminder: (id: number, status: string) => request<{ success: boolean }>(`/api/reminders/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteReminder: (id: number) => request<{ success: boolean }>(`/api/reminders/${id}`, { method: 'DELETE' }),

  // ULTRA FEATURE 15: Saved Filters
  getSavedFilters: () => request<any[]>('/api/saved-filters'),
  createSavedFilter: (name: string, filter_params: any) => request<{ success: boolean; id: number }>('/api/saved-filters', { method: 'POST', body: JSON.stringify({ name, filter_params }) }),
  deleteSavedFilter: (id: number) => request<{ success: boolean }>(`/api/saved-filters/${id}`, { method: 'DELETE' }),

  // ULTRA FEATURE 55: Customer Notes
  getCustomerNotes: (customerId: number) => request<any[]>(`/api/customers/${customerId}/notes`),
  createCustomerNote: (customerId: number, data: { category: string; content: string }) => request<{ success: boolean; id: number }>(`/api/customers/${customerId}/notes`, { method: 'POST', body: JSON.stringify(data) }),
  deleteCustomerNote: (customerId: number, noteId: number) => request<{ success: boolean }>(`/api/customers/${customerId}/notes/${noteId}`, { method: 'DELETE' }),

  // ULTRA FEATURE 12: Customer 360 Timeline
  getTimeline360: (customerId: number) => request<any[]>(`/api/customers/${customerId}/timeline-360`),

  // ULTRA FEATURE 13: Duplicate Detection & Merge
  checkDuplicate: (data: { phone?: string; email?: string; business_name?: string; name?: string; exclude_id?: number }) =>
    request<{ has_duplicate: boolean; duplicates: any[] }>('/api/customers/check-duplicate', { method: 'POST', body: JSON.stringify(data) }),
  mergeCustomers: (primary_id: number, secondary_id: number) =>
    request<{ success: boolean; message: string }>('/api/customers/merge', { method: 'POST', body: JSON.stringify({ primary_id, secondary_id }) }),

  // ULTRA FEATURE 16, 17, 18: Bulk Actions & Import
  bulkAction: (customer_ids: number[], action: string, payload?: any) =>
    request<{ success: boolean; count: number; action: string }>('/api/customers/bulk-action', { method: 'POST', body: JSON.stringify({ customer_ids, action, payload }) }),
  bulkImport: (rows: any[]) =>
    request<{ success: boolean; imported_count: number; skipped_count: number; skipped_rows: any[] }>('/api/customers/bulk-import', { method: 'POST', body: JSON.stringify({ rows }) }),

  // ULTRA FEATURE 10, 11, 37: Analytics
  getRevenueAnalytics: () => request<any>('/api/analytics/revenue'),
  getFunnelAnalytics: () => request<{ totalCustomers: number; funnel: any[] }>('/api/analytics/funnel'),
  getCallAnalytics: () => request<{ totalCalls: number; outcomes: any[]; trends: any[] }>('/api/analytics/calls'),

  // ULTRA FEATURE 29: System Health
  getSystemHealth: () => request<any>('/api/system/health')
};

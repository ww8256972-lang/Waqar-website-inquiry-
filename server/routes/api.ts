import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import {
  dbAll,
  dbGet,
  dbRun,
  dbExec,
  dbBulkRun,
  persistDatabase
} from '../db/database.ts';
import {
  requireAuth,
  generateToken,
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginAttempts,
  AuthenticatedRequest
} from '../middleware/auth.ts';

export const apiRouter = express.Router();

let geminiClient: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI();
  }
} catch {
  // Graceful fallback to deterministic AI heuristics
}

// File upload configuration
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `customer-photo-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMime.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

// Helper for audit logging
function logAudit(admin: string, action: string, targetType: string, targetId: string, details: string, ip: string = '') {
  try {
    dbRun(
      'INSERT INTO audit_logs (admin_username, action, target_type, target_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
      [admin, action, targetType, targetId, details, ip]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// -----------------------------------------------------------------------------
// AUTHENTICATION ROUTES
// -----------------------------------------------------------------------------

apiRouter.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  const rateCheck = checkLoginRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Too many failed attempts. Account locked temporarily for security. Please try again in ${rateCheck.waitMinutes} minute(s).`
    });
  }

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = dbGet<{ id: number; username: string; password_hash: string; role: string }>(
    'SELECT * FROM users WHERE LOWER(username) = LOWER(?)',
    [username.trim()]
  );

  if (!user) {
    recordFailedLogin(clientIp);
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const passwordMatches = bcrypt.compareSync(password, user.password_hash);
  if (!passwordMatches) {
    recordFailedLogin(clientIp);
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  resetLoginAttempts(clientIp);

  const token = generateToken({ id: user.id, username: user.username, role: user.role });

  logAudit(user.username, 'LOGIN', 'USER', String(user.id), 'Admin user logged in successfully', clientIp);

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  });
});

apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const user = dbGet<{ id: number; username: string; role: string; created_at: string }>(
    'SELECT id, username, role, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

apiRouter.post('/auth/change-password', requireAuth, (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
  }

  const user = dbGet<{ id: number; username: string; password_hash: string }>(
    'SELECT * FROM users WHERE id = ?',
    [req.user!.id]
  );
  if (!user) return res.status(404).json({ error: 'User not found' });

  const valid = bcrypt.compareSync(currentPassword, user.password_hash);
  if (!valid) {
    return res.status(400).json({ error: 'Current password does not match.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPassword, salt);

  dbRun('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?', [newHash, user.id]);

  logAudit(user.username, 'PASSWORD_CHANGE', 'USER', String(user.id), 'Admin password updated', req.ip || '');

  res.json({ success: true, message: 'Password changed successfully.' });
});

apiRouter.post('/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully.' });
});

// -----------------------------------------------------------------------------
// DASHBOARD ANALYTICS (Server-side fast SQL queries)
// -----------------------------------------------------------------------------

apiRouter.get('/dashboard/stats', requireAuth, (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Customer counts
    const totalCust = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL') || { count: 0 };
    const newInquiries = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL AND (status = "New" OR inquiry_date = ?)', [today]) || { count: 0 };
    const todayFollowUps = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL AND follow_up_date = ?', [today]) || { count: 0 };

    // Status breakdown
    const statusCounts = dbAll<{ status: string; count: number }>(`
      SELECT status, COUNT(*) as count
      FROM customers
      WHERE deleted_at IS NULL
      GROUP BY status
    `);

    const statusMap: Record<string, number> = {};
    statusCounts.forEach(s => {
      statusMap[s.status] = s.count;
    });

    // Calls stats
    const todayCalls = dbGet<{ count: number }>(`
      SELECT COUNT(*) as count FROM call_schedules
      WHERE scheduled_date = ? AND status != 'cancelled'
    `, [today]) || { count: 0 };

    const upcomingCalls = dbGet<{ count: number }>(`
      SELECT COUNT(*) as count FROM call_schedules
      WHERE scheduled_date > ? AND status = 'scheduled'
    `, [today]) || { count: 0 };

    const overdueCalls = dbGet<{ count: number }>(`
      SELECT COUNT(*) as count FROM call_schedules
      WHERE scheduled_date < ? AND status = 'scheduled'
    `, [today]) || { count: 0 };

    // Financial totals (Computed on Server)
    const financials = dbGet<{ total_revenue: number; total_paid: number; total_remaining: number }>(`
      SELECT
        COALESCE(SUM(total_price), 0) as total_revenue,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(remaining_amount), 0) as total_remaining
      FROM customers
      WHERE deleted_at IS NULL AND status != 'Cancelled'
    `) || { total_revenue: 0, total_paid: 0, total_remaining: 0 };

    // Recent 5 inquiries
    const recentInquiries = dbAll(`
      SELECT c.id, c.inquiry_id, c.name, c.phone, c.business_name, c.status, c.total_price, c.created_at,
             b.name as business_type_name
      FROM customers c
      LEFT JOIN business_types b ON c.business_type_id = b.id
      WHERE c.deleted_at IS NULL
      ORDER BY c.id DESC
      LIMIT 5
    `);

    // Recent 5 activities
    const recentActivities = dbAll(`
      SELECT a.*, c.name as customer_name
      FROM customer_activity a
      JOIN customers c ON a.customer_id = c.id
      ORDER BY a.id DESC
      LIMIT 6
    `);

    res.json({
      totalCustomers: totalCust.count,
      newInquiries: newInquiries.count,
      todayFollowUps: todayFollowUps.count,
      todayCalls: todayCalls.count,
      upcomingCalls: upcomingCalls.count,
      overdueCalls: overdueCalls.count,
      interested: statusMap['Interested'] || 0,
      callBack: statusMap['Call Back'] || 0,
      agreed: statusMap['Agreed'] || 0,
      notInterested: statusMap['Not Interested'] || 0,
      pending: statusMap['Pending'] || 0,
      successProjects: statusMap['Success'] || 0,
      cancelledProjects: statusMap['Cancelled'] || 0,
      totalRevenue: financials.total_revenue,
      totalPaid: financials.total_paid,
      pendingPayments: financials.total_remaining,
      recentInquiries,
      recentActivities
    });
  } catch (err: any) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to calculate dashboard statistics' });
  }
});

// -----------------------------------------------------------------------------
// CUSTOMER MANAGEMENT (Search, Filters, Pagination, CRUD, Soft-Delete)
// -----------------------------------------------------------------------------

apiRouter.get('/customers', requireAuth, (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(10, parseInt(req.query.limit as string) || 25));
    const offset = (page - 1) * limit;

    const search = ((req.query.search as string) || '').trim();
    const status = (req.query.status as string) || '';
    const businessTypeId = req.query.business_type_id ? parseInt(req.query.business_type_id as string) : null;
    const websiteTypeId = req.query.website_type_id ? parseInt(req.query.website_type_id as string) : null;
    const paymentStatus = (req.query.payment_status as string) || '';
    const followUp = (req.query.follow_up as string) || ''; // 'today' | 'upcoming' | 'overdue'
    const isTrash = req.query.trash === 'true';
    const sortBy = (req.query.sort_by as string) || 'id';
    const order = ((req.query.order as string) || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const whereClauses: string[] = [];
    const params: any[] = [];

    // Trash condition
    if (isTrash) {
      whereClauses.push('c.deleted_at IS NOT NULL');
    } else {
      whereClauses.push('c.deleted_at IS NULL');
    }

    // Search condition
    if (search) {
      const searchPattern = `%${search}%`;
      whereClauses.push(`(
        c.name LIKE ? OR
        c.phone LIKE ? OR
        c.business_name LIKE ? OR
        c.inquiry_id LIKE ? OR
        c.website_name LIKE ? OR
        c.notes LIKE ?
      )`);
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (status) {
      whereClauses.push('c.status = ?');
      params.push(status);
    }

    if (businessTypeId) {
      whereClauses.push('c.business_type_id = ?');
      params.push(businessTypeId);
    }

    if (websiteTypeId) {
      whereClauses.push('c.website_type_id = ?');
      params.push(websiteTypeId);
    }

    if (paymentStatus) {
      whereClauses.push('c.payment_status = ?');
      params.push(paymentStatus);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (followUp === 'today') {
      whereClauses.push('c.follow_up_date = ?');
      params.push(todayStr);
    } else if (followUp === 'upcoming') {
      whereClauses.push('c.follow_up_date > ?');
      params.push(todayStr);
    } else if (followUp === 'overdue') {
      whereClauses.push('(c.follow_up_date < ? AND c.status NOT IN ("Success", "Cancelled"))');
      params.push(todayStr);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Total Count
    const countRow = dbGet<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM customers c
      ${whereSql}
    `, params);
    const total = countRow?.count || 0;

    // Allowed sort columns
    const allowedSortCols: Record<string, string> = {
      id: 'c.id',
      name: 'c.name',
      phone: 'c.phone',
      business_name: 'c.business_name',
      status: 'c.status',
      total_price: 'c.total_price',
      remaining_amount: 'c.remaining_amount',
      follow_up_date: 'c.follow_up_date',
      created_at: 'c.created_at'
    };
    const sortCol = allowedSortCols[sortBy] || 'c.id';

    // Query Data with join
    const selectSql = `
      SELECT
        c.*,
        b.name as business_type_name,
        w.name as website_type_name
      FROM customers c
      LEFT JOIN business_types b ON c.business_type_id = b.id
      LEFT JOIN website_types w ON c.website_type_id = w.id
      ${whereSql}
      ORDER BY ${sortCol} ${order}
      LIMIT ? OFFSET ?
    `;

    const customers = dbAll(selectSql, [...params, limit, offset]);

    res.json({
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: any) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Failed to retrieve customers' });
  }
});

apiRouter.post('/customers', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const {
      name,
      phone,
      business_name,
      business_type_id,
      address,
      website_type_id,
      website_name,
      quoted_price,
      total_price,
      advance_payment,
      status,
      follow_up_date,
      follow_up_time,
      notes
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Customer phone number is required.' });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const cleanName = name.trim();
    const qPrice = Math.max(0, parseFloat(quoted_price) || 0);
    const tPrice = Math.max(0, parseFloat(total_price) || qPrice);
    const advPayment = Math.max(0, parseFloat(advance_payment) || 0);
    const paidAmount = advPayment;
    const remainingAmount = Math.max(0, tPrice - paidAmount);

    let paymentStatus = 'pending';
    if (paidAmount >= tPrice && tPrice > 0) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partial';
    }

    const currentStatus = status || 'New';
    const todayStr = new Date().toISOString().split('T')[0];

    // Generate unique inquiry ID
    const countRecord = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM customers') || { count: 0 };
    const inquiryId = `WWI-2026-${String(countRecord.count + 1).padStart(4, '0')}`;

    // Insert customer
    const insertRes = dbRun(`
      INSERT INTO customers (
        inquiry_id, name, phone, business_name, business_type_id, address,
        website_type_id, website_name, quoted_price, total_price, advance_payment,
        paid_amount, remaining_amount, payment_status, status, inquiry_date,
        follow_up_date, follow_up_time, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      inquiryId, cleanName, cleanPhone, business_name || null, business_type_id || null, address || null,
      website_type_id || null, website_name || null, qPrice, tPrice, advPayment,
      paidAmount, remainingAmount, paymentStatus, currentStatus, todayStr,
      follow_up_date || null, follow_up_time || null, notes || null
    ]);

    const customerId = insertRes.lastInsertRowid;

    // Log customer activity
    dbRun(`
      INSERT INTO customer_activity (customer_id, activity_type, title, description)
      VALUES (?, 'inquiry_created', 'Customer Created', ?)
    `, [customerId, `Customer ${cleanName} added with status: ${currentStatus}`]);

    // If advance payment was made, create payment and receipt automatically
    let receiptNumber = null;
    if (advPayment > 0) {
      const payIdStr = `PAY-${customerId}-001`;
      const payRes = dbRun(`
        INSERT INTO payments (payment_id_str, customer_id, amount, payment_method, payment_date, transaction_ref, note, created_by)
        VALUES (?, ?, ?, 'Cash', date('now'), 'ADVANCE-TOKEN', 'Advance payment upon inquiry registration', ?)
      `, [payIdStr, customerId, advPayment, req.user?.username || 'admin']);

      receiptNumber = `WWI-REC-2026-${String(customerId).padStart(5, '0')}`;
      dbRun(`
        INSERT INTO receipts (receipt_number, customer_id, payment_id, amount, total_amount, paid_amount, remaining_amount, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, date('now'))
      `, [receiptNumber, customerId, payRes.lastInsertRowid, advPayment, tPrice, paidAmount, remainingAmount]);

      dbRun(`
        INSERT INTO customer_activity (customer_id, activity_type, title, description)
        VALUES (?, 'payment_received', 'Advance Payment Received', ?)
      `, [customerId, `Received advance token ₹${advPayment.toLocaleString()} (Receipt: ${receiptNumber})`]);
    }

    // Schedule call if follow up set
    if (follow_up_date) {
      dbRun(`
        INSERT INTO call_schedules (customer_id, phone, scheduled_date, scheduled_time, reminder_note, status)
        VALUES (?, ?, ?, ?, ?, 'scheduled')
      `, [customerId, cleanPhone, follow_up_date, follow_up_time || '11:00', notes || 'Follow-up call']);
    }

    logAudit(req.user?.username || 'admin', 'CREATE_CUSTOMER', 'CUSTOMER', String(customerId), `Added ${cleanName} (${cleanPhone})`, req.ip || '');

    return res.status(201).json({
      success: true,
      message: 'Customer saved successfully.',
      customer_id: customerId,
      inquiry_id: inquiryId,
      receipt_number: receiptNumber
    });
  } catch (err: any) {
    console.error('Error creating customer:', err);
    return res.status(500).json({ error: 'Customer could not be saved. Please try again.' });
  }
});

apiRouter.get('/customers/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const customer = dbGet(`
      SELECT
        c.*,
        b.name as business_type_name,
        w.name as website_type_name
      FROM customers c
      LEFT JOIN business_types b ON c.business_type_id = b.id
      LEFT JOIN website_types w ON c.website_type_id = w.id
      WHERE c.id = ?
    `, [id]);

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const notes = dbAll('SELECT * FROM call_notes WHERE customer_id = ? ORDER BY id DESC', [id]);
    const calls = dbAll('SELECT * FROM call_schedules WHERE customer_id = ? ORDER BY id DESC', [id]);
    const payments = dbAll('SELECT * FROM payments WHERE customer_id = ? ORDER BY id DESC', [id]);
    const receipts = dbAll('SELECT * FROM receipts WHERE customer_id = ? ORDER BY id DESC', [id]);
    const photos = dbAll('SELECT * FROM uploaded_files WHERE customer_id = ? ORDER BY id DESC', [id]);
    const activities = dbAll('SELECT * FROM customer_activity WHERE customer_id = ? ORDER BY id DESC', [id]);

    res.json({
      customer,
      notes,
      calls,
      payments,
      receipts,
      photos,
      activities
    });
  } catch (err: any) {
    console.error('Error fetching customer profile:', err);
    res.status(500).json({ error: 'Failed to fetch customer profile' });
  }
});

apiRouter.put('/customers/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = dbGet<{ id: number; name: string; status: string; total_price: number; paid_amount: number }>(
      'SELECT id, name, status, total_price, paid_amount FROM customers WHERE id = ?',
      [id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const {
      name,
      phone,
      business_name,
      business_type_id,
      address,
      website_type_id,
      website_name,
      quoted_price,
      total_price,
      status,
      follow_up_date,
      follow_up_time,
      notes
    } = req.body;

    const tPrice = total_price !== undefined ? Math.max(0, parseFloat(total_price) || 0) : existing.total_price;
    const paidAmount = existing.paid_amount;
    const remainingAmount = Math.max(0, tPrice - paidAmount);

    let paymentStatus = 'pending';
    if (paidAmount >= tPrice && tPrice > 0) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partial';
    }

    dbRun(`
      UPDATE customers SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        business_name = COALESCE(?, business_name),
        business_type_id = ?,
        address = COALESCE(?, address),
        website_type_id = ?,
        website_name = COALESCE(?, website_name),
        quoted_price = COALESCE(?, quoted_price),
        total_price = ?,
        remaining_amount = ?,
        payment_status = ?,
        status = COALESCE(?, status),
        follow_up_date = ?,
        follow_up_time = ?,
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
      WHERE id = ?
    `, [
      name?.trim(),
      phone?.trim(),
      business_name,
      business_type_id !== undefined ? business_type_id : null,
      address,
      website_type_id !== undefined ? website_type_id : null,
      website_name,
      quoted_price !== undefined ? parseFloat(quoted_price) : null,
      tPrice,
      remainingAmount,
      paymentStatus,
      status,
      follow_up_date || null,
      follow_up_time || null,
      notes,
      id
    ]);

    // If status changed, record in activity timeline
    if (status && status !== existing.status) {
      dbRun(`
        INSERT INTO customer_activity (customer_id, activity_type, title, description)
        VALUES (?, 'status_change', 'Status Updated', ?)
      `, [id, `Status changed from ${existing.status} to ${status}`]);
    }

    logAudit(req.user?.username || 'admin', 'UPDATE_CUSTOMER', 'CUSTOMER', String(id), `Updated customer ${name || existing.name}`, req.ip || '');

    res.json({ success: true, message: 'Customer updated successfully.' });
  } catch (err: any) {
    console.error('Error updating customer:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// One-tap quick status update
apiRouter.post('/customers/:id/quick-status', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    const customer = dbGet<{ id: number; name: string; status: string }>('SELECT id, name, status FROM customers WHERE id = ?', [id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const prevStatus = customer.status;
    dbRun('UPDATE customers SET status = ?, updated_at = datetime("now") WHERE id = ?', [status, id]);

    dbRun(`
      INSERT INTO customer_activity (customer_id, activity_type, title, description)
      VALUES (?, 'status_change', 'One-Tap Status Changed', ?)
    `, [id, `Changed from "${prevStatus}" to "${status}"`]);

    logAudit(req.user?.username || 'admin', 'STATUS_CHANGE', 'CUSTOMER', String(id), `${prevStatus} → ${status}`, req.ip || '');

    res.json({ success: true, newStatus: status });
  } catch (err: any) {
    console.error('Error updating quick status:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Soft Delete (move to Trash)
apiRouter.delete('/customers/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const customer = dbGet<{ id: number; name: string }>('SELECT id, name FROM customers WHERE id = ?', [id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    dbRun('UPDATE customers SET deleted_at = datetime("now"), deleted_by = ? WHERE id = ?', [req.user?.username || 'admin', id]);

    dbRun(`
      INSERT INTO customer_activity (customer_id, activity_type, title, description)
      VALUES (?, 'soft_delete', 'Customer Moved to Trash', ?)
    `, [id, `Soft-deleted by ${req.user?.username || 'admin'}`]);

    logAudit(req.user?.username || 'admin', 'SOFT_DELETE_CUSTOMER', 'CUSTOMER', String(id), `Moved ${customer.name} to trash`, req.ip || '');

    res.json({ success: true, message: 'Customer moved to trash.' });
  } catch (err: any) {
    console.error('Error soft deleting customer:', err);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// Restore from Trash
apiRouter.post('/customers/:id/restore', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const customer = dbGet<{ id: number; name: string }>('SELECT id, name FROM customers WHERE id = ?', [id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    dbRun('UPDATE customers SET deleted_at = NULL, deleted_by = NULL WHERE id = ?', [id]);

    dbRun(`
      INSERT INTO customer_activity (customer_id, activity_type, title, description)
      VALUES (?, 'restore', 'Customer Restored', 'Restored from trash')
    `, [id]);

    logAudit(req.user?.username || 'admin', 'RESTORE_CUSTOMER', 'CUSTOMER', String(id), `Restored ${customer.name}`, req.ip || '');

    res.json({ success: true, message: 'Customer restored successfully.' });
  } catch (err: any) {
    console.error('Error restoring customer:', err);
    res.status(500).json({ error: 'Failed to restore customer' });
  }
});

// Permanent Delete
apiRouter.delete('/customers/:id/permanent', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const customer = dbGet<{ id: number; name: string }>('SELECT id, name FROM customers WHERE id = ?', [id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    // Clean up uploaded image files
    const photos = dbAll<{ file_path: string }>('SELECT file_path FROM uploaded_files WHERE customer_id = ?', [id]);
    photos.forEach(p => {
      try {
        if (fs.existsSync(p.file_path)) fs.unlinkSync(p.file_path);
      } catch (e) {
        console.warn('Failed unlinking file', p.file_path, e);
      }
    });

    // Delete cascading
    dbRun('DELETE FROM customers WHERE id = ?', [id]);

    logAudit(req.user?.username || 'admin', 'PERMANENT_DELETE_CUSTOMER', 'CUSTOMER', String(id), `Permanently removed ${customer.name}`, req.ip || '');

    res.json({ success: true, message: 'Customer permanently deleted.' });
  } catch (err: any) {
    console.error('Error permanent deleting customer:', err);
    res.status(500).json({ error: 'Failed to delete customer permanently' });
  }
});

// -----------------------------------------------------------------------------
// CALL NOTES & SCHEDULE
// -----------------------------------------------------------------------------

apiRouter.post('/customers/:id/notes', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const { call_result, note_text, next_follow_up_date, next_follow_up_time, new_status } = req.body;

    if (!note_text || !note_text.trim()) {
      return res.status(400).json({ error: 'Note text cannot be empty.' });
    }

    dbRun(`
      INSERT INTO call_notes (customer_id, admin_id, call_result, note_text, next_follow_up_date, next_follow_up_time, new_status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      customerId,
      req.user?.id || 1,
      call_result || 'Call made',
      note_text.trim(),
      next_follow_up_date || null,
      next_follow_up_time || null,
      new_status || null
    ]);

    // Update customer status and follow up if provided
    if (new_status || next_follow_up_date) {
      dbRun(`
        UPDATE customers SET
          status = COALESCE(?, status),
          follow_up_date = COALESCE(?, follow_up_date),
          follow_up_time = COALESCE(?, follow_up_time),
          updated_at = datetime('now')
        WHERE id = ?
      `, [new_status || null, next_follow_up_date || null, next_follow_up_time || null, customerId]);
    }

    // Schedule next call if date provided
    if (next_follow_up_date) {
      const cust = dbGet<{ phone: string }>('SELECT phone FROM customers WHERE id = ?', [customerId]);
      dbRun(`
        INSERT INTO call_schedules (customer_id, phone, scheduled_date, scheduled_time, reminder_note, status)
        VALUES (?, ?, ?, ?, ?, 'scheduled')
      `, [customerId, cust?.phone || '', next_follow_up_date, next_follow_up_time || '11:00', note_text.trim()]);
    }

    // Add activity record
    dbRun(`
      INSERT INTO customer_activity (customer_id, activity_type, title, description)
      VALUES (?, 'call_note', 'Call Logged', ?)
    `, [customerId, `${call_result || 'Call made'}: ${note_text.trim()}`]);

    res.json({ success: true, message: 'Call note saved permanently.' });
  } catch (err: any) {
    console.error('Error saving call note:', err);
    res.status(500).json({ error: 'Failed to save call note' });
  }
});

apiRouter.get('/calls', requireAuth, (req, res) => {
  try {
    const filter = (req.query.filter as string) || 'all';
    const today = new Date().toISOString().split('T')[0];

    let whereClause = '';
    const params: any[] = [];

    if (filter === 'today') {
      whereClause = 'WHERE cs.scheduled_date = ? AND cs.status != "cancelled"';
      params.push(today);
    } else if (filter === 'upcoming') {
      whereClause = 'WHERE cs.scheduled_date > ? AND cs.status = "scheduled"';
      params.push(today);
    } else if (filter === 'overdue') {
      whereClause = 'WHERE cs.scheduled_date < ? AND cs.status = "scheduled"';
      params.push(today);
    } else if (filter === 'completed') {
      whereClause = 'WHERE cs.status = "completed"';
    } else if (filter === 'cancelled') {
      whereClause = 'WHERE cs.status = "cancelled"';
    }

    const calls = dbAll(`
      SELECT
        cs.*,
        c.name as customer_name,
        c.business_name,
        c.status as customer_status,
        c.inquiry_id
      FROM call_schedules cs
      JOIN customers c ON cs.customer_id = c.id
      ${whereClause}
      ORDER BY cs.scheduled_date ASC, cs.scheduled_time ASC
      LIMIT 100
    `, params);

    res.json(calls);
  } catch (err: any) {
    console.error('Error fetching calls:', err);
    res.status(500).json({ error: 'Failed to fetch scheduled calls' });
  }
});

apiRouter.post('/calls', requireAuth, (req, res) => {
  try {
    const { customer_id, scheduled_date, scheduled_time, reminder_note } = req.body;
    if (!customer_id || !scheduled_date) {
      return res.status(400).json({ error: 'Customer and scheduled date are required.' });
    }

    const customer = dbGet<{ id: number; name: string; phone: string }>('SELECT id, name, phone FROM customers WHERE id = ?', [customer_id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    dbRun(`
      INSERT INTO call_schedules (customer_id, phone, scheduled_date, scheduled_time, reminder_note, status)
      VALUES (?, ?, ?, ?, ?, 'scheduled')
    `, [customer_id, customer.phone, scheduled_date, scheduled_time || '11:00', reminder_note || 'Scheduled follow-up']);

    dbRun(`
      UPDATE customers SET follow_up_date = ?, follow_up_time = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [scheduled_date, scheduled_time || '11:00', customer_id]);

    dbRun(`
      INSERT INTO customer_activity (customer_id, activity_type, title, description)
      VALUES (?, 'call_scheduled', 'Call Scheduled', ?)
    `, [customer_id, `Call scheduled for ${scheduled_date} at ${scheduled_time || '11:00'}`]);

    res.json({ success: true, message: 'Call scheduled successfully.' });
  } catch (err: any) {
    console.error('Error creating call schedule:', err);
    res.status(500).json({ error: 'Failed to schedule call' });
  }
});

apiRouter.patch('/calls/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, scheduled_date, scheduled_time, reminder_note } = req.body;

    const call = dbGet<{ id: number; customer_id: number; scheduled_date: string }>('SELECT * FROM call_schedules WHERE id = ?', [id]);
    if (!call) return res.status(404).json({ error: 'Call schedule not found' });

    dbRun(`
      UPDATE call_schedules SET
        status = COALESCE(?, status),
        scheduled_date = COALESCE(?, scheduled_date),
        scheduled_time = COALESCE(?, scheduled_time),
        reminder_note = COALESCE(?, reminder_note),
        updated_at = datetime('now')
      WHERE id = ?
    `, [status || null, scheduled_date || null, scheduled_time || null, reminder_note || null, id]);

    if (status) {
      dbRun(`
        INSERT INTO customer_activity (customer_id, activity_type, title, description)
        VALUES (?, 'call_updated', 'Call Status Changed', ?)
      `, [call.customer_id, `Call on ${call.scheduled_date} marked as ${status}`]);
    }

    res.json({ success: true, message: 'Call schedule updated successfully.' });
  } catch (err: any) {
    console.error('Error updating call schedule:', err);
    res.status(500).json({ error: 'Failed to update call schedule' });
  }
});

// -----------------------------------------------------------------------------
// PAYMENTS & RECEIPTS
// -----------------------------------------------------------------------------

apiRouter.post('/customers/:id/payments', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const customerId = parseInt(req.params.id);
    const { amount, payment_method, transaction_ref, note } = req.body;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid payment amount.' });
    }

    const customer = dbGet<{ id: number; name: string; total_price: number; paid_amount: number; phone: string; business_name: string }>(
      'SELECT id, name, total_price, paid_amount, phone, business_name FROM customers WHERE id = ?',
      [customerId]
    );

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Calculations enforced strictly on server
    const newPaidAmount = customer.paid_amount + numAmount;
    const newRemainingAmount = Math.max(0, customer.total_price - newPaidAmount);

    let paymentStatus = 'partial';
    if (newPaidAmount >= customer.total_price && customer.total_price > 0) {
      paymentStatus = 'paid';
    }

    // Generate unique payment ID and receipt number
    const payCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM payments WHERE customer_id = ?', [customerId]) || { count: 0 };
    const payIdStr = `PAY-${customerId}-${String(payCount.count + 1).padStart(3, '0')}`;
    const allReceiptsCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM receipts') || { count: 0 };
    const receiptNum = `WWI-REC-2026-${String(allReceiptsCount.count + 1).padStart(5, '0')}`;

    // Atomically execute payment, customer update, receipt and activity
    const payRes = dbRun(`
      INSERT INTO payments (payment_id_str, customer_id, amount, payment_method, payment_date, transaction_ref, note, created_by)
      VALUES (?, ?, ?, ?, date('now'), ?, ?, ?)
    `, [payIdStr, customerId, numAmount, payment_method || 'Cash', transaction_ref || null, note || null, req.user?.username || 'admin']);

    dbRun(`
      UPDATE customers SET
        paid_amount = ?,
        remaining_amount = ?,
        payment_status = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `, [newPaidAmount, newRemainingAmount, paymentStatus, customerId]);

    const receiptRes = dbRun(`
      INSERT INTO receipts (receipt_number, customer_id, payment_id, amount, total_amount, paid_amount, remaining_amount, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, date('now'))
    `, [receiptNum, customerId, payRes.lastInsertRowid, numAmount, customer.total_price, newPaidAmount, newRemainingAmount]);

    dbRun(`
      INSERT INTO customer_activity (customer_id, activity_type, title, description)
      VALUES (?, 'payment_received', 'Payment Received', ?)
    `, [customerId, `Received ₹${numAmount.toLocaleString()} via ${payment_method || 'Cash'} (Receipt: ${receiptNum})`]);

    logAudit(req.user?.username || 'admin', 'ADD_PAYMENT', 'PAYMENT', String(payRes.lastInsertRowid), `Received ₹${numAmount} for ${customer.name}`, req.ip || '');

    res.status(201).json({
      success: true,
      message: 'Payment recorded and receipt generated successfully.',
      payment_id: payRes.lastInsertRowid,
      receipt_id: receiptRes.lastInsertRowid,
      receipt_number: receiptNum,
      new_paid_amount: newPaidAmount,
      new_remaining_amount: newRemainingAmount,
      payment_status: paymentStatus
    });
  } catch (err: any) {
    console.error('Error adding payment:', err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

apiRouter.get('/receipts/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const receipt = dbGet(`
      SELECT
        r.*,
        c.name as customer_name,
        c.phone as customer_phone,
        c.business_name,
        c.address,
        c.website_name,
        w.name as website_type_name,
        p.payment_method,
        p.transaction_ref,
        p.note as payment_note,
        p.created_by
      FROM receipts r
      JOIN customers c ON r.customer_id = c.id
      LEFT JOIN website_types w ON c.website_type_id = w.id
      LEFT JOIN payments p ON r.payment_id = p.id
      WHERE r.id = ?
    `, [id]);

    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
    res.json(receipt);
  } catch (err: any) {
    console.error('Error fetching receipt:', err);
    res.status(500).json({ error: 'Failed to retrieve receipt' });
  }
});

// -----------------------------------------------------------------------------
// BUSINESS TYPES & WEBSITE TYPES
// -----------------------------------------------------------------------------

apiRouter.get('/business-types', (_req, res) => {
  try {
    const types = dbAll('SELECT * FROM business_types ORDER BY name ASC');
    res.json(types);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch business types' });
  }
});

apiRouter.post('/business-types', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    const trimmed = name.trim();
    const existing = dbGet('SELECT id FROM business_types WHERE LOWER(name) = LOWER(?)', [trimmed]);
    if (existing) return res.status(400).json({ error: 'Business type already exists.' });

    const result = dbRun('INSERT INTO business_types (name) VALUES (?)', [trimmed]);
    logAudit(req.user?.username || 'admin', 'ADD_BUSINESS_TYPE', 'SETTINGS', String(result.lastInsertRowid), `Added ${trimmed}`);
    res.json({ success: true, id: result.lastInsertRowid, name: trimmed });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create business type' });
  }
});

apiRouter.delete('/business-types/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    dbRun('DELETE FROM business_types WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete business type' });
  }
});

apiRouter.get('/website-types', (_req, res) => {
  try {
    const types = dbAll('SELECT * FROM website_types ORDER BY name ASC');
    res.json(types);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch website types' });
  }
});

apiRouter.post('/website-types', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    const trimmed = name.trim();
    const existing = dbGet('SELECT id FROM website_types WHERE LOWER(name) = LOWER(?)', [trimmed]);
    if (existing) return res.status(400).json({ error: 'Website type already exists.' });

    const result = dbRun('INSERT INTO website_types (name) VALUES (?)', [trimmed]);
    logAudit(req.user?.username || 'admin', 'ADD_WEBSITE_TYPE', 'SETTINGS', String(result.lastInsertRowid), `Added ${trimmed}`);
    res.json({ success: true, id: result.lastInsertRowid, name: trimmed });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create website type' });
  }
});

apiRouter.delete('/website-types/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    dbRun('DELETE FROM website_types WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete website type' });
  }
});

// -----------------------------------------------------------------------------
// PHOTO UPLOADS
// -----------------------------------------------------------------------------

apiRouter.post('/customers/:id/photos', requireAuth, upload.array('photos', 10), (req: AuthenticatedRequest, res: Response) => {
  try {
    const customerId = parseInt(req.params.id);
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded.' });
    }

    const insertedPhotos = [];
    for (const file of files) {
      const relativePath = `/uploads/${file.filename}`;
      const resDb = dbRun(`
        INSERT INTO uploaded_files (customer_id, file_name, file_path, file_size, mime_type)
        VALUES (?, ?, ?, ?, ?)
      `, [customerId, file.originalname, relativePath, file.size, file.mimetype]);

      insertedPhotos.push({
        id: resDb.lastInsertRowid,
        file_name: file.originalname,
        file_path: relativePath,
        file_size: file.size
      });
    }

    dbRun(`
      INSERT INTO customer_activity (customer_id, activity_type, title, description)
      VALUES (?, 'photo_uploaded', 'Photos Uploaded', ?)
    `, [customerId, `Uploaded ${files.length} business photo(s)`]);

    res.json({ success: true, photos: insertedPhotos });
  } catch (err: any) {
    console.error('Photo upload error:', err);
    res.status(500).json({ error: err.message || 'Failed to upload photos' });
  }
});

apiRouter.delete('/photos/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const photo = dbGet<{ id: number; file_path: string; customer_id: number }>('SELECT * FROM uploaded_files WHERE id = ?', [id]);
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    // Remove file on disk
    const absolutePath = path.resolve(process.cwd(), photo.file_path.replace(/^\//, ''));
    if (fs.existsSync(absolutePath)) {
      try {
        fs.unlinkSync(absolutePath);
      } catch (e) {
        console.warn('Unlink file failed', e);
      }
    }

    dbRun('DELETE FROM uploaded_files WHERE id = ?', [id]);
    res.json({ success: true, message: 'Photo deleted' });
  } catch (err: any) {
    console.error('Delete photo error:', err);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

// -----------------------------------------------------------------------------
// EXPORT DATA (CSV & JSON)
// -----------------------------------------------------------------------------

apiRouter.get('/export/csv', requireAuth, (req, res) => {
  try {
    const isTrash = req.query.trash === 'true';
    const condition = isTrash ? 'c.deleted_at IS NOT NULL' : 'c.deleted_at IS NULL';

    const customers = dbAll(`
      SELECT
        c.inquiry_id,
        c.name,
        c.phone,
        c.business_name,
        b.name as business_type,
        c.address,
        w.name as website_type,
        c.website_name,
        c.total_price,
        c.paid_amount,
        c.remaining_amount,
        c.payment_status,
        c.status,
        c.inquiry_date,
        c.follow_up_date,
        c.follow_up_time,
        c.notes,
        c.created_at
      FROM customers c
      LEFT JOIN business_types b ON c.business_type_id = b.id
      LEFT JOIN website_types w ON c.website_type_id = w.id
      WHERE ${condition}
      ORDER BY c.id DESC
    `);

    // Build CSV
    const headers = [
      'Inquiry ID', 'Customer Name', 'Phone Number', 'Business Name', 'Business Type',
      'Address', 'Website Type', 'Website Name', 'Total Price', 'Paid Amount',
      'Remaining Balance', 'Payment Status', 'Customer Status', 'Inquiry Date',
      'Follow-up Date', 'Follow-up Time', 'Notes', 'Created At'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = customers.map(c => [
      escapeCsv(c.inquiry_id),
      escapeCsv(c.name),
      escapeCsv(c.phone),
      escapeCsv(c.business_name),
      escapeCsv(c.business_type),
      escapeCsv(c.address),
      escapeCsv(c.website_type),
      escapeCsv(c.website_name),
      escapeCsv(c.total_price),
      escapeCsv(c.paid_amount),
      escapeCsv(c.remaining_amount),
      escapeCsv(c.payment_status),
      escapeCsv(c.status),
      escapeCsv(c.inquiry_date),
      escapeCsv(c.follow_up_date),
      escapeCsv(c.follow_up_time),
      escapeCsv(c.notes),
      escapeCsv(c.created_at)
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="waqar_customers_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    console.error('Export CSV error:', err);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// -----------------------------------------------------------------------------
// BACKUP & RESTORE & AUDIT LOGS
// -----------------------------------------------------------------------------

apiRouter.get('/backup/download', requireAuth, (_req, res) => {
  try {
    persistDatabase();
    const dbPath = path.resolve(process.cwd(), 'data', 'waqar_crm.sqlite');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found' });
    }
    res.download(dbPath, `waqar_crm_backup_${new Date().toISOString().split('T')[0]}.sqlite`);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to download database backup' });
  }
});

apiRouter.get('/audit-logs', requireAuth, (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 50;
    const offset = (page - 1) * limit;

    const countRow = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM audit_logs') || { count: 0 };
    const logs = dbAll('SELECT * FROM audit_logs ORDER BY id DESC LIMIT ? OFFSET ?', [limit, offset]);

    res.json({
      data: logs,
      total: countRow.count,
      page,
      totalPages: Math.ceil(countRow.count / limit)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// -----------------------------------------------------------------------------
// SEED BENCHMARK (1,000 to 15,000 records test generator for verifying scalability)
// -----------------------------------------------------------------------------

apiRouter.post('/test/generate-records', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const count = Math.min(15000, Math.max(100, parseInt(req.body.count) || 1000));
    console.log(`Generating ${count} realistic test customer records...`);

    const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Mohammad', 'Waqar', 'Zeeshan', 'Rahul', 'Rohan', 'Rohan', 'Ananya', 'Diya', 'Kavya', 'Riya', 'Sara', 'Pooja', 'Priya', 'Neha', 'Sunita', 'Deepa', 'Sanjay', 'Manish'];
    const lastNames = ['Sharma', 'Verma', 'Gupta', 'Malhotra', 'Khan', 'Siddiqui', 'Choudhary', 'Patel', 'Reddy', 'Singh', 'Kapoor', 'Bhatia', 'Joshi', 'Mishra', 'Mehta', 'Bansal', 'Agarwal', 'Saxena', 'Rawat', 'Das'];
    const businessSuffixes = ['Enterprises', 'Sweets & Bakery', 'Digital Hub', 'Jewellers', 'Textiles', 'Auto Care', 'Mart', 'Fitness Club', 'Tech Labs', 'Solutions', 'Boutique', 'Hotels & Resorts', 'Travels', 'Consulting'];
    const cities = ['New Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Lucknow', 'Jaipur', 'Ahmedabad', 'Pune', 'Kolkata', 'Chandigarh'];
    const statuses = ['New', 'Call Back', 'Interested', 'Not Interested', 'Agreed', 'Pending', 'Success', 'Cancelled'];

    const existingCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM customers') || { count: 0 };
    let startId = existingCount.count + 1;

    const rows: any[][] = [];
    for (let i = 0; i < count; i++) {
      const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const fullName = `${fName} ${lName}`;
      const suffix = businessSuffixes[Math.floor(Math.random() * businessSuffixes.length)];
      const bName = `${fName}'s ${suffix}`;
      const city = cities[Math.floor(Math.random() * cities.length)];
      const bTypeId = Math.floor(Math.random() * 20) + 1;
      const wTypeId = Math.floor(Math.random() * 12) + 1;
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      const phone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
      const inqId = `WWI-TEST-${String(startId + i).padStart(6, '0')}`;
      const price = (Math.floor(Math.random() * 8) + 2) * 5000; // 10k - 50k
      const advPct = [0, 0.2, 0.5, 1][Math.floor(Math.random() * 4)];
      const paid = price * advPct;
      const remaining = price - paid;
      const payStatus = remaining === 0 ? 'paid' : (paid > 0 ? 'partial' : 'pending');

      const today = new Date();
      today.setDate(today.getDate() + Math.floor(Math.random() * 14) - 7);
      const followUpDate = today.toISOString().split('T')[0];

      rows.push([
        inqId, fullName, phone, bName, bTypeId, `Commercial Area, ${city}`,
        wTypeId, `${fName.toLowerCase()}${suffix.toLowerCase().replace(/[^a-z]/g, '')}.com`,
        price, price, paid, paid, remaining, payStatus, status, followUpDate,
        `Seeded test record for testing 15,000+ customer volume and search index speed.`
      ]);
    }

    dbBulkRun(`
      INSERT INTO customers (
        inquiry_id, name, phone, business_name, business_type_id, address,
        website_type_id, website_name, quoted_price, total_price, advance_payment,
        paid_amount, remaining_amount, payment_status, status, inquiry_date,
        follow_up_date, follow_up_time, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, date('now'), ?, '15:00', ?)
    `, rows);

    logAudit(req.user?.username || 'admin', 'BENCHMARK_SEED', 'SYSTEM', '0', `Generated ${count} test customer inquiries`);

    const newTotal = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL');
    res.json({
      success: true,
      message: `Successfully generated ${count.toLocaleString()} customer records!`,
      current_total: newTotal?.count || 0
    });
  } catch (err: any) {
    console.error('Error seeding test records:', err);
    res.status(500).json({ error: 'Failed to generate test records' });
  }
});

// Mount Ultra Features Router
import { ultraRouter } from './ultraFeatures.ts';
apiRouter.use('/', ultraRouter);




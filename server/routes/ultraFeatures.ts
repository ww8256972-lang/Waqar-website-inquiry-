import express from 'express';
import { dbAll, dbGet, dbRun, dbBulkRun, persistDatabase } from '../db/database.ts';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { GoogleGenAI } from '@google/genai';

export const ultraRouter = express.Router();

let geminiClient: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI();
  }
} catch {
  // Graceful fallback
}

function logAudit(username: string, action: string, targetType: string, targetId: string, details: string) {
  try {
    dbRun(
      'INSERT INTO audit_logs (admin_username, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?)',
      [username || 'admin', action, targetType, targetId, details]
    );
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

// =============================================================================
// ULTRA FEATURE 01: AI LEAD SCORING (0-100, Hot/Warm/Cold)
// =============================================================================

function calculateLeadScore(cust: any, callsCount = 0, paymentsCount = 0) {
  let score = 30; // base score
  const factors: { name: string; points: number }[] = [];

  // Status factor
  const statusScores: Record<string, number> = {
    'Agreed': 40,
    'Interested': 30,
    'Call Back': 20,
    'New': 15,
    'Pending': 10,
    'Not Interested': -25,
    'Cancelled': -30
  };
  const statusPts = statusScores[cust.status] ?? 10;
  score += statusPts;
  factors.push({ name: `Status: ${cust.status}`, points: statusPts });

  // Quoted Price / Project Value
  if (cust.quoted_price >= 40000) {
    score += 20;
    factors.push({ name: 'High Value Project (₹40,000+)', points: 20 });
  } else if (cust.quoted_price >= 20000) {
    score += 10;
    factors.push({ name: 'Medium Value Project (₹20,000+)', points: 10 });
  }

  // Payment Activity
  if (cust.paid_amount > 0 && cust.remaining_amount === 0) {
    score += 25;
    factors.push({ name: 'Fully Paid Customer', points: 25 });
  } else if (cust.paid_amount > 0) {
    score += 20;
    factors.push({ name: 'Advance Payment Received', points: 20 });
  }

  // Follow-up & Call Engagement
  if (callsCount > 0) {
    const callPts = Math.min(15, callsCount * 5);
    score += callPts;
    factors.push({ name: `${callsCount} Call(s) Logged`, points: callPts });
  }

  // Tags
  const tagsStr = (cust.tags || '').toUpperCase();
  if (tagsStr.includes('HOT')) {
    score += 15;
    factors.push({ name: 'Tagged as HOT', points: 15 });
  }
  if (tagsStr.includes('HIGH VALUE')) {
    score += 10;
    factors.push({ name: 'Tagged as HIGH VALUE', points: 10 });
  }
  if (tagsStr.includes('URGENT')) {
    score += 10;
    factors.push({ name: 'Tagged as URGENT', points: 10 });
  }

  // Constrain 0 to 100
  score = Math.max(5, Math.min(100, Math.round(score)));

  let temperature: 'Hot' | 'Warm' | 'Cold' = 'Warm';
  if (score >= 70) temperature = 'Hot';
  else if (score < 45) temperature = 'Cold';

  return { score, temperature, factors };
}

ultraRouter.post('/customers/:id/ai-score', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const cust = dbGet<any>('SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL', [id]);
    if (!cust) return res.status(404).json({ error: 'Customer not found' });

    const callsRow = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM call_notes WHERE customer_id = ?', [id]);
    const payRow = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM payments WHERE customer_id = ?', [id]);

    const result = calculateLeadScore(cust, callsRow?.count || 0, payRow?.count || 0);

    dbRun('UPDATE customers SET lead_score = ?, lead_temperature = ? WHERE id = ?', [result.score, result.temperature, id]);

    res.json({
      success: true,
      lead_score: result.score,
      lead_temperature: result.temperature,
      factors: result.factors
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to calculate lead score' });
  }
});

ultraRouter.put('/customers/:id/override-score', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { score, temperature, reason } = req.body;
    const numScore = Math.max(0, Math.min(100, parseInt(score) || 50));
    const validTemp = ['Hot', 'Warm', 'Cold'].includes(temperature) ? temperature : (numScore >= 70 ? 'Hot' : numScore < 45 ? 'Cold' : 'Warm');

    dbRun('UPDATE customers SET lead_score = ?, lead_temperature = ? WHERE id = ?', [numScore, validTemp, id]);

    logAudit(req.user?.username || 'admin', 'OVERRIDE_LEAD_SCORE', 'CUSTOMERS', String(id), `Score set to ${numScore} (${validTemp}). Reason: ${reason || 'Admin manual override'}`);

    res.json({ success: true, lead_score: numScore, lead_temperature: validTemp });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to override score' });
  }
});

// =============================================================================
// ULTRA FEATURE 02: AI FOLLOW-UP ASSISTANT
// =============================================================================

ultraRouter.post('/customers/:id/ai-assistant', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const cust = dbGet<any>(`
      SELECT c.*, b.name as business_type_name, w.name as website_type_name
      FROM customers c
      LEFT JOIN business_types b ON c.business_type_id = b.id
      LEFT JOIN website_types w ON c.website_type_id = w.id
      WHERE c.id = ? AND c.deleted_at IS NULL
    `, [id]);
    if (!cust) return res.status(404).json({ error: 'Customer not found' });

    const recentNotes = dbAll<any>('SELECT * FROM call_notes WHERE customer_id = ? ORDER BY id DESC LIMIT 3', [id]);
    const notesText = recentNotes.map(n => `[${n.call_result}]: ${n.note_text}`).join('\n') || cust.notes || 'None';

    // 1. Try Gemini AI generation if available
    let aiResponse = null;
    if (geminiClient) {
      try {
        const prompt = `You are an elite sales and follow-up advisor for Waqar Website Enquiry (a premium web development agency).
Customer:
- Name: ${cust.name}
- Business: ${cust.business_name || 'Business'} (${cust.business_type_name || 'General'})
- Website Requirement: ${cust.website_type_name || cust.website_name || 'Website'}
- Status: ${cust.status}
- Quoted Price: ₹${cust.quoted_price || 0}, Paid: ₹${cust.paid_amount || 0}, Remaining: ₹${cust.remaining_amount || 0}
- Recent Conversation Notes:
${notesText}

Provide an actionable follow-up plan in JSON format with exactly these keys:
{
  "suggested_followup_date": "YYYY-MM-DD",
  "suggested_message": "A polite, friendly, personalized WhatsApp message under 3 sentences signed from Waqar",
  "talking_points": ["Point 1", "Point 2", "Point 3"],
  "next_action": "Specific next operational task for the admin",
  "summary": "1 sentence executive summary of customer intent"
}`;

        const aiResult = await geminiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });

        const text = aiResult.text?.trim();
        if (text) {
          aiResponse = JSON.parse(text);
        }
      } catch (err) {
        console.warn('Gemini AI assistant fallback triggered:', err);
      }
    }

    // 2. Intelligent Deterministic Heuristic Fallback (works offline & without API key!)
    if (!aiResponse) {
      const today = new Date();
      const offsetDays = cust.status === 'Agreed' ? 2 : (cust.status === 'Interested' ? 3 : 5);
      today.setDate(today.getDate() + offsetDays);
      const suggestedDate = today.toISOString().split('T')[0];

      let msg = `Hello ${cust.name}, this is Waqar regarding your ${cust.website_type_name || 'website'} for ${cust.business_name || 'your business'}. We have refined our project blueprint to match your goals. Would you have 5 minutes today for a quick walkthrough?`;
      if (cust.remaining_amount > 0 && cust.paid_amount > 0) {
        msg = `Hi ${cust.name}, Waqar here. The development milestones for ${cust.business_name || 'your website'} are progressing nicely! We would love to share a preview and discuss the next milestone schedule at your convenience.`;
      }

      const points = [
        `Highlight how a dedicated ${cust.website_type_name || 'modern website'} drives customer trust and organic leads for ${cust.business_name || 'their business'}.`,
        `Clarify scope deliverables: mobile responsiveness, SEO foundations, WhatsApp booking integration, and high-speed cloud hosting.`,
        cust.remaining_amount > 0 ? `Discuss current balance of ₹${cust.remaining_amount.toLocaleString()} and milestone deliverables.` : `Offer flexible payment terms (advance + milestone completion) to finalize the contract.`
      ];

      const action = cust.status === 'Agreed'
        ? 'Send official formal quotation and confirm advance transfer'
        : (cust.status === 'Interested' ? 'Schedule a 10-minute demo call with live preview' : 'Send friendly WhatsApp check-in with website portfolio examples');

      aiResponse = {
        suggested_followup_date: suggestedDate,
        suggested_message: msg,
        talking_points: points,
        next_action: action,
        summary: `${cust.name} is a ${cust.status} prospect for ${cust.business_name || 'their business'} seeking ${cust.website_type_name || 'website development'}.`
      };
    }

    // Save to customer record
    try {
      dbRun(`
        UPDATE customers SET
          ai_suggested_followup = ?,
          ai_talking_points = ?,
          ai_summary = ?
        WHERE id = ?
      `, [
        aiResponse.suggested_message,
        JSON.stringify(aiResponse.talking_points),
        aiResponse.summary,
        id
      ]);
    } catch (e) {
      // ignore
    }

    res.json({ success: true, ...aiResponse });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI assistant error' });
  }
});

// =============================================================================
// ULTRA FEATURE 06: QUOTATION GENERATOR (Unique WWI-QT-2026-XXXXX)
// =============================================================================

ultraRouter.get('/quotations', requireAuth, (req, res) => {
  try {
    const customerId = req.query.customer_id ? parseInt(req.query.customer_id as string) : null;
    const search = ((req.query.search as string) || '').trim();

    let sql = `
      SELECT q.*, c.name as customer_name, c.phone as customer_phone, c.business_name
      FROM quotations q
      JOIN customers c ON q.customer_id = c.id
      WHERE c.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (customerId) {
      sql += ' AND q.customer_id = ?';
      params.push(customerId);
    }
    if (search) {
      sql += ' AND (q.quotation_number LIKE ? OR c.name LIKE ? OR c.business_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY q.id DESC';

    const quotations = dbAll(sql, params).map((q: any) => ({
      ...q,
      items: JSON.parse(q.items_json || '[]')
    }));

    res.json(quotations);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get quotations' });
  }
});

ultraRouter.post('/quotations', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { customer_id, items, discount_amount = 0, tax_amount = 0, validity_date, terms, notes } = req.body;
    if (!customer_id) return res.status(400).json({ error: 'Customer ID is required' });

    const customer = dbGet<any>('SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL', [customer_id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const parsedItems = Array.isArray(items) ? items : [];
    let subtotal = 0;
    for (const it of parsedItems) {
      const qty = parseFloat(it.quantity) || 1;
      const rate = parseFloat(it.rate) || 0;
      subtotal += qty * rate;
    }

    const discount = parseFloat(discount_amount) || 0;
    const tax = parseFloat(tax_amount) || 0;
    const total = Math.max(0, subtotal - discount + tax);

    // Unique quotation number
    const countRow = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM quotations') || { count: 0 };
    const qtNum = `WWI-QT-2026-${String(countRow.count + 1).padStart(5, '0')}`;

    const defaultValidity = validity_date || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
    const defaultTerms = terms || '1. 50% advance to initiate project. 2. Remaining 50% upon final staging review before launch. 3. Free 30-day technical support included.';

    const result = dbRun(`
      INSERT INTO quotations (
        quotation_number, customer_id, items_json, subtotal, discount_amount,
        tax_amount, total_amount, validity_date, terms, notes, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', ?)
    `, [
      qtNum, customer_id, JSON.stringify(parsedItems), subtotal, discount,
      tax, total, defaultValidity, defaultTerms, notes || null, req.user?.username || 'admin'
    ]);

    // Update customer quoted_price if zero
    if (customer.quoted_price === 0) {
      dbRun('UPDATE customers SET quoted_price = ?, total_price = ? WHERE id = ?', [total, total, customer_id]);
    }

    logAudit(req.user?.username || 'admin', 'CREATE_QUOTATION', 'QUOTATIONS', qtNum, `Generated quotation ${qtNum} for ${customer.name} (₹${total.toLocaleString()})`);
    dbRun('INSERT INTO customer_activity (customer_id, activity_type, title, description) VALUES (?, "quotation_created", "Quotation Generated", ?)', [
      customer_id, `Quotation #${qtNum} created for ₹${total.toLocaleString()}`
    ]);

    persistDatabase();
    res.status(201).json({
      success: true,
      id: result.lastInsertRowid,
      quotation_number: qtNum,
      total_amount: total
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create quotation' });
  }
});

ultraRouter.get('/quotations/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const qt = dbGet<any>(`
      SELECT q.*, c.name as customer_name, c.phone as customer_phone, c.business_name, c.address as customer_address
      FROM quotations q
      JOIN customers c ON q.customer_id = c.id
      WHERE q.id = ?
    `, [id]);
    if (!qt) return res.status(404).json({ error: 'Quotation not found' });
    qt.items = JSON.parse(qt.items_json || '[]');
    res.json(qt);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.put('/quotations/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes, terms, validity_date } = req.body;
    dbRun(`
      UPDATE quotations SET
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        terms = COALESCE(?, terms),
        validity_date = COALESCE(?, validity_date),
        updated_at = datetime('now')
      WHERE id = ?
    `, [status, notes, terms, validity_date, id]);

    res.json({ success: true, message: 'Quotation updated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.delete('/quotations/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    dbRun('DELETE FROM quotations WHERE id = ?', [id]);
    persistDatabase();
    res.json({ success: true, message: 'Quotation deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// ULTRA FEATURE 07: INVOICE GENERATOR (Unique WWI-INV-2026-XXXXX)
// =============================================================================

ultraRouter.get('/invoices', requireAuth, (req, res) => {
  try {
    const customerId = req.query.customer_id ? parseInt(req.query.customer_id as string) : null;
    let sql = `
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.business_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE c.deleted_at IS NULL
    `;
    const params: any[] = [];
    if (customerId) {
      sql += ' AND i.customer_id = ?';
      params.push(customerId);
    }
    sql += ' ORDER BY i.id DESC';

    const invoices = dbAll(sql, params).map((inv: any) => ({
      ...inv,
      items: JSON.parse(inv.items_json || '[]')
    }));
    res.json(invoices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.post('/invoices', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { customer_id, quotation_id, items, total_amount, paid_amount = 0, due_date, payment_method, notes } = req.body;
    if (!customer_id) return res.status(400).json({ error: 'Customer ID is required' });

    const customer = dbGet<any>('SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL', [customer_id]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const total = parseFloat(total_amount) || customer.total_price || 0;
    const paid = parseFloat(paid_amount) || customer.paid_amount || 0;
    const remaining = Math.max(0, total - paid);

    const countRow = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM invoices') || { count: 0 };
    const invNum = `WWI-INV-2026-${String(countRow.count + 1).padStart(5, '0')}`;

    const status = remaining === 0 ? 'Paid' : (paid > 0 ? 'Partially Paid' : 'Unpaid');

    const result = dbRun(`
      INSERT INTO invoices (
        invoice_number, customer_id, quotation_id, items_json, total_amount,
        paid_amount, remaining_amount, due_date, payment_method, notes, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invNum, customer_id, quotation_id || null, JSON.stringify(items || []),
      total, paid, remaining, due_date || null, payment_method || 'Bank Transfer / UPI',
      notes || null, status, req.user?.username || 'admin'
    ]);

    logAudit(req.user?.username || 'admin', 'CREATE_INVOICE', 'INVOICES', invNum, `Issued invoice ${invNum} for ${customer.name} (Total ₹${total.toLocaleString()})`);
    dbRun('INSERT INTO customer_activity (customer_id, activity_type, title, description) VALUES (?, "invoice_created", "Invoice Issued", ?)', [
      customer_id, `Invoice #${invNum} generated for ₹${total.toLocaleString()} (Status: ${status})`
    ]);

    persistDatabase();
    res.status(201).json({
      success: true,
      id: result.lastInsertRowid,
      invoice_number: invNum,
      status
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.get('/invoices/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const inv = dbGet<any>(`
      SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.business_name, c.address as customer_address
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      WHERE i.id = ?
    `, [id]);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    inv.items = JSON.parse(inv.items_json || '[]');
    res.json(inv);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.delete('/invoices/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    dbRun('DELETE FROM invoices WHERE id = ?', [id]);
    persistDatabase();
    res.json({ success: true, message: 'Invoice removed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// ULTRA FEATURE 04 & 05: WHATSAPP TEMPLATES & QUICK ACTION
// =============================================================================

ultraRouter.get('/whatsapp-templates', requireAuth, (_req, res) => {
  try {
    const templates = dbAll('SELECT * FROM whatsapp_templates ORDER BY id ASC');
    res.json(templates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.post('/whatsapp-templates', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { title, category, template_body } = req.body;
    if (!title || !template_body) return res.status(400).json({ error: 'Title and body are required' });

    const result = dbRun(
      'INSERT INTO whatsapp_templates (title, category, template_body) VALUES (?, ?, ?)',
      [title.trim(), category || 'Custom', template_body.trim()]
    );
    persistDatabase();
    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.put('/whatsapp-templates/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, category, template_body } = req.body;
    dbRun(`
      UPDATE whatsapp_templates SET
        title = COALESCE(?, title),
        category = COALESCE(?, category),
        template_body = COALESCE(?, template_body),
        updated_at = datetime('now')
      WHERE id = ?
    `, [title, category, template_body, id]);
    persistDatabase();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.delete('/whatsapp-templates/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    dbRun('DELETE FROM whatsapp_templates WHERE id = ?', [id]);
    persistDatabase();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// ULTRA FEATURE 03: SMART REMINDER ENGINE
// =============================================================================

ultraRouter.get('/reminders', requireAuth, (req, res) => {
  try {
    const filter = (req.query.timeframe as string) || 'all';
    const customerId = req.query.customer_id ? parseInt(req.query.customer_id as string) : null;

    let sql = `
      SELECT r.*, c.name as customer_name, c.phone as customer_phone, c.business_name
      FROM smart_reminders r
      LEFT JOIN customers c ON r.customer_id = c.id
      WHERE r.status != 'dismissed'
    `;
    const params: any[] = [];

    if (customerId) {
      sql += ' AND r.customer_id = ?';
      params.push(customerId);
    }

    if (filter === 'due_now') {
      sql += ' AND r.remind_at <= datetime("now") AND r.status = "pending"';
    } else if (filter === 'upcoming') {
      sql += ' AND r.remind_at > datetime("now") AND r.status = "pending"';
    } else if (filter === 'overdue') {
      sql += ' AND r.remind_at < datetime("now", "-1 hour") AND r.status = "pending"';
    }

    sql += ' ORDER BY r.remind_at ASC';
    const reminders = dbAll(sql, params);
    res.json(reminders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.post('/reminders', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { customer_id, title, reminder_type, remind_at, recurring_pattern, note } = req.body;
    if (!title || !remind_at) return res.status(400).json({ error: 'Title and remind_at are required' });

    const result = dbRun(`
      INSERT INTO smart_reminders (customer_id, title, reminder_type, remind_at, recurring_pattern, note, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [customer_id || null, title.trim(), reminder_type || 'one-time', remind_at, recurring_pattern || null, note || null]);

    if (customer_id) {
      dbRun('INSERT INTO customer_activity (customer_id, activity_type, title, description) VALUES (?, "reminder_created", "Reminder Set", ?)', [
        customer_id, `${title} scheduled for ${remind_at}`
      ]);
    }

    persistDatabase();
    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.put('/reminders/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    dbRun('UPDATE smart_reminders SET status = ? WHERE id = ?', [status || 'completed', id]);
    persistDatabase();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.delete('/reminders/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    dbRun('DELETE FROM smart_reminders WHERE id = ?', [id]);
    persistDatabase();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// ULTRA FEATURE 15: SAVED FILTERS
// =============================================================================

ultraRouter.get('/saved-filters', requireAuth, (_req, res) => {
  try {
    const filters = dbAll('SELECT * FROM saved_filters ORDER BY id ASC');
    res.json(filters);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.post('/saved-filters', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { name, filter_params } = req.body;
    if (!name) return res.status(400).json({ error: 'Filter name required' });

    const result = dbRun(
      'INSERT INTO saved_filters (name, filter_params_json) VALUES (?, ?)',
      [name.trim(), JSON.stringify(filter_params || {})]
    );
    persistDatabase();
    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.delete('/saved-filters/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    dbRun('DELETE FROM saved_filters WHERE id = ?', [id]);
    persistDatabase();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// ULTRA FEATURE 55: STRUCTURED NOTES SYSTEM
// =============================================================================

ultraRouter.get('/customers/:id/notes', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const notes = dbAll('SELECT * FROM customer_notes WHERE customer_id = ? ORDER BY id DESC', [id]);
    res.json(notes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.post('/customers/:id/notes', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const id = parseInt(req.params.id);
    const { category, content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Note content is required' });

    const result = dbRun(`
      INSERT INTO customer_notes (customer_id, category, content, author)
      VALUES (?, ?, ?, ?)
    `, [id, category || 'General', content.trim(), req.user?.username || 'admin']);

    dbRun('INSERT INTO customer_activity (customer_id, activity_type, title, description) VALUES (?, "note_added", ?, ?)', [
      id, `${category || 'General'} Note Added`, content.trim().substring(0, 100)
    ]);

    persistDatabase();
    res.status(201).json({ success: true, id: result.lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.delete('/customers/:customerId/notes/:noteId', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { customerId, noteId } = req.params;
    dbRun('DELETE FROM customer_notes WHERE id = ? AND customer_id = ?', [parseInt(noteId), parseInt(customerId)]);
    persistDatabase();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// ULTRA FEATURE 12: CUSTOMER 360 TIMELINE
// =============================================================================

ultraRouter.get('/customers/:id/timeline-360', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const cust = dbGet<any>('SELECT * FROM customers WHERE id = ?', [id]);
    if (!cust) return res.status(404).json({ error: 'Customer not found' });

    const events: Array<{
      id: string;
      type: string;
      title: string;
      description: string;
      timestamp: string;
      author: string;
      meta?: any;
    }> = [];

    // 1. Created Event
    events.push({
      id: `created-${cust.id}`,
      type: 'created',
      title: 'Inquiry Created',
      description: `Inquiry #${cust.inquiry_id} registered for ${cust.name} (${cust.business_name || 'Business'})`,
      timestamp: cust.created_at,
      author: 'system'
    });

    // 2. Call Notes
    const callNotes = dbAll<any>('SELECT * FROM call_notes WHERE customer_id = ?', [id]);
    for (const cn of callNotes) {
      events.push({
        id: `call-${cn.id}`,
        type: 'call',
        title: `Call: ${cn.call_result}`,
        description: cn.note_text,
        timestamp: cn.created_at,
        author: 'admin',
        meta: { next_follow_up_date: cn.next_follow_up_date }
      });
    }

    // 3. Structured Notes
    const notes = dbAll<any>('SELECT * FROM customer_notes WHERE customer_id = ?', [id]);
    for (const n of notes) {
      events.push({
        id: `note-${n.id}`,
        type: 'note',
        title: `${n.category} Note`,
        description: n.content,
        timestamp: n.created_at,
        author: n.author || 'admin'
      });
    }

    // 4. Quotations
    const quotations = dbAll<any>('SELECT * FROM quotations WHERE customer_id = ?', [id]);
    for (const q of quotations) {
      events.push({
        id: `quotation-${q.id}`,
        type: 'quotation',
        title: `Quotation #${q.quotation_number}`,
        description: `Quotation generated for ₹${q.total_amount.toLocaleString()} (Status: ${q.status})`,
        timestamp: q.created_at,
        author: q.created_by || 'admin',
        meta: { amount: q.total_amount, status: q.status }
      });
    }

    // 5. Invoices
    const invoices = dbAll<any>('SELECT * FROM invoices WHERE customer_id = ?', [id]);
    for (const inv of invoices) {
      events.push({
        id: `invoice-${inv.id}`,
        type: 'invoice',
        title: `Invoice #${inv.invoice_number}`,
        description: `Invoice generated for ₹${inv.total_amount.toLocaleString()} (Status: ${inv.status})`,
        timestamp: inv.created_at,
        author: inv.created_by || 'admin',
        meta: { total: inv.total_amount, remaining: inv.remaining_amount }
      });
    }

    // 6. Payments & Receipts
    const payments = dbAll<any>('SELECT * FROM payments WHERE customer_id = ?', [id]);
    for (const p of payments) {
      events.push({
        id: `payment-${p.id}`,
        type: 'payment',
        title: `Payment: ₹${p.amount.toLocaleString()}`,
        description: `Received via ${p.payment_method}. ${p.note || ''}`,
        timestamp: p.created_at,
        author: p.created_by || 'admin',
        meta: { amount: p.amount, method: p.payment_method }
      });
    }

    // Sort descending by timestamp
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// ULTRA FEATURE 13: DUPLICATE CUSTOMER DETECTION & MERGE
// =============================================================================

ultraRouter.post('/customers/check-duplicate', requireAuth, (req, res) => {
  try {
    const { phone, email, business_name, name, exclude_id } = req.body;
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');

    const duplicates: any[] = [];

    // 1. Exact phone match (strongest signal)
    if (cleanPhone.length >= 7) {
      const match = dbAll<any>(`
        SELECT id, name, phone, business_name, status, created_at
        FROM customers
        WHERE deleted_at IS NULL AND (phone LIKE ? OR phone LIKE ?)
        ${exclude_id ? 'AND id != ' + parseInt(exclude_id) : ''}
      `, [`%${cleanPhone.slice(-8)}%`, `%${cleanPhone}%`]);
      duplicates.push(...match.map(m => ({ ...m, match_reason: 'Matching Phone Number' })));
    }

    // 2. Business name match
    if (business_name && business_name.trim().length >= 4) {
      const bMatch = dbAll<any>(`
        SELECT id, name, phone, business_name, status, created_at
        FROM customers
        WHERE deleted_at IS NULL AND business_name LIKE ?
        ${exclude_id ? 'AND id != ' + parseInt(exclude_id) : ''}
      `, [`%${business_name.trim()}%`]);
      for (const b of bMatch) {
        if (!duplicates.some(d => d.id === b.id)) {
          duplicates.push({ ...b, match_reason: 'Similar Business Name' });
        }
      }
    }

    res.json({
      has_duplicate: duplicates.length > 0,
      duplicates
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.post('/customers/merge', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { primary_id, secondary_id } = req.body;
    const primId = parseInt(primary_id);
    const secId = parseInt(secondary_id);

    if (!primId || !secId || primId === secId) {
      return res.status(400).json({ error: 'Valid distinct primary and secondary customer IDs required' });
    }

    const primary = dbGet<any>('SELECT * FROM customers WHERE id = ?', [primId]);
    const secondary = dbGet<any>('SELECT * FROM customers WHERE id = ?', [secId]);
    if (!primary || !secondary) return res.status(404).json({ error: 'Customers not found' });

    // Reassign all related records to primary
    dbRun('UPDATE call_schedules SET customer_id = ? WHERE customer_id = ?', [primId, secId]);
    dbRun('UPDATE call_notes SET customer_id = ? WHERE customer_id = ?', [primId, secId]);
    dbRun('UPDATE customer_notes SET customer_id = ? WHERE customer_id = ?', [primId, secId]);
    dbRun('UPDATE quotations SET customer_id = ? WHERE customer_id = ?', [primId, secId]);
    dbRun('UPDATE invoices SET customer_id = ? WHERE customer_id = ?', [primId, secId]);
    dbRun('UPDATE payments SET customer_id = ? WHERE customer_id = ?', [primId, secId]);
    dbRun('UPDATE receipts SET customer_id = ? WHERE customer_id = ?', [primId, secId]);
    dbRun('UPDATE uploaded_files SET customer_id = ? WHERE customer_id = ?', [primId, secId]);
    dbRun('UPDATE smart_reminders SET customer_id = ? WHERE customer_id = ?', [primId, secId]);

    // Recalculate financial totals for primary
    const paySum = dbGet<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE customer_id = ?', [primId]);
    const paidAmount = paySum?.total || 0;
    const totalPrice = Math.max(primary.total_price, secondary.total_price);
    const remaining = Math.max(0, totalPrice - paidAmount);
    const payStatus = remaining === 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending');

    dbRun(`
      UPDATE customers SET
        paid_amount = ?,
        remaining_amount = ?,
        payment_status = ?,
        notes = ?
      WHERE id = ?
    `, [
      paidAmount, remaining, payStatus,
      `${primary.notes || ''}\n[Merged with ${secondary.name} (#${secondary.inquiry_id})]: ${secondary.notes || ''}`.trim(),
      primId
    ]);

    // Soft delete secondary
    dbRun('UPDATE customers SET deleted_at = datetime("now"), deleted_by = ? WHERE id = ?', [
      `merged_into_${primId}`, secId
    ]);

    logAudit(req.user?.username || 'admin', 'MERGE_CUSTOMERS', 'CUSTOMERS', String(primId), `Merged customer #${secondary.inquiry_id} into #${primary.inquiry_id}`);

    persistDatabase();
    res.json({ success: true, message: `Successfully merged customer into #${primary.inquiry_id}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// ULTRA FEATURE 16: BULK ACTIONS (Status, Date, Tag, Soft Delete, Restore)
// =============================================================================

ultraRouter.post('/customers/bulk-action', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { customer_ids, action, payload } = req.body;
    if (!Array.isArray(customer_ids) || customer_ids.length === 0) {
      return res.status(400).json({ error: 'No customer IDs provided' });
    }

    const ids = customer_ids.map((x: any) => parseInt(x)).filter(Boolean);
    const placeholders = ids.map(() => '?').join(',');

    if (action === 'status') {
      const status = payload?.status || 'Contacted';
      dbRun(`UPDATE customers SET status = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`, [status, ...ids]);
      logAudit(req.user?.username || 'admin', 'BULK_STATUS_CHANGE', 'CUSTOMERS', `${ids.length} records`, `Updated status to ${status}`);
    } else if (action === 'follow_up_date') {
      const date = payload?.follow_up_date;
      if (!date) return res.status(400).json({ error: 'follow_up_date required' });
      dbRun(`UPDATE customers SET follow_up_date = ?, updated_at = datetime('now') WHERE id IN (${placeholders})`, [date, ...ids]);
      logAudit(req.user?.username || 'admin', 'BULK_FOLLOWUP_DATE', 'CUSTOMERS', `${ids.length} records`, `Assigned follow-up ${date}`);
    } else if (action === 'add_tag') {
      const newTag = (payload?.tag || '').toUpperCase().trim();
      if (!newTag) return res.status(400).json({ error: 'Tag required' });
      for (const id of ids) {
        const row = dbGet<any>('SELECT tags FROM customers WHERE id = ?', [id]);
        const existing = (row?.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean);
        if (!existing.includes(newTag)) {
          existing.push(newTag);
          dbRun('UPDATE customers SET tags = ? WHERE id = ?', [existing.join(','), id]);
        }
      }
    } else if (action === 'soft_delete') {
      dbRun(`UPDATE customers SET deleted_at = datetime('now'), deleted_by = ? WHERE id IN (${placeholders})`, [req.user?.username || 'admin', ...ids]);
      logAudit(req.user?.username || 'admin', 'BULK_SOFT_DELETE', 'CUSTOMERS', `${ids.length} records`, 'Moved to Recycle Bin');
    } else if (action === 'restore') {
      dbRun(`UPDATE customers SET deleted_at = NULL, deleted_by = NULL WHERE id IN (${placeholders})`, ids);
      logAudit(req.user?.username || 'admin', 'BULK_RESTORE', 'CUSTOMERS', `${ids.length} records`, 'Restored from Recycle Bin');
    } else {
      return res.status(400).json({ error: 'Unknown bulk action' });
    }

    persistDatabase();
    res.json({ success: true, count: ids.length, action });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// ULTRA FEATURE 17 & 18: BULK IMPORT & EXPORT
// =============================================================================

ultraRouter.post('/customers/bulk-import', requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No data rows supplied for import' });
    }

    const countRow = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM customers') || { count: 0 };
    let startId = countRow.count + 1;

    let importedCount = 0;
    const skippedRows: any[] = [];

    const insertRows: any[][] = [];

    for (const r of rows) {
      const name = (r.Name || r.name || '').trim();
      const phone = (r.Phone || r.phone || '').trim();
      if (!name || !phone) {
        skippedRows.push({ ...r, reason: 'Missing name or phone' });
        continue;
      }

      // Quick duplicate check
      const dup = dbGet('SELECT id FROM customers WHERE phone = ? AND deleted_at IS NULL', [phone]);
      if (dup) {
        skippedRows.push({ ...r, reason: 'Phone number already exists in database' });
        continue;
      }

      const inqId = `WWI-IMP-${String(startId++).padStart(5, '0')}`;
      const business = (r.Business || r.business_name || '').trim();
      const address = (r.Address || r.address || '').trim();
      const website = (r.Website || r.website_name || '').trim();
      const status = r.Status || r.status || 'New';
      const price = parseFloat(r.Price || r.quoted_price) || 0;
      const paid = parseFloat(r.Paid || r.paid_amount) || 0;
      const remaining = Math.max(0, price - paid);
      const followUp = r.FollowUpDate || r.follow_up_date || null;
      const notes = r.Notes || r.notes || 'Imported via CSV batch';

      insertRows.push([
        inqId, name, phone, business, 1, address, 1, website, price, price, paid, paid, remaining,
        remaining === 0 ? 'paid' : (paid > 0 ? 'partial' : 'pending'), status, followUp, notes
      ]);
      importedCount++;
    }

    if (insertRows.length > 0) {
      dbBulkRun(`
        INSERT INTO customers (
          inquiry_id, name, phone, business_name, business_type_id, address,
          website_type_id, website_name, quoted_price, total_price, advance_payment,
          paid_amount, remaining_amount, payment_status, status, follow_up_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, insertRows);
    }

    logAudit(req.user?.username || 'admin', 'BULK_IMPORT', 'CUSTOMERS', `${importedCount} records`, `Imported ${importedCount} customers, skipped ${skippedRows.length}`);
    persistDatabase();

    res.json({
      success: true,
      imported_count: importedCount,
      skipped_count: skippedRows.length,
      skipped_rows: skippedRows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Full JSON / CSV export with authorization
ultraRouter.get('/customers/export-all', requireAuth, (req, res) => {
  try {
    const format = ((req.query.format as string) || 'csv').toLowerCase();
    const customers = dbAll<any>(`
      SELECT
        c.id, c.inquiry_id, c.name, c.phone, c.email, c.business_name,
        b.name as business_type, w.name as website_type, c.quoted_price,
        c.total_price, c.paid_amount, c.remaining_amount, c.payment_status,
        c.status, c.lead_score, c.lead_temperature, c.tags, c.inquiry_date,
        c.follow_up_date, c.follow_up_time, c.notes, c.created_at
      FROM customers c
      LEFT JOIN business_types b ON c.business_type_id = b.id
      LEFT JOIN website_types w ON c.website_type_id = w.id
      WHERE c.deleted_at IS NULL
      ORDER BY c.id ASC
    `);

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="waqar_customers_${Date.now()}.json"`);
      return res.json(customers);
    }

    // CSV format
    const headers = [
      'Inquiry ID', 'Customer Name', 'Phone', 'Email', 'Business Name',
      'Business Type', 'Website Type', 'Quoted Price', 'Total Price', 'Paid Amount',
      'Remaining Amount', 'Payment Status', 'Status', 'Lead Score', 'Temperature',
      'Tags', 'Inquiry Date', 'Follow Up Date', 'Follow Up Time', 'Notes', 'Created At'
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
      escapeCsv(c.email),
      escapeCsv(c.business_name),
      escapeCsv(c.business_type),
      escapeCsv(c.website_type),
      c.quoted_price,
      c.total_price,
      c.paid_amount,
      c.remaining_amount,
      escapeCsv(c.payment_status),
      escapeCsv(c.status),
      c.lead_score,
      escapeCsv(c.lead_temperature),
      escapeCsv(c.tags),
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
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// ULTRA FEATURE 10 & 11 & 37 & 50: ADVANCED FINANCIAL & FUNNEL ANALYTICS
// =============================================================================

ultraRouter.get('/analytics/revenue', requireAuth, (_req, res) => {
  try {
    const finRow = dbGet<any>(`
      SELECT
        COALESCE(SUM(total_price), 0) as totalQuoted,
        COALESCE(SUM(paid_amount), 0) as totalCollected,
        COALESCE(SUM(remaining_amount), 0) as totalPending,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paidCustomersCount,
        COUNT(CASE WHEN payment_status = 'pending' THEN 1 END) as pendingCustomersCount,
        COUNT(CASE WHEN payment_status = 'partial' THEN 1 END) as partialCustomersCount,
        COUNT(*) as totalCustomers
      FROM customers
      WHERE deleted_at IS NULL
    `) || {};

    // Today's collection
    const todayPay = dbGet<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE date(payment_date) = date("now")');
    // Weekly collection (last 7 days)
    const weekPay = dbGet<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE date(payment_date) >= date("now", "-7 days")');
    // Monthly collection (current month)
    const monthPay = dbGet<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE strftime("%Y-%m", payment_date) = strftime("%Y-%m", "now")');
    // Yearly collection (current year)
    const yearPay = dbGet<{ total: number }>('SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE strftime("%Y", payment_date) = strftime("%Y", "now")');

    // Demand by website type
    const websiteDemand = dbAll<any>(`
      SELECT w.name, COUNT(c.id) as count, COALESCE(SUM(c.total_price), 0) as revenue
      FROM website_types w
      LEFT JOIN customers c ON c.website_type_id = w.id AND c.deleted_at IS NULL
      GROUP BY w.id
      ORDER BY count DESC
      LIMIT 6
    `);

    // Demand by business type
    const businessDemand = dbAll<any>(`
      SELECT b.name, COUNT(c.id) as count, COALESCE(SUM(c.total_price), 0) as revenue
      FROM business_types b
      LEFT JOIN customers c ON c.business_type_id = b.id AND c.deleted_at IS NULL
      GROUP BY b.id
      ORDER BY count DESC
      LIMIT 6
    `);

    res.json({
      totalQuoted: finRow.totalQuoted || 0,
      totalCollected: finRow.totalCollected || 0,
      totalPending: finRow.totalPending || 0,
      todayCollection: todayPay?.total || 0,
      weeklyCollection: weekPay?.total || 0,
      monthlyCollection: monthPay?.total || 0,
      yearlyCollection: yearPay?.total || 0,
      paidCustomersCount: finRow.paidCustomersCount || 0,
      pendingCustomersCount: finRow.pendingCustomersCount || 0,
      partialCustomersCount: finRow.partialCustomersCount || 0,
      totalCustomers: finRow.totalCustomers || 0,
      websiteDemand,
      businessDemand
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.get('/analytics/funnel', requireAuth, (_req, res) => {
  try {
    const totalRow = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL') || { count: 0 };
    const total = totalRow.count || 1;

    const stagesDef = [
      { key: 'New', label: 'New Inquiries', filter: "status = 'New'" },
      { key: 'Contacted', label: 'Contacted', filter: "status IN ('Contacted', 'Call Back')" },
      { key: 'Interested', label: 'Interested Leads', filter: "status = 'Interested'" },
      { key: 'Agreed', label: 'Agreed / Finalizing', filter: "status = 'Agreed'" },
      { key: 'Quotation', label: 'Quotation Sent', filter: "id IN (SELECT DISTINCT customer_id FROM quotations)" },
      { key: 'Payment', label: 'Payment Received', filter: "paid_amount > 0" },
      { key: 'Completed', label: 'Completed Projects', filter: "status = 'Agreed' AND remaining_amount = 0" }
    ];

    const funnel = stagesDef.map(st => {
      const row = dbGet<{ count: number }>(`SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL AND ${st.filter}`);
      const count = row?.count || 0;
      return {
        stage: st.key,
        label: st.label,
        count,
        percentage: Math.min(100, Math.round((count / total) * 100))
      };
    });

    res.json({ totalCustomers: total, funnel });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

ultraRouter.get('/analytics/calls', requireAuth, (_req, res) => {
  try {
    const totalRow = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM call_notes') || { count: 0 };
    const outcomes = dbAll<any>(`
      SELECT call_result, COUNT(*) as count
      FROM call_notes
      GROUP BY call_result
      ORDER BY count DESC
    `);

    // Trend by last 7 days
    const trends = dbAll<any>(`
      SELECT date(created_at) as call_date, COUNT(*) as calls_count
      FROM call_notes
      WHERE date(created_at) >= date('now', '-6 days')
      GROUP BY date(created_at)
      ORDER BY call_date ASC
    `);

    res.json({
      totalCalls: totalRow.count,
      outcomes,
      trends
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// ULTRA FEATURE 29: SYSTEM HEALTH & ADMIN ACTIVITY
// =============================================================================

ultraRouter.get('/system/health', requireAuth, (_req, res) => {
  try {
    const custCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL');
    const trashCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NOT NULL');
    const callsCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM call_notes');
    const payCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM payments');
    const auditCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM audit_logs');

    const memUsage = process.memoryUsage();

    res.json({
      status: 'ONLINE',
      uptime_seconds: Math.round(process.uptime()),
      database: {
        engine: 'SQLite3 WASM (ACID Compliant)',
        status: 'CONNECTED',
        persistence: 'Atomic Disk Write-Ahead (data/waqar_crm.sqlite)',
        active_customers: custCount?.count || 0,
        recycle_bin_count: trashCount?.count || 0,
        total_calls_logged: callsCount?.count || 0,
        total_payments_recorded: payCount?.count || 0,
        total_audit_events: auditCount?.count || 0
      },
      system: {
        node_version: process.version,
        rss_memory_mb: Math.round(memUsage.rss / 1024 / 1024),
        heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024)
      },
      app_version: '3.0.0-PRO'
    });
  } catch (err: any) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

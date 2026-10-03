import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import bcrypt from 'bcryptjs';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'waqar_crm.sqlite');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

let SQL: SqlJsStatic;
let db: Database;
let isSaving = false;
let pendingSave = false;

// Persist SQLite DB to disk atomically
export function persistDatabase() {
  if (!db) return;
  if (isSaving) {
    pendingSave = true;
    return;
  }
  isSaving = true;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, buffer);
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Failed to persist database to disk:', err);
  } finally {
    isSaving = false;
    if (pendingSave) {
      pendingSave = false;
      persistDatabase();
    }
  }
}

// Database helper functions for standard query access
export function dbAll<T = any>(sql: string, params: any[] = []): T[] {
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('SQL dbAll error:', err, 'Query:', sql);
    throw err;
  }
}

export function dbGet<T = any>(sql: string, params: any[] = []): T | null {
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    let result: T | null = null;
    if (stmt.step()) {
      result = stmt.getAsObject() as unknown as T;
    }
    stmt.free();
    return result;
  } catch (err) {
    console.error('SQL dbGet error:', err, 'Query:', sql);
    throw err;
  }
}

export function dbRun(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  try {
    db.run(sql, params);
    const res = db.exec("SELECT last_insert_rowid() AS id, changes() AS changes");
    const lastInsertRowid = res[0]?.values[0]?.[0] ? Number(res[0].values[0][0]) : 0;
    const changes = res[0]?.values[0]?.[1] ? Number(res[0].values[0][1]) : 0;
    persistDatabase();
    return { lastInsertRowid, changes };
  } catch (err) {
    console.error('SQL dbRun error:', err, 'Query:', sql);
    throw err;
  }
}

export function dbExec(sql: string) {
  try {
    db.exec(sql);
    persistDatabase();
  } catch (err) {
    console.error('SQL dbExec error:', err);
    throw err;
  }
}

export function dbBulkRun(sql: string, rows: any[][]): number {
  try {
    db.exec('BEGIN TRANSACTION;');
    const stmt = db.prepare(sql);
    for (let i = 0; i < rows.length; i++) {
      stmt.run(rows[i]);
    }
    stmt.free();
    db.exec('COMMIT;');
    persistDatabase();
    return rows.length;
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch (e) {
      // rollback ignore
    }
    console.error('dbBulkRun error:', err);
    throw err;
  }
}

// Initialize Database schema and default seeds
export async function initDatabase(): Promise<Database> {
  if (db) return db;

  SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      console.log('✅ Loaded existing SQLite database from disk.');
    } catch (e) {
      console.warn('⚠️ Could not read existing DB file, creating a fresh one.', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('✨ Initialized new SQLite database.');
  }

  // Schema creation
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS business_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS website_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inquiry_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      business_name TEXT,
      business_type_id INTEGER REFERENCES business_types(id) ON DELETE SET NULL,
      address TEXT,
      website_type_id INTEGER REFERENCES website_types(id) ON DELETE SET NULL,
      website_name TEXT,
      quoted_price REAL NOT NULL DEFAULT 0,
      total_price REAL NOT NULL DEFAULT 0,
      advance_payment REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      remaining_amount REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      status TEXT NOT NULL DEFAULT 'New',
      inquiry_date TEXT NOT NULL DEFAULT (date('now')),
      follow_up_date TEXT,
      follow_up_time TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT,
      deleted_by TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
    CREATE INDEX IF NOT EXISTS idx_customers_follow_up_date ON customers(follow_up_date);
    CREATE INDEX IF NOT EXISTS idx_customers_deleted ON customers(deleted_at);

    CREATE TABLE IF NOT EXISTS call_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      phone TEXT NOT NULL,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      reminder_note TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_call_schedules_date ON call_schedules(scheduled_date, status);

    CREATE TABLE IF NOT EXISTS call_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      admin_id INTEGER REFERENCES users(id),
      call_result TEXT NOT NULL,
      note_text TEXT NOT NULL,
      next_follow_up_date TEXT,
      next_follow_up_time TEXT,
      new_status TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customer_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      activity_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id_str TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      payment_date TEXT NOT NULL DEFAULT (date('now')),
      transaction_ref TEXT,
      note TEXT,
      created_by TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
      amount REAL NOT NULL,
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL,
      remaining_amount REAL NOT NULL,
      date TEXT NOT NULL DEFAULT (date('now')),
      receipt_data_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS uploaded_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_username TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS backup_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      customer_count INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      items_json TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      validity_date TEXT,
      terms TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'Draft',
      created_by TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_quotations_cust ON quotations(customer_id);
    CREATE INDEX IF NOT EXISTS idx_quotations_num ON quotations(quotation_number);

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT UNIQUE NOT NULL,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      quotation_id INTEGER REFERENCES quotations(id) ON DELETE SET NULL,
      items_json TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      remaining_amount REAL NOT NULL DEFAULT 0,
      due_date TEXT,
      payment_method TEXT NOT NULL DEFAULT 'Bank Transfer / UPI',
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'Unpaid',
      created_by TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_invoices_cust ON invoices(customer_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_num ON invoices(invoice_number);

    CREATE TABLE IF NOT EXISTS whatsapp_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      template_body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS smart_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      reminder_type TEXT NOT NULL DEFAULT 'one-time',
      remind_at TEXT NOT NULL,
      recurring_pattern TEXT,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_reminders_date ON smart_reminders(remind_at, status);

    CREATE TABLE IF NOT EXISTS saved_filters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      filter_params_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customer_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      category TEXT NOT NULL DEFAULT 'General',
      content TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notes_cust ON customer_notes(customer_id);
  `);

  // Safe migration for customers table columns if not exists
  const alterColumns = [
    { name: 'email', def: 'TEXT' },
    { name: 'lead_score', def: 'INTEGER DEFAULT 50' },
    { name: 'lead_temperature', def: "TEXT DEFAULT 'Warm'" },
    { name: 'tags', def: "TEXT DEFAULT 'INQUIRY'" },
    { name: 'last_contact_date', def: 'TEXT' },
    { name: 'ai_summary', def: 'TEXT' },
    { name: 'ai_suggested_followup', def: 'TEXT' },
    { name: 'ai_talking_points', def: 'TEXT' }
  ];

  for (const col of alterColumns) {
    try {
      dbRun(`ALTER TABLE customers ADD COLUMN ${col.name} ${col.def}`);
    } catch {
      // Column already exists
    }
  }

  // Ensure default Admin User exists (waqar / waqar)
  const existingUser = dbGet<{ id: number }>('SELECT id FROM users WHERE username = ?', ['waqar']);
  if (!existingUser) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('waqar', salt);
    dbRun('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', ['waqar', hash, 'admin']);
    console.log('🔒 Default admin user "waqar" seeded.');
  }

  // Seed standard business types
  const defaultBusinessTypes = [
    'Restaurant', 'Hotel', 'School', 'College', 'Coaching Institute',
    'Hospital', 'Clinic', 'Gym', 'Clothing Store', 'Grocery Store',
    'Medical Store', 'Cafe', 'Salon', 'Real Estate', 'Travel Agency',
    'Photography', 'Digital Marketing', 'Portfolio', 'E-commerce', 'Local Business', 'Other'
  ];
  for (const bType of defaultBusinessTypes) {
    const exists = dbGet('SELECT id FROM business_types WHERE name = ?', [bType]);
    if (!exists) {
      dbRun('INSERT INTO business_types (name) VALUES (?)', [bType]);
    }
  }

  // Seed standard website types
  const defaultWebsiteTypes = [
    'Business Website', 'Restaurant Website', 'Portfolio Website', 'E-commerce Website',
    'School Website', 'Coaching Website', 'Institute Website', 'Hotel Website',
    'Hospital Website', 'Landing Page', 'Web Application', 'Custom Website', 'Other'
  ];
  for (const wType of defaultWebsiteTypes) {
    const exists = dbGet('SELECT id FROM website_types WHERE name = ?', [wType]);
    if (!exists) {
      dbRun('INSERT INTO website_types (name) VALUES (?)', [wType]);
    }
  }

  // Seed sample initial customers if table is empty
  const customerCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM customers WHERE deleted_at IS NULL');
  if (customerCount && customerCount.count === 0) {
    const sampleCustomers = [
      {
        inquiry_id: 'WWI-2026-001',
        name: 'Rahul Kumar',
        phone: '9876543210',
        business_name: 'Royal Spice Restaurant & Lounge',
        business_type_id: 1, // Restaurant
        address: 'Sector 18, Commercial Hub, Noida, UP',
        website_type_id: 2, // Restaurant Website
        website_name: 'royalspicerestaurant.com',
        quoted_price: 25000,
        total_price: 22000,
        advance_payment: 10000,
        paid_amount: 10000,
        remaining_amount: 12000,
        payment_status: 'partial',
        status: 'Agreed',
        inquiry_date: '2026-10-01',
        follow_up_date: '2026-10-04',
        follow_up_time: '14:00',
        notes: 'Requested online table booking system, digital menu QR code and food gallery.'
      },
      {
        inquiry_id: 'WWI-2026-002',
        name: 'Amit Sharma',
        phone: '9811223344',
        business_name: 'Apex Academy Coaching Institute',
        business_type_id: 5, // Coaching Institute
        address: 'MG Road, Civil Lines, Jaipur, Rajasthan',
        website_type_id: 6, // Coaching Website
        website_name: 'apexcoachinginstitute.in',
        quoted_price: 35000,
        total_price: 30000,
        advance_payment: 15000,
        paid_amount: 15000,
        remaining_amount: 15000,
        payment_status: 'partial',
        status: 'Interested',
        inquiry_date: '2026-10-02',
        follow_up_date: '2026-10-03',
        follow_up_time: '16:30',
        notes: 'Student admission form, course syllabus download and fee structure page.'
      },
      {
        inquiry_id: 'WWI-2026-003',
        name: 'Priya Verma',
        phone: '9722334455',
        business_name: 'Glamour Chic Unisex Salon',
        business_type_id: 13, // Salon
        address: 'Bandra West, Hill Road, Mumbai, Maharashtra',
        website_type_id: 1, // Business Website
        website_name: 'glamourchicsalon.com',
        quoted_price: 18000,
        total_price: 18000,
        advance_payment: 18000,
        paid_amount: 18000,
        remaining_amount: 0,
        payment_status: 'paid',
        status: 'Success',
        inquiry_date: '2026-09-28',
        follow_up_date: '2026-10-05',
        follow_up_time: '11:00',
        notes: 'Project completed successfully! Client highly satisfied with booking widget.'
      },
      {
        inquiry_id: 'WWI-2026-004',
        name: 'Vikram Singh',
        phone: '9910022334',
        business_name: 'Grand Heritage Hotel',
        business_type_id: 2, // Hotel
        address: 'Fatehabad Road, Tourist Complex, Agra',
        website_type_id: 8, // Hotel Website
        website_name: 'grandheritagehotel.com',
        quoted_price: 45000,
        total_price: 40000,
        advance_payment: 0,
        paid_amount: 0,
        remaining_amount: 40000,
        payment_status: 'pending',
        status: 'Call Back',
        inquiry_date: '2026-10-02',
        follow_up_date: '2026-10-03',
        follow_up_time: '18:00',
        notes: 'Asked to call tomorrow evening after management meeting.'
      },
      {
        inquiry_id: 'WWI-2026-005',
        name: 'Dr. Suresh Mehta',
        phone: '9845012345',
        business_name: 'Mehta Dental & Care Clinic',
        business_type_id: 7, // Clinic
        address: 'Indiranagar 100ft Road, Bengaluru, Karnataka',
        website_type_id: 9, // Hospital Website
        website_name: 'mehtadentalcare.com',
        quoted_price: 22000,
        total_price: 20000,
        advance_payment: 5000,
        paid_amount: 5000,
        remaining_amount: 15000,
        payment_status: 'partial',
        status: 'New',
        inquiry_date: '2026-10-03',
        follow_up_date: '2026-10-04',
        follow_up_time: '10:30',
        notes: 'Fresh inquiry from referral. Needs appointment scheduling and doctor profile.'
      }
    ];

    for (const cust of sampleCustomers) {
      const res = dbRun(`
        INSERT INTO customers (
          inquiry_id, name, phone, business_name, business_type_id, address,
          website_type_id, website_name, quoted_price, total_price, advance_payment,
          paid_amount, remaining_amount, payment_status, status, inquiry_date,
          follow_up_date, follow_up_time, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        cust.inquiry_id, cust.name, cust.phone, cust.business_name, cust.business_type_id,
        cust.address, cust.website_type_id, cust.website_name, cust.quoted_price,
        cust.total_price, cust.advance_payment, cust.paid_amount, cust.remaining_amount,
        cust.payment_status, cust.status, cust.inquiry_date, cust.follow_up_date,
        cust.follow_up_time, cust.notes
      ]);

      const custId = res.lastInsertRowid;

      // Seed initial activity
      dbRun(`
        INSERT INTO customer_activity (customer_id, activity_type, title, description)
        VALUES (?, 'inquiry_created', 'New Inquiry Received', ?)
      `, [custId, `Inquiry generated for ${cust.business_name} (${cust.name})`]);

      // Seed payment and receipt if advance paid
      if (cust.advance_payment > 0) {
        const payRes = dbRun(`
          INSERT INTO payments (payment_id_str, customer_id, amount, payment_method, payment_date, transaction_ref, note, created_by)
          VALUES (?, ?, ?, 'UPI', date('now'), 'UPI-REF-2026-892', 'Advance token payment', 'waqar')
        `, [`PAY-${custId}-001`, custId, cust.advance_payment]);

        const recNum = `WWI-REC-2026-${String(custId).padStart(5, '0')}`;
        dbRun(`
          INSERT INTO receipts (receipt_number, customer_id, payment_id, amount, total_amount, paid_amount, remaining_amount, date)
          VALUES (?, ?, ?, ?, ?, ?, ?, date('now'))
        `, [recNum, custId, payRes.lastInsertRowid, cust.advance_payment, cust.total_price, cust.paid_amount, cust.remaining_amount]);

        dbRun(`
          INSERT INTO customer_activity (customer_id, activity_type, title, description)
          VALUES (?, 'payment_received', 'Payment Received', ?)
        `, [custId, `Received ₹${cust.advance_payment.toLocaleString()} via UPI (Receipt: ${recNum})`]);
      }

      // Schedule call
      if (cust.follow_up_date) {
        dbRun(`
          INSERT INTO call_schedules (customer_id, phone, scheduled_date, scheduled_time, reminder_note, status)
          VALUES (?, ?, ?, ?, ?, 'scheduled')
        `, [custId, cust.phone, cust.follow_up_date, cust.follow_up_time || '11:00', cust.notes]);
      }
    }
    console.log('🚀 Seeded initial sample customer records with payments, schedules and activities.');
  }

  // Seed default WhatsApp templates if empty
  const templateCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM whatsapp_templates');
  if (templateCount && templateCount.count === 0) {
    const defaultTemplates = [
      {
        title: 'Initial Welcome & Enquiry Response',
        category: 'Welcome',
        body: 'Hello {name}, this is Waqar regarding your website enquiry for {business}. We specialize in high-converting modern websites. When is a good time for a quick 5-minute chat to discuss your requirements?'
      },
      {
        title: 'Follow-up on Proposed Website',
        category: 'Follow-up',
        body: 'Hi {name}, hope you are doing well! Following up on our conversation regarding the {website} for {business}. Have you had a chance to review our ideas? We are ready to start building whenever you give the green light.'
      },
      {
        title: 'Quotation Shared & Next Steps',
        category: 'Quotation',
        body: 'Dear {name}, thank you for your interest! We have prepared a customized website development quotation for {business} with a total investment of {amount}. Let us know if you would like any adjustments.'
      },
      {
        title: 'Friendly Payment Milestone Reminder',
        category: 'Payment',
        body: 'Hello {name}, this is a gentle reminder regarding the remaining milestone balance of {due} for the {business} website project. Please let us know once transferred so our team can immediately proceed to final launch.'
      },
      {
        title: 'Payment Received & Digital Receipt',
        category: 'Thank You',
        body: 'Thank you {name}! We have received your payment of {amount} for {business}. Your official digital receipt has been generated. Thank you for choosing Waqar Website Enquiry!'
      },
      {
        title: 'Website Launch & Ready for Review',
        category: 'Delivery',
        body: 'Exciting news {name}! The initial staging preview for {business} is live and ready for your review. Please check it out and let us know your feedback.'
      }
    ];

    for (const t of defaultTemplates) {
      dbRun('INSERT INTO whatsapp_templates (title, category, template_body) VALUES (?, ?, ?)', [t.title, t.category, t.body]);
    }
    console.log('📱 Seeded default WhatsApp message templates.');
  }

  // Seed default saved filters if empty
  const filterCount = dbGet<{ count: number }>('SELECT COUNT(*) as count FROM saved_filters');
  if (filterCount && filterCount.count === 0) {
    const defaultFilters = [
      { name: "Today's Follow-ups", params: JSON.stringify({ follow_up_today: 'true' }) },
      { name: '🔥 Hot Leads (Score 75+)', params: JSON.stringify({ min_score: 75 }) },
      { name: 'Pending Payments', params: JSON.stringify({ payment_status: 'pending' }) },
      { name: 'Overdue Calls', params: JSON.stringify({ overdue_only: 'true' }) },
      { name: 'High Value Projects (₹25k+)', params: JSON.stringify({ min_price: 25000 }) }
    ];

    for (const f of defaultFilters) {
      dbRun('INSERT INTO saved_filters (name, filter_params_json) VALUES (?, ?)', [f.name, f.params]);
    }
    console.log('🔍 Seeded default saved filters.');
  }

  // Ensure initial sample customers have lead scores and tags
  try {
    dbRun(`
      UPDATE customers SET
        lead_score = CASE
          WHEN status = 'Agreed' THEN 88
          WHEN status = 'Interested' THEN 75
          WHEN status = 'Call Back' THEN 60
          WHEN status = 'New' THEN 50
          ELSE 35
        END,
        lead_temperature = CASE
          WHEN status = 'Agreed' THEN 'Hot'
          WHEN status = 'Interested' THEN 'Hot'
          WHEN status = 'Call Back' THEN 'Warm'
          ELSE 'Cold'
        END,
        tags = CASE
          WHEN status = 'Agreed' THEN 'HOT,HIGH VALUE'
          WHEN status = 'Interested' THEN 'FOLLOW-UP,WEBSITE'
          ELSE 'INQUIRY'
        END
      WHERE lead_score IS NULL OR lead_score = 0
    `);
  } catch {
    // Ignore if already set
  }

  persistDatabase();
  return db;
}

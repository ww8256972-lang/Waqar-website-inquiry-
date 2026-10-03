# WAQAR WEBSITE INQUIRY CRM

> **"Manage Every Inquiry. Every Call. Every Customer."**

A complete, production-ready, mobile-first Customer Relationship Management (CRM) web application designed specifically for digital website development agencies and inquiries. Architected to easily manage **10,000+ to 15,000+ customer records** with server-side indexed search, sub-second query performance, ACID transactions, and atomic disk persistence.

---

## 🚀 Key Features

1. **Brand Identity & Animations**:
   - Official circular 3D badge logo ("W / WAQAR WEBSITE ENQUIRY").
   - **2.8-Second Welcome Animation**: Cinematic splash intro with radial glowing orbits, sound-visual design, and smooth dissolve. Re-playable anytime from the top bar.
   - **Continuous Snowfall Particle Animation**: Gentle 60fps canvas snowfall floating across the admin panel, togglable with one click in the header.

2. **Secure Authentication & Admin Control**:
   - Initial credentials:
     - **Username**: `waqar`
     - **Password**: `waqar`
   - Passwords securely hashed with **bcrypt** in the database.
   - Password change supported in Admin Settings.
   - Brute-force protection and rate limiting (locks for 15 minutes after 5 failed attempts).
   - Immutable security audit logs recording every login, status change, and payment.

3. **High-Performance Relational Database**:
   - Powered by WebAssembly SQLite with atomic disk persistence (`data/waqar_crm.sqlite`).
   - Prepared statements with B-Tree indexes on `phone`, `name`, `status`, `follow_up_date`, and `deleted_at`.
   - Scalability verified with a built-in benchmark tool that can generate **1,000 to 15,000 realistic test inquiries** in a single atomic transaction.

4. **Customer Inquiry Management**:
   - Full CRUD: Add, Edit, View Profile, Soft Delete (Trash), Restore, Permanent Delete.
   - One-tap status updates: `New`, `Call Back`, `Interested`, `Not Interested`, `Agreed`, `Pending`, `Success`, `Cancelled`. Every status change automatically creates an activity record.
   - Server-side multi-field search and compound filters (by status, business type, website category, follow-up date, payment status).
   - Server-side pagination (25, 50, 100 per page).

5. **Quick Add Customer (Mobile Optimized)**:
   - Built specifically for one-handed mobile use on Android/iOS.
   - Fast touch-friendly inputs, field validation, duplicate submission protection.

6. **One-Tap Calling & Call Notes**:
   - Direct `tel:` calling on mobile phones.
   - Call log prompt automatically records Call Outcome, Notes, Next Follow-Up Date & Time, and Status into permanent chronological history.

7. **Payments & Professional Receipts**:
   - Transactional payment ledger supporting Cash, UPI, and Bank Transfers.
   - Automatically computes Total Deal Value, Total Paid, and Remaining Balance on the server.
   - Printable formal invoice receipt with company header, receipt number (`WWI-REC-2026-XXXXX`), payment breakdown, and authorized signature.

8. **Restaurant & Business Photo Upload**:
   - Upload multiple restaurant menus, storefronts, and project reference images.
   - Server-side MIME validation (JPEG, PNG, WebP) with thumbnail previews and deletion.

9. **Backups & Disaster Recovery**:
   - Live SQLite binary database snapshot download (`.sqlite`).
   - One-click CSV export of all inquiries.
   - Comprehensive Privacy & Data Retention policy modal.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Motion.
- **Backend**: Node.js, Express, tsx.
- **Database**: SQLite (ACID compliant, relational with foreign keys and B-Tree indexes).
- **Authentication**: JWT (JSON Web Tokens), bcryptjs, cookie-parser.
- **File Storage**: Multer with localized filesystem persistence (`/uploads`).

---

## ⚙️ Environment Variables

Defined in `.env.example`:
```env
JWT_SECRET="waqar_crm_super_secure_jwt_token_key_change_in_production"
DATABASE_FILE="./data/waqar_crm.sqlite"
UPLOAD_DIR="./uploads"
PORT=3000
```

---

## 🏃 Running the Application

```bash
# Start fullstack development server (Express + Vite on Port 3000)
npm run dev

# Compile TypeScript and build production bundle
npm run build

# Start production server
npm start
```

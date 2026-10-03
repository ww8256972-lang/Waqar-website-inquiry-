import React from 'react';
import { X, ShieldCheck, Lock, Database, UserCheck } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Privacy & Data Governance Policy</h2>
              <p className="text-xs text-slate-400">WAQAR WEBSITE INQUIRY</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              1. What Information is Collected
            </h3>
            <p>
              We collect prospect contact details (Name, Phone Number, Business Name, Business Category), website requirements, quoted deal prices, payment transaction references, notes from phone conversations, follow-up call schedules, and uploaded restaurant/business storefront photos.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              2. Purpose of Data Collection
            </h3>
            <p>
              Data is strictly used for client customer relationship management, coordinating website design milestones, issuing formal digital receipts, scheduling follow-up telephone calls, and ensuring project deliverables are executed on time.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              3. Data Storage & Security Architecture
            </h3>
            <p>
              All customer data is stored in a normalized relational database engine using prepared statements, ACID-compliant transactions, and atomic write-ahead disk persistence. Passwords are never stored in plaintext and are securely hashed using industry-standard bcrypt algorithms. API routes are protected by authenticated JSON Web Tokens and login rate limiters.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              4. Access Control & Authorization
            </h3>
            <p>
              Access to customer inquiries, financial receipts, and uploaded photos is restricted exclusively to authorized administrators. Unauthenticated requests are rejected immediately with 401 Unauthorized status codes.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              5. Data Retention & Soft Delete Safeguards
            </h3>
            <p>
              Accidental record deletion is prevented through a two-stage soft-delete mechanism. Deleted customers are moved to the Trash bin where they may be restored at any time. Permanent deletion requires explicit administrative confirmation.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              6. Administrator & Contact Information
            </h3>
            <p>
              For inquiries regarding data protection or backup restorations, contact administrator Waqar via the internal settings console.
            </p>
          </section>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};

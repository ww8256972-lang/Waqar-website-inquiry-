import React, { useState, useRef } from 'react';
import { CreditCard, Printer, Download, Plus, Trash2, X, CheckCircle, Sparkles, Building, Phone } from 'lucide-react';
import { Customer, QuotationItem } from '../types';
import { api } from '../api/client';

interface InvoiceModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  customer,
  isOpen,
  onClose,
  onCreated
}) => {
  const [items, setItems] = useState<QuotationItem[]>([
    { description: 'Website Development & Production Deployment', quantity: 1, rate: 20000, amount: 20000 }
  ]);
  const [paidAmount, setPaidAmount] = useState<number>(customer?.paid_amount || 0);
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI / Net Banking');
  const [dueDate, setDueDate] = useState<string>(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('Thank you for partnering with Waqar Website Enquiry. All deliverables covered under 30-day warranty.');
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !customer) return null;

  const totalAmount = items.reduce((acc, it) => acc + (parseFloat(it.amount as any) || 0), 0);
  const remainingAmount = Math.max(0, totalAmount - (paidAmount || 0));

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { description: 'Cloud Infrastructure & High-Speed Hosting', quantity: 1, rate: 3000, amount: 3000 }
    ]);
  };

  const handleUpdateItem = (index: number, field: keyof QuotationItem, val: any) => {
    setItems(prev => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: val };
      if (field === 'quantity' || field === 'rate') {
        const q = parseFloat(field === 'quantity' ? val : item.quantity) || 0;
        const r = parseFloat(field === 'rate' ? val : item.rate) || 0;
        item.amount = q * r;
      }
      copy[index] = item;
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveInvoice = async () => {
    setSubmitting(true);
    try {
      const res = await api.createInvoice({
        customer_id: customer.id,
        items,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        due_date: dueDate,
        payment_method: paymentMethod,
        notes
      });
      setCreatedInvoice({
        invoice_number: res.invoice_number,
        status: res.status
      });
      onCreated?.();
    } catch (err: any) {
      alert(err.message || 'Failed to issue invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in duration-150 text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 no-print">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Invoice Generator</h2>
              <p className="text-xs text-slate-400">Issue official bill for {customer.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable invoice */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div className="bg-slate-950 border border-slate-800 p-5 sm:p-8 rounded-2xl space-y-6 text-white printable-area">
            {/* Top Brand Bar */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-emerald-500/40 bg-slate-900 flex items-center justify-center">
                  <img src="/logo.png" alt="Waqar Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h1 className="text-base font-black text-white tracking-tight">WAQAR WEBSITE ENQUIRY</h1>
                  <p className="text-[11px] text-emerald-400 font-semibold">Web Development & Digital Invoicing</p>
                  <p className="text-[10px] text-slate-400">GST: 07AAAPW1234F1Z9 &bull; Support: inquiries@waqarwebsite.com</p>
                </div>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest">
                  Tax Invoice
                </span>
                <div className="text-xs font-mono font-bold text-white mt-1.5">
                  {createdInvoice?.invoice_number || 'WWI-INV-2026-DRAFT'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Billed To */}
            <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Billed To:</span>
                <div className="font-bold text-white text-sm mt-0.5">{customer.name}</div>
                <div className="text-slate-300 font-semibold">{customer.business_name}</div>
                <div className="text-slate-400 text-[11px]">{customer.phone}</div>
                {customer.address && <div className="text-slate-400 text-[11px]">{customer.address}</div>}
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Payment Details:</span>
                <div className="font-semibold text-emerald-400 mt-0.5">{paymentMethod}</div>
                <div className="text-slate-400 text-[11px]">Due Date: {dueDate}</div>
                <div className="text-[10px] font-bold mt-1">
                  Status: <span className={remainingAmount === 0 ? 'text-emerald-400' : 'text-amber-400'}>{remainingAmount === 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID')}</span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">Description</th>
                    <th className="pb-2 w-16 text-center">Qty</th>
                    <th className="pb-2 w-24 text-right">Rate</th>
                    <th className="pb-2 w-24 text-right">Total</th>
                    <th className="pb-2 w-8 text-center no-print"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5 pr-2">
                        <input
                          type="text"
                          value={it.description}
                          onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                          className="w-full bg-transparent border-none text-white focus:outline-none focus:bg-slate-900 rounded px-1"
                        />
                      </td>
                      <td className="py-2.5 text-center">
                        <input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value)}
                          className="w-12 text-center bg-transparent border border-slate-800 focus:border-emerald-500 rounded text-white py-0.5"
                        />
                      </td>
                      <td className="py-2.5 text-right font-mono">
                        <input
                          type="number"
                          value={it.rate}
                          onChange={(e) => handleUpdateItem(idx, 'rate', e.target.value)}
                          className="w-20 text-right bg-transparent border border-slate-800 focus:border-emerald-500 rounded text-white py-0.5 font-mono"
                        />
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-white">
                        ₹{(it.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 text-center no-print">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="pt-2 no-print">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-emerald-400 font-semibold hover:bg-slate-850"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>
            </div>

            {/* Total / Paid / Balance Grid */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-3 border-t border-slate-800">
              <div className="flex-1 space-y-2 text-[11px] text-slate-400">
                <div>
                  <span className="font-bold text-slate-300">Payment Instructions:</span>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-[11px] font-mono mt-1 space-y-1">
                    <div>UPI ID: waqarwebsite@icici</div>
                    <div>Account: 012345678901 &bull; IFSC: ICIC0000123</div>
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-60 space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Gross Total:</span>
                  <span className="font-mono text-white font-bold">₹{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400 items-center">
                  <span>Paid / Advance:</span>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="w-24 text-right bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-emerald-400 font-mono font-bold text-xs"
                  />
                </div>
                <div className="flex justify-between text-sm font-black text-amber-400 border-t border-slate-800 pt-2">
                  <span>Balance Due:</span>
                  <span className="font-mono">₹{remainingAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
              <div>Authorized Signatory &bull; Waqar Website Enquiry</div>
              <div className="font-mono">Official Financial Record</div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSaveInvoice}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs shadow-lg active:scale-98 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{createdInvoice ? 'Invoice Issued ✓' : 'Save & Issue Invoice'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

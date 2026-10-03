import React, { useState, useRef } from 'react';
import { FileText, Printer, Download, Plus, Trash2, X, CheckCircle, Sparkles } from 'lucide-react';
import { Customer, QuotationItem } from '../types';
import { api } from '../api/client';

interface QuotationModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export const QuotationModal: React.FC<QuotationModalProps> = ({
  customer,
  isOpen,
  onClose,
  onCreated
}) => {
  const [items, setItems] = useState<QuotationItem[]>([
    { description: 'Custom Responsive Website Design & Development', quantity: 1, rate: 20000, amount: 20000 },
    { description: 'Mobile Optimization, Speed Tuning & WhatsApp Integration', quantity: 1, rate: 5000, amount: 5000 }
  ]);
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [validityDays, setValidityDays] = useState<number>(15);
  const [notes, setNotes] = useState<string>('Includes 1 year free domain & cloud hosting setup, SSL certificate, and 30-day technical support.');
  const [terms, setTerms] = useState<string>('1. 50% advance to start work. 2. 50% upon final staging review before public launch.');
  const [createdQuotation, setCreatedQuotation] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !customer) return null;

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { description: 'Search Engine Optimization (SEO) & Google Business Listing', quantity: 1, rate: 3000, amount: 3000 }
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

  const subtotal = items.reduce((acc, it) => acc + (parseFloat(it.amount as any) || 0), 0);
  const total = Math.max(0, subtotal - (discount || 0) + (tax || 0));

  const handleSaveQuotation = async () => {
    setSubmitting(true);
    try {
      const validityDate = new Date(Date.now() + validityDays * 86400000).toISOString().split('T')[0];
      const res = await api.createQuotation({
        customer_id: customer.id,
        items,
        discount_amount: discount,
        tax_amount: tax,
        validity_date: validityDate,
        terms,
        notes
      });
      setCreatedQuotation({
        quotation_number: res.quotation_number,
        total_amount: res.total_amount,
        validity_date: validityDate
      });
      onCreated?.();
    } catch (err: any) {
      alert(err.message || 'Failed to generate quotation');
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
            <div className="p-2 rounded-xl bg-blue-500/15 text-cyan-400 border border-blue-500/25">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Quotation Generator</h2>
              <p className="text-xs text-slate-400">Client: {customer.name} ({customer.business_name || 'Business'})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable quotation sheet */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div ref={printRef} className="bg-slate-950 border border-slate-800 p-5 sm:p-8 rounded-2xl space-y-6 text-white printable-area">
            {/* Top Company Brand Bar */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-cyan-500/40 bg-slate-900 flex items-center justify-center">
                  <img src="/logo.png" alt="Waqar Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h1 className="text-base font-black text-white tracking-tight">WAQAR WEBSITE ENQUIRY</h1>
                  <p className="text-[11px] text-cyan-400 font-semibold">Web Development & Digital Solutions</p>
                  <p className="text-[10px] text-slate-400">Delhi NCR &bull; Contact: Waqar &bull; inquiries@waqarwebsite.com</p>
                </div>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-600/20 text-cyan-400 border border-blue-500/30 uppercase tracking-widest">
                  Official Quotation
                </span>
                <div className="text-xs font-mono font-bold text-white mt-1.5">
                  {createdQuotation?.quotation_number || 'WWI-QT-2026-DRAFT'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>

            {/* Client Info Grid */}
            <div className="grid grid-cols-2 gap-4 p-3.5 bg-slate-900/60 rounded-xl border border-slate-800/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Quotation Prepared For:</span>
                <div className="font-bold text-white text-sm mt-0.5">{customer.name}</div>
                <div className="text-slate-300 font-semibold">{customer.business_name}</div>
                <div className="text-slate-400 text-[11px]">{customer.phone}</div>
                {customer.address && <div className="text-slate-400 text-[11px]">{customer.address}</div>}
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Project Scope:</span>
                <div className="font-semibold text-cyan-400 mt-0.5">{customer.website_type_name || 'Custom Website'}</div>
                <div className="text-slate-400 text-[11px]">{customer.website_name || 'New Web Portal'}</div>
                <div className="text-[10px] text-amber-400 font-semibold mt-1">
                  Valid Until: {createdQuotation?.validity_date || new Date(Date.now() + validityDays * 86400000).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                    <th className="pb-2">Description / Deliverables</th>
                    <th className="pb-2 w-16 text-center">Qty</th>
                    <th className="pb-2 w-24 text-right">Rate</th>
                    <th className="pb-2 w-24 text-right">Amount</th>
                    <th className="pb-2 w-8 text-center no-print"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {items.map((it, idx) => (
                    <tr key={idx} className="group">
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
                          className="w-12 text-center bg-transparent border border-slate-800 focus:border-cyan-500 rounded text-white py-0.5"
                        />
                      </td>
                      <td className="py-2.5 text-right font-mono">
                        <input
                          type="number"
                          value={it.rate}
                          onChange={(e) => handleUpdateItem(idx, 'rate', e.target.value)}
                          className="w-20 text-right bg-transparent border border-slate-800 focus:border-cyan-500 rounded text-white py-0.5 font-mono"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 font-semibold hover:bg-slate-850"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-3 border-t border-slate-800">
              <div className="flex-1 space-y-2 text-[11px] text-slate-400">
                <div>
                  <span className="font-bold text-slate-300">Notes & Inclusions:</span>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white text-xs mt-1"
                  />
                </div>
                <div>
                  <span className="font-bold text-slate-300">Payment Terms:</span>
                  <input
                    type="text"
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-white text-xs mt-1"
                  />
                </div>
              </div>

              <div className="w-full sm:w-60 space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-white">₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400 items-center">
                  <span>Discount:</span>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-20 text-right bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-white font-mono text-xs"
                  />
                </div>
                <div className="flex justify-between text-slate-400 items-center">
                  <span>Tax / GST:</span>
                  <input
                    type="number"
                    value={tax}
                    onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                    className="w-20 text-right bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-white font-mono text-xs"
                  />
                </div>
                <div className="flex justify-between text-sm font-black text-cyan-400 border-t border-slate-800 pt-2">
                  <span>Total Amount:</span>
                  <span className="font-mono">₹{total.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Signature & Disclaimer */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
              <div>
                <span>Authorized Signatory &bull; Waqar Website Enquiry</span>
              </div>
              <div className="font-mono">
                Generated via Waqar Website Enquiry CRM
              </div>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSaveQuotation}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg active:scale-98 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{createdQuotation ? 'Quotation Saved ✓' : 'Save & Issue Quotation'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

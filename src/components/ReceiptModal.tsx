import React, { useRef } from 'react';
import { Receipt } from '../types';
import { X, Printer, CheckCircle, Sparkles, Building, Phone, Calendar, CreditCard } from 'lucide-react';

interface ReceiptModalProps {
  receipt: Receipt | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose
}) => {
  const receiptRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Controls Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Payment Receipt</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono">
              {receipt.receipt_number}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div
          ref={receiptRef}
          className="p-6 sm:p-8 bg-slate-950 text-slate-100 font-sans print:p-0 print:bg-white print:text-black"
        >
          {/* Brand Header */}
          <div className="flex items-start justify-between border-b border-slate-800 print:border-gray-300 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden shadow-md bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white print:text-black">
                  WAQAR WEBSITE INQUIRY
                </h1>
                <p className="text-[10px] text-cyan-400 print:text-blue-600 font-bold tracking-wider uppercase">
                  Digital Website Development Services
                </p>
                <p className="text-[10px] text-slate-400 print:text-gray-500">
                  Customer & Inquiry Management Suite
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded bg-emerald-500/10 print:bg-green-100 text-emerald-400 print:text-green-700 text-xs font-black uppercase tracking-wider border border-emerald-500/20 print:border-green-300">
                OFFICIAL RECEIPT
              </span>
              <p className="text-xs font-mono font-bold text-slate-300 print:text-black mt-1">
                {receipt.receipt_number}
              </p>
              <p className="text-[11px] text-slate-500 print:text-gray-500">
                Date: {receipt.date}
              </p>
            </div>
          </div>

          {/* Customer & Business Info */}
          <div className="grid grid-cols-2 gap-4 py-5 border-b border-slate-800 print:border-gray-300 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 print:text-gray-400 block mb-1">
                Billed To
              </span>
              <div className="font-bold text-sm text-white print:text-black">
                {receipt.customer_name}
              </div>
              <div className="text-slate-400 print:text-gray-600 mt-0.5">
                {receipt.customer_phone}
              </div>
              {receipt.address && (
                <div className="text-slate-400 print:text-gray-600 mt-0.5">
                  {receipt.address}
                </div>
              )}
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 print:text-gray-400 block mb-1">
                Project Information
              </span>
              <div className="font-bold text-slate-200 print:text-black">
                {receipt.business_name || 'Website Development Project'}
              </div>
              <div className="text-cyan-400 print:text-blue-600 font-medium mt-0.5">
                {receipt.website_type_name || 'Business Website'}
              </div>
              {receipt.website_name && (
                <div className="text-slate-400 print:text-gray-600 font-mono text-[11px] mt-0.5">
                  {receipt.website_name}
                </div>
              )}
            </div>
          </div>

          {/* Payment Breakdown Table */}
          <div className="py-5">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 print:border-gray-300 text-[10px] text-slate-400 print:text-gray-500 uppercase font-semibold">
                  <th className="pb-2">Description</th>
                  <th className="pb-2">Payment Method</th>
                  <th className="pb-2 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-gray-200 font-medium">
                <tr>
                  <td className="py-3 text-white print:text-black">
                    Website Development & Digital Services
                    {receipt.payment_note && (
                      <span className="block text-[11px] text-slate-400 print:text-gray-500 mt-0.5">
                        Note: {receipt.payment_note}
                      </span>
                    )}
                    {receipt.transaction_ref && (
                      <span className="block text-[11px] text-slate-400 print:text-gray-500 font-mono">
                        Ref / TXN: {receipt.transaction_ref}
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-slate-300 print:text-gray-700">
                    {receipt.payment_method || 'Cash / UPI'}
                  </td>
                  <td className="py-3 text-right font-bold text-emerald-400 print:text-green-700 text-sm">
                    {formatCurrency(receipt.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="pt-4 border-t border-slate-800 print:border-gray-300 flex justify-end">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400 print:text-gray-600">
                <span>Total Project Price:</span>
                <span className="font-bold text-white print:text-black">
                  {formatCurrency(receipt.total_amount)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-400 print:text-green-700 font-semibold">
                <span>Total Amount Paid:</span>
                <span>{formatCurrency(receipt.paid_amount)}</span>
              </div>
              <div className="flex justify-between text-amber-400 print:text-red-600 font-bold border-t border-slate-800 print:border-gray-300 pt-2 text-sm">
                <span>Remaining Balance:</span>
                <span>{formatCurrency(receipt.remaining_amount)}</span>
              </div>
            </div>
          </div>

          {/* Footer & Signature */}
          <div className="mt-8 pt-6 border-t border-slate-800 print:border-gray-300 flex items-center justify-between text-[11px] text-slate-500 print:text-gray-500">
            <div>
              <p className="font-bold text-slate-300 print:text-black">
                Authorized By: Waqar (Administrator)
              </p>
              <p>Thank you for choosing Waqar Website Inquiry.</p>
            </div>
            <div className="text-right">
              <div className="w-32 border-b border-slate-700 print:border-gray-400 mb-1" />
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Authorized Signatory
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

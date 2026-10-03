import React, { useState, useEffect } from 'react';
import { CustomerStatus, BusinessType, WebsiteType } from '../types';
import { api } from '../api/client';
import {
  X,
  User,
  Phone,
  Building,
  Briefcase,
  MapPin,
  Globe,
  IndianRupee,
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCustomerId?: number) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessTypeId, setBusinessTypeId] = useState<number | ''>('');
  const [address, setAddress] = useState('');
  const [websiteTypeId, setWebsiteTypeId] = useState<number | ''>('');
  const [websiteName, setWebsiteName] = useState('');
  const [totalPrice, setTotalPrice] = useState<string>('25000');
  const [advancePayment, setAdvancePayment] = useState<string>('5000');
  const [status, setStatus] = useState<CustomerStatus>('New');
  const [followUpDate, setFollowUpDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [followUpTime, setFollowUpTime] = useState('11:00');
  const [notes, setNotes] = useState('');

  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [websiteTypes, setWebsiteTypes] = useState<WebsiteType[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getBusinessTypes().then(setBusinessTypes).catch(console.error);
      api.getWebsiteTypes().then(setWebsiteTypes).catch(console.error);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // Prevent duplicate accidental submissions

    setError(null);
    setSuccessMsg(null);

    // Validation
    if (!name.trim()) {
      setError('Please enter the customer name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter a valid phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createCustomer({
        name: name.trim(),
        phone: phone.trim(),
        business_name: businessName.trim() || undefined,
        business_type_id: businessTypeId ? Number(businessTypeId) : undefined,
        address: address.trim() || undefined,
        website_type_id: websiteTypeId ? Number(websiteTypeId) : undefined,
        website_name: websiteName.trim() || undefined,
        quoted_price: parseFloat(totalPrice) || 0,
        total_price: parseFloat(totalPrice) || 0,
        advance_payment: parseFloat(advancePayment) || 0,
        status,
        follow_up_date: followUpDate || undefined,
        follow_up_time: followUpTime || undefined,
        notes: notes.trim() || undefined
      });

      if (res.success) {
        setSuccessMsg('Customer saved successfully.');
        setTimeout(() => {
          onSuccess(res.customer_id);
          onClose();
          // Reset form
          setName('');
          setPhone('');
          setBusinessName('');
          setNotes('');
        }, 600);
      } else {
        setError('Customer could not be saved. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to create customer:', err);
      setError(err.message || 'Customer could not be saved. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div>
            <h2 className="text-base sm:text-lg font-black text-white">
              QUICK ADD CUSTOMER
            </h2>
            <p className="text-xs text-slate-400">
              One-touch high-speed inquiry creation
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alert Notifications */}
        {error && (
          <div className="m-4 p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="m-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 font-bold">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Customer Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Customer Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Kumar"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Business Name & Business Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Business / Restaurant Name
              </label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Royal Spice Restaurant"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Business Type
              </label>
              <select
                value={businessTypeId}
                onChange={(e) => setBusinessTypeId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="">Select Category...</option>
                {businessTypes.map((bt) => (
                  <option key={bt.id} value={bt.id}>
                    {bt.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Website Type & Domain Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Website Type
              </label>
              <select
                value={websiteTypeId}
                onChange={(e) => setWebsiteTypeId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="">Select Website Type...</option>
                {websiteTypes.map((wt) => (
                  <option key={wt.id} value={wt.id}>
                    {wt.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Proposed Domain / Website Name
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={websiteName}
                  onChange={(e) => setWebsiteName(e.target.value)}
                  placeholder="e.g. royalspice.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Rate & Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Total Deal Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={totalPrice}
                onChange={(e) => setTotalPrice(e.target.value)}
                placeholder="25000"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Advance Token (₹)
              </label>
              <input
                type="number"
                min="0"
                value={advancePayment}
                onChange={(e) => setAdvancePayment(e.target.value)}
                placeholder="5000"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Remaining Balance
              </label>
              <div className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-amber-400 flex items-center">
                ₹{Math.max(0, (parseFloat(totalPrice) || 0) - (parseFloat(advancePayment) || 0)).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Status & Follow-up */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CustomerStatus)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="New">New</option>
                <option value="Call Back">Call Back</option>
                <option value="Interested">Interested</option>
                <option value="Agreed">Agreed</option>
                <option value="Pending">Pending</option>
                <option value="Success">Success</option>
                <option value="Not Interested">Not Interested</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Follow-up Date
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Follow-up Time
              </label>
              <input
                type="time"
                value={followUpTime}
                onChange={(e) => setFollowUpTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Address & Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Address / City
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Sector 18, Commercial Hub, Noida"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Inquiry Requirements & Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Client requirements, specific features (e.g. food menu, table reservation, payment gateway)..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm shadow-[0_0_25px_rgba(59,130,246,0.4)] transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Save Customer Inquiry</span>
                  <ArrowRight className="w-4 h-4 stroke-[3]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

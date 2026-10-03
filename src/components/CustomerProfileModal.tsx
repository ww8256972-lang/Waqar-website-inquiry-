import React, { useState, useEffect, useCallback } from 'react';
import { Customer, CallNote, CallSchedule, Payment, Receipt, UploadedPhoto, CustomerActivity, Quotation, Invoice, TimelineEvent } from '../types';
import { api } from '../api/client';
import {
  X,
  Phone,
  Calendar,
  CreditCard,
  FileText,
  Clock,
  Image as ImageIcon,
  Building,
  Globe,
  MapPin,
  Edit2,
  Trash2,
  Plus,
  Receipt as ReceiptIcon,
  CheckCircle2,
  Upload,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  MessageSquare,
  Sparkles,
  Flame,
  Send,
  Copy,
  Check,
  Tag,
  RefreshCw,
  Sliders,
  DollarSign
} from 'lucide-react';

interface CustomerProfileModalProps {
  customerId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onInitiateCall: (customer: { id: number; name: string; phone: string }) => void;
  onViewReceipt: (receipt: Receipt) => void;
  onCustomerUpdated: () => void;
  onOpenWhatsApp?: (customer: Customer) => void;
  onOpenQuotation?: (customer: Customer) => void;
  onOpenInvoice?: (customer: Customer) => void;
  onOpenReminder?: (customer: Customer) => void;
}

type TabType = 'overview' | 'ai_assistant' | 'timeline_360' | 'quotations' | 'invoices' | 'notes' | 'calls' | 'payments' | 'photos';

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  customerId,
  isOpen,
  onClose,
  onInitiateCall,
  onViewReceipt,
  onCustomerUpdated,
  onOpenWhatsApp,
  onOpenQuotation,
  onOpenInvoice,
  onOpenReminder
}) => {
  const [data, setData] = useState<{
    customer: Customer;
    notes: CallNote[];
    calls: CallSchedule[];
    payments: Payment[];
    receipts: Receipt[];
    photos: UploadedPhoto[];
    activities: CustomerActivity[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);

  // AI Assistant State
  const [aiAssistantData, setAiAssistantData] = useState<{
    suggested_followup_date: string;
    suggested_message: string;
    talking_points: string[];
    next_action: string;
    summary: string;
  } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [copiedAiMsg, setCopiedAiMsg] = useState(false);

  // Timeline 360 State
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Quotations & Invoices
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Structured Notes
  const [structuredNotes, setStructuredNotes] = useState<any[]>([]);
  const [newNoteCategory, setNewNoteCategory] = useState<'General' | 'Call' | 'Payment' | 'Meeting' | 'Internal'>('General');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Lead score override dialog
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [overrideScoreVal, setOverrideScoreVal] = useState('80');
  const [overrideTempVal, setOverrideTempVal] = useState<'Hot' | 'Warm' | 'Cold'>('Hot');
  const [overrideReason, setOverrideReason] = useState('');

  // Sub-modals for Payment
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Edit Customer State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBusiness, setEditBusiness] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState('');

  // File Upload State
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      const [profileRes, qtRes, invRes, notesRes] = await Promise.all([
        api.getCustomer(customerId),
        api.getQuotations({ customer_id: customerId }),
        api.getInvoices({ customer_id: customerId }),
        api.getCustomerNotes(customerId)
      ]);

      setData(profileRes);
      setQuotations(qtRes || []);
      setInvoices(invRes || []);
      setStructuredNotes(notesRes || []);

      // Pre-fill edit
      setEditName(profileRes.customer.name);
      setEditPhone(profileRes.customer.phone);
      setEditBusiness(profileRes.customer.business_name || '');
      setEditPrice(String(profileRes.customer.total_price));
      setEditStatus(profileRes.customer.status);
      setEditNotes(profileRes.customer.notes || '');
      setEditTags(profileRes.customer.tags || '');
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (isOpen && customerId) {
      loadProfile();
      setActiveTab('overview');
      setIsEditing(false);
      setShowAddPayment(false);
      setAiAssistantData(null);
    }
  }, [isOpen, customerId, loadProfile]);

  // Load AI Assistant on demand when tab clicked
  const handleLoadAiAssistant = async () => {
    if (!customerId) return;
    setLoadingAi(true);
    try {
      const res = await api.getAiAssistant(customerId);
      setAiAssistantData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAi(false);
    }
  };

  // Load Timeline 360
  const handleLoadTimeline = async () => {
    if (!customerId) return;
    setLoadingTimeline(true);
    try {
      const res = await api.getTimeline360(customerId);
      setTimelineEvents(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleRecalculateScore = async () => {
    if (!customerId) return;
    try {
      const res = await api.calculateAiScore(customerId);
      if (data?.customer) {
        setData({
          ...data,
          customer: {
            ...data.customer,
            lead_score: res.lead_score,
            lead_temperature: res.lead_temperature
          }
        });
      }
      onCustomerUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to recalculate score');
    }
  };

  const handleOverrideScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    try {
      await api.overrideAiScore(customerId, {
        score: parseInt(overrideScoreVal) || 50,
        temperature: overrideTempVal,
        reason: overrideReason
      });
      setShowScoreModal(false);
      loadProfile();
      onCustomerUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to override score');
    }
  };

  const handleCopyPhone = () => {
    if (!data?.customer.phone) return;
    navigator.clipboard.writeText(data.customer.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    try {
      await api.updateCustomer(customerId, {
        name: editName,
        phone: editPhone,
        business_name: editBusiness,
        total_price: parseFloat(editPrice) || 0,
        status: editStatus as any,
        notes: editNotes,
        tags: editTags
      });
      setIsEditing(false);
      loadProfile();
      onCustomerUpdated();
    } catch (err) {
      alert('Failed to update customer');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return;
    const num = parseFloat(paymentAmount);
    if (!num || num <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      setPaymentSubmitting(true);
      const res = await api.recordPayment(customerId, {
        amount: num,
        payment_method: paymentMethod,
        transaction_ref: paymentRef,
        note: paymentNote
      });

      setShowAddPayment(false);
      setPaymentAmount('');
      setPaymentRef('');
      setPaymentNote('');
      loadProfile();
      onCustomerUpdated();

      if (res.receipt_id) {
        const fullReceipt = await api.getReceipt(res.receipt_id);
        onViewReceipt(fullReceipt);
      }
    } catch (err: any) {
      alert(err.message || 'Payment recording failed');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleAddStructuredNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !newNoteContent.trim()) return;
    setSubmittingNote(true);
    try {
      await api.createCustomerNote(customerId, {
        category: newNoteCategory,
        content: newNoteContent.trim()
      });
      setNewNoteContent('');
      const updatedNotes = await api.getCustomerNotes(customerId);
      setStructuredNotes(updatedNotes);
      onCustomerUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteStructuredNote = async (noteId: number) => {
    if (!customerId || !window.confirm('Delete this note?')) return;
    try {
      await api.deleteCustomerNote(customerId, noteId);
      const updatedNotes = await api.getCustomerNotes(customerId);
      setStructuredNotes(updatedNotes);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!customerId) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('photos', files[i]);
    }

    try {
      setUploadingFiles(true);
      await api.uploadPhotos(customerId, formData);
      loadProfile();
      onCustomerUpdated();
    } catch (err: any) {
      alert(err.message || 'Photo upload failed');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!window.confirm('Delete this photo?')) return;
    try {
      await api.deletePhoto(photoId);
      loadProfile();
      onCustomerUpdated();
    } catch (err) {
      alert('Failed to delete photo');
    }
  };

  const formatCurrency = (val: number = 0) => `₹${val.toLocaleString('en-IN')}`;

  if (!isOpen || !customerId) return null;
  const c = data?.customer;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200 text-xs">
        {/* Profile Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 via-cyan-500 to-blue-700 text-white flex items-center justify-center font-black text-xl shadow-lg shrink-0 ring-2 ring-cyan-500/20">
              {c?.name ? c.name.charAt(0).toUpperCase() : 'C'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white">{c?.name}</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  {c?.status}
                </span>

                {/* Lead Score Badge */}
                <button
                  onClick={() => setShowScoreModal(true)}
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border transition-all ${
                    (c?.lead_score || 50) >= 70
                      ? 'bg-red-500/15 text-red-300 border-red-500/30'
                      : (c?.lead_score || 50) >= 45
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                  title="Click to view or override lead score"
                >
                  <Flame className="w-3 h-3 text-red-400" />
                  <span>Score: {c?.lead_score || 50}/100 ({c?.lead_temperature || 'Warm'})</span>
                </button>

                <span className="text-[10px] text-slate-500 font-mono">
                  #{c?.inquiry_id}
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-400 mt-1 flex-wrap">
                <span>{c?.business_name || 'Individual Prospect'}</span>
                <span>&bull;</span>
                <span className="font-mono text-slate-300">{c?.phone}</span>
                <button
                  onClick={handleCopyPhone}
                  className="p-1 text-slate-500 hover:text-white transition-colors"
                  title="Copy Phone Number"
                >
                  {copiedPhone ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
            {c && (
              <>
                {onOpenWhatsApp && (
                  <button
                    onClick={() => onOpenWhatsApp(c)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold text-xs border border-emerald-500/30 transition-all active:scale-95"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                )}

                <button
                  onClick={() => onInitiateCall({ id: c.id, name: c.name, phone: c.phone })}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
                >
                  <Phone className="w-3.5 h-3.5 fill-current" />
                  <span>Call Now</span>
                </button>
              </>
            )}

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition-colors"
              title="Edit Customer"
            >
              <Edit2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-6 border-b border-slate-800 bg-slate-950/40 overflow-x-auto scrollbar-none text-xs">
          {[
            { id: 'overview', label: 'Overview', icon: Building },
            { id: 'ai_assistant', label: 'AI Follow-up', icon: Sparkles },
            { id: 'timeline_360', label: 'Customer 360', icon: Clock },
            { id: 'quotations', label: `Quotations (${quotations.length})`, icon: FileText },
            { id: 'invoices', label: `Invoices (${invoices.length})`, icon: CreditCard },
            { id: 'notes', label: `Notes (${structuredNotes.length})`, icon: FileText },
            { id: 'calls', label: `Calls (${data?.calls.length || 0})`, icon: Phone },
            { id: 'payments', label: `Payments (${data?.payments.length || 0})`, icon: DollarSign },
            { id: 'photos', label: `Photos (${data?.photos.length || 0})`, icon: ImageIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  if (tab.id === 'ai_assistant' && !aiAssistantData) handleLoadAiAssistant();
                  if (tab.id === 'timeline_360' && timelineEvents.length === 0) handleLoadTimeline();
                }}
                className={`flex items-center gap-1.5 py-3 px-3 border-b-2 font-semibold transition-all shrink-0 ${
                  activeTab === tab.id
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-2">
              <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500 font-mono">Loading Customer 360 profile...</p>
            </div>
          ) : isEditing ? (
            /* Edit Form */
            <form onSubmit={handleSaveEdit} className="space-y-4 max-w-lg mx-auto">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                Edit Customer Details
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Business Name</label>
                <input
                  type="text"
                  value={editBusiness}
                  onChange={(e) => setEditBusiness(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Total Price (₹)</label>
                  <input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="New">New</option>
                    <option value="Call Back">Call Back</option>
                    <option value="Interested">Interested</option>
                    <option value="Agreed">Agreed</option>
                    <option value="Pending">Pending</option>
                    <option value="Success">Success</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Not Interested">Not Interested</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Smart Tags (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. HOT, HIGH VALUE, ECOMMERCE"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Requirements & Brief</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && c && (
                <div className="space-y-6">
                  {/* Lead Score & Inactivity Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-purple-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                        <Flame className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">Lead Conversion Score:</span>
                          <span className="text-base font-black text-cyan-400 font-mono">{c.lead_score || 50}/100</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-200">
                            {c.lead_temperature || 'Warm'} Lead
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Calculated from project size, client engagement, call frequency, and payment signals.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRecalculateScore}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Recalculate</span>
                      </button>
                      <button
                        onClick={() => setShowScoreModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-cyan-300 hover:text-white text-xs font-semibold border border-blue-500/30 transition-colors"
                      >
                        Override Score
                      </button>
                    </div>
                  </div>

                  {/* Payment Timeline Diagram */}
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white uppercase text-[10px] tracking-wider">
                        Payment Timeline & Financial Progression
                      </span>
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        Total Deal: {formatCurrency(c.total_price)}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-2">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-500 block">1. Quoted</span>
                        <span className="font-bold text-white text-xs font-mono">{formatCurrency(c.quoted_price)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-500 block">2. Advance</span>
                        <span className="font-bold text-emerald-400 text-xs font-mono">{formatCurrency(c.advance_payment)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-500 block">3. Total Paid</span>
                        <span className="font-bold text-emerald-400 text-xs font-mono">{formatCurrency(c.paid_amount)}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                        <span className="text-[10px] text-slate-500 block">4. Remaining</span>
                        <span className="font-bold text-amber-400 text-xs font-mono">{formatCurrency(c.remaining_amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Requirements & Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-850 space-y-3">
                      <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Business & Website Scope</h4>
                      <div>
                        <span className="text-slate-500 block">Category:</span>
                        <span className="text-slate-200 font-semibold">{c.business_type_name || 'Not specified'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Website Architecture:</span>
                        <span className="text-cyan-400 font-semibold">{c.website_type_name || 'Standard Website'}</span>
                      </div>
                      {c.website_name && (
                        <div>
                          <span className="text-slate-500 block">Domain / URL:</span>
                          <span className="text-white font-mono">{c.website_name}</span>
                        </div>
                      )}
                      {c.tags && (
                        <div>
                          <span className="text-slate-500 block mb-1">Tags:</span>
                          <div className="flex flex-wrap gap-1">
                            {c.tags.split(',').map((t, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-cyan-300 border border-slate-700 font-mono">
                                {t.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-850 space-y-3">
                      <h4 className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Follow-Up & Schedule</h4>
                      <div>
                        <span className="text-slate-500 block">Next Follow-Up:</span>
                        <span className="text-slate-200 font-semibold">
                          {c.follow_up_date ? `${c.follow_up_date} at ${c.follow_up_time || '11:00 AM'}` : 'None scheduled'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">First Inquired On:</span>
                        <span className="text-slate-300">{c.inquiry_date}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Payment Status:</span>
                        <span className="text-cyan-300 font-bold uppercase">{c.payment_status}</span>
                      </div>
                    </div>
                  </div>

                  {c.notes && (
                    <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-850">
                      <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-1">Customer Brief & Notes</h4>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{c.notes}</p>
                    </div>
                  )}

                  {/* Quick Action Footer */}
                  <div className="flex items-center gap-2 pt-2 flex-wrap">
                    {onOpenQuotation && (
                      <button
                        onClick={() => onOpenQuotation(c)}
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Issue Quotation</span>
                      </button>
                    )}

                    {onOpenInvoice && (
                      <button
                        onClick={() => onOpenInvoice(c)}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Issue Invoice</span>
                      </button>
                    )}

                    <button
                      onClick={() => setShowAddPayment(true)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
                    >
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Record Payment</span>
                    </button>

                    {onOpenReminder && (
                      <button
                        onClick={() => onOpenReminder(c)}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Set Reminder</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: AI FOLLOW-UP ASSISTANT */}
              {activeTab === 'ai_assistant' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-cyan-400" />
                      <div>
                        <h3 className="text-sm font-bold text-white">AI Follow-up Advisor</h3>
                        <p className="text-[11px] text-slate-400">Intelligent conversation talking points, timing & proposed messages</p>
                      </div>
                    </div>

                    <button
                      onClick={handleLoadAiAssistant}
                      disabled={loadingAi}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingAi ? 'animate-spin' : ''}`} />
                      <span>{loadingAi ? 'Thinking...' : 'Regenerate'}</span>
                    </button>
                  </div>

                  {loadingAi ? (
                    <div className="py-16 text-center space-y-2">
                      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-slate-400 font-mono">Consulting AI model with customer history...</p>
                    </div>
                  ) : aiAssistantData ? (
                    <div className="space-y-4">
                      {/* Executive Intent Summary */}
                      <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 text-cyan-200 text-xs">
                        <strong>Customer Intent Summary:</strong> {aiAssistantData.summary}
                      </div>

                      {/* Next Best Action */}
                      <div className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-800/40 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/20 text-cyan-300">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Next Recommended Action:</span>
                          <div className="font-bold text-white text-xs">{aiAssistantData.next_action}</div>
                          <div className="text-[11px] text-cyan-400 font-mono">Suggested Date: {aiAssistantData.suggested_followup_date}</div>
                        </div>
                      </div>

                      {/* Suggested Call Talking Points */}
                      <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                        <span className="font-bold text-white text-xs uppercase tracking-wider block">
                          Suggested Call Talking Points:
                        </span>
                        <ul className="space-y-2 text-xs text-slate-300">
                          {aiAssistantData.talking_points.map((pt, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">
                                {i + 1}
                              </span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Suggested Message with 1-click WhatsApp */}
                      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs uppercase tracking-wider">
                            Suggested WhatsApp Message:
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(aiAssistantData.suggested_message);
                              setCopiedAiMsg(true);
                              setTimeout(() => setCopiedAiMsg(false), 2000);
                            }}
                            className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                          >
                            {copiedAiMsg ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedAiMsg ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>

                        <p className="text-xs text-slate-200 bg-slate-900/80 p-3 rounded-xl border border-slate-800 italic leading-relaxed">
                          "{aiAssistantData.suggested_message}"
                        </p>

                        <div className="flex gap-2 justify-end pt-1">
                          {c && (
                            <button
                              onClick={() => {
                                const cleanPhone = c.phone.replace(/[^0-9]/g, '');
                                const fullPhone = cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : `91${cleanPhone}`;
                                window.open(`https://wa.me/${fullPhone}?text=${encodeURIComponent(aiAssistantData.suggested_message)}`, '_blank');
                              }}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Send this Message via WhatsApp</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center space-y-3">
                      <Sparkles className="w-8 h-8 text-cyan-400/50 mx-auto" />
                      <p className="text-slate-400">Click below to generate personalized follow-up strategy</p>
                      <button
                        onClick={handleLoadAiAssistant}
                        className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold"
                      >
                        Generate AI Follow-up Plan
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: CUSTOMER 360 TIMELINE */}
              {activeTab === 'timeline_360' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Customer 360 Unified Activity Feed
                    </h3>
                    <button onClick={handleLoadTimeline} className="text-cyan-400 hover:text-cyan-300 text-xs">
                      Refresh Feed
                    </button>
                  </div>

                  {loadingTimeline ? (
                    <div className="py-12 text-center text-slate-500">Loading timeline...</div>
                  ) : timelineEvents.length === 0 ? (
                    <p className="text-slate-500 py-8 text-center">No timeline events recorded yet.</p>
                  ) : (
                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                      {timelineEvents.map((ev) => (
                        <div key={ev.id} className="relative">
                          <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-4 ring-slate-900" />
                          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">{ev.title}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(ev.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-slate-300">{ev.description}</p>
                            <span className="text-[10px] text-slate-500 block uppercase">
                              By: {ev.author}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: QUOTATIONS */}
              {activeTab === 'quotations' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Quotations ({quotations.length})
                    </h3>
                    {c && onOpenQuotation && (
                      <button
                        onClick={() => onOpenQuotation(c)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Quotation</span>
                      </button>
                    )}
                  </div>

                  {quotations.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                      <p className="text-slate-400">No formal quotations created for this customer yet.</p>
                      {c && onOpenQuotation && (
                        <button
                          onClick={() => onOpenQuotation(c)}
                          className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
                        >
                          Generate First Quotation
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {quotations.map((q) => (
                        <div key={q.id} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-cyan-400">{q.quotation_number}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                {q.status}
                              </span>
                            </div>
                            <div className="text-slate-400 text-xs mt-1">
                              Valid Until: {q.validity_date || 'N/A'} &bull; {new Date(q.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-black text-sm text-white">
                              ₹{q.total_amount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: INVOICES */}
              {activeTab === 'invoices' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Tax Invoices ({invoices.length})
                    </h3>
                    {c && onOpenInvoice && (
                      <button
                        onClick={() => onOpenInvoice(c)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Issue Invoice</span>
                      </button>
                    )}
                  </div>

                  {invoices.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                      <p className="text-slate-400">No invoices generated yet.</p>
                      {c && onOpenInvoice && (
                        <button
                          onClick={() => onOpenInvoice(c)}
                          className="mt-3 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                        >
                          Issue New Invoice
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {invoices.map((inv) => (
                        <div key={inv.id} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-emerald-400">{inv.invoice_number}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                                {inv.status}
                              </span>
                            </div>
                            <div className="text-slate-400 text-xs mt-1">
                              Payment Method: {inv.payment_method} &bull; Due: {inv.due_date || 'On Receipt'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-black text-sm text-white">
                              ₹{inv.total_amount.toLocaleString()}
                            </div>
                            <div className="text-[10px] text-amber-400 font-mono">
                              Remaining: ₹{inv.remaining_amount.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: STRUCTURED NOTES */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <span className="font-bold text-white text-xs">Add Structured Note</span>
                    <form onSubmit={handleAddStructuredNote} className="space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={newNoteCategory}
                          onChange={(e) => setNewNoteCategory(e.target.value as any)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                        >
                          <option value="General">General</option>
                          <option value="Call">Call Log</option>
                          <option value="Meeting">Client Meeting</option>
                          <option value="Payment">Payment Note</option>
                          <option value="Internal">Internal Team Note</option>
                        </select>
                        <input
                          type="text"
                          required
                          value={newNoteContent}
                          onChange={(e) => setNewNoteContent(e.target.value)}
                          placeholder="Type notes from your conversation or requirement update..."
                          className="flex-1 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                        />
                        <button
                          type="submit"
                          disabled={submittingNote}
                          className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
                        >
                          Add Note
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="space-y-2">
                    {structuredNotes.length === 0 ? (
                      <p className="text-slate-500 py-6 text-center">No structured notes added yet.</p>
                    ) : (
                      structuredNotes.map((n) => (
                        <div key={n.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-cyan-300">
                                {n.category}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(n.created_at).toLocaleString()}
                              </span>
                              <span className="text-[10px] text-slate-500">by {n.author}</span>
                            </div>
                            <p className="text-slate-200 text-xs">{n.content}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteStructuredNote(n.id)}
                            className="text-slate-500 hover:text-red-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 7: CALLS */}
              {activeTab === 'calls' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Scheduled Calls & Activity
                    </h3>
                    {c && onOpenReminder && (
                      <button
                        onClick={() => onOpenReminder(c)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Schedule Call</span>
                      </button>
                    )}
                  </div>

                  {(!data?.calls || data.calls.length === 0) ? (
                    <p className="text-xs text-slate-500 py-8 text-center">No calls scheduled for this customer.</p>
                  ) : (
                    data.calls.map((cal) => (
                      <div key={cal.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-850 text-xs flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{cal.scheduled_date} &bull; {cal.scheduled_time}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                              {cal.status}
                            </span>
                          </div>
                          {cal.reminder_note && (
                            <p className="text-slate-400 mt-0.5">{cal.reminder_note}</p>
                          )}
                        </div>
                        {c && (
                          <button
                            onClick={() => onInitiateCall({ id: c.id, name: c.name, phone: c.phone })}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 fill-current" />
                            <span>Call</span>
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 8: PAYMENTS */}
              {activeTab === 'payments' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      Payment History & Receipts
                    </h3>
                    <button
                      onClick={() => setShowAddPayment(true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  </div>

                  {(!data?.payments || data.payments.length === 0) ? (
                    <p className="text-xs text-slate-500 py-8 text-center">No payments recorded yet.</p>
                  ) : (
                    data.payments.map((p) => {
                      const receipt = data.receipts.find((r) => r.payment_id === p.id);
                      return (
                        <div key={p.id} className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-850 text-xs flex items-center justify-between">
                          <div>
                            <div className="font-extrabold text-sm text-emerald-400 font-mono">
                              {formatCurrency(p.amount)}
                            </div>
                            <div className="text-slate-400 mt-0.5">
                              {p.payment_method} &bull; {p.payment_date}
                              {p.transaction_ref && <span className="font-mono text-[11px] ml-1">({p.transaction_ref})</span>}
                            </div>
                            {p.note && <div className="text-slate-500 text-[11px] mt-0.5">{p.note}</div>}
                          </div>

                          {receipt && (
                            <button
                              onClick={() => onViewReceipt(receipt)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs transition-colors"
                            >
                              <ReceiptIcon className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 9: PHOTOS */}
              {activeTab === 'photos' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-300">Restaurant & Storefront Photos</h3>
                      <p className="text-[11px] text-slate-500">Upload business menus, storefronts, and design assets</p>
                    </div>

                    <label className="cursor-pointer px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingFiles ? 'Uploading...' : 'Upload Photos'}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoUpload}
                        disabled={uploadingFiles}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {(!data?.photos || data.photos.length === 0) ? (
                    <div className="py-12 border-2 border-dashed border-slate-800 rounded-2xl text-center">
                      <ImageIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 font-medium">No business photos uploaded yet.</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">JPEG, PNG, or WebP up to 10MB.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {data.photos.map((ph) => (
                        <div key={ph.id} className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video">
                          <img
                            src={ph.file_path}
                            alt={ph.file_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <a
                              href={ph.file_path}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-xs"
                            >
                              View
                            </a>
                            <button
                              onClick={() => handleDeletePhoto(ph.id)}
                              className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-500 text-xs"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal: Lead Score Override */}
        {showScoreModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-red-400" />
                  <span>Manual Lead Score Override</span>
                </h3>
                <button onClick={() => setShowScoreModal(false)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleOverrideScoreSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Score (0–100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={overrideScoreVal}
                    onChange={(e) => setOverrideScoreVal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Temperature</label>
                  <select
                    value={overrideTempVal}
                    onChange={(e) => setOverrideTempVal(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="Hot">Hot Lead</option>
                    <option value="Warm">Warm Lead</option>
                    <option value="Cold">Cold Lead</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Reason for Override</label>
                  <input
                    type="text"
                    placeholder="e.g. Verbal commitment given over phone"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all mt-2"
                >
                  Save Override
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Payment Nested Box */}
        {showAddPayment && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 shadow-2xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white">Record Customer Payment</h3>
                <button
                  onClick={() => setShowAddPayment(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Amount Paid (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 10000"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-emerald-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reference / Transaction No.
                  </label>
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g. UPI-TXN-982341"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Note
                  </label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                    placeholder="e.g. Milestone 2 completion"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all mt-2"
                >
                  {paymentSubmitting ? 'Recording & Generating Receipt...' : 'Record Payment & Generate Receipt'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

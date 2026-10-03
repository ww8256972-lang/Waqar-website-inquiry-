import React, { useState, useEffect, useCallback } from 'react';
import { Customer, CustomerStatus, BusinessType, WebsiteType } from '../types';
import { api } from '../api/client';
import {
  Search,
  Filter,
  Phone,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  ArrowUpDown,
  Download,
  Calendar,
  Check,
  CreditCard,
  Building2,
  Globe
} from 'lucide-react';

interface CustomersViewProps {
  onSelectCustomer: (id: number) => void;
  onOpenQuickAdd: () => void;
  onInitiateCall: (customer: { id: number; name: string; phone: string }) => void;
}

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'Call Back': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Interested: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  'Not Interested': 'bg-slate-700/30 text-slate-400 border-slate-700/50',
  Agreed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Pending: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Success: 'bg-green-500/20 text-green-300 border-green-500/40',
  Cancelled: 'bg-red-500/15 text-red-400 border-red-500/30'
};

const ALL_STATUSES: CustomerStatus[] = [
  'New',
  'Call Back',
  'Interested',
  'Not Interested',
  'Agreed',
  'Pending',
  'Success',
  'Cancelled'
];

export const CustomersView: React.FC<CustomersViewProps> = ({
  onSelectCustomer,
  onOpenQuickAdd,
  onInitiateCall
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [businessTypeId, setBusinessTypeId] = useState<number | ''>('');
  const [websiteTypeId, setWebsiteTypeId] = useState<number | ''>('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [sortBy, setSortBy] = useState('id');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');

  // Metadata dropdown options
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [websiteTypes, setWebsiteTypes] = useState<WebsiteType[]>([]);
  const [statusMenuOpen, setStatusMenuOpen] = useState<number | null>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Load business & website types once
  useEffect(() => {
    api.getBusinessTypes().then(setBusinessTypes).catch(console.error);
    api.getWebsiteTypes().then(setWebsiteTypes).catch(console.error);
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getCustomers({
        page,
        limit,
        search: debouncedSearch,
        status: status || undefined,
        business_type_id: businessTypeId || undefined,
        website_type_id: websiteTypeId || undefined,
        payment_status: paymentStatus || undefined,
        follow_up: followUp || undefined,
        sort_by: sortBy,
        order
      });

      setCustomers(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, status, businessTypeId, websiteTypeId, paymentStatus, followUp, sortBy, order]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleQuickStatus = async (id: number, newStatus: string) => {
    try {
      // Optimistic update
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus as CustomerStatus } : c))
      );
      setStatusMenuOpen(null);
      await api.quickStatusUpdate(id, newStatus);
    } catch (err) {
      console.error('Status update failed:', err);
      fetchCustomers();
    }
  };

  const handleSoftDelete = async (id: number, name: string) => {
    if (!window.confirm(`Move "${name}" to trash? You can restore it anytime.`)) return;
    try {
      await api.softDeleteCustomer(id);
      fetchCustomers();
    } catch (err) {
      alert('Failed to delete customer');
    }
  };

  const formatCurrency = (val: number = 0) => {
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white">Customer Inquiries</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {total.toLocaleString()} Total
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Realtime database search with server-side pagination & high-speed indexing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/api/export/csv"
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </a>

          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900/70 border border-slate-800 p-3 sm:p-4 rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row gap-2.5">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, business, inquiry ID, notes..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">All Statuses</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Business Type Filter */}
            <select
              value={businessTypeId}
              onChange={(e) => {
                setBusinessTypeId(e.target.value ? Number(e.target.value) : '');
                setPage(1);
              }}
              className="px-2.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 max-w-[140px]"
            >
              <option value="">All Businesses</option>
              {businessTypes.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Follow-up Filter */}
            <select
              value={followUp}
              onChange={(e) => {
                setFollowUp(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Follow-up: Any</option>
              <option value="today">Today's Follow-up</option>
              <option value="upcoming">Upcoming</option>
              <option value="overdue">Overdue</option>
            </select>

            {/* Payment Filter */}
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">Payment: Any</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>

            {/* Reset Filters */}
            {(status || businessTypeId || websiteTypeId || paymentStatus || followUp || search) && (
              <button
                onClick={() => {
                  setStatus('');
                  setBusinessTypeId('');
                  setWebsiteTypeId('');
                  setPaymentStatus('');
                  setFollowUp('');
                  setSearch('');
                  setPage(1);
                }}
                className="px-2.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold shrink-0"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customer List: Cards on mobile, Table on desktop */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-xs text-slate-400 font-mono">Loading Customer Records...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-20 text-center px-4">
            <p className="text-slate-400 text-sm font-semibold">No customer inquiries found</p>
            <p className="text-slate-500 text-xs mt-1">Try adjusting search query or filters.</p>
            <button
              onClick={onOpenQuickAdd}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Customer</span>
            </button>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Customer & Inquiry</th>
                    <th className="py-3 px-3">Business</th>
                    <th className="py-3 px-3">Website</th>
                    <th className="py-3 px-3">Price & Balance</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Follow-up</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {customers.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-850/50 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div
                          onClick={() => onSelectCustomer(c.id)}
                          className="cursor-pointer"
                        >
                          <div className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                            <span>{c.name}</span>
                          </div>
                          <div className="text-slate-400 text-xs font-mono mt-0.5">
                            {c.phone} &bull; <span className="text-[10px] text-slate-500">{c.inquiry_id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-slate-200 font-medium truncate max-w-[150px]">
                          {c.business_name || '—'}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {c.business_type_name || 'General'}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-slate-200 font-medium truncate max-w-[140px]">
                          {c.website_type_name || 'Website'}
                        </div>
                        {c.website_name && (
                          <span className="text-[10px] text-cyan-400 font-mono truncate block">
                            {c.website_name}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-white font-bold">{formatCurrency(c.total_price)}</div>
                        <div className="text-[10px] text-slate-400">
                          Rem: <span className={c.remaining_amount > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                            {formatCurrency(c.remaining_amount)}
                          </span>
                        </div>
                      </td>

                      {/* Status Tag with One-Tap Dropdown */}
                      <td className="py-3 px-3 relative">
                        <button
                          onClick={() => setStatusMenuOpen(statusMenuOpen === c.id ? null : c.id)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-95 ${
                            STATUS_COLORS[c.status] || 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {c.status}
                        </button>

                        {/* One-Tap Status Selector Popover */}
                        {statusMenuOpen === c.id && (
                          <div className="absolute z-30 left-0 top-10 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 space-y-0.5">
                            {ALL_STATUSES.map((st) => (
                              <button
                                key={st}
                                onClick={() => handleQuickStatus(c.id, st)}
                                className={`w-full text-left px-2 py-1 text-xs rounded-lg font-medium transition-colors flex items-center justify-between ${
                                  c.status === st
                                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                              >
                                <span>{st}</span>
                                {c.status === st && <Check className="w-3 h-3 text-cyan-400" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {c.follow_up_date ? (
                          <div className="text-xs text-slate-300 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            <span>{c.follow_up_date}</span>
                            {c.follow_up_time && (
                              <span className="text-[10px] text-slate-500">({c.follow_up_time})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* One-Tap [📞 CALL] button */}
                          <button
                            onClick={() => onInitiateCall({ id: c.id, name: c.name, phone: c.phone })}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
                            title={`Call ${c.name} (${c.phone})`}
                          >
                            <Phone className="w-3.5 h-3.5 fill-current" />
                            <span>CALL</span>
                          </button>

                          <button
                            onClick={() => onSelectCustomer(c.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="View Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleSoftDelete(c.id, c.name)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Move to Trash"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Optimized for One-Hand Phone Usage) */}
            <div className="lg:hidden divide-y divide-slate-800">
              {customers.map((c) => (
                <div key={c.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div
                      onClick={() => onSelectCustomer(c.id)}
                      className="cursor-pointer min-w-0 flex-1"
                    >
                      <div className="font-bold text-sm text-white">
                        {c.name}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {c.phone}
                      </div>
                      {c.business_name && (
                        <div className="text-xs text-cyan-400 font-medium truncate mt-0.5">
                          {c.business_name} ({c.business_type_name || 'Business'})
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <button
                        onClick={() => setStatusMenuOpen(statusMenuOpen === c.id ? null : c.id)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          STATUS_COLORS[c.status] || 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {c.status}
                      </button>

                      {statusMenuOpen === c.id && (
                        <div className="absolute z-30 right-4 mt-6 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 space-y-0.5">
                          {ALL_STATUSES.map((st) => (
                            <button
                              key={st}
                              onClick={() => handleQuickStatus(c.id, st)}
                              className={`w-full text-left px-2 py-1 text-xs rounded-lg font-medium transition-colors flex items-center justify-between ${
                                c.status === st
                                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                              }`}
                            >
                              <span>{st}</span>
                              {c.status === st && <Check className="w-3 h-3 text-cyan-400" />}
                            </button>
                          ))}
                        </div>
                      )}

                      <span className="text-xs font-bold text-white">
                        {formatCurrency(c.total_price)}
                      </span>
                    </div>
                  </div>

                  {/* Financial & Follow-up Badges */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-850">
                    <div>
                      {c.remaining_amount > 0 ? (
                        <span className="text-amber-400 font-semibold">
                          Due: {formatCurrency(c.remaining_amount)}
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-semibold">Fully Paid</span>
                      )}
                    </div>

                    {c.follow_up_date && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-300">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{c.follow_up_date}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons for Mobile */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onInitiateCall({ id: c.id, name: c.name, phone: c.phone })}
                      className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95"
                    >
                      <Phone className="w-3.5 h-3.5 fill-current" />
                      <span>CALL NOW</span>
                    </button>

                    <button
                      onClick={() => onSelectCustomer(c.id)}
                      className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold"
                    >
                      Profile
                    </button>

                    <button
                      onClick={() => handleSoftDelete(c.id, c.name)}
                      className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        <div className="bg-slate-950/80 border-t border-slate-800 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Showing <span className="font-bold text-white">{total > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
              <span className="font-bold text-white">{Math.min(page * limit, total)}</span> of{' '}
              <span className="font-bold text-cyan-400">{total.toLocaleString()}</span> customers
            </span>

            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="ml-2 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none"
            >
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="font-mono text-xs px-2">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

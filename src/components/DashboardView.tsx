import React, { useState, useEffect } from 'react';
import { DashboardStats, Customer } from '../types';
import { api } from '../api/client';
import {
  Users,
  UserPlus,
  PhoneForwarded,
  PhoneCall,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  DollarSign,
  TrendingUp,
  CreditCard,
  Phone,
  ArrowUpRight,
  ExternalLink,
  RefreshCw,
  Plus,
  Calendar,
  Sparkles
} from 'lucide-react';

interface DashboardViewProps {
  onSelectCustomer: (id: number) => void;
  onOpenQuickAdd: () => void;
  setCurrentTab: (tab: string) => void;
  onInitiateCall: (customer: { id: number; name: string; phone: string }) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectCustomer,
  onOpenQuickAdd,
  setCurrentTab,
  onInitiateCall
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatCurrency = (num: number = 0) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-3 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-mono tracking-wide">Loading Inquiry Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-950/60 via-slate-900/80 to-slate-900/60 border border-slate-800 p-4 sm:p-6 rounded-2xl backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Waqar Website Enquiry Dashboard
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Live Real-Time
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            "Manage Every Inquiry. Every Call. Every Customer."
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50"
            title="Refresh Statistics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Quick Add Customer</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Customers */}
        <div
          onClick={() => setCurrentTab('customers')}
          className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Inquiries</span>
            <Users className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {stats?.totalCustomers.toLocaleString() || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <span>All registered inquiries</span>
          </div>
        </div>

        {/* New Inquiries */}
        <div
          onClick={() => setCurrentTab('customers')}
          className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">New Inquiries</span>
            <UserPlus className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-400">
            {stats?.newInquiries.toLocaleString() || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Pending first contact</div>
        </div>

        {/* Today's Follow-ups */}
        <div
          onClick={() => setCurrentTab('customers')}
          className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today Follow-ups</span>
            <Calendar className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400">
            {stats?.todayFollowUps.toLocaleString() || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Scheduled for today</div>
        </div>

        {/* Today's Calls */}
        <div
          onClick={() => setCurrentTab('calls')}
          className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today Calls</span>
            <PhoneCall className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            {stats?.todayCalls.toLocaleString() || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Direct phone calls</div>
        </div>

        {/* Upcoming Calls */}
        <div
          onClick={() => setCurrentTab('calls')}
          className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Upcoming Calls</span>
            <Clock className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-300">
            {stats?.upcomingCalls.toLocaleString() || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Future schedules</div>
        </div>

        {/* Overdue Calls */}
        <div
          onClick={() => setCurrentTab('calls')}
          className="bg-slate-900/80 border border-slate-800 hover:border-red-500/40 p-3.5 sm:p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Overdue Calls</span>
            <AlertTriangle className="w-4 h-4 text-red-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-400">
            {stats?.overdueCalls.toLocaleString() || 0}
          </div>
          <div className="text-[10px] text-red-400/80 mt-1">Needs urgent attention</div>
        </div>
      </div>

      {/* Financials & Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial KPI Card */}
        <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Revenue & Payments</h3>
                  <p className="text-[11px] text-slate-400">Server verified ledger totals</p>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                INR (₹)
              </span>
            </div>

            <div className="space-y-4 my-5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-xs text-slate-300 font-medium">Total Deal Value</span>
                </div>
                <span className="text-base font-extrabold text-white">
                  {formatCurrency(stats?.totalRevenue)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-slate-300 font-medium">Total Collected (Paid)</span>
                </div>
                <span className="text-base font-extrabold text-emerald-400">
                  {formatCurrency(stats?.totalPaid)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs text-slate-300 font-medium">Pending Balance</span>
                </div>
                <span className="text-base font-extrabold text-amber-400">
                  {formatCurrency(stats?.pendingPayments)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Collection Ratio</span>
            <span className="font-mono text-cyan-400 font-bold">
              {stats?.totalRevenue
                ? `${Math.round(((stats.totalPaid || 0) / stats.totalRevenue) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Status Distribution Grid */}
        <div className="lg:col-span-2 bg-slate-900/85 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Inquiry Pipeline Status</h3>
              <p className="text-[11px] text-slate-400">One-tap lifecycle conversion</p>
            </div>
            <button
              onClick={() => setCurrentTab('customers')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Interested */}
            <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-900/50 hover:border-blue-700/50 transition-colors">
              <div className="text-[11px] font-semibold text-blue-400">Interested</div>
              <div className="text-xl font-black text-white mt-1">{stats?.interested || 0}</div>
              <div className="text-[10px] text-slate-400">Warm prospects</div>
            </div>

            {/* Call Back */}
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/50 hover:border-amber-700/50 transition-colors">
              <div className="text-[11px] font-semibold text-amber-400">Call Back</div>
              <div className="text-xl font-black text-white mt-1">{stats?.callBack || 0}</div>
              <div className="text-[10px] text-slate-400">Follow-up requested</div>
            </div>

            {/* Agreed */}
            <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-900/50 hover:border-cyan-700/50 transition-colors">
              <div className="text-[11px] font-semibold text-cyan-400">Agreed</div>
              <div className="text-xl font-black text-white mt-1">{stats?.agreed || 0}</div>
              <div className="text-[10px] text-slate-400">Deal closed verbally</div>
            </div>

            {/* Success */}
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/50 hover:border-emerald-700/50 transition-colors">
              <div className="text-[11px] font-semibold text-emerald-400">Successful</div>
              <div className="text-xl font-black text-white mt-1">{stats?.successProjects || 0}</div>
              <div className="text-[10px] text-slate-400">Completed websites</div>
            </div>

            {/* Pending */}
            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-900/50 hover:border-purple-700/50 transition-colors">
              <div className="text-[11px] font-semibold text-purple-400">Pending Decision</div>
              <div className="text-xl font-black text-white mt-1">{stats?.pending || 0}</div>
              <div className="text-[10px] text-slate-400">Quotes under review</div>
            </div>

            {/* Not Interested */}
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="text-[11px] font-semibold text-slate-400">Not Interested</div>
              <div className="text-xl font-black text-white mt-1">{stats?.notInterested || 0}</div>
              <div className="text-[10px] text-slate-500">Declined offer</div>
            </div>

            {/* Cancelled */}
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-900/50 hover:border-red-700/50 transition-colors">
              <div className="text-[11px] font-semibold text-red-400">Cancelled</div>
              <div className="text-xl font-black text-white mt-1">{stats?.cancelledProjects || 0}</div>
              <div className="text-[10px] text-slate-500">Project terminated</div>
            </div>

            {/* Conversion */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-center">
              <div className="text-[10px] font-semibold text-slate-400">Conversion Rate</div>
              <div className="text-lg font-black text-cyan-300">
                {stats?.totalCustomers
                  ? `${Math.round(((stats.successProjects + stats.agreed) / stats.totalCustomers) * 100)}%`
                  : '0%'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Inquiries & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inquiries with One-Tap Call */}
        <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Recent Customer Inquiries</h3>
            </div>
            <button
              onClick={() => setCurrentTab('customers')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
            >
              <span>Manage All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {(!stats?.recentInquiries || stats.recentInquiries.length === 0) ? (
              <p className="text-xs text-slate-500 py-6 text-center">No inquiries logged yet.</p>
            ) : (
              stats.recentInquiries.map((cust) => (
                <div
                  key={cust.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-850 hover:border-cyan-500/30 transition-all group"
                >
                  <div
                    onClick={() => onSelectCustomer(cust.id)}
                    className="cursor-pointer min-w-0 flex-1 pr-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors truncate">
                        {cust.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-300 shrink-0">
                        {cust.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">
                      {cust.business_name || 'Individual Inquiry'} &bull; {cust.phone}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* One-Tap [📞 CALL] button */}
                    <button
                      onClick={() => onInitiateCall({ id: cust.id, name: cust.name, phone: cust.phone })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
                      title={`Call ${cust.name} (${cust.phone})`}
                    >
                      <Phone className="w-3.5 h-3.5 fill-current" />
                      <span>CALL</span>
                    </button>

                    <button
                      onClick={() => onSelectCustomer(cust.id)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="View Profile"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Timeline Stream */}
        <div className="bg-slate-900/85 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Live Activity & History Timeline</h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Realtime updates</span>
          </div>

          <div className="space-y-3">
            {(!stats?.recentActivities || stats.recentActivities.length === 0) ? (
              <p className="text-xs text-slate-500 py-6 text-center">No activity history recorded yet.</p>
            ) : (
              stats.recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/40 border border-slate-850 text-xs"
                >
                  <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-200">
                        {act.title} &bull; <span className="text-cyan-400 font-semibold">{act.customer_name}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                        {act.created_at ? new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    {act.description && (
                      <p className="text-slate-400 mt-0.5 line-clamp-2">{act.description}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

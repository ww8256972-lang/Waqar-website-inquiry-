import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, CreditCard, ArrowUpRight, BarChart3, Users, Filter, CheckCircle2, Clock, PhoneCall, RefreshCw } from 'lucide-react';
import { RevenueAnalytics, FunnelStage, CallAnalytics } from '../types';
import { api } from '../api/client';

export const RevenueAnalyticsView: React.FC = () => {
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [funnel, setFunnel] = useState<FunnelStage[]>([]);
  const [callStats, setCallStats] = useState<CallAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [revData, funData, callData] = await Promise.all([
        api.getRevenueAnalytics(),
        api.getFunnelAnalytics(),
        api.getCallAnalytics()
      ]);
      setRevenue(revData);
      setFunnel(funData.funnel || []);
      setCallStats(callData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (val: number = 0) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  if (loading && !revenue) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400 font-mono">Aggregating Financial & Pipeline Analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-8 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-950/60 via-slate-900/80 to-purple-950/40 border border-slate-800 p-5 sm:p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white">Revenue & Sales Funnel Analytics</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Live Real-Time
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track business collections, lead conversion funnel and call outcome analytics
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold">Refresh Analytics</span>
        </button>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Quoted */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Quoted</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {formatCurrency(revenue?.totalQuoted)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Across all inquiry pipelines</div>
        </div>

        {/* Total Collected */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Collected</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            {formatCurrency(revenue?.totalCollected)}
          </div>
          <div className="text-[10px] text-emerald-500/80 mt-1">Confirmed bank & cash deposits</div>
        </div>

        {/* Pending Balance */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Balance</span>
            <CreditCard className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-400">
            {formatCurrency(revenue?.totalPending)}
          </div>
          <div className="text-[10px] text-amber-500/80 mt-1">Outstanding milestones</div>
        </div>

        {/* Today's Collection */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Today's Collection</span>
            <ArrowUpRight className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-400">
            {formatCurrency(revenue?.todayCollection)}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            Weekly: {formatCurrency(revenue?.weeklyCollection)}
          </div>
        </div>
      </div>

      {/* Lead Conversion Funnel */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Visual Lead Conversion Funnel</h2>
              <p className="text-[11px] text-slate-400">Track client progression from initial inquiry to completed website</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {funnel.map((st, i) => (
            <div key={st.stage} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-slate-800 text-cyan-400 flex items-center justify-center text-[10px] font-mono">
                    {i + 1}
                  </span>
                  <span>{st.label}</span>
                </span>
                <span className="font-mono text-slate-400">
                  <strong className="text-white">{st.count}</strong> clients ({st.percentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, st.percentage)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: Call Outcome Analytics & Industry Demand */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Call Outcomes */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Call Outcome Analytics</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Total: {callStats?.totalCalls || 0} calls
            </span>
          </div>

          <div className="space-y-2">
            {callStats?.outcomes.map((out) => (
              <div key={out.call_result} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="font-semibold text-slate-300">{out.call_result}</span>
                <span className="font-mono font-bold text-cyan-400">{out.count} calls</span>
              </div>
            ))}
          </div>
        </div>

        {/* Website & Business Type Demand */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Top Website Requirements</h3>
            </div>
          </div>

          <div className="space-y-2">
            {revenue?.websiteDemand.map((w) => (
              <div key={w.name} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div>
                  <div className="font-semibold text-white">{w.name}</div>
                  <div className="text-[10px] text-slate-500">{w.count} inquiries</div>
                </div>
                <div className="font-mono font-bold text-emerald-400 text-right">
                  {formatCurrency(w.revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

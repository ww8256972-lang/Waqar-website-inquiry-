import React, { useState, useEffect } from 'react';
import { Calendar, Phone, PhoneForwarded, AlertTriangle, Flame, CreditCard, ArrowRight, MessageSquare, CheckCircle, RefreshCw } from 'lucide-react';
import { Customer, CallSchedule } from '../types';
import { api } from '../api/client';

interface TodayCommandCenterProps {
  onSelectCustomer: (id: number) => void;
  onInitiateCall: (customer: { id: number; name: string; phone: string }) => void;
  onOpenWhatsApp: (customer: Customer) => void;
}

export const TodayCommandCenter: React.FC<TodayCommandCenterProps> = ({
  onSelectCustomer,
  onInitiateCall,
  onOpenWhatsApp
}) => {
  const [todayFollowUps, setTodayFollowUps] = useState<Customer[]>([]);
  const [overdueCalls, setOverdueCalls] = useState<CallSchedule[]>([]);
  const [todayCalls, setTodayCalls] = useState<CallSchedule[]>([]);
  const [hotLeads, setHotLeads] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTodayData = async () => {
    setLoading(true);
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      const [followUpRes, callsRes, overdueRes, hotRes] = await Promise.all([
        api.getCustomers({ follow_up_date: todayDate, limit: 20 }),
        api.getCalls('today'),
        api.getCalls('overdue'),
        api.getCustomers({ min_score: 70, limit: 10 })
      ]);

      setTodayFollowUps(followUpRes.data || []);
      setTodayCalls(callsRes || []);
      setOverdueCalls(overdueRes || []);
      setHotLeads(hotRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayData();
  }, []);

  return (
    <div className="space-y-6 text-xs">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-cyan-950/40 via-slate-900/80 to-blue-950/40 border border-slate-800 p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">Today Command Center</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live operational dispatch for today's calls, overdue client reminders and hot leads
            </p>
          </div>
        </div>

        <button
          onClick={fetchTodayData}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          <span className="font-semibold">Refresh</span>
        </button>
      </div>

      {/* Grid: 3 operational pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Today's Scheduled Calls */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-cyan-400" />
              <h2 className="font-bold text-white text-sm">Today's Scheduled Calls</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400">
              {todayCalls.length}
            </span>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {todayCalls.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No scheduled calls for today.</div>
            ) : (
              todayCalls.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-white hover:text-cyan-400 cursor-pointer" onClick={() => onSelectCustomer(c.customer_id)}>
                        {c.customer_name || 'Client'}
                      </div>
                      <div className="text-[11px] text-slate-400">{c.phone}</div>
                    </div>
                    <span className="font-mono text-[10px] text-cyan-400 font-bold px-1.5 py-0.5 bg-slate-900 rounded">
                      {c.scheduled_time}
                    </span>
                  </div>

                  {c.reminder_note && (
                    <p className="text-[11px] text-slate-300 italic bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/80">
                      "{c.reminder_note}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                    <button
                      onClick={() => onInitiateCall({ id: c.customer_id, name: c.customer_name || 'Client', phone: c.phone })}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call Now</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Overdue Follow-ups */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="font-bold text-white text-sm">Overdue Attention</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400">
              {overdueCalls.length}
            </span>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {overdueCalls.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No overdue follow-ups! Great job.</div>
            ) : (
              overdueCalls.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-amber-200 hover:text-white cursor-pointer" onClick={() => onSelectCustomer(c.customer_id)}>
                        {c.customer_name || 'Client'}
                      </div>
                      <div className="text-[11px] text-slate-400">{c.phone}</div>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">
                      {c.scheduled_date}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-amber-800/30">
                    <button
                      onClick={() => onInitiateCall({ id: c.customer_id, name: c.customer_name || 'Client', phone: c.phone })}
                      className="flex-1 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Follow Up</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Active Hot Leads */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-red-400" />
              <h2 className="font-bold text-white text-sm">🔥 High-Priority Hot Leads</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400">
              {hotLeads.length}
            </span>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto">
            {hotLeads.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No hot leads scored yet.</div>
            ) : (
              hotLeads.map((h) => (
                <div key={h.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-white hover:text-cyan-400 cursor-pointer" onClick={() => onSelectCustomer(h.id)}>
                        {h.name}
                      </div>
                      <div className="text-[11px] text-slate-400">{h.business_name || 'Business'}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30">
                      Score: {h.lead_score || 75}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Quoted: ₹{h.total_price?.toLocaleString()}</span>
                    <span className="text-emerald-400 font-semibold">{h.status}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                    <button
                      onClick={() => onOpenWhatsApp(h)}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => onInitiateCall({ id: h.id, name: h.name, phone: h.phone })}
                      className="flex-1 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-cyan-300 hover:text-white font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call</span>
                    </button>
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

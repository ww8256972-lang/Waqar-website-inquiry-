import React, { useState, useEffect } from 'react';
import { CallSchedule, Customer } from '../types';
import { api } from '../api/client';
import {
  PhoneCall,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Phone,
  ArrowRight,
  Filter,
  Check,
  X
} from 'lucide-react';

interface CallsViewProps {
  onInitiateCall: (customer: { id: number; name: string; phone: string }) => void;
  onSelectCustomer: (id: number) => void;
}

export const CallsView: React.FC<CallsViewProps> = ({
  onInitiateCall,
  onSelectCustomer
}) => {
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'overdue' | 'completed' | 'all'>('today');
  const [calls, setCalls] = useState<CallSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  // New Schedule Call Modal State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>('');
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState('11:00');
  const [reminderNote, setReminderNote] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const data = await api.getCalls(filter);
      setCalls(data);
    } catch (err) {
      console.error('Error fetching calls:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [filter]);

  useEffect(() => {
    if (showScheduleModal) {
      api.getCustomers({ limit: 50, sort_by: 'name', order: 'ASC' })
        .then((res) => {
          setCustomersList(res.data);
          if (res.data.length > 0 && !selectedCustomerId) {
            setSelectedCustomerId(res.data[0].id);
          }
        })
        .catch(console.error);
    }
  }, [showScheduleModal]);

  const handleUpdateStatus = async (callId: number, newStatus: any) => {
    try {
      await api.updateCallStatus(callId, { status: newStatus });
      fetchCalls();
    } catch (err) {
      alert('Failed to update call status');
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert('Please select a customer');
      return;
    }

    try {
      setScheduling(true);
      await api.scheduleCall({
        customer_id: Number(selectedCustomerId),
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        reminder_note: reminderNote
      });
      setShowScheduleModal(false);
      setReminderNote('');
      fetchCalls();
    } catch (err: any) {
      alert(err.message || 'Failed to schedule call');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-white">Call Scheduling & Reminders</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              One-Tap Calling
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Never miss a follow-up. Integrated tel: calling with permanent note logging.
          </p>
        </div>

        <button
          onClick={() => setShowScheduleModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Schedule New Call</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
        {[
          { id: 'today', label: "Today's Calls", icon: Calendar },
          { id: 'upcoming', label: 'Upcoming', icon: Clock },
          { id: 'overdue', label: 'Overdue Calls', icon: AlertTriangle },
          { id: 'completed', label: 'Completed', icon: CheckCircle },
          { id: 'all', label: 'All Scheduled', icon: PhoneCall }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filter === tab.id
                  ? 'bg-blue-600/20 text-cyan-300 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Call List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-2">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-xs text-slate-400 font-mono">Fetching scheduled calls...</p>
          </div>
        ) : calls.length === 0 ? (
          <div className="py-20 text-center px-4">
            <p className="text-slate-400 text-sm font-semibold">No calls found in this category.</p>
            <p className="text-slate-500 text-xs mt-1">Schedule a call reminder to keep track of conversations.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {calls.map((cal) => (
              <div
                key={cal.id}
                className="p-4 hover:bg-slate-850/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-cyan-400 shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        onClick={() => onSelectCustomer(cal.customer_id)}
                        className="font-bold text-sm text-white hover:text-cyan-400 cursor-pointer transition-colors"
                      >
                        {cal.customer_name || 'Customer'}
                      </span>
                      {cal.business_name && (
                        <span className="text-xs text-slate-400 font-medium">
                          ({cal.business_name})
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300">
                        {cal.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {cal.phone}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-cyan-300 mt-1">
                      <span className="flex items-center gap-1 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{cal.scheduled_date}</span>
                      </span>
                      <span className="flex items-center gap-1 font-semibold">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{cal.scheduled_time}</span>
                      </span>
                    </div>

                    {cal.reminder_note && (
                      <p className="text-xs text-slate-300 mt-1.5 italic bg-slate-950/60 p-2 rounded-xl border border-slate-850">
                        "{cal.reminder_note}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {/* One-Tap [📞 CALL NOW] */}
                  <button
                    onClick={() => onInitiateCall({ id: cal.customer_id, name: cal.customer_name || 'Customer', phone: cal.phone })}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5 fill-current" />
                    <span>CALL NOW</span>
                  </button>

                  {cal.status === 'scheduled' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(cal.id, 'completed')}
                        title="Mark Call Completed"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-emerald-950 hover:text-emerald-400 text-slate-400 transition-colors border border-slate-700/60"
                      >
                        <Check className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(cal.id, 'cancelled')}
                        title="Cancel Call"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 transition-colors border border-slate-700/60"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Call Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">Schedule Call Reminder</h3>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Select Customer *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  {customersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - {c.business_name || 'Individual'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Time *
                  </label>
                  <input
                    type="time"
                    required
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Reminder Note
                </label>
                <input
                  type="text"
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  placeholder="e.g. Call regarding quotation review"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <button
                type="submit"
                disabled={scheduling}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs shadow-md transition-all mt-2"
              >
                {scheduling ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

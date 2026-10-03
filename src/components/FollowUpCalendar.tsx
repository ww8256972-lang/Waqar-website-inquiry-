import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Phone, AlertCircle, Plus } from 'lucide-react';
import { CallSchedule } from '../types';
import { api } from '../api/client';

interface FollowUpCalendarProps {
  onSelectCustomer: (id: number) => void;
  onInitiateCall: (customer: { id: number; name: string; phone: string }) => void;
  onOpenScheduleCall: () => void;
}

export const FollowUpCalendar: React.FC<FollowUpCalendarProps> = ({
  onSelectCustomer,
  onInitiateCall,
  onOpenScheduleCall
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [calls, setCalls] = useState<CallSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const data = await api.getCalls('all');
      setCalls(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-4 text-xs">
      {/* Calendar Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              {monthNames[month]} {year}
            </h2>
            <p className="text-[11px] text-slate-400">Scheduled Follow-ups & Call Pipeline</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-1">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onOpenScheduleCall}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule</span>
          </button>
        </div>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-400 text-[11px] uppercase pb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[90px] rounded-xl bg-slate-950/20 border border-slate-900/40 p-1.5 opacity-30" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          const isToday = new Date().toISOString().split('T')[0] === dayDateStr;

          const dayCalls = calls.filter(c => c.scheduled_date === dayDateStr);

          return (
            <div
              key={dayNum}
              className={`min-h-[90px] rounded-xl border p-1.5 transition-colors flex flex-col justify-between ${
                isToday
                  ? 'bg-blue-950/30 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${
                  isToday ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-300'
                }`}>
                  {dayNum}
                </span>
                {dayCalls.length > 0 && (
                  <span className="text-[10px] font-bold text-cyan-400 font-mono">
                    {dayCalls.length}
                  </span>
                )}
              </div>

              <div className="space-y-1 overflow-y-auto max-h-[65px]">
                {dayCalls.map(c => (
                  <div
                    key={c.id}
                    onClick={() => onSelectCustomer(c.customer_id)}
                    className="p-1 rounded-md bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 cursor-pointer text-[10px] truncate group"
                    title={`${c.customer_name || 'Client'} (${c.scheduled_time}): ${c.reminder_note || ''}`}
                  >
                    <div className="font-bold text-white group-hover:text-cyan-400 truncate">
                      {c.customer_name || 'Client'}
                    </div>
                    <div className="text-slate-400 text-[9px] flex items-center gap-1 font-mono">
                      <Clock className="w-2.5 h-2.5 text-cyan-400" />
                      <span>{c.scheduled_time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

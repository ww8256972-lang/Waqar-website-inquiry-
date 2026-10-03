import React, { useState, useEffect } from 'react';
import { Bell, Clock, AlertTriangle, CheckCircle, PhoneCall, CreditCard, X, ExternalLink } from 'lucide-react';
import { SmartReminder } from '../types';
import { api } from '../api/client';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (id: number) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onSelectCustomer
}) => {
  const [reminders, setReminders] = useState<SmartReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<string>(typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default');

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const res = await api.getReminders({ timeframe: 'all' });
      setReminders(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchReminders();
    }
  }, [isOpen]);

  const requestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      setPermission(res);
      if (res === 'granted') {
        new Notification('Waqar Website Enquiry', {
          body: 'Browser notifications enabled! You will receive live reminder alerts.',
          icon: '/logo.png'
        });
      }
    }
  };

  const handleComplete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.updateReminder(id, 'completed');
      setReminders(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const dueNow = reminders.filter(r => new Date(r.remind_at).getTime() <= Date.now() && r.status === 'pending');
  const upcoming = reminders.filter(r => new Date(r.remind_at).getTime() > Date.now() && r.status === 'pending');

  return (
    <div className="absolute right-0 top-16 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs animate-in fade-in duration-150">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white text-sm">Smart Notifications</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300">
            {reminders.length}
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Permission banner */}
      {permission !== 'granted' && typeof window !== 'undefined' && 'Notification' in window && (
        <div className="p-2.5 bg-blue-950/40 border-b border-blue-900/50 flex items-center justify-between text-[11px] text-cyan-300">
          <span>Enable desktop sound & push alerts:</span>
          <button
            onClick={requestBrowserPermission}
            className="px-2 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
          >
            Enable
          </button>
        </div>
      )}

      {/* List */}
      <div className="max-h-[380px] overflow-y-auto p-2 space-y-2">
        {loading ? (
          <div className="py-8 text-center text-slate-500">Checking reminders...</div>
        ) : reminders.length === 0 ? (
          <div className="py-8 text-center text-slate-500 space-y-1">
            <CheckCircle className="w-8 h-8 text-emerald-400/50 mx-auto" />
            <p className="font-semibold text-slate-400">All Caught Up!</p>
            <p className="text-[11px]">No pending reminders or call alerts right now.</p>
          </div>
        ) : (
          <>
            {dueNow.length > 0 && (
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Due Now / Overdue ({dueNow.length})</span>
                </div>
                {dueNow.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      if (r.customer_id) {
                        onClose();
                        onSelectCustomer(r.customer_id);
                      }
                    }}
                    className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 hover:bg-amber-950/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-amber-200">{r.title}</div>
                      <button
                        onClick={(e) => handleComplete(r.id, e)}
                        title="Mark Completed"
                        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-slate-950 font-bold"
                      >
                        Done
                      </button>
                    </div>
                    {r.customer_name && (
                      <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        Customer: {r.customer_name} ({r.customer_phone})
                      </div>
                    )}
                    <div className="text-[10px] text-amber-400/80 mt-1 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(r.remind_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {upcoming.length > 0 && (
              <div className="space-y-1 mt-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Upcoming ({upcoming.length})
                </div>
                {upcoming.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      if (r.customer_id) {
                        onClose();
                        onSelectCustomer(r.customer_id);
                      }
                    }}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-white">{r.title}</div>
                      <button
                        onClick={(e) => handleComplete(r.id, e)}
                        title="Mark Done"
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                      >
                        Done
                      </button>
                    </div>
                    {r.customer_name && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {r.customer_name} &bull; {r.customer_phone}
                      </div>
                    )}
                    <div className="text-[10px] text-cyan-400 mt-1 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(r.remind_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

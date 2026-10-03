import React, { useState } from 'react';
import { Clock, Calendar, Bell, X, CheckCircle, Plus } from 'lucide-react';
import { Customer } from '../types';
import { api } from '../api/client';

interface SmartReminderModalProps {
  customer?: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SmartReminderModal: React.FC<SmartReminderModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [reminderType, setReminderType] = useState<'call' | 'payment' | 'follow-up' | 'meeting' | 'one-time' | 'daily' | 'weekly'>('follow-up');
  const [remindDate, setRemindDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [remindTime, setRemindTime] = useState('11:00');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const fullDateTime = `${remindDate} ${remindTime}:00`;
      await api.createReminder({
        customer_id: customer?.id || null,
        title: title.trim(),
        reminder_type: reminderType,
        remind_at: fullDateTime,
        note: note.trim() || null
      });

      // Browser notification test if granted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Reminder Scheduled', {
          body: `${title.trim()} scheduled for ${remindDate} at ${remindTime}`,
          icon: '/logo.png'
        });
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save reminder');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 text-xs">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Schedule Smart Reminder</h2>
              <p className="text-xs text-slate-400">
                {customer ? `For: ${customer.name} (${customer.business_name || 'Client'})` : 'General Business Reminder'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Reminder Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Call regarding quotation revision"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Type
              </label>
              <select
                value={reminderType}
                onChange={(e) => setReminderType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
              >
                <option value="follow-up">Follow-up Call</option>
                <option value="payment">Payment Due</option>
                <option value="call">General Call</option>
                <option value="meeting">Client Meeting</option>
                <option value="one-time">One-time Task</option>
                <option value="daily">Daily Recurring</option>
                <option value="weekly">Weekly Recurring</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Time
              </label>
              <input
                type="time"
                required
                value={remindTime}
                onChange={(e) => setRemindTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
              >
              </input>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Date
            </label>
            <input
              type="date"
              required
              value={remindDate}
              onChange={(e) => setRemindDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Notes & Action Context
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add key notes to remember during this reminder..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-md active:scale-98 transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Set Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

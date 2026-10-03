import React, { useState, useEffect } from 'react';
import { CustomerStatus } from '../types';
import { api } from '../api/client';
import { Phone, Calendar, Clock, CheckCircle, AlertCircle, X, ArrowRight, User } from 'lucide-react';

interface CallLogModalProps {
  customer: { id: number; name: string; phone: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CallLogModal: React.FC<CallLogModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [callResult, setCallResult] = useState('Customer interested');
  const [noteText, setNoteText] = useState('');
  const [nextDate, setNextDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [nextTime, setNextTime] = useState('11:00');
  const [newStatus, setNewStatus] = useState<CustomerStatus>('Interested');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNoteText('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) {
      setError('Please enter a note about the call conversation.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api.addCallNote(customer.id, {
        call_result: callResult,
        note_text: noteText.trim(),
        next_follow_up_date: nextDate || undefined,
        next_follow_up_time: nextTime || undefined,
        new_status: newStatus || undefined
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save call note');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Log Call Notes</h2>
              <p className="text-xs text-slate-400">
                {customer.name} &bull; {customer.phone}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="m-4 p-3 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {/* Quick Call Result */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Call Outcome / Result *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Customer interested',
                'Asked to call back',
                'Agreed on quote',
                'Not interested',
                'Did not answer',
                'Sent proposal on WhatsApp'
              ].map((res) => (
                <button
                  type="button"
                  key={res}
                  onClick={() => {
                    setCallResult(res);
                    if (res === 'Customer interested') setNewStatus('Interested');
                    else if (res === 'Asked to call back') setNewStatus('Call Back');
                    else if (res === 'Agreed on quote') setNewStatus('Agreed');
                    else if (res === 'Not interested') setNewStatus('Not Interested');
                  }}
                  className={`px-2.5 py-1.5 text-xs rounded-xl text-left border transition-all ${
                    callResult === res
                      ? 'bg-blue-600/20 text-cyan-300 border-blue-500/40 font-bold'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Note */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Call Conversation & Notes *
            </label>
            <textarea
              rows={3}
              required
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="e.g. Discussed 5-page restaurant website with online menu and table reservation. Asked to follow up tomorrow afternoon."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
            />
          </div>

          {/* Update Status */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Update Customer Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as CustomerStatus)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-semibold"
            >
              <option value="New">New</option>
              <option value="Interested">Interested</option>
              <option value="Call Back">Call Back</option>
              <option value="Agreed">Agreed</option>
              <option value="Pending">Pending</option>
              <option value="Success">Success</option>
              <option value="Not Interested">Not Interested</option>
            </select>
          </div>

          {/* Next Schedule */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Next Follow-up Date
              </label>
              <input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Time
              </label>
              <input
                type="time"
                value={nextTime}
                onChange={(e) => setNextTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Save Call Note Permanently</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

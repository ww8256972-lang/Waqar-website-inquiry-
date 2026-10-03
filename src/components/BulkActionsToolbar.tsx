import React, { useState } from 'react';
import { CheckSquare, Calendar, Tag, Trash2, Download, X, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

interface BulkActionsToolbarProps {
  selectedIds: number[];
  onClearSelection: () => void;
  onSuccess: () => void;
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedIds,
  onClearSelection,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);
  const [statusVal, setStatusVal] = useState('Contacted');
  const [dateVal, setDateVal] = useState('');
  const [tagVal, setTagVal] = useState('');

  if (selectedIds.length === 0) return null;

  const handleExecute = async () => {
    if (!actionType) return;
    setLoading(true);
    try {
      if (actionType === 'status') {
        await api.bulkAction(selectedIds, 'status', { status: statusVal });
      } else if (actionType === 'follow_up_date') {
        if (!dateVal) return alert('Select a date');
        await api.bulkAction(selectedIds, 'follow_up_date', { follow_up_date: dateVal });
      } else if (actionType === 'tag') {
        if (!tagVal) return alert('Enter a tag');
        await api.bulkAction(selectedIds, 'add_tag', { tag: tagVal });
      } else if (actionType === 'delete') {
        if (!window.confirm(`Move ${selectedIds.length} customer(s) to Recycle Bin?`)) return;
        await api.bulkAction(selectedIds, 'soft_delete');
      }
      onClearSelection();
      setActionType(null);
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Bulk action failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-40 w-11/12 max-w-2xl bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-in slide-in-from-bottom-5 duration-200">
      <div className="flex items-center gap-2 text-white font-bold">
        <span className="w-6 h-6 rounded-lg bg-cyan-500 text-slate-950 flex items-center justify-center text-xs">
          {selectedIds.length}
        </span>
        <span>Selected</span>
        <button
          onClick={onClearSelection}
          className="text-slate-400 hover:text-white p-1"
          title="Clear Selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {actionType === 'status' && (
        <div className="flex items-center gap-2">
          <select
            value={statusVal}
            onChange={(e) => setStatusVal(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
          >
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Interested">Interested</option>
            <option value="Agreed">Agreed</option>
            <option value="Call Back">Call Back</option>
            <option value="Not Interested">Not Interested</option>
          </select>
          <button
            onClick={handleExecute}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold"
          >
            Apply
          </button>
          <button onClick={() => setActionType(null)} className="text-slate-400">Cancel</button>
        </div>
      )}

      {actionType === 'follow_up_date' && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateVal}
            onChange={(e) => setDateVal(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs"
          />
          <button
            onClick={handleExecute}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold"
          >
            Apply
          </button>
          <button onClick={() => setActionType(null)} className="text-slate-400">Cancel</button>
        </div>
      )}

      {actionType === 'tag' && (
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Tag (e.g. HOT)"
            value={tagVal}
            onChange={(e) => setTagVal(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs uppercase"
          />
          <button
            onClick={handleExecute}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold"
          >
            Add
          </button>
          <button onClick={() => setActionType(null)} className="text-slate-400">Cancel</button>
        </div>
      )}

      {!actionType && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActionType('status')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
          >
            Change Status
          </button>
          <button
            onClick={() => setActionType('follow_up_date')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
          >
            Assign Date
          </button>
          <button
            onClick={() => setActionType('tag')}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
          >
            Add Tag
          </button>
          <button
            onClick={() => {
              setActionType('delete');
              setTimeout(handleExecute, 50);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Trash</span>
          </button>
        </div>
      )}
    </div>
  );
};

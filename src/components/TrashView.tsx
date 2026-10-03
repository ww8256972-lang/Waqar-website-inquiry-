import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { api } from '../api/client';
import { Trash2, RotateCcw, AlertTriangle, RefreshCw, CheckCircle, ShieldAlert } from 'lucide-react';

export const TrashView: React.FC = () => {
  const [deletedCustomers, setDeletedCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrash = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomers({ trash: true, limit: 50 });
      setDeletedCustomers(res.data);
    } catch (err) {
      console.error('Failed to load trash:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, []);

  const handleRestore = async (id: number, name: string) => {
    try {
      await api.restoreCustomer(id);
      fetchTrash();
    } catch (err) {
      alert('Failed to restore customer');
    }
  };

  const handlePermanentDelete = async (id: number, name: string) => {
    if (!window.confirm(`PERMANENT DELETE WARNING: Are you sure you want to permanently erase "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.permanentDeleteCustomer(id);
      fetchTrash();
    } catch (err) {
      alert('Failed to delete permanently');
    }
  };

  return (
    <div className="space-y-4 pb-20 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red-950/20 border border-red-900/40 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">Trash & Soft-Deleted Inquiries</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Safeguarded records. Restore anytime or permanently delete.
            </p>
          </div>
        </div>

        <button
          onClick={fetchTrash}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="py-20 flex justify-center">
            <RefreshCw className="w-6 h-6 text-red-400 animate-spin" />
          </div>
        ) : deletedCustomers.length === 0 ? (
          <div className="py-20 text-center px-4">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-slate-300 text-sm font-semibold">Trash is currently empty</p>
            <p className="text-slate-500 text-xs mt-0.5">No soft-deleted customer inquiries.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {deletedCustomers.map((cust) => (
              <div
                key={cust.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-bold text-sm text-white">
                    {cust.name}
                  </div>
                  <div className="text-slate-400 font-mono mt-0.5">
                    {cust.phone} &bull; {cust.inquiry_id}
                  </div>
                  {cust.business_name && (
                    <div className="text-slate-400 mt-0.5">
                      Business: {cust.business_name}
                    </div>
                  )}
                  {cust.deleted_at && (
                    <div className="text-[10px] text-red-400 mt-1">
                      Deleted on: {new Date(cust.deleted_at).toLocaleString()} by {cust.deleted_by || 'admin'}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleRestore(cust.id, cust.name)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>

                  <button
                    onClick={() => handlePermanentDelete(cust.id, cust.name)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanent Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

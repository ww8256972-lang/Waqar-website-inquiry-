import React from 'react';
import { AlertTriangle, UserCheck, ArrowRight, X, GitMerge } from 'lucide-react';

interface DuplicateDetectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  duplicates: any[];
  onViewExisting: (id: number) => void;
  onContinueAnyway: () => void;
  onMerge: (existingId: number) => void;
}

export const DuplicateDetectionModal: React.FC<DuplicateDetectionModalProps> = ({
  isOpen,
  onClose,
  duplicates,
  onViewExisting,
  onContinueAnyway,
  onMerge
}) => {
  if (!isOpen || duplicates.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 text-xs">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-amber-950/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Possible Duplicate Found</h2>
              <p className="text-xs text-amber-300">A customer with similar details already exists in the database.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-slate-300">
            To maintain clean records, review the matching existing customer(s) below. You can view their full profile, merge records together, or continue creating a separate entry.
          </p>

          <div className="space-y-2">
            {duplicates.map((d) => (
              <div key={d.id} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{d.name}</div>
                    <div className="text-slate-400 text-xs">{d.phone} &bull; {d.business_name || 'Business'}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {d.match_reason || 'Match Found'}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewExisting(d.id);
                    }}
                    className="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>View Existing</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onMerge(d.id);
                    }}
                    className="flex-1 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-cyan-300 hover:text-white font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Merge Records</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onContinueAnyway}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold"
          >
            Continue Anyway (New Record)
          </button>
        </div>
      </div>
    </div>
  );
};

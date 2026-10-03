import React, { useState, useEffect, useRef } from 'react';
import { Search, LayoutDashboard, Users, PhoneCall, FileText, Receipt, BarChart3, Settings, Trash2, ArrowRight, UserCheck, Flame, Plus } from 'lucide-react';
import { Customer } from '../types';
import { api } from '../api/client';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (id: number) => void;
  onNavigateTab: (tab: string) => void;
  onOpenQuickAdd: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onSelectCustomer,
  onNavigateTab,
  onOpenQuickAdd
}) => {
  const [query, setQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setCustomerResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setCustomerResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.getCustomers({ search: query.trim(), limit: 5 });
        setCustomerResults(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard shortcut listener for Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickNav = [
    { title: 'Dashboard', tab: 'dashboard', icon: LayoutDashboard },
    { title: 'Customers List', tab: 'customers', icon: Users },
    { title: 'Calls & Reminders', tab: 'calls', icon: PhoneCall },
    { title: 'Quotations & Invoices', tab: 'quotations', icon: FileText },
    { title: 'Revenue Analytics', tab: 'analytics', icon: BarChart3 },
    { title: 'Admin Settings', tab: 'settings', icon: Settings },
    { title: 'Recycle Bin', tab: 'trash', icon: Trash2 }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh]">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-800 flex items-center gap-3 bg-slate-950/60">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a customer name, phone, business, or command..."
            className="flex-1 bg-transparent border-none text-white text-sm placeholder-slate-500 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto space-y-4 text-xs">
          {/* Quick Action */}
          <div>
            <button
              onClick={() => {
                onClose();
                onOpenQuickAdd();
              }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold hover:bg-cyan-500/30 transition-all text-left"
            >
              <div className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400">
                <Plus className="w-3.5 h-3.5" />
              </div>
              <span className="flex-1">Quick Add New Customer</span>
              <kbd className="text-[10px] text-slate-400 font-mono">Enter</kbd>
            </button>
          </div>

          {/* Customer Search Results */}
          {customerResults.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
                Matching Inquiries ({customerResults.length})
              </div>
              <div className="space-y-1">
                {customerResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onClose();
                      onSelectCustomer(c.id);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/80 text-left transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-white group-hover:text-cyan-400 flex items-center gap-2">
                          <span>{c.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">#{c.inquiry_id}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>{c.phone}</span>
                          {c.business_name && <span>&bull; {c.business_name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300">
                        {c.status}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="py-4 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
              <span>Searching database...</span>
            </div>
          )}

          {/* Navigation Shortcuts */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">
              Jump To Module
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {quickNav.map((n) => {
                const Icon = n.icon;
                return (
                  <button
                    key={n.tab}
                    onClick={() => {
                      onClose();
                      onNavigateTab(n.tab);
                    }}
                    className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/40 hover:bg-slate-800 border border-slate-800/60 text-slate-300 hover:text-white transition-all text-left"
                  >
                    <Icon className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-semibold">{n.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-2.5 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between px-4">
          <span>Tip: Press <kbd className="text-slate-400 font-mono">Ctrl+K</kbd> / <kbd className="text-slate-400 font-mono">⌘K</kbd> anywhere</span>
          <button onClick={onClose} className="hover:text-white">Close</button>
        </div>
      </div>
    </div>
  );
};

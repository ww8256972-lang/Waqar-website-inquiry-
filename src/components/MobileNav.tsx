import React from 'react';
import { LayoutDashboard, Users, PhoneCall, Plus, Settings } from 'lucide-react';

interface MobileNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenQuickAdd: () => void;
  todayCallsCount?: number;
  overdueCallsCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  setCurrentTab,
  onOpenQuickAdd,
  todayCallsCount = 0,
  overdueCallsCount = 0
}) => {
  const totalCallsAlert = todayCallsCount + overdueCallsCount;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1 safe-area-pb">
      <div className="flex items-center justify-around h-14">
        {/* Dashboard */}
        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-colors ${
            currentTab === 'dashboard' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Overview</span>
        </button>

        {/* Customers */}
        <button
          onClick={() => setCurrentTab('customers')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-colors ${
            currentTab === 'customers' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Customers</span>
        </button>

        {/* Center Quick Add Elevated Action */}
        <button
          onClick={onOpenQuickAdd}
          className="relative -top-3 w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 via-cyan-500 to-blue-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.6)] ring-4 ring-slate-950 active:scale-95 transition-transform"
          title="Quick Add Customer"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>

        {/* Calls */}
        <button
          onClick={() => setCurrentTab('calls')}
          className={`relative flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-colors ${
            currentTab === 'calls' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PhoneCall className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Calls</span>
          {totalCallsAlert > 0 && (
            <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[9px] flex items-center justify-center">
              {totalCallsAlert}
            </span>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={() => setCurrentTab('settings')}
          className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-colors ${
            currentTab === 'settings' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Settings</span>
        </button>
      </div>
    </div>
  );
};

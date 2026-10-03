import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  PhoneCall,
  Settings,
  Trash2,
  LogOut,
  Sun,
  Moon,
  CloudSnow,
  Users,
  LayoutDashboard,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenQuickAdd: () => void;
  snowfallActive: boolean;
  setSnowfallActive: (val: boolean) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  todayCallsCount?: number;
  overdueCallsCount?: number;
  onReplayWelcome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenQuickAdd,
  snowfallActive,
  setSnowfallActive,
  isDarkMode,
  setIsDarkMode,
  todayCallsCount = 0,
  overdueCallsCount = 0,
  onReplayWelcome
}) => {
  const { user, logout } = useAuth();
  const totalAlertCalls = todayCallsCount + overdueCallsCount;

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Title with AI-Generated Waqar Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className="flex items-center gap-3 text-left group focus:outline-none py-1"
          >
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.35)] ring-2 ring-cyan-500/40 bg-slate-900 flex-shrink-0 group-hover:ring-cyan-400 transition-all group-hover:scale-105">
              <img
                src="/logo.png"
                alt="Waqar Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center -z-10 bg-gradient-to-br from-blue-900 to-slate-950">
                <span className="text-lg font-black text-cyan-400">W</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-white text-base sm:text-lg tracking-tight group-hover:text-cyan-400 transition-colors">
                Waqar Website Enquiry
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                Customer Management & Inquiries
              </span>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 ml-6">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-blue-600/20 text-cyan-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setCurrentTab('customers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'customers'
                  ? 'bg-blue-600/20 text-cyan-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Customers</span>
            </button>

            <button
              onClick={() => setCurrentTab('calls')}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'calls'
                  ? 'bg-blue-600/20 text-cyan-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Calls & Reminders</span>
              {totalAlertCalls > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-slate-950 animate-pulse">
                  {totalAlertCalls}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentTab('trash')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'trash'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-red-300 hover:bg-slate-900'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Trash</span>
            </button>

            <button
              onClick={() => setCurrentTab('settings')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentTab === 'settings'
                  ? 'bg-blue-600/20 text-cyan-400 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2">
          {/* Quick Add Button */}
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs shadow-[0_0_15px_rgba(59,130,246,0.4)] active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Quick Add</span>
          </button>

          {/* Snowfall Continuous Animation Toggle */}
          <button
            onClick={() => setSnowfallActive(!snowfallActive)}
            title={snowfallActive ? 'Snowfall animation: Active (Click to Pause)' : 'Snowfall animation: Paused (Click to Resume)'}
            className={`p-2 rounded-xl text-xs transition-all border ${
              snowfallActive
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                : 'text-slate-500 hover:text-slate-300 bg-slate-900 border-slate-800'
            }`}
          >
            <CloudSnow className={`w-4 h-4 ${snowfallActive ? 'animate-bounce text-cyan-300' : ''}`} />
          </button>

          {/* Replay Welcome Intro */}
          <button
            onClick={onReplayWelcome}
            title="Replay Welcome Intro"
            className="hidden sm:flex p-2 rounded-xl text-slate-400 hover:text-cyan-300 bg-slate-900 hover:bg-slate-850 border border-slate-800 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-colors"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Admin user info & Logout */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <div className="hidden lg:flex flex-col text-right">
              <span className="text-xs font-bold text-white capitalize leading-none">
                {user?.username || 'Waqar'}
              </span>
              <span className="text-[10px] text-cyan-400 font-semibold leading-tight">
                Admin
              </span>
            </div>

            <button
              onClick={() => logout()}
              title="Logout"
              className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

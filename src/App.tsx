import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WelcomeAnimation } from './components/WelcomeAnimation';
import { SnowfallCanvas } from './components/SnowfallCanvas';
import { LoginView } from './components/LoginView';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { DashboardView } from './components/DashboardView';
import { CustomersView } from './components/CustomersView';
import { CallsView } from './components/CallsView';
import { TrashView } from './components/TrashView';
import { AdminSettingsView } from './components/AdminSettingsView';
import { QuickAddModal } from './components/QuickAddModal';
import { CustomerProfileModal } from './components/CustomerProfileModal';
import { CallLogModal } from './components/CallLogModal';
import { ReceiptModal } from './components/ReceiptModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { Receipt } from './types';
import { api } from './api/client';

function MainApp() {
  const { isAuthenticated, isLoading } = useAuth();

  // Welcome Animation State
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    const shown = sessionStorage.getItem('wwi_welcome_shown');
    return !shown;
  });

  // Admin panel continuous snowfall animation
  const [snowfallActive, setSnowfallActive] = useState<boolean>(true);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Active Tab - Restored to 'dashboard'
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Modals
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [callLogCustomer, setCallLogCustomer] = useState<{ id: number; name: string; phone: string } | null>(null);
  const [isCallLogOpen, setIsCallLogOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<Receipt | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Counters for Navbar badges
  const [todayCallsCount, setTodayCallsCount] = useState(0);
  const [overdueCallsCount, setOverdueCallsCount] = useState(0);

  // Key to force refresh lists when child components mutate data
  const [refreshKey, setRefreshKey] = useState(0);

  const handleWelcomeComplete = () => {
    sessionStorage.setItem('wwi_welcome_shown', 'true');
    setShowWelcome(false);
  };

  const handleReplayWelcome = () => {
    setShowWelcome(true);
  };

  // Load telemetry stats
  useEffect(() => {
    if (isAuthenticated) {
      api.getDashboardStats()
        .then((s) => {
          setTodayCallsCount(s.todayCalls || 0);
          setOverdueCallsCount(s.overdueCalls || 0);
        })
        .catch(console.error);
    }
  }, [isAuthenticated, refreshKey, currentTab]);

  // Initiate a phone call: Opens phone's native dialer and opens note logging modal
  const handleInitiateCall = (customer: { id: number; name: string; phone: string }) => {
    const cleanPhone = customer.phone.replace(/[^0-9+]/g, '');
    window.location.href = `tel:${cleanPhone}`;

    setTimeout(() => {
      setCallLogCustomer(customer);
      setIsCallLogOpen(true);
    }, 400);
  };

  const handleSelectCustomer = (id: number) => {
    setSelectedCustomerId(id);
    setIsProfileOpen(true);
  };

  const handleViewReceipt = (receipt: Receipt) => {
    setActiveReceipt(receipt);
    setIsReceiptOpen(true);
  };

  if (showWelcome) {
    return <WelcomeAnimation onComplete={handleWelcomeComplete} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-3 border-cyan-400/20 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-mono tracking-widest uppercase">
          Loading Waqar Website Enquiry...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
        <LoginView onShowWelcome={handleReplayWelcome} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} relative`}>
      {/* Continuous Snowfall Animation */}
      <SnowfallCanvas active={snowfallActive} />

      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        snowfallActive={snowfallActive}
        setSnowfallActive={setSnowfallActive}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        todayCallsCount={todayCallsCount}
        overdueCallsCount={overdueCallsCount}
        onReplayWelcome={handleReplayWelcome}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-20">
        {currentTab === 'dashboard' && (
          <DashboardView
            key={`dash-${refreshKey}`}
            onSelectCustomer={handleSelectCustomer}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            setCurrentTab={setCurrentTab}
            onInitiateCall={handleInitiateCall}
          />
        )}

        {currentTab === 'customers' && (
          <CustomersView
            key={`cust-${refreshKey}`}
            onSelectCustomer={handleSelectCustomer}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            onInitiateCall={handleInitiateCall}
          />
        )}

        {currentTab === 'calls' && (
          <CallsView
            key={`call-${refreshKey}`}
            onInitiateCall={handleInitiateCall}
            onSelectCustomer={handleSelectCustomer}
          />
        )}

        {currentTab === 'trash' && (
          <TrashView key={`trash-${refreshKey}`} />
        )}

        {currentTab === 'settings' && (
          <AdminSettingsView
            key={`set-${refreshKey}`}
            onOpenPrivacyPolicy={() => setIsPrivacyOpen(true)}
          />
        )}
      </main>

      {/* Mobile-First Bottom Navigation */}
      <MobileNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        todayCallsCount={todayCallsCount}
        overdueCallsCount={overdueCallsCount}
      />

      {/* Modals */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={(newId) => {
          setRefreshKey((k) => k + 1);
          if (newId) {
            setSelectedCustomerId(newId);
            setIsProfileOpen(true);
          }
        }}
      />

      <CustomerProfileModal
        customerId={selectedCustomerId}
        isOpen={isProfileOpen}
        onClose={() => {
          setIsProfileOpen(false);
          setSelectedCustomerId(null);
        }}
        onInitiateCall={handleInitiateCall}
        onViewReceipt={handleViewReceipt}
        onCustomerUpdated={() => setRefreshKey((k) => k + 1)}
      />

      <CallLogModal
        customer={callLogCustomer}
        isOpen={isCallLogOpen}
        onClose={() => {
          setIsCallLogOpen(false);
          setCallLogCustomer(null);
        }}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      <ReceiptModal
        receipt={activeReceipt}
        isOpen={isReceiptOpen}
        onClose={() => {
          setIsReceiptOpen(false);
          setActiveReceipt(null);
        }}
      />

      <PrivacyPolicyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

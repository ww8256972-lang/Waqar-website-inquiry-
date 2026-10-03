import React, { useState, useEffect } from 'react';
import { BusinessType, WebsiteType, AuditLog } from '../types';
import { api } from '../api/client';
import {
  KeyRound,
  ShieldCheck,
  Building2,
  Globe,
  Download,
  Database,
  Flame,
  CheckCircle,
  AlertCircle,
  Trash2,
  Plus,
  RefreshCw,
  FileText,
  Lock,
  Sparkles
} from 'lucide-react';

interface AdminSettingsViewProps {
  onOpenPrivacyPolicy: () => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  onOpenPrivacyPolicy
}) => {
  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [changingPass, setChangingPass] = useState(false);

  // Business Types
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [newBType, setNewBType] = useState('');
  const [addingBType, setAddingBType] = useState(false);

  // Website Types
  const [websiteTypes, setWebsiteTypes] = useState<WebsiteType[]>([]);
  const [newWType, setNewWType] = useState('');
  const [addingWType, setAddingWType] = useState(false);

  // Audit Logs
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Benchmark generator
  const [benchCount, setBenchCount] = useState(1000);
  const [benchLoading, setBenchLoading] = useState(false);
  const [benchMsg, setBenchMsg] = useState<string | null>(null);

  const loadMetadata = () => {
    api.getBusinessTypes().then(setBusinessTypes).catch(console.error);
    api.getWebsiteTypes().then(setWebsiteTypes).catch(console.error);
  };

  const loadAuditLogs = () => {
    setLoadingLogs(true);
    api.getAuditLogs(1)
      .then((res) => setLogs(res.data))
      .catch(console.error)
      .finally(() => setLoadingLogs(false));
  };

  useEffect(() => {
    loadMetadata();
    loadAuditLogs();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    try {
      setChangingPass(true);
      const res = await api.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setPasswordMsg({ type: 'success', text: 'Password successfully changed!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setChangingPass(false);
    }
  };

  const handleAddBusinessType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBType.trim()) return;
    try {
      setAddingBType(true);
      await api.createBusinessType(newBType.trim());
      setNewBType('');
      loadMetadata();
    } catch (err: any) {
      alert(err.message || 'Failed to add business type');
    } finally {
      setAddingBType(false);
    }
  };

  const handleDeleteBusinessType = async (id: number) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await api.deleteBusinessType(id);
      loadMetadata();
    } catch (err) {
      alert('Failed to delete category');
    }
  };

  const handleAddWebsiteType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWType.trim()) return;
    try {
      setAddingWType(true);
      await api.createWebsiteType(newWType.trim());
      setNewWType('');
      loadMetadata();
    } catch (err: any) {
      alert(err.message || 'Failed to add website type');
    } finally {
      setAddingWType(false);
    }
  };

  const handleDeleteWebsiteType = async (id: number) => {
    if (!window.confirm('Delete this website type?')) return;
    try {
      await api.deleteWebsiteType(id);
      loadMetadata();
    } catch (err) {
      alert('Failed to delete website type');
    }
  };

  const handleRunBenchmark = async () => {
    if (!window.confirm(`Generate ${benchCount.toLocaleString()} test customer records into the SQLite database to verify 15,000+ record search & pagination performance?`)) {
      return;
    }
    try {
      setBenchLoading(true);
      setBenchMsg(null);
      const res = await api.seedBenchmark(benchCount);
      setBenchMsg(res.message);
      loadAuditLogs();
    } catch (err: any) {
      alert(err.message || 'Benchmark seeding failed');
    } finally {
      setBenchLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8 max-w-5xl mx-auto">
      {/* Settings Header */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-6 rounded-2xl">
        <h1 className="text-xl sm:text-2xl font-black text-white">System Settings & Admin Control</h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure security, categories, automated backups, and 15,000+ benchmark tests
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security & Password Change */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Lock className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Admin Security & Password</h2>
              <p className="text-[11px] text-slate-400">Update initial credentials securely</p>
            </div>
          </div>

          {passwordMsg && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              passwordMsg.type === 'success' ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300' : 'bg-red-950/60 border border-red-800 text-red-300'
            }`}>
              {passwordMsg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Current Password (initial: waqar)
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <button
              type="submit"
              disabled={changingPass}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all active:scale-98 disabled:opacity-50"
            >
              {changingPass ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Database Backup & Disaster Recovery */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Database className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Database Backup & Disaster Recovery</h2>
              <p className="text-[11px] text-slate-400">Atomic disk persistence (.sqlite binary snapshot)</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            All customer inquiries, payments, receipts, and notes are atomically committed to the persistent SQLite database on disk. You can download a live snapshot backup at any time.
          </p>

          <div className="space-y-3 pt-2">
            <a
              href="/api/backup/download"
              download
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Live SQLite Database Backup (.sqlite)</span>
            </a>

            <a
              href="/api/export/csv"
              download
              className="w-full py-2.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-850 text-cyan-300 border border-slate-800 font-semibold text-xs transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Export All Customers to CSV Spreadsheet</span>
            </a>

            <button
              type="button"
              onClick={onOpenPrivacyPolicy}
              className="w-full py-2 px-3 text-xs text-slate-400 hover:text-white transition-colors"
            >
              View System Privacy & Data Retention Policy
            </button>
          </div>
        </div>
      </div>

      {/* Official AI-Generated Brand Identity & Logo */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Official Brand Identity & AI Name Logo</h2>
              <p className="text-xs text-slate-400">Custom generated luxury emblem featuring "WAQAR"</p>
            </div>
          </div>
          <a
            href="/logo.png"
            download="waqar-brand-logo.png"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold text-xs transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Download Ultra-HD Logo</span>
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5 items-center">
          <div className="flex flex-col items-center justify-center p-4 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <div className="relative w-28 h-28 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.4)] ring-4 ring-cyan-500/40 bg-slate-900 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="Waqar Official AI Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[11px] font-bold text-slate-300 mt-3">Primary App Emblem</span>
            <span className="text-[10px] text-slate-500">1024 x 1024 • AI Synthesized</span>
          </div>

          <div className="sm:col-span-2 space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/60">
              <h4 className="text-xs font-bold text-white mb-1">Active Integrations Across the App:</h4>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                <li><span className="text-cyan-400 font-semibold">Header Navigation Bar:</span> Luxury emblem beside "Waqar Website Enquiry"</li>
                <li><span className="text-cyan-400 font-semibold">Admin Login Portal:</span> Animated glowing emblem on the login card</li>
                <li><span className="text-cyan-400 font-semibold">Welcome Intro Animation:</span> Fullscreen entrance spotlight</li>
                <li><span className="text-cyan-400 font-semibold">Browser & Mobile:</span> Favicon, Apple Touch icon, and PWA launch icon</li>
              </ul>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Personalized with user name: <strong className="text-white font-bold">WAQAR</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* High Volume Inquiries Benchmark Section */}
      <div className="bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-purple-950/40 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Database Performance & Volume Test</h2>
              <p className="text-[11px] text-slate-400">Verify SQLite indexing, sub-second search & server-side pagination</p>
            </div>
          </div>
        </div>

        {benchMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>{benchMsg}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-64">
            <label className="block text-[11px] text-slate-400 mb-1">Batch Inquiry Count</label>
            <select
              value={benchCount}
              onChange={(e) => setBenchCount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold"
            >
              <option value="1000">1,000 Customer Inquiries</option>
              <option value="5000">5,000 Customer Inquiries</option>
              <option value="10000">10,000 Customer Inquiries</option>
              <option value="25000">25,000 Customer Inquiries</option>
              <option value="50000">50,000 Customer Inquiries</option>
            </select>
          </div>

          <button
            onClick={handleRunBenchmark}
            disabled={benchLoading}
            className="w-full sm:w-auto mt-4 sm:mt-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {benchLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
            ) : (
              <Flame className="w-4 h-4 fill-current text-slate-950" />
            )}
            <span>{benchLoading ? 'Inserting into SQLite...' : `Generate ${benchCount.toLocaleString()} Test Customer Inquiries`}</span>
          </button>
        </div>
      </div>

      {/* Category Management: Business Types & Website Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Types */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Business Types ({businessTypes.length})</h3>
            </div>
          </div>

          <form onSubmit={handleAddBusinessType} className="flex gap-2">
            <input
              type="text"
              required
              value={newBType}
              onChange={(e) => setNewBType(e.target.value)}
              placeholder="e.g. Travel Agency"
              className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
            <button
              type="submit"
              disabled={addingBType}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
            >
              Add
            </button>
          </form>

          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {businessTypes.map((bt) => (
              <div key={bt.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-850 text-xs text-slate-300">
                <span>{bt.name}</span>
                <button
                  onClick={() => handleDeleteBusinessType(bt.id)}
                  className="text-slate-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Website Types */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Website Types ({websiteTypes.length})</h3>
            </div>
          </div>

          <form onSubmit={handleAddWebsiteType} className="flex gap-2">
            <input
              type="text"
              required
              value={newWType}
              onChange={(e) => setNewWType(e.target.value)}
              placeholder="e.g. Real Estate Portal"
              className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
            <button
              type="submit"
              disabled={addingWType}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
            >
              Add
            </button>
          </form>

          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {websiteTypes.map((wt) => (
              <div key={wt.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-850 text-xs text-slate-300">
                <span>{wt.name}</span>
                <button
                  onClick={() => handleDeleteWebsiteType(wt.id)}
                  className="text-slate-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-white">System Security Audit Log</h2>
              <p className="text-[11px] text-slate-400">Immutable trace of sensitive administrative operations</p>
            </div>
          </div>
          <button
            onClick={loadAuditLogs}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/80 text-xs">
          {logs.map((log) => (
            <div key={log.id} className="py-2.5 flex items-center justify-between gap-3">
              <div>
                <span className="font-bold text-cyan-400 mr-2">[{log.action}]</span>
                <span className="text-slate-300">{log.details}</span>
              </div>
              <div className="text-[10px] text-slate-500 shrink-0 font-mono text-right">
                <div>{new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString()}</div>
                <div>by {log.admin_username}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, ShieldCheck, AlertCircle, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';

interface LoginViewProps {
  onShowWelcome?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onShowWelcome }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('waqar');
  const [password, setPassword] = useState('waqar');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(username.trim(), password);
      if (!res.success) {
        setError(res.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillCredentials = () => {
    setUsername('waqar');
    setPassword('waqar');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 relative bg-slate-950 text-slate-100 overflow-hidden">
      {/* Background radial atmosphere */}
      <div className="absolute w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl -top-24 -left-24 pointer-events-none" />
      <div className="absolute w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-3xl -bottom-24 -right-24 pointer-events-none" />

      <div className="w-full max-w-md relative z-20">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 mx-auto rounded-full overflow-hidden shadow-[0_0_35px_rgba(59,130,246,0.5)] ring-4 ring-cyan-500/30 bg-slate-900 flex items-center justify-center">
              <img
                src="/logo.png"
                alt="WAQAR Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center -z-10 bg-slate-900">
                <span className="text-3xl font-extrabold text-cyan-400">W</span>
              </div>
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            WAQAR <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">WEBSITE INQUIRY</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Secure Admin Access Portal
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-2xl">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white">Admin Login</h2>
              <p className="text-xs text-slate-400">Enter your credentials to continue</p>
            </div>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>v2.4 Protected</span>
            </span>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="waqar"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950/70 border border-slate-850 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-950/70 border border-slate-850 rounded-xl text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-sm shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Admin Panel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Credential Helper */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400 block font-medium">Default Credentials:</span>
                <span className="text-cyan-400 font-mono font-semibold">User: waqar | Pass: waqar</span>
              </div>
              <button
                type="button"
                onClick={handleFillCredentials}
                className="px-2.5 py-1 text-xs rounded-lg bg-blue-600/20 text-cyan-300 border border-blue-500/30 hover:bg-blue-600/30 transition-colors font-semibold"
              >
                Autofill
              </button>
            </div>

            {onShowWelcome && (
              <button
                type="button"
                onClick={onShowWelcome}
                className="mt-3 w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Replay 3-Second Welcome Intro</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6 font-medium">
          WAQAR WEBSITE INQUIRY &bull; Customer Inquiry & Management System
        </p>
      </div>
    </div>
  );
};

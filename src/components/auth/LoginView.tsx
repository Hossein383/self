import React, { useState } from 'react';
import {
  Lock,
  Shield,
  Key,
  User,
  ArrowRight,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Server,
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (token: string, user: { username: string; role: 'SUPER_ADMIN' | 'OPERATOR' }) => void;
  isRtl: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, isRtl }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser) {
      setError(isRtl ? 'لطفاً نام کاربری را وارد کنید.' : 'Please enter your username.');
      return;
    }

    if (!cleanPass) {
      setError(isRtl ? 'لطفاً گذرواژه امنیتی را وارد کنید.' : 'Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || (isRtl ? 'نام کاربری یا گذرواژه وارد شده نادرست است.' : 'Invalid credentials.'));
      } else {
        onLoginSuccess(data.token, data.user);
      }
    } catch {
      setError(isRtl ? 'خطا در برقراری ارتباط با سرور احراز هویت.' : 'Authentication server connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-xl shadow-indigo-600/30 mb-2">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {isRtl ? 'سامانه مدیریت و کنترل مرکزی تلگرام' : 'Telegram Control Center'}
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Enterprise MTProto Orchestration & Cluster Management
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-indigo-400" />
              <span>{isRtl ? 'احراز هویت ورود به پنل' : 'Administrator Sign-In'}</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              PROTECTED
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">{isRtl ? 'نام کاربری (Username)' : 'Username'}</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-colors"
                />
                <User className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">{isRtl ? 'گذرواژه امنیتی (Password)' : 'Password'}</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition-colors font-mono"
                />
                <Key className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{loading ? (isRtl ? 'در حال بررسی اعتبارسنجی...' : 'Authenticating...') : isRtl ? 'ورود به پنل مدیریت' : 'Sign In'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  Settings,
  Shield,
  AlertOctagon,
  Cpu,
  Clock,
  Save,
  CheckCircle2,
  RefreshCw,
  Key,
} from 'lucide-react';
import { SystemSettings } from '../../types';

interface SettingsViewProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
  isRtl: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  isRtl,
}) => {
  const [form, setForm] = useState<SystemSettings>({ ...settings });
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    onUpdateSettings(form);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleToggleEmergency = () => {
    const nextHalt = !form.emergencyHalt;
    setForm((prev) => ({ ...prev, emergencyHalt: nextHalt }));
    onUpdateSettings({ emergencyHalt: nextHalt });
  };

  return (
    <div id="settings-view" className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-indigo-400" />
          <span>{isRtl ? 'تنظیمات سامانه و تدابیر ضد اسپم (Engine & Safety Policies)' : 'Engine & Anti-Flood Policies'}</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          {isRtl
            ? 'پیکربندی کلید سراسری توقف اضطراری (Kill-Switch)، محدودیت‌های ارسال تلگرام و کنترل چندنخی Workerها'
            : 'Global emergency circuit breaker, Telegram MTProto rate limits, and worker thread concurrency tuning.'}
        </p>
      </div>

      {/* Emergency Halt Banner (Section 31) */}
      <div
        className={`rounded-2xl p-5 border shadow-xl transition-all ${
          form.emergencyHalt
            ? 'bg-rose-950/40 border-rose-500/60 shadow-rose-950/30'
            : 'bg-slate-900/90 border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertOctagon className={`h-5 w-5 ${form.emergencyHalt ? 'text-rose-400 animate-pulse' : 'text-slate-400'}`} />
              <h3 className="font-bold text-sm text-white">
                {isRtl ? 'کلید سراسری توقف اضطراری (Emergency Kill-Switch)' : 'Global Emergency Kill-Switch'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              {isRtl
                ? 'با فعال‌سازی این کلید، تمام جاب‌های در حال اجرا و صف‌های انتشار بدون استثنا متوقف می‌شوند تا حساب‌ها از محرومیت و Flood Wait در امان بمانند.'
                : 'Instantly halts all running workers, halts queue dispatches, and blocks outbound MTProto calls to protect accounts.'}
            </p>
          </div>

          <button
            id="emergency-halt-toggle-btn"
            onClick={handleToggleEmergency}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all shadow-lg cursor-pointer ${
              form.emergencyHalt
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/40'
                : 'bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30'
            }`}
          >
            {form.emergencyHalt
              ? isRtl ? 'سامانه متوقف است (کلیک برای خروج از توقف)' : 'HALT ACTIVE — RESUME SYSTEM'
              : isRtl ? 'توقف سراسری اضطراری' : 'ACTIVATE EMERGENCY HALT'}
          </button>
        </div>
      </div>

      {/* Rate Limits & Policies Form */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
          <Shield className="h-4 w-4 text-cyan-400" />
          <span>{isRtl ? 'پارامترهای ایمنی ارسال و الگوریتم‌های جلوگیری از بلاک' : 'MTProto Safety Boundaries'}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {isRtl ? 'حداقل بازه زمانی مجاز بین ارسال‌ها (دقیقه):' : 'Minimum Allowed Interval (Minutes):'}
            </label>
            <input
              type="number"
              min="5"
              max="120"
              value={form.minIntervalMinutes}
              onChange={(e) => setForm({ ...form, minIntervalMinutes: Number(e.target.value) })}
              className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-indigo-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Prevents operators from configuring dangerous high-frequency bursts.
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {isRtl ? 'سقف تعداد پیام در دقیقه برای هر حساب:' : 'Max Messages Per Minute Per Account:'}
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={form.maxMessagesPerMinutePerAccount}
              onChange={(e) => setForm({ ...form, maxMessagesPerMinutePerAccount: Number(e.target.value) })}
              className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-indigo-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Enforced by token-bucket rate limiter in worker layer.
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {isRtl ? 'حداکثر تعداد تلاش مجدد در خطا (Max Retry Attempts):' : 'Max Retry Attempts on Retryable Errors:'}
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={form.retryAttempts}
              onChange={(e) => setForm({ ...form, retryAttempts: Number(e.target.value) })}
              className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-indigo-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Exponential backoff applied: [5s, 30s, 120s].
            </span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {isRtl ? 'تعداد رشته‌های موازی Worker:' : 'Parallel Worker Concurrency:'}
            </label>
            <input
              type="number"
              min="1"
              max="32"
              value={form.workerConcurrency}
              onChange={(e) => setForm({ ...form, workerConcurrency: Number(e.target.value) })}
              className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-indigo-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Active concurrent execution slots in background engine.
            </span>
          </div>
        </div>

        {/* Telegram App Credentials config */}
        <div className="pt-4 border-t border-slate-800 space-y-4">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Key className="h-4 w-4 text-indigo-400" />
            <span>{isRtl ? 'کلیدهای پایه اپلیکیشن تلگرام (API ID / Hash)' : 'Default Telegram API Credentials'}</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Telegram App API ID</label>
              <input
                type="text"
                value={form.telegramApiId}
                onChange={(e) => setForm({ ...form, telegramApiId: e.target.value })}
                className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Telegram App API Hash (Masked)</label>
              <input
                type="password"
                value={form.telegramApiHash}
                onChange={(e) => setForm({ ...form, telegramApiHash: e.target.value })}
                className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          {isSaved ? (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              <span>{isRtl ? 'تنظیمات با موفقیت ذخیره شدند.' : 'Settings saved successfully.'}</span>
            </span>
          ) : (
            <span />
          )}

          <button
            id="save-settings-btn"
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{isRtl ? 'ذخیره و اعمال تنظیمات' : 'Save Policies'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

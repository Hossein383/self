import React, { useState } from 'react';
import {
  ShieldAlert,
  RotateCcw,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Radio,
  Server,
  Users,
  Shield,
  Clock,
  ArrowRightLeft,
} from 'lucide-react';
import { SystemSettings, TelegramAccount, ProxyItem } from '../../types';

interface FailoverViewProps {
  settings: SystemSettings;
  accounts: TelegramAccount[];
  proxies: ProxyItem[];
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
  isRtl: boolean;
}

export const FailoverView: React.FC<FailoverViewProps> = ({
  settings,
  accounts,
  proxies,
  onUpdateSettings,
  isRtl,
}) => {
  const [maxRetryAttempts, setMaxRetryAttempts] = useState<number>(settings.retryAttempts || 3);
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(settings.circuitBreakerCooldownMinutes || 15);
  const [autoRotateProxy, setAutoRotateProxy] = useState<boolean>(true);
  const [floodWaitSleep, setFloodWaitSleep] = useState<boolean>(true);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSave = () => {
    onUpdateSettings({
      retryAttempts: maxRetryAttempts,
      circuitBreakerCooldownMinutes: cooldownMinutes,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const restrictedAccounts = accounts.filter(
    (a) => a.restrictionStatus !== 'NONE_DETECTED' || a.status === 'DEGRADED' || a.status === 'SESSION_EXPIRED'
  );

  return (
    <div id="failover-view" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-400" />
            <span>{isRtl ? 'سیاست‌های Failover و تاب‌آوری خودکار (Resilience Engine)' : 'Failover Decision Engine & Circuit Breakers'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRtl
              ? 'سیاست‌های چرخش خودکار اکانت هنگام بروز محدودیت تلگرام، تغییر پروکسی در زمان افت کیفیت و مدیریت خطاهای شبکه'
              : 'Automated account substitution upon FloodWait/restrictions, proxy circuit-breaker and dead-letter failover.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="save-failover-settings-btn"
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-rose-600/30 transition-all"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{savedSuccess ? (isRtl ? 'ذخیره شد!' : 'Saved!') : isRtl ? 'ذخیره سیاست‌های افزونگی' : 'Apply Failover Policies'}</span>
          </button>
        </div>
      </div>

      {/* Rules Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Account Failover Rule */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <Users className="h-5 w-5" />
            <h3 className="text-sm font-bold text-white">{isRtl ? 'سیاست جایگزینی اکانت (Account Fallback)' : 'Account Failover Hierarchy'}</h3>
          </div>
          <p className="text-xs text-slate-400">
            {isRtl
              ? 'در صورت دریافت خطای FLOOD_WAIT یا SESSION_EXPIRED، جاب معلق بلافاصله به اکانت رزرو (Failover Account) واگذار می‌شود.'
              : 'When primary account triggers FloodWait or revoked session, queue shifts immediately to hot standby.'}
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <span className="text-slate-300">{isRtl ? 'پایش لحظه‌ای خطاهای FloodWait' : 'Honor Telegram FloodWait Signals'}</span>
              <span className="text-emerald-400 font-mono font-bold">{isRtl ? 'فعال (الزامی)' : 'ACTIVE (Enforced)'}</span>
            </div>

            <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <span className="text-slate-300">{isRtl ? 'اکانت‌های درگیر محدودیت' : 'Currently Degraded Accounts'}</span>
              <span className="text-rose-400 font-mono font-bold">{restrictedAccounts.length} {isRtl ? 'مورد' : 'accounts'}</span>
            </div>
          </div>
        </div>

        {/* Proxy Failover Rule */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <Server className="h-5 w-5" />
            <h3 className="text-sm font-bold text-white">{isRtl ? 'سیاست چرخش پروکسی (Proxy Circuit Breaker)' : 'Proxy Failure Rotation'}</h3>
          </div>
          <p className="text-xs text-slate-400">
            {isRtl
              ? 'در صورت وقوع بیش از ۳ بار خطای اتصال مکرر (Timeout)، پروکسی مربوطه از چرخه خارج و با پروکسی آماده دیگر تعویض می‌گردد.'
              : 'Isolate degraded proxy IP after 3 consecutive network timeouts and reroute traffic through backup tunnels.'}
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <span className="text-slate-300">{isRtl ? 'تعداد تلاش مجدد قبل از تعویض (Retries)' : 'Max Retry Attempts'}</span>
              <select
                value={maxRetryAttempts}
                onChange={(e) => setMaxRetryAttempts(Number(e.target.value))}
                className="rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-xs text-slate-200"
              >
                <option value={1}>1 {isRtl ? 'تلاش' : 'Attempt'}</option>
                <option value={2}>2 {isRtl ? 'تلاش' : 'Attempts'}</option>
                <option value={3}>3 {isRtl ? 'تلاش (استاندارد)' : 'Attempts (Default)'}</option>
                <option value={5}>5 {isRtl ? 'تلاش' : 'Attempts'}</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
              <span className="text-slate-300">{isRtl ? 'مدت زمان استراحت پس از خطا (دقیقه)' : 'Circuit Breaker Cooldown (Min)'}</span>
              <input
                type="number"
                min={1}
                max={120}
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                className="w-20 rounded-lg bg-slate-900 border border-slate-700 px-2 py-1 text-xs text-slate-200 text-center font-mono"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

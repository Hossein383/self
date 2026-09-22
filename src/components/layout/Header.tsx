import React from 'react';
import {
  Search,
  Bell,
  Globe,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { NavItemKey } from './Sidebar';

export interface HeaderProps {
  currentTab: NavItemKey;
  onOpenCommandPalette: () => void;
  isRtl: boolean;
  onToggleRtl?: () => void;
  lang?: 'fa' | 'en';
  onToggleLang?: () => void;
  onToggleLanguage?: () => void;
  failedCount?: number;
  activeJobsCount?: number;
  queuedCount?: number;
  uptime?: number;
  onDrillDownError?: () => void;
  emergencyHaltActive?: boolean;
  onToggleEmergencyHalt?: () => void;
  activeAccountsCount?: number;
  totalAccountsCount?: number;
  aliveProxiesCount?: number;
  totalProxiesCount?: number;
  healthyTargetsCount?: number;
  totalTargetsCount?: number;
  userSession?: { username: string; role: 'SUPER_ADMIN' | 'OPERATOR' } | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenCommandPalette,
  isRtl,
  onToggleRtl,
  lang = 'fa',
  onToggleLang,
  onToggleLanguage,
  failedCount = 0,
  activeJobsCount = 0,
  queuedCount = 0,
  uptime = 100,
  onDrillDownError,
  emergencyHaltActive = false,
  onToggleEmergencyHalt,
  activeAccountsCount,
  totalAccountsCount,
  aliveProxiesCount,
  totalProxiesCount,
  healthyTargetsCount,
  totalTargetsCount,
  userSession,
  onLogout,
}) => {
  const handleLanguageToggle = onToggleLanguage || onToggleLang || onToggleRtl || (() => {});
  const getTabTitle = (tab: NavItemKey) => {
    switch (tab) {
      case 'dashboard':
        return isRtl ? 'پیشخوان کنترل مرکزی (Control Plane)' : 'Central Control Plane';
      case 'accounts':
        return isRtl ? 'مدیریت و اتصال حساب‌های تلگرام (Accounts)' : 'Telegram Accounts Management';
      case 'targets':
        return isRtl ? 'ماتریس انتشار در گروه‌ها و کانال‌ها (Targets Matrix)' : 'Publishing Targets & Spreadsheet Matrix';
      case 'campaigns':
        return isRtl ? 'کمپین‌ها و پیام‌ساز پیشرفته (Campaigns)' : 'Campaigns & Message Composer';
      case 'schedules':
        return isRtl ? 'زمان‌بندی دقیق و تشخیص تداخل (Schedules)' : 'Smart Precision Scheduler';
      case 'failover':
        return isRtl ? 'موتور تصمیم‌گیری Failover و افزونگی' : 'Failover Decision Engine';
      case 'proxies':
        return isRtl ? 'زیرساخت پروکسی و پایش تاخیر (Proxies)' : 'Proxy Infrastructure & Health Checks';
      case 'monitoring':
        return isRtl ? 'پایش جامع و رصد لحظه‌ای سلامت سیستم' : 'System Observability & Monitoring';
      case 'workers':
        return isRtl ? 'استخر Workerها و بازیابی اورفان‌ها' : 'Worker Nodes Pool & Recovery';
      case 'logs':
        return isRtl ? 'مرکز خطایابی، تحویل پیام و ممیزی (Audit)' : 'Deliveries, Errors & Immutable Audit';
      case 'capacity':
        return isRtl ? 'تحلیل ظرفیت بار و شبیه‌ساز انتشار' : 'Capacity Analysis & Simulation';
      case 'backups':
        return isRtl ? 'پشتیبان‌گیری کامل سیستم و بازیابی (Backups)' : 'System Backup & Recovery Center';
      case 'settings':
        return isRtl ? 'تنظیمات امنیتی، سیاست‌های تلگرام و RBAC' : 'Security Settings & Telegram Policies';
    }
  };

  return (
    <header
      id="main-header"
      className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-900/80 px-6 backdrop-blur-xl"
    >
      {/* Title & Quick Info */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <span>{getTabTitle(currentTab)}</span>
            <span className="hidden sm:inline-block rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono text-indigo-400 border border-indigo-500/20">
              CLUSTER ACTIVE
            </span>
          </h1>
        </div>
      </div>

      {/* Middle/Center: Quick Health & Metrics Pill (Interactive drill-down!) */}
      <div className="hidden lg:flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-xl bg-slate-950/70 px-3 py-1.5 border border-slate-800/60 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{uptime > 0 ? `${uptime.toFixed(1)}%` : '100%'} Uptime</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[11px]">
            <Activity className="h-3.5 w-3.5 animate-pulse" />
            <span>{activeJobsCount} Active</span>
          </div>
          <span className="text-slate-700">|</span>
          <span className="text-slate-400 font-mono text-[11px]">{queuedCount} Queued</span>
          {failedCount > 0 && (
            <>
              <span className="text-slate-700">|</span>
              <button
                id="header-failed-jobs-pill"
                onClick={onDrillDownError}
                className="flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-2 py-0.5 text-[11px] font-mono text-rose-400 hover:bg-rose-500/30 transition-colors cursor-pointer border border-rose-500/30"
                title={isRtl ? 'کلیک برای بررسی ریشه خطاها' : 'Click to inspect root causes'}
              >
                <AlertTriangle className="h-3 w-3 text-rose-400" />
                <span>{failedCount} Failed Jobs</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Command Palette Trigger */}
        <button
          id="command-palette-trigger"
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 rounded-xl bg-slate-800/60 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-all border border-slate-700/50 shadow-sm"
        >
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <span className="hidden md:inline">{isRtl ? 'فرمان‌ها...' : 'Quick Action...'}</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-700 bg-slate-900 px-1.5 text-[10px] font-mono text-slate-400">
            Ctrl+K
          </kbd>
        </button>

        {/* Language & RTL Toggles */}
        <button
          id="toggle-lang-button"
          onClick={onToggleLang}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/40 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border border-slate-800"
          title={isRtl ? 'تغییر زبان به انگلیسی' : 'Switch to Persian'}
        >
          <Globe className="h-4 w-4" />
        </button>

        <button
          id="toggle-rtl-button"
          onClick={onToggleRtl}
          className="flex h-9 items-center gap-1 rounded-xl bg-slate-800/40 px-2.5 text-xs font-mono text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border border-slate-800"
          title={isRtl ? 'تغییر جهت به چپ‌به‌راست' : 'Switch to RTL'}
        >
          <Terminal className="h-3.5 w-3.5 text-slate-400" />
          <span>{isRtl ? 'RTL' : 'LTR'}</span>
        </button>

        {/* Notifications Bell */}
        <button
          id="header-notification-button"
          onClick={onDrillDownError}
          className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/40 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border border-slate-800"
          title={isRtl ? 'هشدارهای بحرانی سیستم' : 'Critical Alerts'}
        >
          <Bell className="h-4 w-4" />
          {failedCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-lg shadow-rose-500/50">
              {failedCount}
            </span>
          )}
        </button>

        {/* User RBAC Pill & Logout */}
        <div className="flex items-center gap-2 rounded-xl bg-slate-800/50 py-1 px-2.5 border border-slate-700/40">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/30 text-indigo-400 font-bold text-xs uppercase">
            {userSession?.username ? userSession.username.slice(0, 1) : 'A'}
          </div>
          <div className="hidden xl:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-200">
              {userSession?.username || 'admin'}
            </span>
            <span className="text-[9px] font-mono text-indigo-400 flex items-center gap-1">
              <Shield className="h-2.5 w-2.5" />
              {userSession?.role || 'SUPER_ADMIN'}
            </span>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="ml-1 text-[10px] text-slate-400 hover:text-rose-400 px-1 py-0.5 rounded hover:bg-rose-500/10 transition-colors"
              title={isRtl ? 'خروج از حساب' : 'Logout'}
            >
              {isRtl ? 'خروج' : 'Logout'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

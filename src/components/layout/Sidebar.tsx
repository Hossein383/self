import React from 'react';
import {
  LayoutDashboard,
  Users,
  Target,
  Send,
  CalendarClock,
  ShieldAlert,
  Server,
  Activity,
  Cpu,
  FileText,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  Database,
} from 'lucide-react';

export type NavItemKey =
  | 'dashboard'
  | 'accounts'
  | 'targets'
  | 'campaigns'
  | 'schedules'
  | 'failover'
  | 'proxies'
  | 'monitoring'
  | 'workers'
  | 'logs'
  | 'capacity'
  | 'backups'
  | 'settings';

export type NavTab = NavItemKey;

export interface SidebarProps {
  currentTab: NavItemKey;
  onSelectTab: (tab: NavItemKey) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  stats?: {
    accountsCount: number;
    targetsCount: number;
    failedJobsCount: number;
    activeJobsCount: number;
    proxiesCount: number;
  };
  isRtl: boolean;
  emergencyHaltActive?: boolean;
  activeAccountsCount?: number;
  totalTargetsCount?: number;
  totalProxiesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed = false,
  onToggleCollapse,
  stats,
  isRtl,
  emergencyHaltActive = false,
  activeAccountsCount = 0,
  totalTargetsCount = 0,
  totalProxiesCount = 0,
}) => {
  const currentStats = stats || {
    accountsCount: activeAccountsCount,
    targetsCount: totalTargetsCount,
    failedJobsCount: 0,
    activeJobsCount: 0,
    proxiesCount: totalProxiesCount,
  };
  const navItems = [
    {
      key: 'dashboard' as NavItemKey,
      label: isRtl ? 'پیشخوان کنترل' : 'Dashboard',
      icon: LayoutDashboard,
      badge: currentStats.activeJobsCount > 0 ? `${currentStats.activeJobsCount} live` : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    },
    {
      key: 'accounts' as NavItemKey,
      label: isRtl ? 'حساب‌های کاربری' : 'Accounts',
      icon: Users,
      badge: `${currentStats.accountsCount}`,
      badgeColor: 'bg-slate-800 text-slate-300',
    },
    {
      key: 'targets' as NavItemKey,
      label: isRtl ? 'اهداف و گروه‌ها' : 'Targets Matrix',
      icon: Target,
      badge: `${currentStats.targetsCount}`,
      badgeColor: 'bg-slate-800 text-slate-300',
    },
    {
      key: 'campaigns' as NavItemKey,
      label: isRtl ? 'کمپین‌های انتشار' : 'Campaigns',
      icon: Send,
    },
    {
      key: 'schedules' as NavItemKey,
      label: isRtl ? 'زمان‌بندی هوشمند' : 'Schedules',
      icon: CalendarClock,
    },
    {
      key: 'failover' as NavItemKey,
      label: isRtl ? 'سیاست‌های Failover' : 'Failover Rules',
      icon: ShieldAlert,
    },
    {
      key: 'proxies' as NavItemKey,
      label: isRtl ? 'زیرساخت پروکسی' : 'Proxy Infra',
      icon: Server,
      badge: `${currentStats.proxiesCount}`,
      badgeColor: 'bg-slate-800 text-slate-300',
    },
    {
      key: 'monitoring' as NavItemKey,
      label: isRtl ? 'مانیتورینگ و سلامت' : 'Monitoring',
      icon: Activity,
      badge: currentStats.activeJobsCount > 0 ? 'Live' : undefined,
      badgeColor: 'bg-cyan-500/10 text-cyan-400',
    },
    {
      key: 'workers' as NavItemKey,
      label: isRtl ? 'مدیریت Workerها' : 'Worker Pool',
      icon: Cpu,
    },
    {
      key: 'logs' as NavItemKey,
      label: isRtl ? 'لاگ‌ها و خطاها' : 'Logs & Errors',
      icon: FileText,
      badge: currentStats.failedJobsCount > 0 ? `${currentStats.failedJobsCount} err` : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    },
    {
      key: 'capacity' as NavItemKey,
      label: isRtl ? 'توزیع ظرفیت و شبیه‌ساز' : 'Capacity & Sim',
      icon: Layers,
    },
    {
      key: 'backups' as NavItemKey,
      label: isRtl ? 'پشتیبان‌گیری و بازیابی' : 'Backup & Restore',
      icon: Database,
    },
    {
      key: 'settings' as NavItemKey,
      label: isRtl ? 'تنظیمات و امنیت' : 'Settings',
      icon: Sliders,
    },
  ];

  return (
    <aside
      id="main-sidebar"
      className={`relative z-20 flex flex-col border-slate-800/80 bg-slate-900/90 backdrop-blur-xl transition-all duration-300 ease-in-out ${
        isRtl ? 'border-l' : 'border-r'
      } ${collapsed ? 'w-20' : 'w-64'}`}
    >
      {/* Header / Brand */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/20">
            <Shield className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col truncate">
              <span className="font-bold text-sm tracking-tight text-white">
                Telegram Control
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                Enterprise v2.4
              </span>
            </div>
          )}
        </div>
        <button
          id="toggle-sidebar-button"
          onClick={onToggleCollapse}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          title={isRtl ? 'تغییر وضعیت نوار کناری' : 'Toggle Sidebar'}
        >
          {isRtl ? (
            collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.key;
          return (
            <button
              key={item.key}
              id={`nav-item-${item.key}`}
              onClick={() => onSelectTab(item.key)}
              title={collapsed ? item.label : undefined}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-indigo-400' : 'text-slate-400'
                }`}
              />
              {!collapsed && (
                <div className="flex flex-1 items-center justify-between truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-medium ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Operational Integrity Status Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-800/60">
          <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/40">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span>{isRtl ? 'سلامت زیرساخت' : 'Infra Status'}</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[10px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ONLINE
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono truncate">
              DC4: 14ms | P12: 940ms
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

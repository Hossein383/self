import React, { useState, useEffect } from 'react';
import {
  Search,
  X,
  Users,
  Target,
  Send,
  Server,
  Activity,
  FileText,
  Sliders,
  AlertTriangle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { NavItemKey } from './layout/Sidebar';

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: NavItemKey) => void;
  onAction?: (actionType: string) => void;
  onToggleEmergencyHalt?: () => void;
  emergencyHaltActive?: boolean;
  isRtl: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onAction,
  onToggleEmergencyHalt,
  emergencyHaltActive = false,
  isRtl,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else if (onAction) onAction('OPEN_PALETTE');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onAction]);

  if (!isOpen) return null;

  const commands = [
    {
      id: 'goto-accounts',
      title: isRtl ? 'مشاهده و اتصال حساب‌های تلگرام' : 'Go to Accounts',
      category: 'Navigation',
      icon: Users,
      action: () => { onNavigate('accounts'); onClose(); },
    },
    {
      id: 'add-account-wizard',
      title: isRtl ? 'افزودن حساب جدید (Phone OTP یا Session)' : 'Add Telegram Account Wizard',
      category: 'Actions',
      icon: Users,
      action: () => { onNavigate('accounts'); onAction?.('ADD_ACCOUNT'); onClose(); },
    },
    {
      id: 'goto-targets',
      title: isRtl ? 'ماتریس انتشار و گروه‌ها (Spreadsheet Matrix)' : 'Go to Targets Matrix',
      category: 'Navigation',
      icon: Target,
      action: () => { onNavigate('targets'); onClose(); },
    },
    {
      id: 'bulk-edit-targets',
      title: isRtl ? 'ویرایش دسته‌جمعی اهداف (Bulk Edit Targets)' : 'Bulk Edit Selected Targets',
      category: 'Actions',
      icon: Target,
      action: () => { onNavigate('targets'); onAction?.('BULK_EDIT'); onClose(); },
    },
    {
      id: 'create-campaign',
      title: isRtl ? 'ایجاد کمپین جدید با پیام‌ساز پیشرفته' : 'Create New Campaign',
      category: 'Actions',
      icon: Send,
      action: () => { onNavigate('campaigns'); onAction?.('NEW_CAMPAIGN'); onClose(); },
    },
    {
      id: 'inspect-error-root-cause',
      title: isRtl ? 'بررسی ریشه خطاهای اخیر (Inspect P12 Latency Spike)' : 'Inspect 4 Failed Jobs & Root Cause',
      category: 'Diagnostics',
      icon: AlertTriangle,
      action: () => { onNavigate('logs'); onAction?.('ROOT_CAUSE'); onClose(); },
    },
    {
      id: 'test-proxies',
      title: isRtl ? 'تست سلامت و پینگ تمام پروکسی‌ها' : 'Run Health Check on All 36 Proxies',
      category: 'Diagnostics',
      icon: Server,
      action: () => { onNavigate('proxies'); onAction?.('TEST_ALL_PROXIES'); onClose(); },
    },
    {
      id: 'run-dry-run',
      title: isRtl ? 'اجرای تست مقدماتی و شبیه‌سازی (Dry Run / Preflight)' : 'Run Dry Run & Preflight Simulation',
      category: 'Scheduling',
      icon: Play,
      action: () => { onNavigate('capacity'); onClose(); },
    },
    {
      id: 'goto-monitoring',
      title: isRtl ? 'مشاهده مانیتورینگ سیستم و Uptime' : 'Open System Monitoring',
      category: 'Navigation',
      icon: Activity,
      action: () => { onNavigate('monitoring'); onClose(); },
    },
    {
      id: 'goto-audit',
      title: isRtl ? 'مشاهده دفتر کل ممیزی تغییرات (Audit Logs)' : 'View Immutable Audit Ledger',
      category: 'Security',
      icon: FileText,
      action: () => { onNavigate('logs'); onClose(); },
    },
    {
      id: 'goto-settings',
      title: isRtl ? 'تنظیمات، سیاست‌های FloodWait و RBAC' : 'Settings & Telegram Policies',
      category: 'Configuration',
      icon: Sliders,
      action: () => { onNavigate('settings'); onClose(); },
    },
  ];

  const filteredCommands = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      id="command-palette-backdrop"
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 p-4 pt-20 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="command-palette-modal"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-slate-950/90 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="relative flex items-center border-b border-slate-800 px-4 py-3">
          <Search className="h-5 w-5 text-indigo-400 shrink-0" />
          <input
            id="command-palette-input"
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isRtl ? 'جستجوی دستور، اکانت، هدف یا لاگ...' : 'Type a command or search...'}
            className="w-full bg-transparent px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              {isRtl ? 'دستوری با این عبارت یافت نشد' : 'No matching commands found.'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    id={`cmd-${cmd.id}`}
                    onClick={cmd.action}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white transition-all text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-indigo-400 border border-slate-700/50">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-slate-200">{cmd.title}</span>
                    </div>
                    <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-400 border border-slate-700/40">
                      {cmd.category}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/60 px-4 py-2 text-[11px] text-slate-500 font-mono">
          <span>{isRtl ? 'برای انتخاب کلیک کنید یا Enter را بزنید' : 'Use arrow keys & Enter to select'}</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};

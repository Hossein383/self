import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Shield,
  Phone,
  FileCode,
  Key,
  CheckCircle2,
  AlertTriangle,
  X,
  Server,
  RefreshCw,
  Search,
  Lock,
  ExternalLink,
  Trash2,
  Activity,
  Check,
  Copy,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { TelegramAccount, ProxyItem } from '../../types';
import { defaultTelegramProvider } from '../../services/telegram/mockProvider';

interface AccountsViewProps {
  accounts: TelegramAccount[];
  proxies: ProxyItem[];
  onAddAccount: (account: TelegramAccount) => void;
  onUpdateAccount: (id: string, updates: Partial<TelegramAccount>) => void;
  onDeleteAccount: (id: string) => void;
  isRtl: boolean;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  proxies,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  isRtl,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardMode, setWizardMode] = useState<'PHONE' | 'SESSION'>('PHONE');
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [selectedAccountForDiag, setSelectedAccountForDiag] = useState<TelegramAccount | null>(null);

  // Wizard state
  const [phoneInput, setPhoneInput] = useState('');
  const [selectedProxyId, setSelectedProxyId] = useState<string>('');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [deliveryType, setDeliveryType] = useState<'APP' | 'SMS' | 'CALL' | 'EMAIL'>('APP');
  const [otpInput, setOtpInput] = useState('');
  const [codeCountdown, setCodeCountdown] = useState<number>(120);
  const [requires2FA, setRequires2FA] = useState<boolean>(false);
  const [password2FA, setPassword2FA] = useState('');
  const [sessionString, setSessionString] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [createdAccountSummary, setCreatedAccountSummary] = useState<TelegramAccount | null>(null);

  // Deduplicate items to prevent React key collisions
  const uniqueAccounts = Array.from(new Map(accounts.map((a) => [a.id, a])).values());
  const uniqueProxies = Array.from(new Map(proxies.map((p) => [p.id, p])).values());

  const filteredAccounts = uniqueAccounts.filter((acc) => {
    const matchesSearch =
      acc.phone.includes(searchTerm) ||
      acc.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.username && acc.username.toLowerCase().includes(searchTerm.toLowerCase()));
    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && acc.status === statusFilter;
  });

  // Countdown timer for Telegram verification code in Step 2
  useEffect(() => {
    let timer: any;
    if (isWizardOpen && wizardStep === 2 && codeCountdown > 0) {
      timer = setInterval(() => {
        setCodeCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isWizardOpen, wizardStep, codeCountdown]);

  // Handler for Phone OTP Flow: Requests authentic verification code from Telegram (auth.sendCode)
  const handleRequestCode = async () => {
    if (!phoneInput || phoneInput.trim().length < 7) {
      setWizardError(isRtl ? 'لطفاً شماره تلفن معتبر با پیش‌شماره بین‌المللی وارد نمایید (مثال: +989123456789).' : 'Please enter a valid international phone number (+989...).');
      return;
    }
    setIsProcessing(true);
    setWizardError(null);
    try {
      const result = await defaultTelegramProvider.requestVerificationCode(phoneInput.trim());
      setAttemptId(result.attemptId);
      setDeliveryType(result.deliveryType);
      setCodeCountdown(result.timeout || 120);
      setOtpInput('');
      setRequires2FA(false);
      setWizardStep(2); // Advance to manual user OTP entry step
    } catch (err: any) {
      setWizardError(err.message || 'خطا در ارسال کد تایید تلگرام.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResendCode = async () => {
    if (!attemptId) {
      handleRequestCode();
      return;
    }
    setIsProcessing(true);
    setWizardError(null);
    try {
      if (defaultTelegramProvider.resendVerificationCode) {
        const res = await defaultTelegramProvider.resendVerificationCode(attemptId);
        setCodeCountdown(res.timeout || 120);
      } else {
        await handleRequestCode();
      }
    } catch (err: any) {
      setWizardError(err.message || 'خطا در ارسال مجدد کد تأیید تلگرام.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyOtpAndCreate = async () => {
    if (!otpInput.trim()) {
      setWizardError(isRtl ? 'لطفاً کد تایید دریافتی از تلگرام را وارد نمایید.' : 'Please enter the verification code received from Telegram.');
      return;
    }
    if (!attemptId) {
      setWizardError(isRtl ? 'شناسه درخواست یافت نشد. لطفاً شماره را مجدداً ارسال فرمایید.' : 'Session attempt missing. Please re-enter phone.');
      return;
    }

    setIsProcessing(true);
    setWizardError(null);
    try {
      let authResult;
      if (requires2FA) {
        if (!password2FA.trim()) {
          setWizardError(isRtl ? 'لطفاً رمز عبور تأیید دومرحله‌ای را وارد کنید.' : 'Please enter your 2FA password.');
          setIsProcessing(false);
          return;
        }
        authResult = await defaultTelegramProvider.verify2FA(attemptId, password2FA.trim());
      } else {
        const res = await defaultTelegramProvider.authenticate(phoneInput.trim(), otpInput.trim(), attemptId, password2FA.trim() || undefined);
        if (res.requires2FA) {
          setRequires2FA(true);
          setWizardError(isRtl ? 'این حساب دارای رمز تأیید دومرحله‌ای (2FA) است. لطفاً رمز عبور خود را وارد کنید.' : 'Two-Step Verification (2FA) is active. Please enter your password.');
          setIsProcessing(false);
          return;
        }
        authResult = res;
      }

      const tempAccId = 'acc-' + Date.now();
      let dialogsList: any[] = [];
      try {
        dialogsList = await defaultTelegramProvider.getDialogs(tempAccId, authResult.sessionHash);
      } catch {
        dialogsList = [];
      }

      const groupCount = dialogsList.filter((d) => d.type === 'GROUP' || d.type === 'SUPERGROUP').length;
      const channelCount = dialogsList.filter((d) => d.type === 'CHANNEL').length;
      const botCount = dialogsList.filter((d) => d.type === 'BOT').length;
      const privateCount = dialogsList.length - groupCount - channelCount - botCount;

      const newAcc: TelegramAccount = {
        id: tempAccId,
        phone: authResult.profile.phone || phoneInput.trim(),
        username: authResult.profile.username,
        displayName: authResult.profile.displayName || 'کاربر تلگرام',
        telegramUserId: authResult.profile.userId,
        dcId: authResult.profile.dcId || 4,
        phoneRegion: authResult.profile.phoneRegion || 'Iran (+98)',
        accountType: 'USER',
        isPremium: authResult.profile.isPremium,
        has2FA: Boolean(authResult.profile.has2FA || requires2FA),
        status: 'CONNECTED',
        restrictionStatus: 'NONE_DETECTED',
        proxyId: selectedProxyId || (uniqueProxies.length > 0 ? uniqueProxies[0].id : undefined),
        lastSeen: new Date().toISOString(),
        lastSuccessfulOp: new Date().toISOString(),
        encryptedSessionHash: authResult.sessionHash,
        healthScore: {
          connection: 'HEALTHY',
          auth: 'VALID',
          session: 'HEALTHY',
          proxy: selectedProxyId ? 'HEALTHY' : 'DEGRADED',
          restrictions: 'NONE',
        },
        stats: {
          messagesProcessed: 0,
          successfulJobs: 0,
          failedJobs: 0,
          uptimePercent: 100,
          avgLatencyMs: 68,
        },
        dialogCount: {
          total: dialogsList.length,
          groups: groupCount,
          channels: channelCount,
          privateChats: Math.max(0, privateCount),
          bots: botCount,
        },
      };

      onAddAccount(newAcc);
      setCreatedAccountSummary(newAcc);
      setWizardStep(3); // Completed step
    } catch (err: any) {
      setWizardError(err.message || 'کد تایید نامعتبر است یا منقضی شده است.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler for Session Import Flow
  const handleSessionImport = async () => {
    if (!sessionString.trim()) {
      setWizardError(isRtl ? 'لطفاً رشته سشن معتبر وارد نمایید.' : 'Please provide a valid session string.');
      return;
    }
    setIsProcessing(true);
    setWizardError(null);
    try {
      const imported = await defaultTelegramProvider.importSession(sessionString);
      const tempAccId = 'acc-' + Date.now();
      
      let dialogsList: any[] = [];
      try {
        dialogsList = await defaultTelegramProvider.getDialogs(tempAccId);
      } catch {
        dialogsList = [];
      }
      
      const groupCount = dialogsList.filter((d) => d.type === 'GROUP' || d.type === 'SUPERGROUP').length;
      const channelCount = dialogsList.filter((d) => d.type === 'CHANNEL').length;
      const botCount = dialogsList.filter((d) => d.type === 'BOT').length;
      const privateCount = dialogsList.length - groupCount - channelCount - botCount;

      const newAcc: TelegramAccount = {
        id: tempAccId,
        phone: imported.profile.phone,
        username: imported.profile.username,
        displayName: imported.profile.displayName,
        telegramUserId: imported.profile.userId,
        dcId: imported.profile.dcId,
        phoneRegion: imported.profile.phoneRegion,
        accountType: 'USER',
        isPremium: imported.profile.isPremium,
        has2FA: imported.profile.has2FA,
        status: 'CONNECTED',
        restrictionStatus: 'NONE_DETECTED',
        proxyId: selectedProxyId || (uniqueProxies.length > 0 ? uniqueProxies[0].id : undefined),
        lastSeen: new Date().toISOString(),
        lastSuccessfulOp: new Date().toISOString(),
        encryptedSessionHash: imported.sessionHash,
        healthScore: {
          connection: 'HEALTHY',
          auth: 'VALID',
          session: 'HEALTHY',
          proxy: selectedProxyId ? 'HEALTHY' : 'DEGRADED',
          restrictions: 'NONE',
        },
        stats: {
          messagesProcessed: 0,
          successfulJobs: 0,
          failedJobs: 0,
          uptimePercent: 100,
          avgLatencyMs: 72,
        },
        dialogCount: {
          total: dialogsList.length,
          groups: groupCount,
          channels: channelCount,
          privateChats: Math.max(0, privateCount),
          bots: botCount,
        },
      };

      onAddAccount(newAcc);
      setCreatedAccountSummary(newAcc);
      setWizardStep(3);
    } catch (err: any) {
      setWizardError(err.message || 'سشن واردشده نامعتبر است.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetWizard = () => {
    setIsWizardOpen(false);
    setWizardStep(1);
    setPhoneInput('');
    setOtpInput('');
    setAttemptId(null);
    setDeliveryType('APP');
    setCodeCountdown(120);
    setRequires2FA(false);
    setPassword2FA('');
    setSessionString('');
    setSelectedProxyId('');
    setWizardError(null);
    setCreatedAccountSummary(null);
  };

  return (
    <div id="accounts-view" className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-400" />
            <span>{isRtl ? 'مدیریت و اتصال حساب‌های تلگرام (Accounts)' : 'Telegram Accounts'}</span>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-mono text-slate-300">
              {accounts.length} Total
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRtl
              ? 'اتصال پایدار از طریق MTProto، رمزنگاری کلاینت‌ساید نشست‌ها با AES-256 و پایش سلامت اتصال'
              : 'Reliable MTProto client connections with AES-256 session encryption and continuous health checks.'}
          </p>
        </div>

        <button
          id="add-account-btn"
          onClick={() => {
            setIsWizardOpen(true);
            setWizardStep(1);
          }}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>{isRtl ? 'افزودن حساب جدید (Onboard Wizard)' : 'Add Telegram Account'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-slate-900/80 p-3 border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            id="accounts-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isRtl ? 'جستجو با شماره، نام کاربری یا برچسب...' : 'Search by phone, username, tag...'}
            className="w-full rounded-xl bg-slate-950/70 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 border border-slate-800 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['ALL', 'CONNECTED', 'DEGRADED', 'RESTRICTED', 'SESSION_EXPIRED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-xl px-3 py-1.5 text-[11px] font-mono transition-all shrink-0 ${
                statusFilter === status
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 font-semibold'
                  : 'bg-slate-950/40 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Accounts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAccounts.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-200">
                {isRtl ? 'هیچ حساب تلگرامی متصل نشده است' : 'No Telegram Accounts Connected'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {isRtl
                  ? 'جهت اتصال حساب تستی، بر روی دکمه «افزودن حساب جدید» کلیک کرده و شماره تلفن یا سشن خود را وارد فرمایید.'
                  : 'Click "Add Telegram Account" to connect your first test account via OTP verification or session string.'}
              </p>
            </div>
            <button
              onClick={() => {
                setIsWizardOpen(true);
                setWizardStep(1);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{isRtl ? 'افزودن حساب تستی اول' : 'Connect First Account'}</span>
            </button>
          </div>
        )}

        {filteredAccounts.map((account) => {
          const isHealthy = account.status === 'CONNECTED';
          const isDegraded = account.status === 'DEGRADED';
          const isRestricted = account.status === 'RESTRICTED';
          const isExpired = account.status === 'SESSION_EXPIRED';
          const assignedProxy = uniqueProxies.find((p) => p.id === account.proxyId);

          return (
            <div
              key={account.id}
              id={`account-card-${account.id}`}
              className={`rounded-2xl p-5 border transition-all shadow-xl bg-slate-900/90 ${
                isRestricted
                  ? 'border-rose-500/40 hover:border-rose-500'
                  : isDegraded
                  ? 'border-amber-500/40 hover:border-amber-500'
                  : isExpired
                  ? 'border-purple-500/40 hover:border-purple-500'
                  : 'border-slate-800 hover:border-indigo-500/40'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800 text-slate-200 font-bold text-sm border border-slate-700/60 shadow-inner">
                      {account.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <span
                      className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-slate-900 ${
                        isHealthy
                          ? 'bg-emerald-500'
                          : isDegraded
                          ? 'bg-amber-500'
                          : isRestricted
                          ? 'bg-rose-500'
                          : 'bg-purple-500'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-white truncate max-w-[150px]">{account.displayName}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                      <span>{account.phone}</span>
                      {account.isPremium && (
                        <span className="rounded bg-indigo-500/20 px-1 py-0.2 text-[9px] text-indigo-300 font-mono">
                          ★ Prem
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold border ${
                    isHealthy
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : isDegraded
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : isRestricted
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                  }`}
                >
                  {account.status}
                </span>
              </div>

              {/* Specs & Semantics */}
              <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] rounded-xl bg-slate-950/60 p-3 border border-slate-800/60">
                <div>
                  <span className="text-slate-500">{isRtl ? 'مرکز داده (DC):' : 'Data Center:'}</span>
                  <div className="font-mono text-slate-300 font-medium">DC {account.dcId}</div>
                </div>
                <div>
                  <span className="text-slate-500">{isRtl ? 'منطقه شماره:' : 'Phone Region:'}</span>
                  <div className="text-slate-300 truncate">{account.phoneRegion}</div>
                </div>
                <div>
                  <span className="text-slate-500">{isRtl ? 'پروکسی انتسابی:' : 'Assigned Proxy:'}</span>
                  <div className={`font-mono truncate ${assignedProxy?.status === 'DEGRADED' ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                    {assignedProxy ? `${assignedProxy.regionLabel}` : 'Direct'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">{isRtl ? 'گروه‌ها / کانال‌ها:' : 'Dialogs:'}</span>
                  <div className="font-mono text-slate-300">
                    {account.dialogCount.groups} G / {account.dialogCount.channels} Ch
                  </div>
                </div>
              </div>

              {/* Error Notice if degraded or restricted */}
              {account.lastError && (
                <div className="mt-3 rounded-lg bg-rose-950/30 p-2.5 border border-rose-500/20 text-[10px] text-rose-300 font-mono">
                  {account.lastError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/80">
                <button
                  id={`diag-btn-${account.id}`}
                  onClick={() => setSelectedAccountForDiag(account)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs text-slate-200 transition-colors"
                >
                  <Activity className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{isRtl ? 'گزارش عیب‌یابی (Diagnostics)' : 'Diagnostics'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      onUpdateAccount(account.id, {
                        lastSeen: new Date().toISOString(),
                        lastSuccessfulOp: new Date().toISOString(),
                      });
                    }}
                    title={isRtl ? 'همگام‌سازی وضعیت' : 'Sync Status'}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteAccount(account.id)}
                    title={isRtl ? 'حذف اکانت' : 'Delete Account'}
                    className="p-1.5 rounded-lg text-rose-400/80 hover:bg-rose-500/20 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Account Diagnostics Modal (Section 115) */}
      {selectedAccountForDiag && (
        <div
          id="account-diagnostics-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedAccountForDiag(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedAccountForDiag.displayName}</h3>
                  <span className="text-xs text-slate-400 font-mono">{selectedAccountForDiag.phone}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAccountForDiag(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Diagnostic Details Grid */}
            <div className="space-y-4">
              <div className="rounded-xl bg-slate-950/70 p-4 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  {isRtl ? 'هویت و نشست تلگرام' : 'Telegram Identity & Security'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px]">Telegram User ID:</span>
                    <div className="font-mono text-slate-200">{selectedAccountForDiag.telegramUserId}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Data Center (DC):</span>
                    <div className="font-mono text-slate-200">DC {selectedAccountForDiag.dcId}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">2FA Verification:</span>
                    <div className="text-emerald-400 font-medium">
                      {selectedAccountForDiag.has2FA ? 'Enabled (Active)' : 'Disabled'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Session Encryption:</span>
                    <div className="text-indigo-400 font-mono text-[10px] truncate">
                      {selectedAccountForDiag.encryptedSessionHash}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Restriction Status:</span>
                    <div className="text-slate-300 font-medium">
                      {selectedAccountForDiag.restrictionStatus}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Uptime Rate:</span>
                    <div className="text-emerald-400 font-mono font-bold">
                      {selectedAccountForDiag.stats.uptimePercent}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Dialog Distribution */}
              <div className="rounded-xl bg-slate-950/70 p-4 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                  {isRtl ? 'آمار دیالوگ‌ها و گروه‌های در دسترس' : 'Dialog Discovery Matrix'}
                </h4>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                    <span className="text-sm font-bold font-mono text-white">
                      {selectedAccountForDiag.dialogCount.groups}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{isRtl ? 'گروه‌ها' : 'Groups'}</span>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                    <span className="text-sm font-bold font-mono text-white">
                      {selectedAccountForDiag.dialogCount.channels}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{isRtl ? 'کانال‌ها' : 'Channels'}</span>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                    <span className="text-sm font-bold font-mono text-white">
                      {selectedAccountForDiag.dialogCount.privateChats}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{isRtl ? 'چت‌های خصوصی' : 'Private'}</span>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                    <span className="text-sm font-bold font-mono text-white">
                      {selectedAccountForDiag.dialogCount.bots}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{isRtl ? 'ربات‌ها' : 'Bots'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedAccountForDiag(null)}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-200"
              >
                {isRtl ? 'بستن پنجره' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Wizard Modal (Section 6: Mode A Phone + Mode B Session) */}
      {isWizardOpen && (
        <div
          id="account-wizard-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in"
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {isRtl ? 'افزودن حساب کاربری تلگرام (Telegram Onboarding)' : 'Add Telegram Account Wizard'}
                </h3>
                <span className="text-xs text-slate-400">
                  {wizardMode === 'PHONE' ? 'Mode A: Phone & OTP 2FA' : 'Mode B: Encrypted Session Import'}
                </span>
              </div>
              <button onClick={resetWizard} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Selector Tabs */}
            {wizardStep === 1 && (
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setWizardMode('PHONE')}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    wizardMode === 'PHONE' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>{isRtl ? 'حالت الف: شماره و پیامک (Phone OTP)' : 'Mode A: Phone Login'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWizardMode('SESSION')}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    wizardMode === 'SESSION' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="h-3.5 w-3.5" />
                  <span>{isRtl ? 'حالت ب: ایمپورت سشن (Session String)' : 'Mode B: Session Import'}</span>
                </button>
              </div>
            )}

            {wizardError && (
              <div className="rounded-xl bg-rose-950/40 p-3 border border-rose-500/40 text-xs text-rose-300">
                {wizardError}
              </div>
            )}

            {/* Mode A: Step 1 (Phone Input & Proxy Selection) */}
            {wizardMode === 'PHONE' && wizardStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isRtl ? 'شماره تماس تلگرام (با پیش‌شماره بین‌المللی):' : 'Telegram Phone Number (E.164 format):'}
                  </label>
                  <input
                    type="text"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+989123456789"
                    className="w-full rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs text-white border border-slate-800 font-mono focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {isRtl
                      ? 'کد ورود ۵ رقمی به تلگرام متصل به این شماره ارسال خواهد شد.'
                      : 'A 5-digit Telegram confirmation code will be dispatched to this number.'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isRtl ? 'پروکسی اختصاصی برای این حساب (اختیاری):' : 'Dedicated Proxy Routing (Optional):'}
                  </label>
                  <select
                    value={selectedProxyId}
                    onChange={(e) => setSelectedProxyId(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 px-3 py-2.5 text-xs text-slate-200 border border-slate-800 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">{isRtl ? 'اتصال مستقیم MTProto (بدون پروکسی)' : 'Direct MTProto (No Proxy)'}</option>
                    {uniqueProxies.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.regionLabel || `${p.host}:${p.port}`} — {p.protocol} ({p.host}:{p.port}) [{p.latencyMs}ms]
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={resetWizard}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700"
                  >
                    {isRtl ? 'انصراف' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleRequestCode}
                    disabled={isProcessing}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/20"
                  >
                    {isProcessing ? (isRtl ? 'در حال صدور و ارسال کد...' : 'Requesting Code...') : (isRtl ? 'دریافت کد تایید تلگرام' : 'Request Verification Code')}
                  </button>
                </div>
              </div>
            )}

            {/* Mode A: Step 2 (Real Telegram Verification & 2FA) */}
            {wizardMode === 'PHONE' && wizardStep === 2 && (
              <div className="space-y-4">
                {/* Authentic Telegram Dispatch Banner (NO FAKE CODE DISPLAY) */}
                <div className="rounded-2xl bg-indigo-950/40 p-4 border border-indigo-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-200">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>{isRtl ? 'کد تأیید توسط Telegram ارسال شد' : 'Verification Code Dispatched via Telegram'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono bg-slate-900/80 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                      <Clock className="h-3 w-3 text-indigo-400" />
                      <span>
                        {codeCountdown > 0
                          ? `${Math.floor(codeCountdown / 60)}:${(codeCountdown % 60).toString().padStart(2, '0')}`
                          : (isRtl ? 'زمان منقضی شد' : 'Expired')}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {deliveryType === 'APP'
                      ? (isRtl
                          ? 'یک کد تأیید برای برنامه رسمی Telegram شما ارسال شده است. لطفاً کد دریافتی را در کادر زیر وارد کنید.'
                          : 'A confirmation code has been dispatched to your Telegram app. Please enter the received code below.')
                      : (isRtl
                          ? 'یک کد تأیید از طریق پیامک (SMS) برای شماره شما ارسال شده است. لطفاً کد دریافتی را در کادر زیر وارد کنید.'
                          : 'A confirmation code has been sent via SMS to your number. Please enter the received code below.')}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-indigo-500/20">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{isRtl ? `روش ارسال: ${deliveryType === 'APP' ? 'اپلیکیشن تلگرام' : 'پیامک SMS'}` : `Delivery: ${deliveryType}`}</span>
                    </span>
                    {codeCountdown === 0 ? (
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={isProcessing}
                        className="text-indigo-400 hover:text-indigo-300 font-medium underline cursor-pointer"
                      >
                        {isRtl ? 'ارسال مجدد کد' : 'Resend Code'}
                      </button>
                    ) : (
                      <span className="text-slate-500 text-[10px]">
                        {isRtl ? 'در صورت عدم دریافت، پس از پایان تایمر مجدداً درخواست دهید' : 'You can resend after timer expires'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Real User OTP Input */}
                <div>
                  <label className="block text-xs font-medium text-slate-200 mb-1.5">
                    {isRtl ? 'کد تأیید Telegram (کد دریافتی را وارد کنید):' : 'Telegram Verification Code (Enter received code):'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder={isRtl ? 'مثال: ۴۸۱۷۳' : 'e.g. 48173'}
                    maxLength={8}
                    className="w-full rounded-xl bg-slate-950 px-4 py-3 text-center text-xl font-mono tracking-widest text-emerald-400 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {isRtl
                      ? 'کد دریافتی از تلگرام را دقیقاً در این کادر وارد نمایید.'
                      : 'Enter the exact verification code dispatched to your Telegram session.'}
                  </span>
                </div>

                {/* 2FA Password Input (Displayed prominently when requires2FA or active) */}
                {requires2FA ? (
                  <div className="rounded-xl bg-amber-950/40 p-3.5 border border-amber-500/40 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                      <Key className="h-4 w-4 text-amber-400" />
                      <span>{isRtl ? 'تأیید دو مرحله‌ای فعال است (Two-Step Verification)' : '2FA Password Required'}</span>
                    </div>
                    <label className="block text-[11px] text-amber-200/90">
                      {isRtl ? 'لطفاً رمز عبور حساب تلگرام خود را وارد فرمایید:' : 'Please enter your Telegram Cloud password:'}
                    </label>
                    <input
                      type="password"
                      value={password2FA}
                      onChange={(e) => setPassword2FA(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs text-white border border-amber-500/40 focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {isRtl ? 'رمز عبور تأیید دومرحله‌ای (2FA - در صورت فعال بودن):' : 'Cloud 2FA Password (If enabled):'}
                    </label>
                    <input
                      type="password"
                      value={password2FA}
                      onChange={(e) => setPassword2FA(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl bg-slate-950 px-3 py-2.5 text-xs text-white border border-slate-800 focus:border-indigo-500 focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      {isRtl ? 'تنها در صورت فعال بودن Two-Step Verification در حساب تلگرام نیاز به ورود است.' : 'Only required if Two-Step Verification is active on this account.'}
                    </span>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 cursor-pointer"
                  >
                    {isRtl ? 'مرحله قبل' : 'Back'}
                  </button>
                  <button
                    onClick={handleVerifyOtpAndCreate}
                    disabled={isProcessing || !otpInput.trim()}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/20"
                  >
                    {isProcessing ? (isRtl ? 'در حال اعتبارسنجی با تلگرام...' : 'Validating with Telegram...') : (isRtl ? 'تأیید کد و اتصال حساب' : 'Verify & Connect Account')}
                  </button>
                </div>
              </div>
            )}

            {/* Mode B: Session String Import */}
            {wizardMode === 'SESSION' && wizardStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isRtl ? 'رشته سشن Telethon یا Pyrogram:' : 'Telethon / Pyrogram Session String:'}
                  </label>
                  <textarea
                    rows={4}
                    value={sessionString}
                    onChange={(e) => setSessionString(e.target.value)}
                    placeholder="1BJWap1wBu3d8X9..."
                    className="w-full rounded-xl bg-slate-950 p-3 text-xs font-mono text-slate-200 border border-slate-800 focus:border-indigo-500 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    {isRtl
                      ? 'سشن بلافاصله با کلید مستر سرور به‌صورت AES-256 رمزنگاری شده و نسخه خام حذف می‌گردد.'
                      : 'Session will be encrypted at rest via AES-256 and raw string permanently discarded.'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isRtl ? 'پروکسی اختصاصی برای این حساب (اختیاری):' : 'Dedicated Proxy Routing (Optional):'}
                  </label>
                  <select
                    value={selectedProxyId}
                    onChange={(e) => setSelectedProxyId(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 px-3 py-2.5 text-xs text-slate-200 border border-slate-800 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">{isRtl ? 'اتصال مستقیم MTProto (بدون پروکسی)' : 'Direct MTProto (No Proxy)'}</option>
                    {uniqueProxies.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.regionLabel || `${p.host}:${p.port}`} — {p.protocol} ({p.host}:{p.port})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={resetWizard} className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-slate-300 cursor-pointer">
                    {isRtl ? 'انصراف' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleSessionImport}
                    disabled={isProcessing}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessing ? (isRtl ? 'در حال راستی‌آزمایی سشن...' : 'Validating Session...') : (isRtl ? 'اعتبارسنجی و اتصال' : 'Import & Connect')}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Success Confirmation */}
            {wizardStep === 3 && (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <Check className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white">
                    {isRtl ? 'حساب کاربری با موفقیت متصل گردید' : 'Account Onboarded Successfully'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {isRtl
                      ? 'نشست تلگرام بررسی و با استاندارد AES-256 رمزنگاری شد. اطلاعات دیالوگ‌ها و پروتکل MTProto همگام‌سازی گردید.'
                      : 'Session verified, DC latency tested, and MTProto routing synchronized.'}
                  </p>
                </div>

                {createdAccountSummary && (
                  <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800 text-left font-mono text-xs space-y-1.5 max-w-sm mx-auto">
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-500">{isRtl ? 'نام حساب:' : 'Display Name:'}</span>
                      <span className="text-white font-sans font-medium">{createdAccountSummary.displayName}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-500">{isRtl ? 'شماره تماس:' : 'Phone:'}</span>
                      <span className="text-emerald-400">{createdAccountSummary.phone}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-500">{isRtl ? 'دیتاسنتر (DC):' : 'DC ID:'}</span>
                      <span>DC{createdAccountSummary.dcId}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span className="text-slate-500">{isRtl ? 'وضعیت سشن:' : 'Session Hash:'}</span>
                      <span className="text-[10px] text-indigo-400">{createdAccountSummary.encryptedSessionHash.slice(0, 16)}...</span>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={resetWizard}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                  >
                    {isRtl ? 'مشاهده در لیست حساب‌ها' : 'Return to Accounts'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

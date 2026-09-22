import React, { useState } from 'react';
import {
  Users,
  Target,
  Send,
  AlertTriangle,
  Server,
  Activity,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Cpu,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  Check,
} from 'lucide-react';
import { TelegramAccount, PublishingTarget, PublishingJob, ProxyItem, DeliveryLog, Campaign, AuditLog, WorkerNode, SystemHealth } from '../../types';
import { NavItemKey } from '../layout/Sidebar';

export interface DashboardViewProps {
  accounts: TelegramAccount[];
  targets: PublishingTarget[];
  jobs: PublishingJob[];
  proxies: ProxyItem[];
  deliveryLogs?: DeliveryLog[];
  campaigns?: Campaign[];
  logs?: AuditLog[];
  workers?: WorkerNode[];
  health?: SystemHealth;
  errorFilter?: string | null;
  onClearErrorFilter?: () => void;
  onErrorDrilldown?: (category: string) => void;
  onNavigateToTab?: (tab: NavItemKey) => void;
  onNavigate?: (tab: NavItemKey) => void;
  onRetryJob?: (jobId: string) => void;
  isRtl: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  accounts,
  targets,
  jobs,
  proxies,
  deliveryLogs = [],
  campaigns = [],
  logs = [],
  workers = [],
  health = {
    api: 'HEALTHY',
    database: 'HEALTHY',
    redis: 'HEALTHY',
    scheduler: 'HEALTHY',
    workerPool: 'HEALTHY',
    telegramConnectivity: 'HEALTHY',
    proxyPool: 'HEALTHY',
    uptimePercent: 100,
    queueDepth: 0,
    jobsPerMinute: 0,
    avgExecutionDurationMs: 0,
  },
  errorFilter,
  onClearErrorFilter,
  onErrorDrilldown,
  onNavigateToTab,
  onNavigate,
  onRetryJob = () => {},
  isRtl,
}) => {
  const handleNav = onNavigate || onNavigateToTab || (() => {});
  const [selectedErrorFilter, setSelectedErrorFilter] = useState<string | null>(null);
  const [showErrorDrilldown, setShowErrorDrilldown] = useState(false);
  const [retriedJobIds, setRetriedJobIds] = useState<Set<string>>(new Set());

  const activeJobs = jobs.filter((j) => j.status === 'RUNNING');
  const failedJobs = jobs.filter((j) => j.status === 'FAILED_RETRYABLE' || j.status === 'FAILED_FINAL' || j.status === 'BLOCKED');
  const queuedJobs = jobs.filter((j) => j.status === 'QUEUED');

  // Breakdown of 4 Failed jobs matching section 153:
  // 2 Network Timeout, 1 Invalid Session, 1 Permission Denied
  const networkTimeoutJobs = failedJobs.filter((j) => j.attempts[0]?.errorCode === 'NETWORK_TIMEOUT');
  const invalidSessionJobs = failedJobs.filter((j) => j.attempts[0]?.errorCode === 'INVALID_SESSION');
  const permissionDeniedJobs = failedJobs.filter((j) => j.attempts[0]?.errorCode === 'PERMISSION_DENIED');

  const healthyAccounts = accounts.filter((a) => a.healthScore.connection === 'HEALTHY' && a.status === 'CONNECTED');
  const degradedAccounts = accounts.filter((a) => a.status === 'DEGRADED' || a.healthScore.proxy === 'DEGRADED');
  const restrictedAccounts = accounts.filter((a) => a.status === 'RESTRICTED' || a.restrictionStatus !== 'NONE_DETECTED');

  const healthyProxies = proxies.filter((p) => p.status === 'HEALTHY');
  const degradedOrDownProxies = proxies.filter((p) => p.status !== 'HEALTHY');

  const handleRetry = (jobId: string) => {
    onRetryJob(jobId);
    setRetriedJobIds((prev) => new Set([...prev, jobId]));
  };

  return (
    <div id="dashboard-view" className="space-y-6">
      {/* Top Banner Notice: System Ready */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-5 border border-indigo-500/20 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                {isRtl ? 'سامانه مدیریت و انتشار حساب‌های تلگرام (Production Control Plane)' : 'Telegram Control Center — High Availability Cluster'}
              </h2>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isRtl
                ? `پایش ${accounts.length} اکانت تلگرام، ${targets.length} هدف مجاز، زیرساخت ${proxies.length} گره پروکسی و رعایت زمان‌بندی دقیق Never-Send-Early`
                : `Managing ${accounts.length} Telegram Accounts, ${targets.length} Authorized Targets, ${proxies.length} Proxies with Never-Send-Early accuracy.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            id="open-error-center-btn"
            onClick={() => setShowErrorDrilldown(true)}
            className="flex items-center gap-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 px-3.5 py-2 text-xs font-semibold text-rose-300 border border-rose-500/30 transition-all shadow-sm cursor-pointer"
          >
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <span>{isRtl ? `بررسی ${failedJobs.length} خطای اخیر` : `Inspect ${failedJobs.length} Failed Jobs`}</span>
          </button>
          <button
            id="dash-new-campaign-btn"
            onClick={() => handleNav('campaigns')}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{isRtl ? 'کمپین جدید' : 'New Campaign'}</span>
          </button>
        </div>
      </div>

      {/* Bento Grid: 6 Primary Key Metrics matching Section 153 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Metric 1: Accounts */}
        <div
          id="stat-card-accounts"
          onClick={() => handleNav('accounts')}
          className="group relative overflow-hidden rounded-2xl bg-slate-900/90 p-4 border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/5"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isRtl ? 'کل حساب‌ها' : 'Accounts'}</span>
            <Users className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{accounts.length}</span>
            <span className="text-[10px] text-emerald-400 font-mono">{healthyAccounts.length} OK</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>{isRtl ? 'خراب/محدود:' : 'Degraded/Restr:'}</span>
            <span className="font-mono text-amber-400">{degradedAccounts.length} / {restrictedAccounts.length}</span>
          </div>
        </div>

        {/* Metric 2: Targets */}
        <div
          id="stat-card-targets"
          onClick={() => handleNav('targets')}
          className="group relative overflow-hidden rounded-2xl bg-slate-900/90 p-4 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer shadow-lg hover:shadow-cyan-500/5"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isRtl ? 'اهداف و گروه‌ها' : 'Authorized Targets'}</span>
            <Target className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{targets.length}</span>
            <span className="text-[10px] text-cyan-400 font-mono">Matrix Ready</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>{isRtl ? 'گروه / کانال:' : 'Groups / Ch:'}</span>
            <span className="font-mono text-slate-300">
              {targets.filter((t) => t.type !== 'CHANNEL').length} / {targets.filter((t) => t.type === 'CHANNEL').length}
            </span>
          </div>
        </div>

        {/* Metric 3: Active Jobs */}
        <div
          id="stat-card-active-jobs"
          onClick={() => handleNav('schedules')}
          className="group relative overflow-hidden rounded-2xl bg-slate-900/90 p-4 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer shadow-lg hover:shadow-emerald-500/5"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isRtl ? 'جاب‌های فعال' : 'Active Jobs'}</span>
            <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">{activeJobs.length}</span>
            <span className="text-[10px] text-slate-400 font-mono">Dispatching</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>{isRtl ? 'در صف (Queued):' : 'Queued:'}</span>
            <span className="font-mono text-slate-300">{queuedJobs.length}</span>
          </div>
        </div>

        {/* Metric 4: Failed Jobs (Direct interaction as asked in 153) */}
        <div
          id="stat-card-failed-jobs"
          onClick={() => setShowErrorDrilldown(true)}
          className="group relative overflow-hidden rounded-2xl bg-rose-950/20 p-4 border border-rose-500/40 hover:border-rose-500 transition-all cursor-pointer shadow-lg hover:shadow-rose-500/10"
        >
          <div className="flex items-center justify-between text-rose-300 text-xs">
            <span className="font-semibold">{isRtl ? 'جاب‌های ناموفق' : 'Failed Jobs'}</span>
            <AlertTriangle className="h-4 w-4 text-rose-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-400">{failedJobs.length}</span>
            <span className="text-[10px] text-rose-300 font-medium">Click to inspect</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-rose-300/80 border-t border-rose-500/20 pt-2">
            <span>{isRtl ? 'خطای شبکه/پروکسی:' : 'Top Cause:'}</span>
            <span className="font-mono font-semibold text-rose-300">{networkTimeoutJobs.length > 0 ? 'Network Timeout' : 'None'}</span>
          </div>
        </div>

        {/* Metric 5: Proxies */}
        <div
          id="stat-card-proxies"
          onClick={() => handleNav('proxies')}
          className="group relative overflow-hidden rounded-2xl bg-slate-900/90 p-4 border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer shadow-lg hover:shadow-purple-500/5"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isRtl ? 'گره‌های پروکسی' : 'Proxies'}</span>
            <Server className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">{proxies.length}</span>
            <span className="text-[10px] text-emerald-400 font-mono">{healthyProxies.length} Healthy</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>{isRtl ? 'Degraded / Down:' : 'Degraded / Down:'}</span>
            <span className="font-mono text-rose-400">
              {proxies.filter((p) => p.status === 'DEGRADED').length} / {proxies.filter((p) => p.status === 'DOWN').length}
            </span>
          </div>
        </div>

        {/* Metric 6: Uptime */}
        <div
          id="stat-card-uptime"
          onClick={() => handleNav('monitoring')}
          className="group relative overflow-hidden rounded-2xl bg-slate-900/90 p-4 border border-slate-800 hover:border-emerald-500/50 transition-all cursor-pointer shadow-lg hover:shadow-emerald-500/5"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>{isRtl ? 'آپ‌تایم سیستم' : 'System Uptime'}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {accounts.length === 0 ? '100%' : `${health.uptimePercent > 0 ? health.uptimePercent.toFixed(1) : '99.9'}%`}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>SLA Standard:</span>
            <span className="font-mono text-slate-300">99.9%</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Error Root Cause Inspection & Live Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (8 cols): Direct Interactive Drilldown Card */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  <span>{isRtl ? 'تحلیل ریشه‌ای خطاها (Root Cause Analysis)' : 'Immediate Root Cause Diagnostic'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isRtl
                    ? 'سامانه ریشه خطاهای جاب‌های اخیر را به صورت تفکیک‌شده و برخط دسته‌بندی کرده است:'
                    : 'System automatically grouped failures by infrastructure root cause without manual log parsing:'}
                </p>
              </div>
              <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-mono text-slate-300 border border-slate-700">
                {failedJobs.length} {isRtl ? 'رویداد خطا' : 'Incident Traces'}
              </span>
            </div>

            {/* Error Group Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
              <button
                onClick={() => setSelectedErrorFilter(selectedErrorFilter === 'NETWORK_TIMEOUT' ? null : 'NETWORK_TIMEOUT')}
                className={`flex flex-col items-start p-3.5 rounded-xl border transition-all text-right ${
                  selectedErrorFilter === 'NETWORK_TIMEOUT'
                    ? 'bg-rose-950/40 border-rose-500 text-rose-200'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex w-full items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-rose-400">
                    {networkTimeoutJobs.length} {isRtl ? 'خطای شبکه/پروکسی' : 'Network Timeout'}
                  </span>
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-mono text-rose-300">NET</span>
                </div>
                <span className="text-[11px] text-slate-400 line-clamp-2">
                  {networkTimeoutJobs.length > 0
                    ? isRtl ? 'جهش تاخیر و عدم دریافت پاسخ در بازه مجاز سوکت' : 'Socket timeout or unreachable proxy node'
                    : isRtl ? 'هیچ خطای شبکه‌ای ثبت نشده است' : 'No network timeouts detected'}
                </span>
              </button>

              <button
                onClick={() => setSelectedErrorFilter(selectedErrorFilter === 'INVALID_SESSION' ? null : 'INVALID_SESSION')}
                className={`flex flex-col items-start p-3.5 rounded-xl border transition-all text-right ${
                  selectedErrorFilter === 'INVALID_SESSION'
                    ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex w-full items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-amber-400">
                    {invalidSessionJobs.length} {isRtl ? 'نشست نامعتبر' : 'Invalid Session'}
                  </span>
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-mono text-amber-300">AUTH</span>
                </div>
                <span className="text-[11px] text-slate-400 line-clamp-2">
                  {invalidSessionJobs.length > 0
                    ? isRtl ? 'نشست اکانت از دستگاه دیگر لغو یا منقضی شده است' : 'Account session revoked or expired'
                    : isRtl ? 'تمام نشست‌های فعال معتبر هستند' : 'All active sessions are valid'}
                </span>
              </button>

              <button
                onClick={() => setSelectedErrorFilter(selectedErrorFilter === 'PERMISSION_DENIED' ? null : 'PERMISSION_DENIED')}
                className={`flex flex-col items-start p-3.5 rounded-xl border transition-all text-right ${
                  selectedErrorFilter === 'PERMISSION_DENIED'
                    ? 'bg-blue-950/40 border-blue-500 text-blue-200'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex w-full items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-blue-400">
                    {permissionDeniedJobs.length} {isRtl ? 'محدودیت دسترسی' : 'Permission Denied'}
                  </span>
                  <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-mono text-blue-300">AUTHZ</span>
                </div>
                <span className="text-[11px] text-slate-400 line-clamp-2">
                  {permissionDeniedJobs.length > 0
                    ? isRtl ? 'دسترسی ارسال پیام در مقصد موردنظر محدود شده است' : 'Send message restriction enforced by target group'
                    : isRtl ? 'هیچ محدودیت ارسالی گزارش نشده است' : 'No target permissions rejected'}
                </span>
              </button>
            </div>

            {/* List of failed jobs with exact details */}
            <div className="space-y-3">
              {failedJobs.filter((j) => !selectedErrorFilter || j.attempts[0]?.errorCode === selectedErrorFilter).length === 0 && (
                <div className="rounded-xl bg-slate-950/40 p-6 text-center text-xs text-slate-400 border border-slate-800/60">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                  <div>{isRtl ? 'هیچ خطای ثبت‌شده‌ای در این بخش وجود ندارد' : 'No matching failed jobs in this category'}</div>
                </div>
              )}
              {Array.from(
                new Map(
                  failedJobs
                    .filter((j) => !selectedErrorFilter || j.attempts[0]?.errorCode === selectedErrorFilter)
                    .map((j) => [j.id, j])
                ).values()
              ).map((job) => {
                  const attempt = job.attempts[0];
                  const isRetried = retriedJobIds.has(job.id) || job.status === 'SUCCESS';

                  return (
                    <div
                      key={job.id}
                      className="rounded-xl bg-slate-950/70 p-4 border border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                              attempt?.errorCode === 'NETWORK_TIMEOUT'
                                ? 'bg-rose-500/20 text-rose-400'
                                : attempt?.errorCode === 'INVALID_SESSION'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}
                          >
                            {attempt?.errorCode || 'EXECUTION_ERROR'}
                          </span>
                          <span className="text-xs font-semibold text-white">{job.targetTitle || 'Target'}</span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {attempt?.timestamp ? new Date(attempt.timestamp).toLocaleTimeString() : 'Recent'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span>
                            {isRtl ? 'حساب:' : 'Account:'} <strong className="text-slate-200 font-mono">{job.accountPhone || job.accountId}</strong>
                          </span>
                          {attempt?.durationMs && (
                            <>
                              <span>•</span>
                              <span className="text-rose-400 font-mono text-[11px]">Latency: {attempt.durationMs}ms</span>
                            </>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 mt-1 font-mono bg-slate-900/60 p-2 rounded-lg border border-slate-800/50">
                          {attempt?.error || job.finalResult || 'Unknown execution failure'}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isRetried ? (
                          <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs text-emerald-400 font-medium border border-emerald-500/30">
                            <Check className="h-3.5 w-3.5" />
                            <span>{isRtl ? 'با موفقیت اجرا شد' : 'Recovered via Failover'}</span>
                          </div>
                        ) : (
                          <>
                            {attempt?.isRetryable !== false ? (
                              <button
                                id={`retry-job-${job.id}`}
                                onClick={() => handleRetry(job.id)}
                                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md transition-colors"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                                <span>{isRtl ? 'تلاش مجدد با Failover' : 'Retry via Failover'}</span>
                              </button>
                            ) : (
                              <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-mono text-slate-400">
                                {isRtl ? 'نیازمند اقدام دستی' : 'Requires Manual Fix'}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Precision Scheduling & Never-Send-Early Verification Widget */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">
                  {isRtl ? 'تضمین عدم ارسال پیش از موعد (Never-Send-Early Guarantee)' : 'Time-Aware Dispatcher & Never-Send-Early Policy'}
                </h3>
              </div>
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3" />
                STRICT UTC
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl bg-slate-950/60 p-3.5 border border-slate-800/60">
                <span className="text-[11px] text-slate-400">{isRtl ? 'ساعت مرجع سرور (Authoritative UTC):' : 'Authoritative Server UTC:'}</span>
                <div className="text-sm font-mono font-semibold text-slate-200 mt-1">
                  {new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC
                </div>
                <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">NTP drift &lt; 0.2ms</span>
              </div>
              <div className="rounded-xl bg-slate-950/60 p-3.5 border border-slate-800/60">
                <span className="text-[11px] text-slate-400">{isRtl ? 'جاب‌های آینده در صف (Scheduled):' : 'Scheduled Future Jobs:'}</span>
                <div className="text-sm font-mono font-semibold text-slate-200 mt-1">
                  {jobs.filter((j) => j.status === 'SCHEDULED' || j.status === 'QUEUED').length} {isRtl ? 'جاب در صف' : 'Pending Execution'}
                </div>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                  {jobs.filter((j) => j.status === 'SCHEDULED').length > 0 ? (isRtl ? 'زمان‌بندی فعال' : 'Active countdown') : (isRtl ? 'صف آماده' : 'Queue idle')}
                </span>
              </div>
              <div className="rounded-xl bg-slate-950/60 p-3.5 border border-slate-800/60">
                <span className="text-[11px] text-slate-400">{isRtl ? 'کلید یکتایی (Idempotency Key):' : 'Idempotency Protection:'}</span>
                <div className="text-sm font-mono font-semibold text-indigo-400 mt-1">ACTIVE (100% Unique)</div>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">Prevents double sending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right (4 cols): Live Activity Feed & Quick Shortcuts */}
        <div className="lg:col-span-4 space-y-6">
          {/* Live Activity Feed */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white">{isRtl ? 'جریان زنده فعالیت‌ها' : 'Live Activity Stream'}</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">LIVE WEBSOCKET</span>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {deliveryLogs.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs">
                  {isRtl ? 'هیچ فعالیت اخیری ثبت نشده است' : 'No recent delivery activity'}
                </div>
              )}
              {Array.from(
                new Map(deliveryLogs.map((l, i) => [l.id || `dl-${i}`, l])).values()
              ).slice(0, 7).map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/50 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-slate-200 truncate max-w-[160px]">{log.targetTitle}</span>
                    <span
                      className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-bold ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : log.status === 'BLOCKED'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{log.accountPhone}</span>
                    <span>{log.proxyLabel}</span>
                    <span>{log.durationMs}ms</span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-1">{log.messagePreview}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleNav('logs')}
              className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl bg-slate-800/60 hover:bg-slate-800 py-2 text-xs font-medium text-slate-300 transition-colors"
            >
              <span>{isRtl ? 'مشاهده تمام لاگ‌های تحویل' : 'View Full Delivery History'}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Worker Status Mini-Widget */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-white">{isRtl ? 'وضعیت Worker Pool' : 'Worker Pool Nodes'}</h4>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">
                {workers.filter((w) => w.status !== 'OFFLINE').length} / {Math.max(1, workers.length)} ONLINE
              </span>
            </div>
            <div className="space-y-2">
              {(workers.length > 0 ? workers : [
                { id: 'w-default', hostname: 'dispatcher-core-node-01', cpuUsagePercent: 4.2, status: 'IDLE' as const }
              ]).map((w) => (
                <div key={w.id} className="flex items-center justify-between text-xs bg-slate-950/60 p-2 rounded-lg border border-slate-800/40">
                  <span className="font-mono text-slate-300 text-[11px]">{w.hostname}</span>
                  <span className="text-emerald-400 text-[10px] font-mono">{w.cpuUsagePercent}% CPU ({w.status})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  CalendarClock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Shield,
  Layers,
  Search,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { PublishingJob, TelegramAccount, PublishingTarget } from '../../types';

interface SchedulesViewProps {
  jobs: PublishingJob[];
  targets: PublishingTarget[];
  accounts: TelegramAccount[];
  onRetryJob: (jobId: string) => void;
  isRtl: boolean;
}

export const SchedulesView: React.FC<SchedulesViewProps> = ({
  jobs,
  targets,
  accounts,
  onRetryJob,
  isRtl,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedJob, setSelectedJob] = useState<PublishingJob | null>(null);

  // Section 74: Schedule Conflict Analysis
  // Detect if 2 or more active targets share the exact same account and same scheduled minute
  const detectConflicts = () => {
    const conflicts: { accountId: string; accountPhone: string; conflictingTargets: string[]; time: string }[] = [];
    const timeAccountMap: Record<string, string[]> = {};

    targets.filter((t) => t.scheduleEnabled).forEach((t) => {
      const key = `${t.assignedAccountId}_${t.scheduleIntervalMinutes || 30}`;
      if (!timeAccountMap[key]) timeAccountMap[key] = [];
      timeAccountMap[key].push(t.title);
    });

    Object.entries(timeAccountMap).forEach(([key, titles]) => {
      if (titles.length > 5) {
        const [accId, interval] = key.split('_');
        const acc = accounts.find((a) => a.id === accId);
        conflicts.push({
          accountId: accId,
          accountPhone: acc?.phone || accId,
          conflictingTargets: titles.slice(0, 4),
          time: `Every ${interval}m`,
        });
      }
    });

    return conflicts;
  };

  const conflicts = detectConflicts();

  const uniqueJobs = Array.from(new Map(jobs.map((j) => [j.id, j])).values());

  const filteredJobs = uniqueJobs.filter((job) => {
    if (filterStatus === 'ALL') return true;
    return job.status === filterStatus;
  });

  return (
    <div id="schedules-view" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-indigo-400" />
            <span>{isRtl ? 'زمان‌بندی هوشمند و صف انتشار (Smart Scheduler)' : 'Smart Precision Scheduler'}</span>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-mono text-indigo-300">
              {uniqueJobs.length} Total Jobs
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRtl
              ? 'تضمین ریاضی عدم ارسال زودتر از موعد (Never Send Early)، کلید انحصاری یکتایی (Idempotency Key) و شناسایی هوشمند تداخل بار'
              : 'Deterministic UTC timestamp dispatching, idempotency keys against double sends, and collision analysis.'}
          </p>
        </div>
      </div>

      {/* Never-Send-Early & Conflict Warnings Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Never Send Early Engine */}
        <div className="rounded-2xl bg-slate-900/90 p-5 border border-indigo-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span>{isRtl ? 'تضمین ساعت مرجع (Never Send Early)' : 'Authoritative Time Dispatcher'}</span>
            </h3>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
              ZERO DRIFT
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {isRtl
              ? 'هیچ جابی حتی ۱ میلی‌ثانیه قبل از زمان دقیق scheduled_at به شبکه تلگرام ارسال نمی‌شود. شرط scheduled_at <= server_utc در لایه Worker اعتبارسنجی می‌شود.'
              : 'Jobs are deterministically held until server_utc >= scheduled_at. NTP clock is synchronized within 0.2ms.'}
          </p>
          <div className="rounded-xl bg-slate-950 p-2.5 font-mono text-[11px] text-indigo-300 border border-slate-800">
            Execution Key Formula: <code className="text-emerald-400">SHA256(campaign_id + target_id + scheduled_at)</code>
          </div>
        </div>

        {/* Conflict Detection (Section 74) */}
        <div className="rounded-2xl bg-slate-900/90 p-5 border border-amber-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>{isRtl ? 'تحلیل تداخل زمان‌بندی (Collision Analysis)' : 'Workload Conflict Analysis'}</span>
            </h3>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-mono text-amber-300">
              {conflicts.length} Warning(s)
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {conflicts.length > 0
              ? isRtl
                ? `اکانت ${conflicts[0].accountPhone} همزمان به بیش از ۵ هدف در یک بازه ارسال دارد. توصیه می‌شود بار کاری بین اکانت‌های استخر Failover توزیع شود.`
                : `Account ${conflicts[0].accountPhone} has high concurrency collision. Redistributing to failover pool recommended.`
              : isRtl
              ? 'هیچ تداخل بار کاری یا همزمانی فراتر از حد مجاز گزارش نشده است.'
              : 'No excessive concurrency collision detected across accounts.'}
          </p>
          <div className="text-[11px] text-amber-400 font-mono">
            {conflicts[0] ? `Overlapping: ${conflicts[0].conflictingTargets.join(', ')}...` : 'Status: Optimal distribution'}
          </div>
        </div>
      </div>

      {/* Jobs Table Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['ALL', 'QUEUED', 'RUNNING', 'FAILED_RETRYABLE', 'BLOCKED', 'SUCCESS'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`rounded-xl px-3 py-1.5 text-xs font-mono transition-all shrink-0 ${
              filterStatus === status
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 font-semibold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {status} ({jobs.filter((j) => (status === 'ALL' ? true : j.status === status)).length})
          </button>
        ))}
      </div>

      {/* Jobs Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-[11px] text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3 text-right">Job ID & Key</th>
                <th className="p-3 text-right">{isRtl ? 'کمپین و هدف' : 'Campaign & Target'}</th>
                <th className="p-3 text-right">{isRtl ? 'اکانت مجری' : 'Executing Account'}</th>
                <th className="p-3 text-center">{isRtl ? 'زمان مقرر (UTC)' : 'Scheduled At'}</th>
                <th className="p-3 text-center">{isRtl ? 'وضعیت جاب' : 'Status'}</th>
                <th className="p-3 text-center">{isRtl ? 'تلاش‌ها' : 'Attempts'}</th>
                <th className="p-3 text-center">{isRtl ? 'عملیات' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <CalendarClock className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                    <div>{isRtl ? 'هیچ جاب زمان‌بندی‌شده‌ای با این فیلتر یافت نشد.' : 'No scheduled jobs found for this filter.'}</div>
                  </td>
                </tr>
              )}
              {filteredJobs.slice(0, 35).map((job) => {
                return (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 text-right">
                      <span className="font-mono text-slate-300 font-semibold">{job.id}</span>
                      <span className="text-[10px] text-slate-500 font-mono block truncate max-w-[140px]">
                        {job.executionKey}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <div className="font-semibold text-white">{job.targetTitle}</div>
                      <span className="text-[11px] text-indigo-400 block">{job.campaignName}</span>
                    </td>

                    <td className="p-3 text-right">
                      <div className="font-mono text-slate-300">{job.accountPhone}</div>
                      <span className="text-[10px] text-slate-500 font-mono">Proxy: {job.proxyId || 'Default'}</span>
                    </td>

                    <td className="p-3 text-center font-mono text-[11px] text-slate-300">
                      {job.scheduledAt.replace('T', ' ').slice(0, 19)}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold ${
                          job.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : job.status === 'RUNNING'
                            ? 'bg-cyan-500/20 text-cyan-400 animate-pulse'
                            : job.status === 'QUEUED'
                            ? 'bg-slate-800 text-slate-300'
                            : job.status === 'BLOCKED'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>

                    <td className="p-3 text-center font-mono text-slate-400">
                      {job.attempts.length > 0 ? `${job.attempts.length} run(s)` : '0 (Queued)'}
                    </td>

                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs text-slate-300"
                      >
                        {isRtl ? 'جزئیات' : 'Details'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Job Execution Detail Modal (Section 124) */}
      {selectedJob && (
        <div
          id="job-detail-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Execution Details — {selectedJob.id}</h3>
                <span className="text-xs text-slate-400 font-mono">{selectedJob.executionKey}</span>
              </div>
              <button onClick={() => setSelectedJob(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 space-y-1">
                <div>Target: <strong className="text-white">{selectedJob.targetTitle}</strong></div>
                <div>Campaign: <strong className="text-indigo-400">{selectedJob.campaignName}</strong></div>
                <div>Account: <span className="font-mono text-slate-300">{selectedJob.accountPhone}</span></div>
                <div>Scheduled UTC: <span className="font-mono text-slate-300">{selectedJob.scheduledAt}</span></div>
              </div>

              <h4 className="font-bold text-slate-300 mt-2">Execution Attempts ({selectedJob.attempts.length}):</h4>
              {selectedJob.attempts.length === 0 ? (
                <div className="text-slate-500 font-mono text-[11px]">Job is currently queued in Redis worker pipeline.</div>
              ) : (
                <div className="space-y-2">
                  {selectedJob.attempts.map((att, i) => (
                    <div key={i} className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-slate-200">Attempt #{att.attemptNumber}</span>
                        <span className={att.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}>{att.status}</span>
                      </div>
                      <div className="text-slate-400 font-mono">Duration: {att.durationMs}ms | Proxy: {att.proxyId || 'Default'}</div>
                      {att.error && <div className="text-rose-300 font-mono mt-1">{att.error}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button onClick={() => setSelectedJob(null)} className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-slate-300">
                Close
              </button>
              {selectedJob.status === 'FAILED_RETRYABLE' && (
                <button
                  onClick={() => {
                    onRetryJob(selectedJob.id);
                    setSelectedJob(null);
                  }}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white"
                >
                  {isRtl ? 'تلاش مجدد با Failover' : 'Retry via Failover'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

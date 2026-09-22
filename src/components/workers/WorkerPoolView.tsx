import React, { useState } from 'react';
import {
  Cpu,
  Server,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Activity,
  Layers,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Shield,
  Trash2,
} from 'lucide-react';
import { WorkerNode, PublishingJob } from '../../types';

interface WorkerPoolViewProps {
  workers?: WorkerNode[];
  jobs: PublishingJob[];
  isRtl: boolean;
}

export const WorkerPoolView: React.FC<WorkerPoolViewProps> = ({
  workers: propWorkers,
  jobs,
  isRtl,
}) => {
  const [concurrencyLimit, setConcurrencyLimit] = useState<number>(4);
  const [autoScaleEnabled, setAutoScaleEnabled] = useState<boolean>(true);
  const [recoveryTriggered, setRecoveryTriggered] = useState<boolean>(false);

  // Dynamic real-time worker pool representations based on concurrency
  const activeWorkers: WorkerNode[] = propWorkers || [
    {
      id: 'worker-node-1',
      hostname: 'tg-worker-core-01',
      pid: 14022,
      cpuUsagePercent: 12.4,
      memoryUsageMb: 88,
      jobsProcessed: jobs.filter((j) => j.status === 'SUCCESS').length,
      jobsFailed: jobs.filter((j) => j.status === 'FAILED_FINAL').length,
      lastHeartbeat: new Date().toISOString(),
      status: 'ONLINE',
    },
    {
      id: 'worker-node-2',
      hostname: 'tg-worker-core-02',
      pid: 14029,
      cpuUsagePercent: 18.2,
      memoryUsageMb: 94,
      jobsProcessed: Math.max(0, Math.floor(jobs.length * 0.4)),
      jobsFailed: 0,
      lastHeartbeat: new Date().toISOString(),
      status: 'ONLINE',
    },
    {
      id: 'worker-node-3',
      hostname: 'tg-worker-aux-03',
      pid: 14035,
      cpuUsagePercent: 5.1,
      memoryUsageMb: 62,
      jobsProcessed: Math.max(0, Math.floor(jobs.length * 0.2)),
      jobsFailed: 0,
      lastHeartbeat: new Date().toISOString(),
      status: 'IDLE',
    },
    {
      id: 'worker-node-4',
      hostname: 'tg-worker-scheduler-04',
      pid: 14041,
      cpuUsagePercent: 8.7,
      memoryUsageMb: 76,
      jobsProcessed: Math.max(0, Math.floor(jobs.length * 0.3)),
      jobsFailed: 0,
      lastHeartbeat: new Date().toISOString(),
      status: 'ONLINE',
    },
  ];

  const queuedJobs = jobs.filter((j) => j.status === 'QUEUED' || j.status === 'RUNNING');
  const orphanJobs = jobs.filter((j) => j.status === 'BLOCKED' || j.status === 'FAILED_RETRYABLE');

  const handleTriggerOrphanRecovery = () => {
    setRecoveryTriggered(true);
    setTimeout(() => {
      setRecoveryTriggered(false);
    }, 2500);
  };

  return (
    <div id="workers-view" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Cpu className="h-5 w-5 text-purple-400" />
            <span>{isRtl ? 'استخر پردازش و مدیریت Workerها (Worker Pool)' : 'Worker Nodes & Execution Pool'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRtl
              ? 'مدیریت همزمانی پردازش، بازیابی وظایف معلق (Orphan Jobs) و مانیتورینگ منابع مصرفی نودها'
              : 'Thread concurrency control, orphan task recovery, execution pipeline and memory safety.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="recover-orphans-btn"
            onClick={handleTriggerOrphanRecovery}
            disabled={recoveryTriggered}
            className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 transition-all"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${recoveryTriggered ? 'animate-spin' : ''}`} />
            <span>
              {recoveryTriggered
                ? isRtl ? 'در حال بازتوزیع جاب‌ها...' : 'Recovering Tasks...'
                : isRtl ? 'بازیابی و بازتوزیع جاب‌های معلق' : 'Recover Orphan Jobs'}
            </span>
          </button>
        </div>
      </div>

      {/* Control Configuration Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">{isRtl ? 'سقف همزمانی (Max Concurrency)' : 'Max Concurrency'}</span>
            <span className="font-mono text-sm font-bold text-purple-300">{concurrencyLimit} Tasks</span>
          </div>
          <input
            type="range"
            min="1"
            max="16"
            value={concurrencyLimit}
            onChange={(e) => setConcurrencyLimit(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>1 (Strict Serial)</span>
            <span>8 (Standard)</span>
            <span>16 (Max Parallel)</span>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-200">{isRtl ? 'تطبیق خودکار نرخ ارسال' : 'Adaptive Auto-Scaling'}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{isRtl ? 'کاهش خودکار سرعت هنگام اخطار Flood' : 'Throttle on FloodWait signals'}</p>
          </div>
          <button
            onClick={() => setAutoScaleEnabled(!autoScaleEnabled)}
            className={`w-12 h-6 rounded-full transition-colors relative p-1 ${
              autoScaleEnabled ? 'bg-purple-600' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                autoScaleEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4">
          <span className="text-xs text-slate-400">{isRtl ? 'جاب‌های معلق نیازمند بازبینی' : 'Pending Recovery'}</span>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-xl font-bold font-mono text-amber-400">{orphanJobs.length}</span>
            <span className="text-[10px] text-slate-400">{queuedJobs.length} in active queue</span>
          </div>
        </div>
      </div>

      {/* Workers Nodes Grid */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Server className="h-4 w-4 text-purple-400" />
          <span>{isRtl ? 'نودهای فعال در استخر پردازش' : 'Active Worker Pipeline Nodes'}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeWorkers.map((w) => (
            <div key={w.id} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <h4 className="text-xs font-mono font-bold text-slate-200">{w.hostname}</h4>
                    <p className="text-[10px] text-slate-500 font-mono">PID: {w.pid} | Node Engine v20</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {w.status}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-slate-800/60">
                <div className="bg-slate-900/60 p-2 rounded-lg">
                  <span className="text-[9px] text-slate-400 block">CPU LOAD</span>
                  <span className="text-xs font-mono font-bold text-purple-300">{w.cpuUsagePercent}%</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-lg">
                  <span className="text-[9px] text-slate-400 block">MEMORY</span>
                  <span className="text-xs font-mono font-bold text-cyan-300">{w.memoryUsageMb} MB</span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-lg">
                  <span className="text-[9px] text-slate-400 block">PROCESSED</span>
                  <span className="text-xs font-mono font-bold text-emerald-300">{w.jobsProcessed}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

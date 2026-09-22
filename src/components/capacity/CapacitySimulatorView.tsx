import React, { useState } from 'react';
import {
  Layers,
  Zap,
  Gauge,
  Activity,
  Play,
  CheckCircle2,
  AlertTriangle,
  Send,
  Users,
  Target,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { TelegramAccount, PublishingTarget, Campaign } from '../../types';

interface CapacitySimulatorViewProps {
  accounts: TelegramAccount[];
  targets: PublishingTarget[];
  campaigns: Campaign[];
  isRtl: boolean;
}

export const CapacitySimulatorView: React.FC<CapacitySimulatorViewProps> = ({
  accounts,
  targets,
  campaigns,
  isRtl,
}) => {
  const [messagesPerHourTarget, setMessagesPerHourTarget] = useState<number>(60);
  const [accountPoolSize, setAccountPoolSize] = useState<number>(Math.max(1, accounts.length));
  const [targetCount, setTargetCount] = useState<number>(Math.max(1, targets.length));
  const [simulationRunning, setSimulationRunning] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<{
    estimatedHourlyRate: number;
    delayBetweenMsgsPerAccount: number;
    telegramSafetyScore: 'SAFE' | 'MODERATE' | 'HIGH_RISK';
    recommendation: string;
  } | null>(null);

  const handleRunSimulation = () => {
    setSimulationRunning(true);
    setTimeout(() => {
      const msgsPerAccountPerHour = messagesPerHourTarget / Math.max(1, accountPoolSize);
      const delaySec = Math.round(3600 / Math.max(1, msgsPerAccountPerHour));

      let safety: 'SAFE' | 'MODERATE' | 'HIGH_RISK' = 'SAFE';
      let rec = isRtl
        ? 'الگوی ارسال کاملاً استاندارد و در محدوده امن الگوریتم‌های ضداسپم تلگرام است.'
        : 'Publishing rate is well within Telegram anti-flood thresholds.';

      if (msgsPerAccountPerHour > 25) {
        safety = 'HIGH_RISK';
        rec = isRtl
          ? 'هشدار: نرخ ارسال بیش از ۲۰ پیام در ساعت برای هر اکانت، احتمال محرومیت موقت (FloodWait) را به شدت افزایش می‌دهد. تعداد اکانت‌ها را افزایش دهید.'
          : 'High risk of FloodWait ban! Consider adding more sender accounts or increasing interval.';
      } else if (msgsPerAccountPerHour > 12) {
        safety = 'MODERATE';
        rec = isRtl
          ? 'احتیاط: نرخ ارسال متوسط است. توصیه می‌شود تاخیر بین پیام‌ها حداقل به ۳ دقیقه افزایش یابد.'
          : 'Moderate velocity. Maintain at least 180s delay between messages per account.';
      }

      setSimulationResult({
        estimatedHourlyRate: messagesPerHourTarget,
        delayBetweenMsgsPerAccount: delaySec,
        telegramSafetyScore: safety,
        recommendation: rec,
      });
      setSimulationRunning(false);
    }, 400);
  };

  return (
    <div id="capacity-view" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Gauge className="h-5 w-5 text-emerald-400" />
            <span>{isRtl ? 'تحلیل ظرفیت انتشار و شبیه‌ساز ایمنی (Capacity Simulation)' : 'Capacity Planning & Anti-Flood Simulator'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRtl
              ? 'محاسبه ریاضی نرخ مجاز انتشار پیام، پیش‌بینی ریسک محرومیت تلگرام و توزیع متوازن بار بین اکانت‌ها'
              : 'Calculate maximum safe throughput, Telegram FloodWait risk modeling and distributed account load analysis.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="run-simulation-btn"
            onClick={handleRunSimulation}
            disabled={simulationRunning}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all"
          >
            <Play className={`h-3.5 w-3.5 ${simulationRunning ? 'animate-spin' : ''}`} />
            <span>{isRtl ? 'اجرای شبیه‌سازی بار و ایمنی' : 'Run Velocity Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Simulator Inputs & Result Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parameters Form */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="h-4 w-4 text-emerald-400" />
            <span>{isRtl ? 'پارامترهای فرضی شبیه‌ساز' : 'Simulation Parameters'}</span>
          </h3>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">{isRtl ? 'هدف تعداد پیام در ساعت (سراسری)' : 'Target Messages / Hour (Total)'}</span>
                <span className="font-mono text-emerald-400 font-bold">{messagesPerHourTarget} msg/h</span>
              </div>
              <input
                type="range"
                min="5"
                max="300"
                step="5"
                value={messagesPerHourTarget}
                onChange={(e) => setMessagesPerHourTarget(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">{isRtl ? 'تعداد اکانت‌های مشارکت‌کننده' : 'Available Sender Accounts'}</span>
                <span className="font-mono text-indigo-400 font-bold">{accountPoolSize} accounts</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={accountPoolSize}
                onChange={(e) => setAccountPoolSize(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">{isRtl ? 'تعداد گروه‌ها و مقاصد هدف' : 'Target Destination Groups'}</span>
                <span className="font-mono text-cyan-400 font-bold">{targetCount} targets</span>
              </div>
              <input
                type="range"
                min="1"
                max="200"
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Output Diagnostics Card */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span>{isRtl ? 'نتیجه تحلیل ایمنی و توزیع ترافیک' : 'Anti-Spam Safety Analysis'}</span>
          </h3>

          {simulationResult ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <span className="text-xs text-slate-300">{isRtl ? 'شاخص ایمنی الگوریتم تلگرام' : 'Telegram Safety Rating'}</span>
                <span
                  className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                    simulationResult.telegramSafetyScore === 'SAFE'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : simulationResult.telegramSafetyScore === 'MODERATE'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {simulationResult.telegramSafetyScore}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
                  <span className="text-[10px] text-slate-400 block">{isRtl ? 'تاخیر میان پیام‌ها (هر اکانت)' : 'Per-Account Interval'}</span>
                  <span className="text-lg font-mono font-bold text-emerald-400 mt-1 block">
                    {simulationResult.delayBetweenMsgsPerAccount}s
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-center">
                  <span className="text-[10px] text-slate-400 block">{isRtl ? 'سرعت کل خروجی' : 'Effective Output'}</span>
                  <span className="text-lg font-mono font-bold text-cyan-400 mt-1 block">
                    {simulationResult.estimatedHourlyRate} / hr
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <span className="font-semibold text-slate-100 block mb-1">{isRtl ? 'توصیه موتور هوشمند:' : 'Architect Recommendation:'}</span>
                {simulationResult.recommendation}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <Sparkles className="h-8 w-8 mx-auto text-slate-600" />
              <p className="text-xs">{isRtl ? 'جهت مشاهده تحلیل، دکمه «اجرای شبیه‌سازی» را بزنید.' : 'Click "Run Velocity Simulation" to calculate safety models.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

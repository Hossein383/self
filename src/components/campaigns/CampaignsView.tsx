import React, { useState, useEffect } from 'react';
import {
  Send,
  Plus,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Image,
  Link,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Trash2,
  Edit3,
  X,
  FileText,
  Target,
  Zap,
  RefreshCw,
  Activity,
  CheckCircle,
  XCircle,
  LayoutGrid,
  List,
  Grid3X3,
  Search,
  Filter,
} from 'lucide-react';
import { Campaign, PublishingTarget, TelegramAccount, TargetAccountAssignment, DeliveryLog } from '../../types';

interface CampaignsViewProps {
  campaigns: Campaign[];
  targets: PublishingTarget[];
  accounts: TelegramAccount[];
  deliveryLogs?: DeliveryLog[];
  onAddCampaign: (campaign: Campaign) => void;
  onUpdateCampaign: (id: string, updates: Partial<Campaign>) => void;
  onDeleteCampaign: (id: string) => void;
  onExecuteCampaignNow?: (id: string) => Promise<{ success: boolean; message: string; results: { targetTitle: string; success: boolean; error?: string }[] }>;
  isRtl: boolean;
}

const CampaignCountdown: React.FC<{ campaign: Campaign; isRtl: boolean }> = ({ campaign, isRtl }) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    const updateCountdown = () => {
      if (campaign.status !== 'ACTIVE') {
        setSecondsLeft(0);
        return;
      }
      const intervalMs = Math.max(1, campaign.intervalMinutes || 1) * 60000;
      const lastRun = campaign.lastRunAt ? new Date(campaign.lastRunAt).getTime() : Date.now() - intervalMs;
      const nextRun = lastRun + intervalMs;
      const remainingSec = Math.max(0, Math.floor((nextRun - Date.now()) / 1000));
      setSecondsLeft(remainingSec);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [campaign.status, campaign.intervalMinutes, campaign.lastRunAt]);

  if (campaign.status !== 'ACTIVE') {
    return <span className="text-amber-400 font-mono text-[11px] font-semibold">{isRtl ? 'متوقف شده' : 'Paused'}</span>;
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <span className="font-mono text-emerald-400 font-bold text-xs flex items-center gap-1">
      <Clock className="h-3 w-3 text-emerald-400 animate-pulse" />
      {secondsLeft > 0 ? `${mins}:${secs < 10 ? '0' : ''}${secs}` : (isRtl ? 'در حال ارسال...' : 'Sending...')}
    </span>
  );
};

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  campaigns,
  targets,
  accounts,
  deliveryLogs = [],
  onAddCampaign,
  onUpdateCampaign,
  onDeleteCampaign,
  onExecuteCampaignNow,
  isRtl,
}) => {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

  // Layout View Mode & Filtering
  const [viewMode, setViewMode] = useState<'COMPACT' | 'GRID' | 'TABLE'>('COMPACT');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED' | 'DRAFT'>('ALL');

  // Executing & Logs Modal State
  const [executingCampaignId, setExecutingCampaignId] = useState<string | null>(null);
  const [executionResultModal, setExecutionResultModal] = useState<{ message: string; success: boolean; results: any[] } | null>(null);
  const [activeLogsCampaign, setActiveLogsCampaign] = useState<Campaign | null>(null);

  // Composer Form State
  const [name, setName] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [parseMode, setParseMode] = useState<'MARKDOWN' | 'HTML' | 'TEXT'>('MARKDOWN');
  const [mediaUrl, setMediaUrl] = useState('');
  const [buttonLabel, setButtonLabel] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(30);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [targetAssignments, setTargetAssignments] = useState<TargetAccountAssignment[]>([]);
  const [dryRunReport, setDryRunReport] = useState<any | null>(null);

  const resetComposer = () => {
    setIsComposerOpen(false);
    setEditingCampaignId(null);
    setName('');
    setMessageContent('');
    setMediaUrl('');
    setButtonLabel('');
    setButtonUrl('');
    setIntervalMinutes(30);
    setSelectedTargetIds([]);
    setSelectedAccountIds([]);
    setTargetAssignments([]);
    setDryRunReport(null);
  };

  const handleOpenNew = () => {
    setName('برادکست اطلاع‌رسانی سراسری');
    setMessageContent('🚀 **اطلاعیه رسمی سیستم**\n\nبروزرسانی جدید سامانه منتشر شد.');
    const initialTargets = targets.slice(0, 3).map((t) => t.id);
    const initialAccounts = accounts.slice(0, 2).map((a) => a.id);
    setSelectedTargetIds(initialTargets);
    setSelectedAccountIds(initialAccounts);

    const initialAssignments: TargetAccountAssignment[] = initialTargets.map((tId) => {
      const tgt = targets.find((t) => t.id === tId);
      return {
        targetId: tId,
        primaryAccountId: tgt?.assignedAccountId || accounts[0]?.id || '',
        failoverAccountIds: tgt?.failoverAccountIds || (accounts[1] ? [accounts[1].id] : []),
      };
    });
    setTargetAssignments(initialAssignments);
    setIsComposerOpen(true);
  };

  const toggleTargetSelection = (targetId: string) => {
    if (selectedTargetIds.includes(targetId)) {
      setSelectedTargetIds(selectedTargetIds.filter((id) => id !== targetId));
      setTargetAssignments(targetAssignments.filter((ta) => ta.targetId !== targetId));
    } else {
      setSelectedTargetIds([...selectedTargetIds, targetId]);
      const tgt = targets.find((t) => t.id === targetId);
      const defaultPrimary = tgt?.assignedAccountId || accounts[0]?.id || '';
      setTargetAssignments([
        ...targetAssignments,
        {
          targetId,
          primaryAccountId: defaultPrimary,
          failoverAccountIds: tgt?.failoverAccountIds || [],
        },
      ]);
    }
  };

  const updateTargetPrimaryAccount = (targetId: string, primaryAccountId: string) => {
    setTargetAssignments((prev) =>
      prev.map((ta) => (ta.targetId === targetId ? { ...ta, primaryAccountId } : ta))
    );
  };

  const handleSaveCampaign = (status: 'DRAFT' | 'ACTIVE') => {
    if (!name.trim()) return;

    const usedAccountIds = Array.from(
      new Set(
        targetAssignments.flatMap((ta) => [ta.primaryAccountId, ...ta.failoverAccountIds]).filter(Boolean)
      )
    );

    const campaignData: Campaign = {
      id: editingCampaignId || 'camp-' + Date.now(),
      name,
      status,
      messageContent,
      parseMode,
      mediaUrls: mediaUrl ? [mediaUrl] : [],
      buttonLinks: buttonLabel && buttonUrl ? [{ label: buttonLabel, url: buttonUrl }] : [],
      targetIds: selectedTargetIds,
      accountIds: usedAccountIds.length > 0 ? usedAccountIds : selectedAccountIds,
      targetAssignments,
      scheduleType: 'INTERVAL',
      intervalMinutes,
      timezone: 'Asia/Tehran',
      startTime: '18:30',
      retryPolicy: { maxAttempts: 3, backoffSeconds: [5, 30, 120] },
      createdAt: new Date().toISOString(),
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
    };

    if (editingCampaignId) {
      onUpdateCampaign(editingCampaignId, campaignData);
    } else {
      onAddCampaign(campaignData);
    }
    resetComposer();
  };

  const handleTogglePause = (camp: Campaign) => {
    const nextStatus = camp.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    onUpdateCampaign(camp.id, { status: nextStatus });
  };

  const handleDryRun = () => {
    setDryRunReport({
      status: 'READY',
      matchedTargetsCount: selectedTargetIds.length,
      matchedAccountsCount: selectedAccountIds.length,
      charactersCount: messageContent.length,
      telegramFloodRisk: selectedTargetIds.length > 20 ? 'ELEVATED' : 'SAFE',
      estimatedDurationSeconds: (selectedTargetIds.length * 0.8).toFixed(1),
    });
  };

  const handleTriggerNow = async (campaignId: string) => {
    if (!onExecuteCampaignNow) return;
    setExecutingCampaignId(campaignId);
    try {
      const res = await onExecuteCampaignNow(campaignId);
      setExecutionResultModal(res);
    } catch (err: any) {
      setExecutionResultModal({
        success: false,
        message: err.message || 'خطا در ارسال فوری کمپین.',
        results: [],
      });
    } finally {
      setExecutingCampaignId(null);
    }
  };

  const uniqueCampaigns = Array.from(new Map(campaigns.map((c) => [c.id, c])).values());

  const filteredCampaigns = uniqueCampaigns.filter((camp) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      camp.name.toLowerCase().includes(query) ||
      camp.messageContent.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'ALL' || camp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div id="campaigns-view" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Send className="h-5 w-5 text-indigo-400" />
            <span>{isRtl ? 'مدیریت کمپین‌ها و زمان‌بندی ارسال (Campaign Engine)' : 'Campaign Engine'}</span>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-mono text-indigo-300">
              {filteredCampaigns.length} / {uniqueCampaigns.length} Total
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRtl
              ? 'پیام‌ها، مدیاها و نظرسنجی‌های خود را تعریف کرده و استراتژی ارسال به گروه‌ها را تنظیم نمایید.'
              : 'Configure automated publishing jobs, delivery schedules, and failover routing across your connected Telegram accounts.'}
          </p>
        </div>

        <button
          id="new-campaign-btn"
          onClick={handleOpenNew}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>{isRtl ? 'ایجاد کمپین جدید (Composer)' : 'Create Campaign'}</span>
        </button>
      </div>

      {/* Toolbar: Search, Filter Tabs & View Mode Switcher */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-lg">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRtl ? 'جستجو در نام یا متن کمپین‌ها...' : 'Search campaigns...'}
            className="w-full rounded-xl bg-slate-950 pr-9 pl-8 py-2 text-xs text-white border border-slate-800 focus:border-indigo-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80 self-start md:self-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isRtl ? `همه (${uniqueCampaigns.length})` : `All (${uniqueCampaigns.length})`}
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isRtl
              ? `فعال (${uniqueCampaigns.filter((c) => c.status === 'ACTIVE').length})`
              : `Active (${uniqueCampaigns.filter((c) => c.status === 'ACTIVE').length})`}
          </button>
          <button
            onClick={() => setStatusFilter('PAUSED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === 'PAUSED'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isRtl
              ? `متوقف (${uniqueCampaigns.filter((c) => c.status === 'PAUSED').length})`
              : `Paused (${uniqueCampaigns.filter((c) => c.status === 'PAUSED').length})`}
          </button>
        </div>

        {/* View Mode Switches */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80 self-start md:self-auto">
          <button
            onClick={() => setViewMode('COMPACT')}
            title={isRtl ? 'نمای شبکه‌ای فشرده (دید در یک نگاه)' : 'Compact Grid View'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'COMPACT'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden lg:inline">{isRtl ? 'کارت فشرده' : 'Compact'}</span>
          </button>

          <button
            onClick={() => setViewMode('GRID')}
            title={isRtl ? 'نمای کارت‌های استاندارد' : 'Standard Grid View'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'GRID'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden lg:inline">{isRtl ? 'کارت استاندارد' : 'Grid'}</span>
          </button>

          <button
            onClick={() => setViewMode('TABLE')}
            title={isRtl ? 'نمای جدول مدیریتی' : 'Table View'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'TABLE'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <List className="h-4 w-4" />
            <span className="hidden lg:inline">{isRtl ? 'جدول داده‌ها' : 'Table'}</span>
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredCampaigns.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Send className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">
              {uniqueCampaigns.length === 0
                ? isRtl ? 'هیچ کمپینی ایجاد نشده است' : 'No Campaigns Created'
                : isRtl ? 'هیچ کمپینی با این مشخصات یافت نشد' : 'No Matching Campaigns Found'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {uniqueCampaigns.length === 0
                ? isRtl
                  ? 'برای انتشار خودکار پیام‌ها، عکس‌ها یا نظرسنجی‌ها به کانال‌ها و سوپرگروه‌ها، اولین کمپین خود را تعریف نمایید.'
                  : 'Define your first campaign to schedule and broadcast content across your target groups and channels.'
                : isRtl
                  ? 'عبارت جستجو یا فیلترهای انتخابی خود را تغییر دهید.'
                  : 'Try adjusting your search criteria or filters.'}
            </p>
          </div>
          {uniqueCampaigns.length === 0 && (
            <button
              onClick={handleOpenNew}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{isRtl ? 'ایجاد اولین کمپین' : 'Create First Campaign'}</span>
            </button>
          )}
        </div>
      )}

      {/* 1. COMPACT GRID VIEW (5 Columns on Large Screens for Single-Glance Overview) */}
      {viewMode === 'COMPACT' && filteredCampaigns.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredCampaigns.map((camp) => {
            const isActive = camp.status === 'ACTIVE';
            const isPaused = camp.status === 'PAUSED';

            return (
              <div
                key={camp.id}
                id={`campaign-card-${camp.id}`}
                className="rounded-xl border border-slate-800 bg-slate-900/95 p-3 shadow-lg space-y-2.5 hover:border-indigo-500/50 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  {/* Header: Title & Status */}
                  <div className="flex items-start justify-between gap-1.5">
                    <h3 className="font-bold text-xs text-white truncate max-w-[130px]" title={camp.name}>
                      {camp.name}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-mono font-semibold border shrink-0 ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isPaused
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {camp.status}
                    </span>
                  </div>

                  {/* Countdown Bar */}
                  <div className="rounded-lg bg-slate-950/80 p-2 border border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 text-[10px]">
                      {isRtl ? 'ارسال بعدی:' : 'Next:'}
                    </span>
                    <CampaignCountdown campaign={camp} isRtl={isRtl} />
                  </div>

                  {/* Micro Stats */}
                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 bg-slate-950/40 p-1.5 rounded-lg border border-slate-800/50">
                    <div>
                      <span>{isRtl ? 'دوره:' : 'Interval:'}</span>{' '}
                      <strong className="text-slate-200 font-mono">{camp.intervalMinutes}m</strong>
                    </div>
                    <div>
                      <span>{isRtl ? 'تارگت:' : 'Targets:'}</span>{' '}
                      <strong className="text-indigo-300 font-mono">{camp.targetIds?.length || 0}</strong>
                    </div>
                    <div className="col-span-2 flex items-center justify-between border-t border-slate-800/50 pt-1 mt-0.5">
                      <span>{isRtl ? 'موفق/خطا:' : 'Pass/Fail:'}</span>
                      <span className="font-mono">
                        <strong className="text-emerald-400">{camp.successfulRuns || 0}</strong> /{' '}
                        <strong className="text-rose-400">{camp.failedRuns || 0}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Compact Actions */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleTriggerNow(camp.id)}
                    disabled={executingCampaignId === camp.id}
                    className="w-full flex items-center justify-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 text-[11px] font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {executingCampaignId === camp.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin text-white" />
                    ) : (
                      <Zap className="h-3 w-3 text-amber-300 fill-amber-300" />
                    )}
                    <span>{executingCampaignId === camp.id ? (isRtl ? 'در حال ارسال...' : 'Sending...') : (isRtl ? 'ارسال فوری' : 'Send Now')}</span>
                  </button>

                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={() => handleTogglePause(camp)}
                      className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-semibold transition-all ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      }`}
                    >
                      {isActive ? <Pause className="h-2.5 w-2.5" /> : <Play className="h-2.5 w-2.5" />}
                      <span>{isActive ? (isRtl ? 'توقف' : 'Pause') : (isRtl ? 'ادامه' : 'Resume')}</span>
                    </button>

                    <button
                      onClick={() => setActiveLogsCampaign(camp)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                      title={isRtl ? 'مشاهده لاگ‌ها' : 'View Logs'}
                    >
                      <Activity className="h-3 w-3" />
                    </button>

                    <button
                      onClick={() => {
                        setName(camp.name);
                        setMessageContent(camp.messageContent);
                        setParseMode(camp.parseMode);
                        setMediaUrl(camp.mediaUrls[0] || '');
                        setIntervalMinutes(camp.intervalMinutes);
                        setSelectedTargetIds(camp.targetIds);
                        setSelectedAccountIds(camp.accountIds);
                        setEditingCampaignId(camp.id);
                        setIsComposerOpen(true);
                      }}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title={isRtl ? 'ویرایش' : 'Edit'}
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>

                    <button
                      onClick={() => onDeleteCampaign(camp.id)}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-rose-400"
                      title={isRtl ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2. STANDARD GRID VIEW */}
      {viewMode === 'GRID' && filteredCampaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCampaigns.map((camp) => {
            const isActive = camp.status === 'ACTIVE';
            const isPaused = camp.status === 'PAUSED';

            return (
              <div
                key={camp.id}
                id={`campaign-card-${camp.id}`}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4 hover:border-indigo-500/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-white">{camp.name}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold border ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isPaused
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {camp.status}
                    </span>
                  </div>

                  {/* Message preview snippet */}
                  <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800 text-xs text-slate-300 font-mono line-clamp-3">
                    {camp.messageContent}
                  </div>

                  {/* Live Countdown Bar */}
                  <div className="rounded-xl bg-slate-950/90 p-2.5 border border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">
                      {isRtl ? 'زمان تا ارسال بعدی:' : 'Next send in:'}
                    </span>
                    <CampaignCountdown campaign={camp} isRtl={isRtl} />
                  </div>

                  {/* Meta details */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-indigo-400" />
                      <span>{isRtl ? `دوره: هر ${camp.intervalMinutes} دقیقه` : `Interval: ${camp.intervalMinutes}m`}</span>
                    </div>
                    <div>
                      <span>{isRtl ? 'اهداف:' : 'Targets:'} <strong className="text-slate-200 font-mono">{camp.targetIds.length}</strong></span>
                    </div>
                    <div>
                      <span>{isRtl ? 'آخرین ارسال:' : 'Last sent:'} <strong className="text-slate-300 font-mono">{camp.lastRunAt ? new Date(camp.lastRunAt).toLocaleTimeString('fa-IR') : (isRtl ? 'هنوز نسپریده' : 'Never')}</strong></span>
                    </div>
                    <div>
                      <span>{isRtl ? 'موفق/ناموفق:' : 'Success/Fail:'} <strong className="text-emerald-400 font-mono">{camp.successfulRuns}</strong>/<strong className="text-rose-400 font-mono">{camp.failedRuns}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 pt-3 border-t border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleTriggerNow(camp.id)}
                      disabled={executingCampaignId === camp.id}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      {executingCampaignId === camp.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-white" />
                      ) : (
                        <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
                      )}
                      <span>{executingCampaignId === camp.id ? (isRtl ? 'در حال ارسال...' : 'Sending...') : (isRtl ? 'ارسال فوری (الان بفرست)' : 'Send Now')}</span>
                    </button>

                    <button
                      onClick={() => setActiveLogsCampaign(camp)}
                      className="flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer"
                      title={isRtl ? 'مشاهده لاگ‌های کمپین' : 'View Campaign Logs'}
                    >
                      <Activity className="h-3.5 w-3.5 text-cyan-400" />
                      <span>{isRtl ? 'لاگ‌ها' : 'Logs'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleTogglePause(camp)}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                      }`}
                    >
                      {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      <span>{isActive ? (isRtl ? 'توقف موقت' : 'Pause') : (isRtl ? 'فعال‌سازی مجدد' : 'Resume')}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setName(camp.name);
                          setMessageContent(camp.messageContent);
                          setParseMode(camp.parseMode);
                          setMediaUrl(camp.mediaUrls[0] || '');
                          setIntervalMinutes(camp.intervalMinutes);
                          setSelectedTargetIds(camp.targetIds);
                          setSelectedAccountIds(camp.accountIds);
                          setEditingCampaignId(camp.id);
                          setIsComposerOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                        title={isRtl ? 'ویرایش کمپین' : 'Edit Campaign'}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteCampaign(camp.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
                        title={isRtl ? 'حذف کمپین' : 'Delete Campaign'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. TABLE VIEW */}
      {viewMode === 'TABLE' && filteredCampaigns.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">{isRtl ? 'نام کمپین' : 'Campaign Name'}</th>
                <th className="px-4 py-3">{isRtl ? 'وضعیت' : 'Status'}</th>
                <th className="px-4 py-3">{isRtl ? 'زمان تا ارسال بعدی' : 'Next Dispatch'}</th>
                <th className="px-4 py-3">{isRtl ? 'دوره (دقیقه)' : 'Interval'}</th>
                <th className="px-4 py-3">{isRtl ? 'اهداف' : 'Targets'}</th>
                <th className="px-4 py-3">{isRtl ? 'موفق/ناموفق' : 'Pass/Fail'}</th>
                <th className="px-4 py-3 text-center">{isRtl ? 'عملیات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCampaigns.map((camp) => {
                const isActive = camp.status === 'ACTIVE';
                const isPaused = camp.status === 'PAUSED';

                return (
                  <tr key={camp.id} className="hover:bg-slate-850/50 transition-all">
                    <td className="px-4 py-3 font-bold text-white">
                      <div className="flex flex-col">
                        <span>{camp.name}</span>
                        <span className="text-[10px] text-slate-400 line-clamp-1 font-mono font-normal">
                          {camp.messageContent}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold border ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isPaused
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {camp.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <CampaignCountdown campaign={camp} isRtl={isRtl} />
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-300">
                      هر {camp.intervalMinutes} دقیقه
                    </td>
                    <td className="px-4 py-3 font-mono text-indigo-300 font-bold">
                      {camp.targetIds?.length || 0}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      <span className="text-emerald-400 font-bold">{camp.successfulRuns || 0}</span> /{' '}
                      <span className="text-rose-400 font-bold">{camp.failedRuns || 0}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleTriggerNow(camp.id)}
                          disabled={executingCampaignId === camp.id}
                          className="flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 text-[11px] font-bold shadow transition-all cursor-pointer disabled:opacity-50"
                        >
                          {executingCampaignId === camp.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Zap className="h-3 w-3 text-amber-300 fill-amber-300" />
                          )}
                          <span>{isRtl ? 'ارسال فوری' : 'Send'}</span>
                        </button>

                        <button
                          onClick={() => handleTogglePause(camp)}
                          className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                          }`}
                        >
                          {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </button>

                        <button
                          onClick={() => setActiveLogsCampaign(camp)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400"
                          title={isRtl ? 'لاگ‌ها' : 'Logs'}
                        >
                          <Activity className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setName(camp.name);
                            setMessageContent(camp.messageContent);
                            setParseMode(camp.parseMode);
                            setMediaUrl(camp.mediaUrls[0] || '');
                            setIntervalMinutes(camp.intervalMinutes);
                            setSelectedTargetIds(camp.targetIds);
                            setSelectedAccountIds(camp.accountIds);
                            setEditingCampaignId(camp.id);
                            setIsComposerOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          title={isRtl ? 'ویرایش' : 'Edit'}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteCampaign(camp.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-rose-400"
                          title={isRtl ? 'حذف' : 'Delete'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Execution Result Modal */}
      {executionResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-400" />
                <span>{isRtl ? 'گزارش اجرای ارسال فوری کمپین' : 'Instant Send Report'}</span>
              </h3>
              <button onClick={() => setExecutionResultModal(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className={`p-3 rounded-xl border text-xs font-semibold ${
              executionResultModal.success ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {executionResultModal.message}
            </div>

            {executionResultModal.results && executionResultModal.results.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                <span className="text-xs font-bold text-slate-300">{isRtl ? 'جزئیات وضعیت ارسال به گروه‌ها:' : 'Target Dispatch Status:'}</span>
                {executionResultModal.results.map((r, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <span className="text-slate-200 font-medium">{r.targetTitle}</span>
                    {r.success ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-bold">
                        <CheckCircle className="h-3.5 w-3.5" />
                        {isRtl ? 'موفق' : 'Success'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400 font-bold" title={r.error}>
                        <XCircle className="h-3.5 w-3.5" />
                        {r.error || (isRtl ? 'خطا' : 'Failed')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setExecutionResultModal(null)}
              className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-white transition-all cursor-pointer"
            >
              {isRtl ? 'متوجه شدم' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Campaign Logs History Modal */}
      {activeLogsCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-400" />
                  <span>{isRtl ? `تاریخچه لاگ‌های ارسال: ${activeLogsCampaign.name}` : `Logs for ${activeLogsCampaign.name}`}</span>
                </h3>
                <span className="text-xs text-slate-400">
                  {isRtl ? 'لیست تمام پیام‌های صادر شده و وضعیت اجرا' : 'History of all message dispatches for this campaign'}
                </span>
              </div>
              <button onClick={() => setActiveLogsCampaign(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {deliveryLogs.filter((l) => l.campaignName === activeLogsCampaign.name).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <Clock className="h-8 w-8 text-slate-600 mx-auto" />
                <p>{isRtl ? 'هنوز هیچ لاگی برای این کمپین ثبت نشده است.' : 'No dispatch logs recorded for this campaign yet.'}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {deliveryLogs
                  .filter((l) => l.campaignName === activeLogsCampaign.name)
                  .map((log) => (
                    <div key={log.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{log.targetTitle}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          log.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{isRtl ? 'اکانت:' : 'Account:'} {log.accountPhone}</span>
                        <span>{isRtl ? 'زمان:' : 'Time:'} {new Date(log.timestamp).toLocaleTimeString('fa-IR')}</span>
                      </div>
                      {log.errorMessage && (
                        <div className="p-2 rounded bg-rose-950/40 border border-rose-900/50 text-[11px] text-rose-300 font-mono">
                          {log.errorMessage}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}

            <button
              onClick={() => setActiveLogsCampaign(null)}
              className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-white transition-all cursor-pointer"
            >
              {isRtl ? 'بستن' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Message Composer Drawer / Modal (Section 16) */}
      {isComposerOpen && (
        <div
          id="message-composer-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in"
        >
          <div
            className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingCampaignId
                    ? isRtl ? 'ویرایش کمپین و پیام' : 'Edit Campaign'
                    : isRtl ? 'ایجاد کمپین و پیام‌ساز تلگرام (Telegram Composer)' : 'New Campaign Composer'}
                </h3>
                <span className="text-xs text-indigo-400 font-mono">
                  Markdown, HTML & Media Attachment Support
                </span>
              </div>
              <button onClick={resetComposer} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left (7 cols): Input controls */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isRtl ? 'عنوان کمپین:' : 'Campaign Name:'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Weekend Tech Digest"
                    className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">
                      {isRtl ? 'متن پیام تلگرام:' : 'Telegram Message Text:'}
                    </label>
                    <div className="flex items-center gap-1">
                      {(['MARKDOWN', 'HTML', 'TEXT'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setParseMode(mode)}
                          className={`rounded px-2 py-0.5 text-[10px] font-mono ${
                            parseMode === mode
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={6}
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Type message with **bold** or HTML tags..."
                    className="w-full rounded-xl bg-slate-950 p-3 text-xs font-mono text-slate-200 border border-slate-800 focus:border-indigo-500 focus:outline-none"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-1">
                    <span>Characters: {messageContent.length} / 4096</span>
                    <span>Parse Mode: {parseMode}</span>
                  </div>
                </div>

                {/* Media and URL button */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {isRtl ? 'آدرس تصویر یا مدیا (اختیاری):' : 'Media URL (Optional Image/Video):'}
                    </label>
                    <input
                      type="text"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="https://images.unsplash..."
                      className="w-full rounded-xl bg-slate-950 px-3 py-1.5 text-xs text-slate-300 border border-slate-800 font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {isRtl ? 'دکمه شیشه‌ای (Link Button):' : 'Inline URL Button (Optional):'}
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Label"
                        value={buttonLabel}
                        onChange={(e) => setButtonLabel(e.target.value)}
                        className="w-1/2 rounded-xl bg-slate-950 px-2 py-1.5 text-xs text-slate-300 border border-slate-800"
                      />
                      <input
                        type="text"
                        placeholder="https://..."
                        value={buttonUrl}
                        onChange={(e) => setButtonUrl(e.target.value)}
                        className="w-1/2 rounded-xl bg-slate-950 px-2 py-1.5 text-xs text-slate-300 border border-slate-800 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Target & Interval configuration */}
                <div className="pt-2 border-t border-slate-800">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isRtl ? 'فاصله انتشار (دقیقه):' : 'Interval (Minutes):'}
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                    className="w-full max-w-xs rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono"
                  />
                </div>

                {/* Target Rooms & Account Matrix Assignment */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Target className="h-4 w-4 text-cyan-400" />
                      <span>{isRtl ? 'اهداف و حساب‌های ارسال‌کننده (Target-Account Matrix):' : 'Target Rooms & Assigned Accounts:'}</span>
                    </label>
                    <span className="text-xs font-mono text-cyan-400">
                      {selectedTargetIds.length} / {targets.length} Selected
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl bg-slate-950 p-2.5 border border-slate-800">
                    {targets.map((tgt) => {
                      const isSelected = selectedTargetIds.includes(tgt.id);
                      const assignment = targetAssignments.find((ta) => ta.targetId === tgt.id);

                      return (
                        <div
                          key={tgt.id}
                          className={`flex items-center justify-between gap-2 p-2 rounded-lg border text-xs transition-all ${
                            isSelected
                              ? 'bg-slate-900 border-cyan-500/40'
                              : 'bg-slate-950/60 border-slate-800/80 opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTargetSelection(tgt.id)}
                              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500"
                            />
                            <div className="truncate">
                              <span className="font-semibold text-white truncate block">{tgt.title}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                ID: {tgt.telegramId} • {tgt.type}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <select
                                value={assignment?.primaryAccountId || tgt.assignedAccountId || accounts[0]?.id || ''}
                                onChange={(e) => updateTargetPrimaryAccount(tgt.id, e.target.value)}
                                className="rounded-lg bg-slate-950 px-2 py-1 text-[11px] text-cyan-300 border border-slate-700 font-mono"
                              >
                                {accounts.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.displayName} ({a.phone})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right (5 cols): Live Telegram Message Preview Bubble (Section 16) */}
              <div className="lg:col-span-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-indigo-400" />
                  <span>{isRtl ? 'پیش‌نمایش زنده در تلگرام' : 'Telegram Live Preview'}</span>
                </h4>

                <div className="rounded-2xl bg-gradient-to-b from-[#0e1621] to-[#17212b] p-4 border border-slate-800 shadow-inner min-h-[260px] flex flex-col justify-end">
                  {/* Message Bubble */}
                  <div className="rounded-2xl bg-[#182533] p-3.5 text-slate-100 max-w-[280px] self-end space-y-2 border border-slate-700/40 shadow-md">
                    {mediaUrl && (
                      <div className="overflow-hidden rounded-xl bg-slate-800 h-32 w-full">
                        <img
                          src={mediaUrl}
                          alt="Attachment preview"
                          className="h-full w-full object-cover"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      </div>
                    )}
                    <div className="text-xs whitespace-pre-wrap leading-relaxed">
                      {messageContent || 'Your message text will appear here...'}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[9px] text-slate-400 font-mono">
                      <span>18:30</span>
                      <span className="text-cyan-400">✓✓</span>
                    </div>

                    {buttonLabel && buttonUrl && (
                      <div className="pt-1 border-t border-slate-700/60">
                        <a
                          href={buttonUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block w-full rounded-lg bg-[#2b5278] py-1 text-center text-xs font-medium text-white hover:bg-[#34628f]"
                        >
                          {buttonLabel}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dry Run / Preflight Trigger (Section 76) */}
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{isRtl ? 'تست مقدماتی (Dry Run):' : 'Preflight Dry Run:'}</span>
                    <button
                      onClick={handleDryRun}
                      className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-mono text-indigo-300"
                    >
                      Run Preflight
                    </button>
                  </div>
                  {dryRunReport && (
                    <div className="pt-2 border-t border-slate-800 text-[11px] text-emerald-400 font-mono">
                      ✓ Ready for {dryRunReport.matchedTargetsCount} targets. Est duration: {dryRunReport.estimatedDurationSeconds}s. Flood Risk: {dryRunReport.telegramFloodRisk}.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button onClick={resetComposer} className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-slate-300">
                {isRtl ? 'انصراف' : 'Cancel'}
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSaveCampaign('DRAFT')}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-200"
                >
                  {isRtl ? 'ذخیره پیش‌نویس (Draft)' : 'Save Draft'}
                </button>
                <button
                  id="activate-campaign-submit-btn"
                  onClick={() => handleSaveCampaign('ACTIVE')}
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30"
                >
                  {isRtl ? 'فعال‌سازی و انتشار زمان‌بندی‌شده' : 'Activate & Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

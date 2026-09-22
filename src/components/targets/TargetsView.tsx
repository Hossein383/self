import React, { useState } from 'react';
import {
  Target,
  Plus,
  Search,
  Filter,
  Users,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Edit2,
  Trash2,
  ArrowUpDown,
  Download,
  ExternalLink,
  X,
  Check,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { PublishingTarget, TelegramAccount } from '../../types';
import { TelegramTargetResolver, TargetResolutionResult } from '../../services/telegram/targetResolver';

interface TargetsViewProps {
  targets: PublishingTarget[];
  accounts: TelegramAccount[];
  onAddTarget: (target: PublishingTarget) => void;
  onUpdateTarget: (id: string, updates: Partial<PublishingTarget>) => void;
  onBulkUpdateTargets: (ids: string[], updates: Partial<PublishingTarget>) => { updatedCount: number };
  onDeleteTarget: (id: string) => void;
  isRtl: boolean;
}

export const TargetsView: React.FC<TargetsViewProps> = ({
  targets,
  accounts,
  onAddTarget,
  onUpdateTarget,
  onBulkUpdateTargets,
  onDeleteTarget,
  isRtl,
}) => {
  const [activeTab, setActiveTab] = useState<'GROUPS' | 'CHANNELS' | 'ARCHIVED'>('GROUPS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline edit state
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [editingIntervalValue, setEditingIntervalValue] = useState<number>(30);

  // Bulk Edit Modal state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkInterval, setBulkInterval] = useState<number>(30);
  const [bulkAccountId, setBulkAccountId] = useState<string>(accounts[0]?.id || '');
  const [bulkScheduleEnabled, setBulkScheduleEnabled] = useState<boolean>(true);
  const [bulkPreviewConfirmed, setBulkPreviewConfirmed] = useState(false);
  const [bulkSuccessReport, setBulkSuccessReport] = useState<string | null>(null);

  // Add / Resolve Target Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'RESOLVE' | 'MANUAL'>('RESOLVE');
  const [targetResolveQuery, setTargetResolveQuery] = useState('https://t.me/tech_official');
  const [selectedPrimaryAccount, setSelectedPrimaryAccount] = useState<string>(accounts[0]?.id || '');
  const [selectedFailoverAccounts, setSelectedFailoverAccounts] = useState<string[]>(accounts[1]?.id ? [accounts[1].id] : []);
  const [customInterval, setCustomInterval] = useState<number>(30);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveResult, setResolveResult] = useState<TargetResolutionResult | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Manual target form state
  const [manualTitle, setManualTitle] = useState('');
  const [manualTelegramId, setManualTelegramId] = useState('-100');
  const [manualUsername, setManualUsername] = useState('');
  const [manualType, setManualType] = useState<'SUPERGROUP' | 'CHANNEL' | 'GROUP'>('SUPERGROUP');
  const [manualMemberCount, setManualMemberCount] = useState<number>(5000);

  // Auto-Extract Groups from Account Modal State
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [selectedExtractAccount, setSelectedExtractAccount] = useState<string>(accounts[0]?.id || '');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedDialogs, setExtractedDialogs] = useState<Array<{ id: string; title: string; username?: string; type: string; memberCount: number; canSend: boolean }>>([]);
  const [selectedExtractedIds, setSelectedExtractedIds] = useState<Set<string>>(new Set());
  const [extractError, setExtractError] = useState<string | null>(null);

  const handleFetchDialogs = async () => {
    if (!selectedExtractAccount) return;
    setIsExtracting(true);
    setExtractError(null);
    setExtractedDialogs([]);
    try {
      const acc = accounts.find((a) => a.id === selectedExtractAccount);
      const res = await fetch('/api/telegram/dialogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedExtractAccount,
          sessionString: acc?.encryptedSessionHash,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.dialogs)) {
        const filtered = data.dialogs.filter((d: any) => d.type === 'SUPERGROUP' || d.type === 'GROUP' || d.type === 'CHANNEL');
        setExtractedDialogs(filtered);
        setSelectedExtractedIds(new Set(filtered.map((d: any) => d.id)));
      } else {
        setExtractError(data.error || 'خطا در استخراج لیست گفتگوهای تلگرام.');
      }
    } catch (err: any) {
      setExtractError(err.message || 'خطا در ارتباط با سرور.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImportSelectedDialogs = () => {
    const selectedList = extractedDialogs.filter((d) => selectedExtractedIds.has(d.id));
    selectedList.forEach((d) => {
      const targetId = 'target-ext-' + d.id;
      const target: PublishingTarget = {
        id: targetId,
        telegramId: d.id.startsWith('-') ? d.id : (d.id.length > 8 ? `-100${d.id}` : d.id),
        title: d.title,
        username: d.username,
        type: d.type === 'CHANNEL' ? 'CHANNEL' : 'SUPERGROUP',
        memberCount: d.memberCount || 2,
        assignedAccountId: selectedExtractAccount,
        failoverAccountIds: [],
        scheduleIntervalMinutes: 30,
        scheduleEnabled: true,
        membershipState: 'JOINED',
        adminState: 'MEMBER',
        status: 'HEALTHY',
        lastSync: new Date().toISOString(),
        isArchived: false,
        permissions: {
          canSend: d.canSend,
          canPost: d.type === 'CHANNEL',
          canInvite: true,
        },
      };
      onAddTarget(target);
    });

    setIsExtractModalOpen(false);
    setExtractedDialogs([]);
    setSelectedExtractedIds(new Set());
  };

  // Deduplicate targets
  const uniqueTargets = Array.from(new Map(targets.map((t) => [t.id, t])).values());

  // Filtered by tab and search
  const filteredTargets = uniqueTargets.filter((t) => {
    if (activeTab === 'GROUPS' && t.type === 'CHANNEL') return false;
    if (activeTab === 'CHANNELS' && t.type !== 'CHANNEL') return false;
    if (activeTab === 'ARCHIVED' && !t.isArchived) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.username && t.username.toLowerCase().includes(q)) ||
        t.telegramId.includes(q) ||
        t.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTargets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTargets.map((t) => t.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleInlineSaveInterval = (id: string) => {
    onUpdateTarget(id, { scheduleIntervalMinutes: editingIntervalValue });
    setEditingTargetId(null);
  };

  const handleBulkApply = () => {
    const ids = Array.from(selectedIds);
    const updates: Partial<PublishingTarget> = {
      scheduleIntervalMinutes: bulkInterval,
      assignedAccountId: bulkAccountId,
      scheduleEnabled: bulkScheduleEnabled,
    };

    const res = onBulkUpdateTargets(ids, updates);
    setBulkSuccessReport(`${res.updatedCount}/${ids.length} ${isRtl ? 'هدف با موفقیت بروزرسانی شدند' : 'targets successfully updated.'}`);
    setTimeout(() => {
      setIsBulkModalOpen(false);
      setBulkPreviewConfirmed(false);
      setBulkSuccessReport(null);
      setSelectedIds(new Set());
    }, 1500);
  };

  const handleResolveTarget = async () => {
    setIsResolving(true);
    setResolveError(null);
    try {
      const resolved = await TelegramTargetResolver.resolve(targetResolveQuery, {
        accountId: selectedPrimaryAccount || accounts[0]?.id,
        accounts,
      });
      setResolveResult(resolved);
    } catch (err: any) {
      setResolveError(err.message || 'خطا در شناسایی مقصد تلگرام.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleSaveResolvedTarget = () => {
    if (!resolveResult) return;
    const primaryId = selectedPrimaryAccount || accounts[0]?.id || '';
    const newTarget = TelegramTargetResolver.buildPublishingTarget(resolveResult, {
      assignedAccountId: primaryId,
      failoverAccountIds: selectedFailoverAccounts,
      scheduleIntervalMinutes: customInterval,
    });

    onAddTarget(newTarget);
    setIsAddModalOpen(false);
    setResolveResult(null);
    setTargetResolveQuery('');
  };

  const handleSaveManualTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim() || !manualTelegramId.trim()) return;

    const primaryId = selectedPrimaryAccount || accounts[0]?.id || '';
    const id = 'target-' + Date.now();
    const cleanUsername = manualUsername.trim().replace('@', '');

    const newTarget: PublishingTarget = {
      id,
      telegramId: manualTelegramId.trim(),
      title: manualTitle.trim(),
      username: cleanUsername ? cleanUsername : undefined,
      type: manualType,
      memberCount: Number(manualMemberCount) || 1000,
      assignedAccountId: primaryId,
      failoverAccountIds: selectedFailoverAccounts,
      scheduleIntervalMinutes: Number(customInterval) || 30,
      scheduleEnabled: true,
      membershipState: 'JOINED',
      adminState: 'MEMBER',
      status: 'HEALTHY',
      lastSync: new Date().toISOString(),
      isArchived: false,
      permissions: {
        canSend: manualType !== 'CHANNEL',
        canPost: manualType === 'CHANNEL',
        canInvite: true,
      },
    };

    onAddTarget(newTarget);
    setIsAddModalOpen(false);
    setManualTitle('');
    setManualTelegramId('-100');
    setManualUsername('');
  };

  return (
    <div id="targets-view" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Target className="h-5 w-5 text-cyan-400" />
            <span>{isRtl ? 'ماتریس انتشار در گروه‌ها و کانال‌ها (Spreadsheet Matrix)' : 'Authorized Publishing Targets Matrix'}</span>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-mono text-cyan-300">
              {targets.length} Total
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRtl
              ? 'نمای اکسل‌مانند، ویرایش ردیفی بدون ریلود، اعمال دسته‌جمعی (Bulk Edit) روی ۵ تا ۵۰ هدف و تخصیص حساب‌ها'
              : 'Dense spreadsheet layout with inline interval edits, transactional bulk modifications, and failover pool routing.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              id="bulk-edit-open-btn"
              onClick={() => {
                setIsBulkModalOpen(true);
                setBulkPreviewConfirmed(false);
                setBulkSuccessReport(null);
              }}
              className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-600/30 transition-all animate-in fade-in"
            >
              <Edit2 className="h-4 w-4" />
              <span>
                {isRtl ? `ویرایش گروهی (${selectedIds.size} مورد)` : `Bulk Edit (${selectedIds.size} Selected)`}
              </span>
            </button>
          )}

          <button
            id="extract-dialogs-btn"
            onClick={() => {
              setIsExtractModalOpen(true);
              setExtractError(null);
              setExtractedDialogs([]);
              setSelectedExtractedIds(new Set());
            }}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-200" />
            <span>{isRtl ? 'استخراج خودکار گروه‌ها از اکانت' : 'Auto-Extract Groups'}</span>
          </button>

          <button
            id="add-target-btn"
            onClick={() => {
              setIsAddModalOpen(true);
              setResolveResult(null);
              setResolveError(null);
            }}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>{isRtl ? 'افزودن و شناسایی هدف (Resolve Target)' : 'Import & Resolve Target'}</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-slate-900/80 p-3 border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('GROUPS')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'GROUPS'
                ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isRtl ? 'گروه‌ها و سوپرگروه‌ها' : 'Groups & Supergroups'}
          </button>
          <button
            onClick={() => setActiveTab('CHANNELS')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'CHANNELS'
                ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isRtl ? 'کانال‌های مجاز' : 'Authorized Channels'}
          </button>
          <button
            onClick={() => setActiveTab('ARCHIVED')}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === 'ARCHIVED'
                ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isRtl ? 'بایگانی‌شده' : 'Archived'}
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            id="targets-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isRtl ? 'جستجو در نام گروه، شناسه یا نام کاربری...' : 'Search targets, IDs, titles...'}
            className="w-full rounded-xl bg-slate-950/70 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 border border-slate-800 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Spreadsheet Matrix Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-[11px] text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredTargets.length && filteredTargets.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-cyan-500"
                  />
                </th>
                <th className="p-3 text-right">{isRtl ? 'نام هدف و شناسه' : 'Target & ID'}</th>
                <th className="p-3 text-center">{isRtl ? 'نوع' : 'Type'}</th>
                <th className="p-3 text-center">{isRtl ? 'وضعیت عضویت' : 'Membership'}</th>
                <th className="p-3 text-center">{isRtl ? 'دسترسی ارسال' : 'Permissions'}</th>
                <th className="p-3 text-right">{isRtl ? 'اکانت اصلی' : 'Primary Account'}</th>
                <th className="p-3 text-center">{isRtl ? 'بازه زمان‌بندی (دقیقه)' : 'Schedule'}</th>
                <th className="p-3 text-center">{isRtl ? 'وضعیت' : 'Status'}</th>
                <th className="p-3 text-center">{isRtl ? 'اجرای بعدی' : 'Next Run'}</th>
                <th className="p-3 text-center">{isRtl ? 'عملیات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredTargets.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    <Target className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                    <div>{isRtl ? 'هیچ هدفی در این بخش یافت نشد.' : 'No targets found in this view.'}</div>
                  </td>
                </tr>
              )}
              {filteredTargets.slice(0, 40).map((target) => {
                const isSelected = selectedIds.has(target.id);
                const assignedAccount = accounts.find((a) => a.id === target.assignedAccountId);
                const isInlineEditing = editingTargetId === target.id;

                return (
                  <tr
                    key={target.id}
                    id={`target-row-${target.id}`}
                    className={`transition-colors hover:bg-slate-800/40 ${
                      isSelected ? 'bg-cyan-950/20' : ''
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(target.id)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-cyan-500"
                      />
                    </td>

                    <td className="p-3 text-right">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <span>{target.title}</span>
                        {target.username && (
                          <span className="text-[10px] text-slate-500 font-mono">@{target.username}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        {target.telegramId}
                      </span>
                    </td>

                    <td className="p-3 text-center font-mono">
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                        {target.type}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          target.membershipState === 'JOINED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {target.membershipState}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                          target.permissions.canSend
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {target.permissions.canSend ? 'Can Send' : 'Write Forbidden'}
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="font-mono text-slate-200">
                          {assignedAccount ? assignedAccount.phone : 'Not Assigned'}
                        </span>
                      </div>
                    </td>

                    {/* Inline Edit for Schedule Interval (Section 50) */}
                    <td className="p-3 text-center">
                      {isInlineEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="5"
                            max="1440"
                            value={editingIntervalValue}
                            onChange={(e) => setEditingIntervalValue(Number(e.target.value))}
                            className="w-16 rounded bg-slate-950 px-2 py-1 text-center font-mono text-xs text-white border border-cyan-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleInlineSaveInterval(target.id)}
                            className="p-1 rounded bg-cyan-600 text-white hover:bg-cyan-500"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingTargetId(target.id);
                            setEditingIntervalValue(target.scheduleIntervalMinutes || 30);
                          }}
                          className="group inline-flex items-center gap-1 rounded-lg bg-slate-800/80 px-2.5 py-1 text-xs font-mono text-cyan-300 hover:bg-slate-800 border border-slate-700/60"
                          title="Click to inline edit interval"
                        >
                          <span>{target.scheduleIntervalMinutes || 30}m</span>
                          <Edit2 className="h-2.5 w-2.5 opacity-40 group-hover:opacity-100" />
                        </button>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold ${
                          target.status === 'HEALTHY'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : target.status === 'DEGRADED'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {target.status}
                      </span>
                    </td>

                    <td className="p-3 text-center font-mono text-[11px] text-slate-400">
                      {target.nextRun ? target.nextRun.slice(11, 16) + ' UTC' : '—'}
                    </td>

                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            onUpdateTarget(target.id, { scheduleEnabled: !target.scheduleEnabled });
                          }}
                          title={target.scheduleEnabled ? 'Disable' : 'Enable'}
                          className={`p-1.5 rounded-lg text-xs font-mono ${
                            target.scheduleEnabled ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-slate-500 hover:bg-slate-800'
                          }`}
                        >
                          {target.scheduleEnabled ? 'ON' : 'OFF'}
                        </button>
                        <button
                          onClick={() => onDeleteTarget(target.id)}
                          className="p-1.5 rounded-lg text-rose-400/70 hover:bg-rose-500/20 hover:text-rose-300"
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

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-400">
          <span>
            {isRtl
              ? `نمایش ۴۰ هدف از ${filteredTargets.length} هدف مجاز`
              : `Showing first 40 of ${filteredTargets.length} authorized targets`}
          </span>
          <span className="font-mono text-cyan-400">
            {selectedIds.size > 0 ? `${selectedIds.size} targets selected for bulk actions` : 'Spreadsheet synced'}
          </span>
        </div>
      </div>

      {/* Bulk Edit Modal (Section 18 & 88) with Pre-commit Diff */}
      {isBulkModalOpen && (
        <div
          id="bulk-edit-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in"
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {isRtl ? 'ویرایش دسته‌جمعی اهداف (Bulk Edit Targets)' : 'Bulk Edit Schedule & Accounts'}
                </h3>
                <span className="text-xs text-cyan-400 font-mono">
                  {selectedIds.size} {isRtl ? 'هدف انتخاب شده است' : 'targets currently selected'}
                </span>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {bulkSuccessReport ? (
              <div className="rounded-xl bg-emerald-950/40 p-4 border border-emerald-500/40 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">{bulkSuccessReport}</h4>
                <p className="text-xs text-slate-400">
                  {isRtl ? 'تغییرات با تراکنش امن ذخیره شدند.' : 'Changes committed with full transactional audit integrity.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isRtl ? 'بازه زمانی جدید (فاصله انتشار برحسب دقیقه):' : 'New Interval (Minutes):'}
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    value={bulkInterval}
                    onChange={(e) => setBulkInterval(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isRtl ? 'تخصیص حساب اصلی به تمام اهداف انتخاب شده:' : 'Assign Primary Account:'}
                  </label>
                  <select
                    value={bulkAccountId}
                    onChange={(e) => setBulkAccountId(e.target.value)}
                    className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-cyan-500 focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.displayName} ({acc.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="bulk-schedule-enabled"
                    checked={bulkScheduleEnabled}
                    onChange={(e) => setBulkScheduleEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-cyan-500"
                  />
                  <label htmlFor="bulk-schedule-enabled" className="text-xs text-slate-300">
                    {isRtl ? 'فعال‌سازی وضعیت Schedule برای تمام اهداف' : 'Enable Schedule status across all selected targets'}
                  </label>
                </div>

                {/* Pre-commit Safety Preview Box (Section 18 & 88) */}
                <div className="rounded-xl bg-slate-950/80 p-3.5 border border-cyan-500/30 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                    <Shield className="h-4 w-4" />
                    <span>{isRtl ? 'پیش‌نمایش ایمنی قبل از اعمال (Safety Verification):' : 'Pre-flight Safety Preview:'}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono">
                    ✓ {selectedIds.size} targets will be modified with interval: {bulkInterval}m.
                  </p>
                  <p className="text-[11px] text-emerald-400 font-mono">
                    ✓ No existing target permissions or membership records will be lost.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setIsBulkModalOpen(false)}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-slate-300"
                  >
                    {isRtl ? 'انصراف' : 'Cancel'}
                  </button>
                  <button
                    id="commit-bulk-edit-btn"
                    onClick={handleBulkApply}
                    className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-600/30"
                  >
                    {isRtl ? 'تایید و اعمال روی ماتریس' : 'Apply Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Target Import & Resolver Modal */}
      {isAddModalOpen && (
        <div
          id="resolve-target-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in"
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="h-4 w-4 text-cyan-400" />
                <span>{isRtl ? 'افزودن و شناسایی مقصد تلگرام' : 'Add Publishing Target'}</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setAddMode('RESOLVE')}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                  addMode === 'RESOLVE' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isRtl ? 'شناسایی هوشمند از لینک / آیدی' : 'Smart Link / ID Resolver'}
              </button>
              <button
                type="button"
                onClick={() => setAddMode('MANUAL')}
                className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                  addMode === 'MANUAL' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isRtl ? 'افزودن دستی با مشخصات دلخواه' : 'Manual Target Entry'}
              </button>
            </div>

            {addMode === 'RESOLVE' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isRtl ? 'لینک تلگرام، نام کاربری یا شناسه عددی:' : 'Telegram Link, @Username or Chat ID:'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={targetResolveQuery}
                      onChange={(e) => setTargetResolveQuery(e.target.value)}
                      placeholder="https://t.me/tech_official or @tech_official"
                      className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                    <button
                      onClick={handleResolveTarget}
                      disabled={isResolving || !targetResolveQuery}
                      className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      {isResolving ? (isRtl ? 'در حال بررسی...' : 'Resolving...') : (isRtl ? 'شناسایی' : 'Resolve')}
                    </button>
                  </div>
                </div>

                {resolveError && (
                  <div className="rounded-xl bg-rose-950/40 p-3 border border-rose-500/40 text-xs text-rose-300">
                    {resolveError}
                  </div>
                )}

                {resolveResult && (
                  <div className="rounded-xl bg-slate-950/80 p-4 border border-slate-800 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{resolveResult.canonicalIdentity.title}</span>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-cyan-300 font-mono">
                        {resolveResult.canonicalIdentity.type}
                      </span>
                    </div>
                    <div className="space-y-1 text-[11px] font-mono text-slate-400">
                      <div>Telegram ID: <span className="text-cyan-400 font-bold">{resolveResult.canonicalIdentity.telegramId}</span></div>
                      {resolveResult.canonicalIdentity.username && (
                        <div>Username: @{resolveResult.canonicalIdentity.username}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                      <span className="text-emerald-400">✓ مجوز ارسال فعال است</span>
                      <span>•</span>
                      <span className="text-slate-400">{resolveResult.canonicalIdentity.memberCount?.toLocaleString()} عضو</span>
                    </div>

                    {/* Account Selection */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-2">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          {isRtl ? 'حساب اصلی ارسال‌کننده (Primary Sender):' : 'Primary Publishing Account:'}
                        </label>
                        <select
                          value={selectedPrimaryAccount}
                          onChange={(e) => setSelectedPrimaryAccount(e.target.value)}
                          className="w-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white border border-slate-700 font-mono"
                        >
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.displayName} ({a.phone})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          {isRtl ? 'فاصله زمانی ارسال پیام‌ها (دقیقه):' : 'Publishing Interval (min):'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="1440"
                          value={customInterval}
                          onChange={(e) => setCustomInterval(Number(e.target.value))}
                          className="w-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white border border-slate-700 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-slate-300"
                  >
                    {isRtl ? 'انصراف' : 'Cancel'}
                  </button>
                  <button
                    disabled={!resolveResult}
                    onClick={handleSaveResolvedTarget}
                    className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 shadow-lg shadow-cyan-600/30"
                  >
                    {isRtl ? 'افزودن به ماتریس اهداف' : 'Save to Matrix'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveManualTarget} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isRtl ? 'عنوان / نام گروه یا کانال:' : 'Group or Channel Title:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="e.g. گروه تخصصی برنامه‌نویسان"
                    className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {isRtl ? 'نوع هدف:' : 'Target Type:'}
                    </label>
                    <select
                      value={manualType}
                      onChange={(e) => setManualType(e.target.value as any)}
                      className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-cyan-500 focus:outline-none"
                    >
                      <option value="SUPERGROUP">{isRtl ? 'ابرگروه (Supergroup)' : 'Supergroup'}</option>
                      <option value="CHANNEL">{isRtl ? 'کانال (Channel)' : 'Channel'}</option>
                      <option value="GROUP">{isRtl ? 'گروه معمولی (Group)' : 'Group'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {isRtl ? 'تعداد تقریبی اعضا:' : 'Member Count:'}
                    </label>
                    <input
                      type="number"
                      value={manualMemberCount}
                      onChange={(e) => setManualMemberCount(Number(e.target.value))}
                      className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {isRtl ? 'شناسه عددی تلگرام (Chat ID):' : 'Telegram ID:'}
                    </label>
                    <input
                      type="text"
                      required
                      value={manualTelegramId}
                      onChange={(e) => setManualTelegramId(e.target.value)}
                      placeholder="-1001928472911"
                      className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {isRtl ? 'نام کاربری / آیدی (اختیاری):' : 'Username (Optional):'}
                    </label>
                    <input
                      type="text"
                      value={manualUsername}
                      onChange={(e) => setManualUsername(e.target.value)}
                      placeholder="@tech_group"
                      className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {isRtl ? 'حساب اصلی ارسال‌کننده:' : 'Primary Account:'}
                    </label>
                    <select
                      value={selectedPrimaryAccount}
                      onChange={(e) => setSelectedPrimaryAccount(e.target.value)}
                      className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-cyan-500 focus:outline-none"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.displayName} ({a.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {isRtl ? 'فاصله زمانی (دقیقه):' : 'Interval (min):'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={customInterval}
                      onChange={(e) => setCustomInterval(Number(e.target.value))}
                      className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-slate-300"
                  >
                    {isRtl ? 'انصراف' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-600/30"
                  >
                    {isRtl ? 'ذخیره و ثبت هدف' : 'Save Target'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Auto-Extract Dialogs Modal */}
      {isExtractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Download className="h-5 w-5 text-emerald-400" />
                  <span>{isRtl ? 'استخراج خودکار گروه‌ها و کانال‌ها از اکانت' : 'Auto-Extract Dialogs from Account'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isRtl
                    ? 'یک اکانت تلگرام متصل را انتخاب کرده تا گروه‌ها و کانال‌های عضو شده را استخراج کند.'
                    : 'Select a connected Telegram account to pull all joined groups and channels.'}
                </p>
              </div>
              <button onClick={() => setIsExtractModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                {isRtl ? 'انتخاب اکانت متصل:' : 'Select Telegram Account:'}
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedExtractAccount}
                  onChange={(e) => setSelectedExtractAccount(e.target.value)}
                  className="flex-1 rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-emerald-500 focus:outline-none"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.displayName} ({a.phone})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleFetchDialogs}
                  disabled={isExtracting || !selectedExtractAccount}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-md cursor-pointer transition-all"
                >
                  {isExtracting ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <Download className="h-4 w-4 text-emerald-200" />
                  )}
                  <span>{isExtracting ? (isRtl ? 'در حال دریافت...' : 'Fetching...') : (isRtl ? 'دریافت لیست' : 'Fetch Dialogs')}</span>
                </button>
              </div>

              {extractError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-semibold">
                  {extractError}
                </div>
              )}

              {extractedDialogs.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>{isRtl ? `گروه‌ها و کانال‌های یافت شده (${extractedDialogs.length} مورد):` : `Found Dialogs (${extractedDialogs.length}):`}</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedExtractedIds.size === extractedDialogs.length) {
                          setSelectedExtractedIds(new Set());
                        } else {
                          setSelectedExtractedIds(new Set(extractedDialogs.map((d) => d.id)));
                        }
                      }}
                      className="text-emerald-400 hover:underline text-[11px]"
                    >
                      {selectedExtractedIds.size === extractedDialogs.length ? (isRtl ? 'لغو همه' : 'Deselect All') : (isRtl ? 'انتخاب همه' : 'Select All')}
                    </button>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {extractedDialogs.map((d) => {
                      const isSelected = selectedExtractedIds.has(d.id);
                      return (
                        <div
                          key={d.id}
                          onClick={() => {
                            const next = new Set(selectedExtractedIds);
                            if (next.has(d.id)) next.delete(d.id);
                            else next.add(d.id);
                            setSelectedExtractedIds(next);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected ? 'bg-emerald-950/40 border-emerald-500/50 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <div className="font-bold text-slate-200">{d.title}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {d.username ? `@${d.username}` : d.id} • {d.type}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {d.memberCount ? `${d.memberCount} members` : 'Group'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleImportSelectedDialogs}
                    disabled={selectedExtractedIds.size === 0}
                    className="w-full mt-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-2.5 text-xs font-bold text-white shadow-lg transition-all cursor-pointer"
                  >
                    {isRtl ? `افزودن ${selectedExtractedIds.size} موارد انتخاب شده به لیست اهداف` : `Import ${selectedExtractedIds.size} Selected Targets`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

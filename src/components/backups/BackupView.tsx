import React, { useState, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  Lock,
  Plus,
  Clock,
  HardDrive,
  CheckCircle,
} from 'lucide-react';
import { BackupRecord } from '../../types';

interface BackupViewProps {
  backups: BackupRecord[];
  onCreateBackup: (name?: string) => void;
  onRestoreBackup: (backupId: string) => { success: boolean; message: string; safetyBackupId?: string };
  onDeleteBackup: (backupId: string) => void;
  onExportBackup: (backupId: string) => string;
  onImportBackup: (jsonString: string) => { success: boolean; message: string };
  isRtl: boolean;
}

export const BackupView: React.FC<BackupViewProps> = ({
  backups,
  onCreateBackup,
  onRestoreBackup,
  onDeleteBackup,
  onExportBackup,
  onImportBackup,
  isRtl,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [backupNameInput, setBackupNameInput] = useState('');
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupRecord | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  const handleCreate = () => {
    onCreateBackup(backupNameInput.trim() || undefined);
    setBackupNameInput('');
    setIsCreating(false);
    showNotification('success', isRtl ? 'بکاپ جدید با موفقیت ایجاد و اعتبارسنجی شد.' : 'Backup created and verified successfully.');
  };

  const handleConfirmRestore = () => {
    if (!selectedBackupForRestore) return;
    const res = onRestoreBackup(selectedBackupForRestore.id);
    if (res.success) {
      showNotification(
        'success',
        `${res.message} (یک نسخه ایمنی اضطراری با شناسه ${res.safetyBackupId} ذخیره گردید)`
      );
    } else {
      showNotification('error', res.message);
    }
    setSelectedBackupForRestore(null);
  };

  const handleExportDownload = (record: BackupRecord) => {
    const jsonStr = onExportBackup(record.id);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${record.id}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showNotification('success', isRtl ? 'فایل بکاپ جهت دانلود آماده شد.' : 'Backup downloaded successfully.');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = onImportBackup(content);
        if (res.success) {
          showNotification('success', res.message);
        } else {
          showNotification('error', res.message);
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uniqueBackups = Array.from(new Map(backups.map((b) => [b.id, b])).values());

  return (
    <div id="backup-view" className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : notification.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
          }`}
        >
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white mr-2">
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-400" />
            <span>{isRtl ? 'مرکز پشتیبان‌گیری و بازیابی پایگاه داده' : 'Database Backup & Disaster Recovery'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRtl
              ? 'تهیه نسخه پشتیبان با هش اعتبارسنجی SHA-256، دانلود داده‌ها و بازیابی با محافظت ایمنی خودکار قبل از بازگردانی'
              : 'Cryptographically verified database snapshots with pre-restore safety snapshots and export/import.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-all cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            <span>{isRtl ? 'بارگذاری فایل JSON' : 'Import JSON'}</span>
          </button>

          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{isRtl ? 'تهیه بکاپ فوری' : 'Create Snapshot'}</span>
          </button>
        </div>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-100">
            {isRtl ? 'تهیه نسخه پشتیبان کامل پایگاه داده' : 'Create Full Snapshot'}
          </h3>
          <p className="text-xs text-slate-400">
            {isRtl
              ? 'این عملیات از تمام حساب‌ها، پروکسی‌ها، تارگت‌ها، کمپین‌ها، زمان‌بندی‌ها و تنظیمات سیستم یک تصویر کامل تهیه می‌کند.'
              : 'Creates a point-in-time snapshot of all accounts, proxies, targets, campaigns, schedules and settings.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <input
              type="text"
              value={backupNameInput}
              onChange={(e) => setBackupNameInput(e.target.value)}
              placeholder={isRtl ? 'عنوان دلخواه بکاپ (اختیاری)...' : 'Optional backup label...'}
              className="flex-1 rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setIsCreating(false)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                {isRtl ? 'انصراف' : 'Cancel'}
              </button>
              <button
                onClick={handleCreate}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                {isRtl ? 'ثبت و اعتبارسنجی' : 'Capture & Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Notice Card */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-slate-300">
          <span className="font-semibold text-amber-300">
            {isRtl ? 'خط‌مشی تضمین ایمنی داده‌ها (Zero Data Loss Policy): ' : 'Zero Data Loss Policy: '}
          </span>
          {isRtl
            ? 'پیش از اعمال هرگونه عملیات بازیابی (Restore)، سامانه به‌صورت کاملاً خودکار یک نسخه پشتیبان ایمنی اضطراری (Safety Pre-Restore) از وضعیت لحظه‌ای سیستم تهیه می‌نماید تا در صورت بروز هرگونه مشکل، امکان بازگشت کامل بدون اتلاف داده وجود داشته باشد.'
            : 'Before executing any restore operation, an automated safety backup is captured immediately to prevent any state loss.'}
        </div>
      </div>

      {/* Backups List */}
      {uniqueBackups.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <HardDrive className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-200 mb-1">
            {isRtl ? 'هنوز هیچ نسخه‌ای ذخیره نشده است' : 'No Snapshots Recorded'}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            {isRtl
              ? 'برای حفظ پایداری داده‌ها و تضمین قابلیت بازیابی هنگام بحران، اولین نسخه پشتیبان را ثبت نمایید.'
              : 'Capture your first snapshot to ensure state durability and instant recovery.'}
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{isRtl ? 'ایجاد اولین نسخه پشتیبان' : 'Capture Initial Backup'}</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                  <th className="py-3 px-4">{isRtl ? 'عنوان و مشخصات نسخه' : 'Backup Label'}</th>
                  <th className="py-3 px-4">{isRtl ? 'نوع' : 'Type'}</th>
                  <th className="py-3 px-4">{isRtl ? 'زمان ثبت' : 'Timestamp'}</th>
                  <th className="py-3 px-4">{isRtl ? 'حجم' : 'Size'}</th>
                  <th className="py-3 px-4">{isRtl ? 'اعتبارسنجی SHA-256' : 'Checksum'}</th>
                  <th className="py-3 px-4 text-center">{isRtl ? 'عملیات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {uniqueBackups.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <Database className="h-4 w-4 text-indigo-400 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-200">{b.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{b.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          b.type === 'SAFETY_PRE_RESTORE'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : b.type === 'AUTOMATIC'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        {b.type === 'SAFETY_PRE_RESTORE'
                          ? isRtl
                            ? 'ایمنی قبل بازیابی'
                            : 'Pre-Restore Safety'
                          : b.type === 'AUTOMATIC'
                          ? isRtl
                            ? 'خودکار'
                            : 'Auto'
                          : isRtl
                          ? 'دستی'
                          : 'Manual'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {new Date(b.createdAt).toLocaleDateString('fa-IR')}{' '}
                      <span className="text-slate-500 text-[10px]">
                        {new Date(b.createdAt).toLocaleTimeString('fa-IR')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">{b.sizeFormatted}</td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>{b.checksumSha256.slice(0, 16)}...</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedBackupForRestore(b)}
                          className="flex items-center gap-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>{isRtl ? 'بازیابی' : 'Restore'}</span>
                        </button>

                        <button
                          onClick={() => handleExportDownload(b)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                          title={isRtl ? 'دانلود فایل JSON' : 'Export JSON'}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteBackup(b.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title={isRtl ? 'حذف بکاپ' : 'Delete'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Restore */}
      {selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400 border-b border-slate-800 pb-3">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-sm font-bold text-slate-100">
                {isRtl ? 'تایید عملیات بازگردانی اطلاعات' : 'Confirm State Restoration'}
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isRtl
                ? `آیا از بازگردانی داده‌های سامانه به نسخه «${selectedBackupForRestore.name}» اطمینان دارید؟`
                : `Are you sure you want to restore system state to "${selectedBackupForRestore.name}"?`}
            </p>

            <div className="rounded-xl bg-slate-950 p-3 text-[11px] text-slate-400 space-y-1">
              <div>
                {isRtl ? 'تاریخ نسخه: ' : 'Snapshot Date: '}
                <span className="font-mono text-slate-200">
                  {new Date(selectedBackupForRestore.createdAt).toLocaleString('fa-IR')}
                </span>
              </div>
              <div>
                {isRtl ? 'هش اعتبارسنجی: ' : 'Checksum: '}
                <span className="font-mono text-emerald-400">{selectedBackupForRestore.checksumSha256}</span>
              </div>
              <div className="text-amber-400/90 pt-1">
                {isRtl
                  ? '✓ یک نسخه پشتیبان ایمنی به‌صورت خودکار قبل از تغییرات ذخیره خواهد شد.'
                  : '✓ A safety pre-restore snapshot will be automatically recorded.'}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedBackupForRestore(null)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 cursor-pointer"
              >
                {isRtl ? 'انصراف' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmRestore}
                className="rounded-xl bg-amber-600 hover:bg-amber-500 px-5 py-2 text-xs font-semibold text-white cursor-pointer"
              >
                {isRtl ? 'تایید و بازگردانی ایمن' : 'Confirm Safe Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

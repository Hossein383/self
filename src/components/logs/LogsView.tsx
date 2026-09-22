import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  Download,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  Trash2,
} from 'lucide-react';
import { AuditLog } from '../../types';

interface LogsViewProps {
  logs: AuditLog[];
  onClearLogs?: () => void;
  isRtl: boolean;
}

export const LogsView: React.FC<LogsViewProps> = ({ logs, onClearLogs, isRtl }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'INFO' | 'WARN' | 'ERROR'>('ALL');

  const getLogLevel = (log: AuditLog): 'INFO' | 'WARN' | 'ERROR' => {
    if (log.level) return log.level;
    if (log.action.includes('FAIL') || log.action.includes('ERROR') || log.action.includes('HALT')) return 'ERROR';
    if (log.action.includes('WARN') || log.action.includes('DEGRADED')) return 'WARN';
    return 'INFO';
  };

  const getLogDetails = (log: AuditLog): string => {
    return log.details || log.afterState || log.beforeState || log.action;
  };

  const uniqueLogs = Array.from(new Map(logs.map((l, idx) => [l.id || `log-${idx}`, l])).values());

  const filteredLogs = uniqueLogs.filter((log) => {
    const lvl = getLogLevel(log);
    if (levelFilter !== 'ALL' && lvl !== levelFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const entity = (log.entityId || log.resourceId || '').toLowerCase();
      const details = getLogDetails(log).toLowerCase();
      return (
        log.action.toLowerCase().includes(q) ||
        details.includes(q) ||
        entity.includes(q)
      );
    }
    return true;
  });

  const exportAsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `telegram_control_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportAsCSV = () => {
    const headers = ['id', 'timestamp', 'level', 'action', 'entityType', 'entityId', 'details'];
    const rows = logs.map((l) => [
      l.id,
      l.timestamp,
      getLogLevel(l),
      `"${l.action.replace(/"/g, '""')}"`,
      l.entityType || l.resourceType,
      l.entityId || l.resourceId || '',
      `"${getLogDetails(l).replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `telegram_control_audit_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div id="logs-view" className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-400" />
            <span>{isRtl ? 'لاگ‌های ساختاریافته و حسابرسی امنیتی (Audit Trail)' : 'Structured Audit Trail & Compliance'}</span>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-mono text-indigo-300">
              {logs.length} Events
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRtl
              ? 'ثبت تمام وقایع، تغییرات زمان‌بندی، ارورهای تلگرام و سانسور خودکار داده‌های محرمانه (Session Redaction)'
              : 'Immutable event stream, sensitive token masking, and exportable CSV/JSON compliance archives.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="export-csv-btn"
            onClick={exportAsCSV}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 border border-slate-700/60 transition-all"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>
          <button
            id="export-json-btn"
            onClick={exportAsJSON}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl bg-slate-900/80 p-3 border border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`rounded-xl px-3 py-1.5 text-xs font-mono transition-all ${
                levelFilter === lvl
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {lvl} ({logs.filter((l) => (lvl === 'ALL' ? true : l.level === lvl)).length})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            id="logs-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isRtl ? 'جستجو در اکشن، جزئیات و شناسه...' : 'Filter actions, entities, details...'}
            className="w-full rounded-xl bg-slate-950/70 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 border border-slate-800 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-950/80 text-[11px] text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-3 text-center w-16">Level</th>
                <th className="p-3 text-center">{isRtl ? 'زمان وقوع (UTC)' : 'Timestamp'}</th>
                <th className="p-3 text-right">{isRtl ? 'عنوان رویداد' : 'Action'}</th>
                <th className="p-3 text-right">{isRtl ? 'موجودیت هدف' : 'Entity'}</th>
                <th className="p-3 text-right">{isRtl ? 'توضیحات و متادیتا' : 'Details'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    <FileText className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                    <div>{isRtl ? 'هیچ لاگی ثبت نشده است.' : 'No audit log entries recorded yet.'}</div>
                  </td>
                </tr>
              )}
              {filteredLogs.slice(0, 45).map((log) => {
                const lvl = getLogLevel(log);
                const isError = lvl === 'ERROR';
                const isWarn = lvl === 'WARN';
                const entityName = log.entityType || log.resourceType || 'SYSTEM';
                const entityId = log.entityId || log.resourceId;

                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 text-center font-mono">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          isError
                            ? 'bg-rose-500/20 text-rose-400'
                            : isWarn
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-indigo-500/20 text-indigo-300'
                        }`}
                      >
                        {lvl}
                      </span>
                    </td>

                    <td className="p-3 text-center font-mono text-[11px] text-slate-400">
                      {log.timestamp.slice(11, 19)}
                    </td>

                    <td className="p-3 text-right font-mono font-semibold text-slate-200">
                      {log.action}
                    </td>

                    <td className="p-3 text-right font-mono text-slate-400">
                      {entityName} {entityId ? `[${entityId}]` : ''}
                    </td>

                    <td className="p-3 text-right font-mono text-slate-300 text-[11px]">
                      {getLogDetails(log)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

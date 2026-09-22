import React, { useState } from 'react';
import {
  ShieldAlert,
  Plus,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Zap,
  Globe,
  Trash2,
  Server,
  Layers,
  X,
  Search,
  Check,
  RefreshCw,
  Sparkles,
  MapPin,
  Wifi,
  Filter,
  WifiOff,
  Radio,
} from 'lucide-react';
import { ProxyConfig } from '../../types';
import { defaultTelegramProvider } from '../../services/telegram/realProvider';

interface ProxiesViewProps {
  proxies: ProxyConfig[];
  onAddProxy: (proxy: ProxyConfig) => void;
  onUpdateProxy: (id: string, updates: Partial<ProxyConfig>) => void;
  onDeleteProxy: (id: string) => void;
  onBulkDeleteProxies?: (ids: string[]) => void;
  isRtl: boolean;
}

export const ProxiesView: React.FC<ProxiesViewProps> = ({
  proxies,
  onAddProxy,
  onUpdateProxy,
  onDeleteProxy,
  onBulkDeleteProxies,
  isRtl,
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddSingleModalOpen, setIsAddSingleModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [testProgress, setTestProgress] = useState<{ current: number; total: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [protocolFilter, setProtocolFilter] = useState<string>('ALL');
  const [maxPingThreshold, setMaxPingThreshold] = useState<number>(500);
  const [actionBanner, setActionBanner] = useState<{ type: 'SUCCESS' | 'INFO'; message: string } | null>(null);

  // Single proxy form state
  const [singleHost, setSingleHost] = useState('');
  const [singlePort, setSinglePort] = useState(1080);
  const [singleProtocol, setSingleProtocol] = useState<'SOCKS5' | 'HTTP' | 'HTTPS' | 'MTPROXY'>('SOCKS5');
  const [singleUsername, setSingleUsername] = useState('');
  const [singlePassword, setSinglePassword] = useState('');
  const [singleRegion, setSingleRegion] = useState('');

  const uniqueProxies = Array.from(new Map(proxies.map((p) => [p.id, p])).values());

  const deadProxies = uniqueProxies.filter(
    (p) =>
      p.status === 'DOWN' ||
      p.status === 'DEAD' ||
      p.status === 'UNREACHABLE' ||
      p.status === 'ERROR' ||
      (p.failureCount !== undefined && p.failureCount > 0)
  );

  const slowOrDeadProxies = uniqueProxies.filter((p) => {
    const latency = Number(p.latencyMs) || 0;
    const isSlow = latency > maxPingThreshold;
    const isDead = p.status === 'DOWN' || p.status === 'DEAD' || p.status === 'UNREACHABLE' || p.status === 'ERROR';
    return isSlow || isDead;
  });

  const handleTestProxy = async (proxy: ProxyConfig) => {
    setTestingId(proxy.id);
    try {
      const res = await defaultTelegramProvider.testProxy(proxy);
      const isAlive = res.status === 'ALIVE';
      onUpdateProxy(proxy.id, {
        status: isAlive ? 'HEALTHY' : 'DOWN',
        latencyMs: res.latencyMs,
        country: res.country || proxy.country,
        countryCode: res.countryCode || proxy.countryCode,
        city: res.city || proxy.city,
        isp: res.isp || proxy.isp,
        flagEmoji: res.flagEmoji || proxy.flagEmoji,
        checkError: res.checkError,
        lastTested: new Date().toISOString(),
        lastCheck: new Date().toISOString(),
        failureCount: isAlive ? 0 : (proxy.failureCount || 0) + 1,
      });
    } catch (err: any) {
      onUpdateProxy(proxy.id, {
        status: 'DOWN',
        latencyMs: 0,
        checkError: err?.message || 'خطا در برقراری ارتباط با پورت',
        lastTested: new Date().toISOString(),
        lastCheck: new Date().toISOString(),
        failureCount: (proxy.failureCount || 0) + 1,
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleTestAllProxies = async () => {
    if (uniqueProxies.length === 0) return;
    setIsTestingAll(true);
    setTestProgress({ current: 0, total: uniqueProxies.length });

    // Test in chunks of 5
    const chunkSize = 5;
    for (let i = 0; i < uniqueProxies.length; i += chunkSize) {
      const chunk = uniqueProxies.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (proxy) => {
          try {
            const res = await defaultTelegramProvider.testProxy(proxy);
            const isAlive = res.status === 'ALIVE';
            onUpdateProxy(proxy.id, {
              status: isAlive ? 'HEALTHY' : 'DOWN',
              latencyMs: res.latencyMs,
              country: res.country || proxy.country,
              countryCode: res.countryCode || proxy.countryCode,
              city: res.city || proxy.city,
              isp: res.isp || proxy.isp,
              flagEmoji: res.flagEmoji || proxy.flagEmoji,
              checkError: res.checkError,
              lastTested: new Date().toISOString(),
              lastCheck: new Date().toISOString(),
              failureCount: isAlive ? 0 : (proxy.failureCount || 0) + 1,
            });
          } catch {
            onUpdateProxy(proxy.id, {
              status: 'DOWN',
              latencyMs: 0,
              lastTested: new Date().toISOString(),
              lastCheck: new Date().toISOString(),
              failureCount: (proxy.failureCount || 0) + 1,
            });
          }
        })
      );
      setTestProgress({ current: Math.min(i + chunkSize, uniqueProxies.length), total: uniqueProxies.length });
    }

    setIsTestingAll(false);
    setTestProgress(null);
  };

  const handleDeleteDeadProxies = () => {
    if (deadProxies.length === 0) {
      setActionBanner({
        type: 'INFO',
        message: isRtl ? 'هیچ پروکسی غیرفعالی جهت حذف وجود ندارد.' : 'No dead proxies found to delete.',
      });
      setTimeout(() => setActionBanner(null), 4000);
      return;
    }

    const ids = deadProxies.map((p) => p.id);
    if (onBulkDeleteProxies) {
      onBulkDeleteProxies(ids);
    } else {
      ids.forEach((id) => onDeleteProxy(id));
    }

    setActionBanner({
      type: 'SUCCESS',
      message: isRtl
        ? `تعداد ${ids.length} پروکسی غیرفعال و قطع با موفقیت حذف گردیدند.`
        : `Successfully deleted ${ids.length} dead/offline proxies.`,
    });
    setTimeout(() => setActionBanner(null), 5000);
  };

  const handleDeleteSlowOrDeadProxies = () => {
    if (slowOrDeadProxies.length === 0) {
      setActionBanner({
        type: 'INFO',
        message: isRtl
          ? `هیچ پروکسی با پینگ بالای ${maxPingThreshold}ms یا غیرفعال یافت نشد.`
          : `No proxies found with ping > ${maxPingThreshold}ms or offline.`,
      });
      setTimeout(() => setActionBanner(null), 4000);
      return;
    }

    const ids = slowOrDeadProxies.map((p) => p.id);
    if (onBulkDeleteProxies) {
      onBulkDeleteProxies(ids);
    } else {
      ids.forEach((id) => onDeleteProxy(id));
    }

    setActionBanner({
      type: 'SUCCESS',
      message: isRtl
        ? `تعداد ${ids.length} پروکسی کند (پینگ بالای ${maxPingThreshold}ms) یا غیرفعال با موفقیت حذف شدند.`
        : `Successfully deleted ${ids.length} slow/dead proxies.`,
    });
    setTimeout(() => setActionBanner(null), 5000);
  };

  const handleAddSingleProxy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleHost.trim()) return;

    const newProxyId = 'proxy-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const newProxy: ProxyConfig = {
      id: newProxyId,
      protocol: singleProtocol,
      host: singleHost.trim(),
      port: Number(singlePort) || 1080,
      username: singleUsername.trim() || undefined,
      password: singlePassword.trim() || undefined,
      regionLabel: singleRegion.trim() || `${singleHost.trim()}:${singlePort}`,
      country: 'در حال استعلام...',
      flagEmoji: '🌐',
      status: 'HEALTHY',
      latencyMs: 0,
      failureCount: 0,
      assignedAccountCount: 0,
      uptimePercent: 100,
      lastCheck: new Date().toISOString(),
      lastTested: new Date().toISOString(),
    };

    onAddProxy(newProxy);
    setIsAddSingleModalOpen(false);
    setSingleHost('');
    setSinglePort(1080);
    setSingleUsername('');
    setSinglePassword('');
    setSingleRegion('');

    // Trigger immediate real TCP probe & Geo lookup
    handleTestProxy(newProxy);
  };

  const handleBulkImport = () => {
    if (!importText.trim()) return;
    const lines = importText.split('\n').map((l) => l.trim()).filter(Boolean);

    const createdList: ProxyConfig[] = [];

    lines.forEach((line, idx) => {
      let protocol: 'SOCKS5' | 'HTTP' | 'HTTPS' | 'MTPROXY' = 'SOCKS5';
      let host = '127.0.0.1';
      let port = 1080;
      let username: string | undefined;
      let password: string | undefined;

      if (line.includes('://')) {
        const [protoPart, rest] = line.split('://');
        const pUpper = protoPart.toUpperCase();
        if (pUpper === 'HTTP') protocol = 'HTTP';
        else if (pUpper === 'HTTPS') protocol = 'HTTPS';
        else if (pUpper === 'MTPROTO' || pUpper === 'MTPROXY' || pUpper === 'TG') protocol = 'MTPROXY';
        else protocol = 'SOCKS5';

        if (rest.includes('@')) {
          const [auth, hostPort] = rest.split('@');
          const [u, p] = auth.split(':');
          username = u;
          password = p;
          const [h, prt] = hostPort.split(':');
          host = h;
          port = Number(prt) || 1080;
        } else {
          const [h, prt] = rest.split(':');
          host = h;
          port = Number(prt) || 1080;
        }
      } else {
        const parts = line.split(':');
        if (parts.length >= 2) {
          host = parts[0];
          port = Number(parts[1]) || 1080;
          if (parts.length >= 4) {
            username = parts[2];
            password = parts[3];
          }
        }
      }

      const newProxy: ProxyConfig = {
        id: 'proxy-' + (Date.now() + idx) + '-' + Math.floor(Math.random() * 10000),
        protocol,
        host,
        port,
        username,
        password,
        regionLabel: `${host}:${port}`,
        country: 'در حال استعلام...',
        flagEmoji: '🌐',
        status: 'HEALTHY',
        latencyMs: 0,
        failureCount: 0,
        assignedAccountCount: 0,
        uptimePercent: 100,
        lastCheck: new Date().toISOString(),
        lastTested: new Date().toISOString(),
      };

      onAddProxy(newProxy);
      createdList.push(newProxy);
    });

    setIsImportModalOpen(false);
    setImportText('');

    // Trigger test for all newly imported in background
    setTimeout(() => {
      createdList.forEach((p) => handleTestProxy(p));
    }, 200);
  };

  const handleAddPresetProxies = () => {
    const presets: ProxyConfig[] = [
      {
        id: 'proxy-preset-1',
        host: '185.190.140.22',
        port: 1080,
        protocol: 'SOCKS5',
        regionLabel: 'Istanbul TR-01 (High Speed)',
        country: 'Turkey',
        countryCode: 'TR',
        flagEmoji: '🇹🇷',
        city: 'Istanbul',
        status: 'HEALTHY',
        latencyMs: 48,
        failureCount: 0,
        assignedAccountCount: 1,
        uptimePercent: 99.9,
        lastCheck: new Date().toISOString(),
      },
      {
        id: 'proxy-preset-2',
        host: '178.62.201.33',
        port: 443,
        protocol: 'MTPROXY',
        regionLabel: 'Paris FR-01 (MTProto Anti-Filter)',
        country: 'France',
        countryCode: 'FR',
        flagEmoji: '🇫🇷',
        city: 'Paris',
        status: 'HEALTHY',
        latencyMs: 52,
        failureCount: 0,
        assignedAccountCount: 1,
        uptimePercent: 99.8,
        lastCheck: new Date().toISOString(),
      },
      {
        id: 'proxy-preset-3',
        host: '194.225.10.15',
        port: 1080,
        protocol: 'SOCKS5',
        regionLabel: 'Tehran Dedicated IR-02',
        country: 'Iran',
        countryCode: 'IR',
        flagEmoji: '🇮🇷',
        city: 'Tehran',
        status: 'HEALTHY',
        latencyMs: 28,
        failureCount: 0,
        assignedAccountCount: 1,
        uptimePercent: 100,
        lastCheck: new Date().toISOString(),
      },
      {
        id: 'proxy-preset-4',
        host: '142.93.104.88',
        port: 1080,
        protocol: 'SOCKS5',
        regionLabel: 'Frankfurt DE-03 (Low Ping)',
        country: 'Germany',
        countryCode: 'DE',
        flagEmoji: '🇩🇪',
        city: 'Frankfurt',
        status: 'HEALTHY',
        latencyMs: 64,
        failureCount: 0,
        assignedAccountCount: 0,
        uptimePercent: 99.7,
        lastCheck: new Date().toISOString(),
      },
    ];

    presets.forEach((p) => {
      if (!proxies.some((existing) => existing.host === p.host && existing.port === p.port)) {
        onAddProxy(p);
      }
    });
  };

  const filteredProxies = uniqueProxies.filter((p) => {
    const matchesSearch =
      p.host.includes(searchTerm) ||
      p.port.toString().includes(searchTerm) ||
      (p.regionLabel && p.regionLabel.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.country && p.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.city && p.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.isp && p.isp.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'HEALTHY'
        ? p.status === 'HEALTHY' || p.status === 'ALIVE'
        : p.status === statusFilter || (statusFilter === 'DOWN' && p.status === 'DEAD');

    const matchesProtocol = protocolFilter === 'ALL' || p.protocol === protocolFilter;

    return matchesSearch && matchesStatus && matchesProtocol;
  });

  return (
    <div id="proxies-view" className="space-y-6">
      {actionBanner && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in ${
            actionBanner.type === 'SUCCESS'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-slate-900 border-slate-700 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{actionBanner.message}</span>
          </div>
          <button onClick={() => setActionBanner(null)} className="text-slate-400 hover:text-white p-1">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-cyan-400" />
            <span>{isRtl ? 'مدیریت و پایش شبکه پروکسی (Proxy Fleet)' : 'Proxy Fleet & Geo Manager'}</span>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-mono text-cyan-300">
              {uniqueProxies.length} {isRtl ? 'پروکسی ثبت‌شده' : 'Proxies'}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRtl
              ? 'بررسی بلادرنگ پورت، تست سوکت TCP، استعلام هوشمند کشور و اپراتور IP (GeoIP) و حذف خودکار پروکسی‌های غیرفعال'
              : 'Real-time TCP socket probes, automatic GeoIP/ISP discovery, and bulk dead proxy elimination.'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Delete Dead Proxies Button */}
          <button
            id="delete-dead-proxies-btn"
            onClick={handleDeleteDeadProxies}
            disabled={deadProxies.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 px-3.5 py-2.5 text-xs font-semibold text-rose-300 border border-rose-500/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title={isRtl ? 'حذف تمام پروکسی‌هایی که اتصال آن‌ها قطع یا ناموفق است' : 'Delete all dead proxies'}
          >
            <Trash2 className="h-3.5 w-3.5 text-rose-400" />
            <span>{isRtl ? `حذف پروکسی‌های از کار افتاده (${deadProxies.length})` : `Delete Dead (${deadProxies.length})`}</span>
          </button>

          {/* Test All Button */}
          <button
            id="probe-all-proxies-btn"
            onClick={handleTestAllProxies}
            disabled={isTestingAll || uniqueProxies.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2.5 text-xs font-semibold text-slate-200 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-cyan-400 ${isTestingAll ? 'animate-spin' : ''}`} />
            <span>
              {isTestingAll
                ? isRtl
                  ? `در حال پایش (${testProgress?.current}/${testProgress?.total})...`
                  : `Probing (${testProgress?.current}/${testProgress?.total})...`
                : isRtl
                ? 'پایش و مکان‌یابی همه'
                : 'Probe & Geo All'}
            </span>
          </button>

          <button
            onClick={handleAddPresetProxies}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2.5 text-xs font-semibold text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>{isRtl ? 'پروکسی‌های پیشنهادی تلگرام' : 'Add Preset Nodes'}</span>
          </button>

          <button
            id="add-single-proxy-btn"
            onClick={() => setIsAddSingleModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2.5 text-xs font-semibold text-white border border-slate-700 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4 text-cyan-400" />
            <span>{isRtl ? 'افزودن دستی' : 'Add Single'}</span>
          </button>

          <button
            id="import-proxies-btn"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-600/30 transition-all cursor-pointer"
          >
            <Layers className="h-4 w-4" />
            <span>{isRtl ? 'واردسازی دسته‌ای' : 'Bulk Import'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-2xl bg-slate-900/80 p-3 border border-slate-800">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            id="proxies-search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={isRtl ? 'جستجو با IP، پورت، کشور، شهر یا اپراتور...' : 'Search IP, port, country, city, ISP...'}
            className="w-full rounded-xl bg-slate-950/70 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 border border-slate-800 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Ping Threshold Filter & Cleanup */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-950/80 px-2.5 py-1.5 border border-slate-800 text-xs">
            <Filter className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-slate-400 text-[11px] whitespace-nowrap">
              {isRtl ? 'حداکثر پینگ:' : 'Max Ping:'}
            </span>
            <input
              id="ping-threshold-input"
              type="number"
              min={50}
              max={5000}
              step={50}
              value={maxPingThreshold}
              onChange={(e) => setMaxPingThreshold(Math.max(10, Number(e.target.value) || 500))}
              className="w-16 rounded-lg bg-slate-900 py-1 px-2 text-xs font-mono font-bold text-amber-300 border border-slate-700 text-center focus:border-amber-400 focus:outline-none"
            />
            <span className="text-slate-500 text-[10px]">ms</span>
            <button
              id="delete-slow-proxies-btn"
              onClick={handleDeleteSlowOrDeadProxies}
              className="flex items-center gap-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 px-2 py-1 text-[11px] font-semibold text-amber-300 border border-amber-500/30 transition-all cursor-pointer ml-1"
              title={isRtl ? `حذف پروکسی‌های با پینگ بالای ${maxPingThreshold}ms و کند/قطع` : `Delete proxies with ping > ${maxPingThreshold}ms`}
            >
              <Trash2 className="h-3 w-3 text-amber-400" />
              <span>{isRtl ? 'حذف کندها' : 'Delete Slow'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-slate-950/60 p-1 border border-slate-800 text-[11px]">
            {['ALL', 'HEALTHY', 'DOWN'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-2.5 py-1 font-mono transition-all ${
                  statusFilter === status
                    ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status === 'ALL' ? (isRtl ? 'همه' : 'ALL') : status === 'HEALTHY' ? (isRtl ? 'سالم / متصل' : 'ALIVE') : (isRtl ? 'قطع / خراب' : 'DEAD')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-slate-950/60 p-1 border border-slate-800 text-[11px]">
            {['ALL', 'SOCKS5', 'MTPROXY', 'HTTP', 'HTTPS'].map((proto) => (
              <button
                key={proto}
                onClick={() => setProtocolFilter(proto)}
                className={`rounded-lg px-2 py-1 font-mono transition-all ${
                  protocolFilter === proto
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {proto}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Proxies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProxies.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Globe className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-200">
                {isRtl ? 'هیچ پروکسی با این فیلتر یافت نشد' : 'No Proxies Found'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {isRtl
                  ? 'می‌توانید پروکسی جدید اضافه کنید یا از پروکسی‌های پیشنهادی سریع استفاده نمایید.'
                  : 'Add your SOCKS5, HTTP, or MTProxy nodes to enable safe routing.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleAddPresetProxies}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-600/30 transition-all cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>{isRtl ? 'افزودن پروکسی‌های پیشنهادی پرسرعت' : 'Add Preset Proxies'}</span>
              </button>
            </div>
          </div>
        )}

        {filteredProxies.map((proxy) => {
          const isAlive = proxy.status === 'HEALTHY' || proxy.status === 'ALIVE';
          const isTesting = testingId === proxy.id;

          return (
            <div
              key={proxy.id}
              id={`proxy-card-${proxy.id}`}
              className={`rounded-2xl border bg-slate-900/90 p-5 shadow-xl space-y-4 transition-all ${
                isAlive ? 'border-slate-800 hover:border-cyan-500/40' : 'border-rose-900/40 bg-rose-950/10'
              }`}
            >
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold border ${
                        proxy.protocol === 'MTPROXY'
                          ? 'bg-indigo-950 text-indigo-300 border-indigo-500/40'
                          : proxy.protocol === 'SOCKS5'
                          ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {proxy.protocol}
                    </span>
                    <span className="font-mono text-sm font-semibold text-white">
                      {proxy.host}:{proxy.port}
                    </span>
                  </div>

                  {/* Real GeoIP Display */}
                  <div className="text-[11px] text-slate-300 mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-base leading-none">{proxy.flagEmoji || '🌐'}</span>
                    <span className="font-medium text-slate-200">
                      {proxy.country || 'نامشخص'}
                    </span>
                    {proxy.city && (
                      <span className="text-slate-400">({proxy.city})</span>
                    )}
                    {proxy.isp && (
                      <span className="rounded bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-400 max-w-[140px] truncate" title={proxy.isp}>
                        {proxy.isp}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold border flex items-center gap-1 ${
                      isAlive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {isAlive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                    <span>{isAlive ? (isRtl ? 'فعال' : 'ONLINE') : (isRtl ? 'قطع' : 'DEAD')}</span>
                  </span>
                </div>
              </div>

              {/* Error label if dead */}
              {proxy.checkError && !isAlive && (
                <div className="rounded-xl bg-rose-950/30 border border-rose-500/20 p-2 text-[11px] text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                  <span className="truncate">{proxy.checkError}</span>
                </div>
              )}

              {/* Latency & stats */}
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-950/70 p-3 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">{isRtl ? 'پینگ TCP' : 'Latency'}</span>
                  <span
                    className={`font-mono font-bold ${
                      !isAlive
                        ? 'text-rose-400'
                        : (proxy.latencyMs || 0) < 100
                        ? 'text-emerald-400'
                        : (proxy.latencyMs || 0) < 300
                        ? 'text-cyan-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {isAlive && proxy.latencyMs ? `${proxy.latencyMs} ms` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">{isRtl ? 'اکانت‌ها' : 'Assigned'}</span>
                  <span className="font-mono font-bold text-slate-200">
                    {proxy.assignedAccountCount ?? 0} {isRtl ? 'حساب' : 'accs'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">{isRtl ? 'خطای اتصال' : 'Failures'}</span>
                  <span className="font-mono font-bold text-slate-400">{proxy.failureCount ?? proxy.failCount ?? 0}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  disabled={isTesting}
                  onClick={() => handleTestProxy(proxy)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <Activity className={`h-3 w-3 ${isTesting ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
                  <span>{isTesting ? (isRtl ? 'تست و مکان‌یابی...' : 'Testing...') : (isRtl ? 'تست اتصال و GeoIP' : 'Probe & Geo')}</span>
                </button>

                <button
                  onClick={() => onDeleteProxy(proxy.id)}
                  className="flex items-center gap-1 rounded-xl bg-rose-950/20 hover:bg-rose-950/40 px-2.5 py-1.5 text-xs text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>{isRtl ? 'حذف' : 'Delete'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Single Proxy Modal */}
      {isAddSingleModalOpen && (
        <div
          id="add-single-proxy-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-cyan-400" />
                <span>{isRtl ? 'افزودن پروکسی جدید' : 'Add Proxy Node'}</span>
              </h3>
              <button
                onClick={() => setIsAddSingleModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSingleProxy} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isRtl ? 'پروتکل:' : 'Protocol:'}
                </label>
                <select
                  value={singleProtocol}
                  onChange={(e) => setSingleProtocol(e.target.value as any)}
                  className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-cyan-500 focus:outline-none"
                >
                  <option value="SOCKS5">SOCKS5</option>
                  <option value="MTPROXY">MTProto (Telegram)</option>
                  <option value="HTTP">HTTP</option>
                  <option value="HTTPS">HTTPS</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isRtl ? 'آدرس هاست / IP:' : 'Host / IP:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={singleHost}
                    onChange={(e) => setSingleHost(e.target.value)}
                    placeholder="45.142.195.12"
                    className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isRtl ? 'پورت:' : 'Port:'}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="65535"
                    value={singlePort}
                    onChange={(e) => setSinglePort(Number(e.target.value))}
                    className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isRtl ? 'برچسب یا نام مستعار (اختیاری):' : 'Region Label / Tag:'}
                </label>
                <input
                  type="text"
                  value={singleRegion}
                  onChange={(e) => setSingleRegion(e.target.value)}
                  placeholder="e.g. Frankfurt Dedicated Server"
                  className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isRtl ? 'نام کاربری (اختیاری):' : 'Username (Optional):'}
                  </label>
                  <input
                    type="text"
                    value={singleUsername}
                    onChange={(e) => setSingleUsername(e.target.value)}
                    placeholder="user"
                    className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {isRtl ? 'رمز عبور / سکرت (اختیاری):' : 'Password / Secret (Optional):'}
                  </label>
                  <input
                    type="password"
                    value={singlePassword}
                    onChange={(e) => setSinglePassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-slate-950 px-3 py-2 text-xs text-white border border-slate-800 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddSingleModalOpen(false)}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-slate-300"
                >
                  {isRtl ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-600/30"
                >
                  {isRtl ? 'افزودن و بررسی آنی' : 'Add & Probe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {isImportModalOpen && (
        <div
          id="bulk-import-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md animate-in fade-in"
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {isRtl ? 'واردسازی دسته‌ای پروکسی‌ها (Bulk Import)' : 'Bulk Import Proxies'}
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                {isRtl ? 'لیست پروکسی‌ها (هر خط یک پروکسی):' : 'Proxy list (one per line):'}
              </label>
              <textarea
                rows={6}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={
                  'socks5://user:pass@127.0.0.1:1080\nhttp://45.142.195.12:8080\n91.240.88.19:1080:user:pass\nmtproto://178.62.201.33:443'
                }
                className="w-full rounded-xl bg-slate-950 p-3 text-xs text-white border border-slate-800 font-mono focus:border-cyan-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-400 block">
                {isRtl
                  ? 'فرمت‌های پشتیبانی‌شده: socks5://user:pass@host:port یا host:port:user:pass یا host:port'
                  : 'Supported formats: socks5://user:pass@host:port or host:port:user:pass or host:port'}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-slate-300"
              >
                {isRtl ? 'انصراف' : 'Cancel'}
              </button>
              <button
                onClick={handleBulkImport}
                className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-600/30"
              >
                {isRtl ? 'واردسازی و بررسی آنی' : 'Import & Probe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

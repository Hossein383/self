import React, { useState, useEffect } from 'react';
import { centralStore } from './services/store';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { CommandPalette } from './components/CommandPalette';
import { DashboardView } from './components/dashboard/DashboardView';
import { AccountsView } from './components/accounts/AccountsView';
import { TargetsView } from './components/targets/TargetsView';
import { CampaignsView } from './components/campaigns/CampaignsView';
import { SchedulesView } from './components/schedules/SchedulesView';
import { ProxiesView } from './components/proxies/ProxiesView';
import { LogsView } from './components/logs/LogsView';
import { SettingsView } from './components/settings/SettingsView';
import { FailoverView } from './components/failover/FailoverView';
import { MonitoringView } from './components/monitoring/MonitoringView';
import { WorkerPoolView } from './components/workers/WorkerPoolView';
import { CapacitySimulatorView } from './components/capacity/CapacitySimulatorView';
import { BackupView } from './components/backups/BackupView';
import { LoginView } from './components/auth/LoginView';
import { AlertOctagon } from 'lucide-react';

export default function App() {
  const [storeState, setStoreState] = useState(() => centralStore.getState());
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isRtl, setIsRtl] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Authentication State with localStorage persistence
  const [userSession, setUserSession] = useState<{ username: string; role: 'SUPER_ADMIN' | 'OPERATOR' } | null>(() => {
    try {
      const savedToken = localStorage.getItem('tg_sec_token');
      const savedUser = localStorage.getItem('tg_sec_user');
      if (savedToken && savedUser) {
        return JSON.parse(savedUser);
      }
    } catch {
      // JSON parse fallback
    }
    return null;
  });

  const handleLoginSuccess = (token: string, user: { username: string; role: 'SUPER_ADMIN' | 'OPERATOR' }) => {
    localStorage.setItem('tg_sec_token', token);
    localStorage.setItem('tg_sec_user', JSON.stringify(user));
    setUserSession(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('tg_sec_token');
    localStorage.removeItem('tg_sec_user');
    setUserSession(null);
  };

  // Subscribe to CentralStore updates
  useEffect(() => {
    const unsubscribe = centralStore.subscribe(() => {
      setStoreState(centralStore.getState());
    });
    return unsubscribe;
  }, []);

  // Update HTML document dir & lang attribute when isRtl changes
  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = isRtl ? 'fa' : 'en';
  }, [isRtl]);

  const {
    accounts,
    proxies,
    targets,
    campaigns,
    jobs,
    auditLogs,
    systemSettings,
    errorDrilldownFilter,
    backups,
    deliveryLogs,
  } = storeState;

  // Actions
  const handleToggleEmergencyHalt = () => {
    centralStore.toggleEmergencyHalt();
  };

  const handleToggleLanguage = () => {
    setIsRtl(!isRtl);
  };

  const handleOpenCommandPalette = () => {
    setIsCommandPaletteOpen(true);
  };

  // If user is not authenticated, display the login screen
  if (!userSession) {
    return <LoginView onLoginSuccess={handleLoginSuccess} isRtl={isRtl} />;
  }

  return (
    <div
      id="app-root"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200"
    >
      {/* Top Emergency Halt Alert if Triggered */}
      {systemSettings.emergencyHalt && (
        <div
          id="global-emergency-banner"
          className="bg-rose-600 px-4 py-2.5 text-center text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg z-50 sticky top-0"
        >
          <AlertOctagon className="h-4 w-4 animate-spin" />
          <span>
            {isRtl
              ? 'هشدار: توقف اضطراری سراسری (Emergency Halt) فعال است. کلیه جاب‌های ارسالی متوقف شده‌اند.'
              : 'CRITICAL ALERT: Global Emergency Halt is ACTIVE. Outbound MTProto dispatches are locked.'}
          </span>
          <button
            onClick={handleToggleEmergencyHalt}
            className="rounded bg-rose-950/80 px-2 py-0.5 text-[11px] underline hover:bg-rose-950 cursor-pointer"
          >
            {isRtl ? 'غیرفعال‌سازی' : 'Deactivate'}
          </button>
        </div>
      )}

      {/* Main Layout Shell */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setIsMobileSidebarOpen(false);
          }}
          isRtl={isRtl}
          emergencyHaltActive={systemSettings.emergencyHalt}
          activeAccountsCount={accounts.filter((a) => a.status === 'CONNECTED' || a.status === 'AUTHENTICATED' || a.status === 'ACTIVE').length}
          totalTargetsCount={targets.length}
          totalProxiesCount={proxies.length}
        />

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <Header
            currentTab={currentTab}
            isRtl={isRtl}
            onToggleLanguage={handleToggleLanguage}
            onOpenCommandPalette={handleOpenCommandPalette}
            emergencyHaltActive={systemSettings.emergencyHalt}
            onToggleEmergencyHalt={handleToggleEmergencyHalt}
            activeAccountsCount={accounts.filter((a) => a.status === 'CONNECTED' || a.status === 'AUTHENTICATED' || a.status === 'ACTIVE').length}
            totalAccountsCount={accounts.length}
            aliveProxiesCount={proxies.filter((p) => p.status === 'HEALTHY').length}
            totalProxiesCount={proxies.length}
            healthyTargetsCount={targets.filter((t) => t.status === 'HEALTHY').length}
            totalTargetsCount={targets.length}
            userSession={userSession}
            onLogout={handleLogout}
          />

          {/* Main Workspace Body */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {currentTab === 'dashboard' && (
              <DashboardView
                accounts={accounts}
                proxies={proxies}
                targets={targets}
                campaigns={campaigns}
                jobs={jobs}
                logs={auditLogs}
                errorFilter={errorDrilldownFilter}
                onClearErrorFilter={() => centralStore.setErrorDrilldownFilter(null)}
                onErrorDrilldown={(category) => centralStore.setErrorDrilldownFilter(category)}
                onNavigateToTab={(tab) => setCurrentTab(tab as NavTab)}
                isRtl={isRtl}
              />
            )}

            {currentTab === 'accounts' && (
              <AccountsView
                accounts={accounts}
                proxies={proxies}
                onAddAccount={(acc) => centralStore.addAccount(acc)}
                onUpdateAccount={(id, updates) => centralStore.updateAccount(id, updates)}
                onDeleteAccount={(id) => centralStore.deleteAccount(id)}
                isRtl={isRtl}
              />
            )}

            {currentTab === 'targets' && (
              <TargetsView
                targets={targets}
                accounts={accounts}
                onAddTarget={(tgt) => centralStore.addTarget(tgt)}
                onUpdateTarget={(id, updates) => centralStore.updateTarget(id, updates)}
                onBulkUpdateTargets={(ids, updates) => centralStore.bulkUpdateTargets(ids, updates)}
                onDeleteTarget={(id) => centralStore.deleteTarget(id)}
                isRtl={isRtl}
              />
            )}

            {currentTab === 'campaigns' && (
              <CampaignsView
                campaigns={campaigns}
                targets={targets}
                accounts={accounts}
                deliveryLogs={deliveryLogs}
                onAddCampaign={(camp) => centralStore.addCampaign(camp)}
                onUpdateCampaign={(id, updates) => centralStore.updateCampaign(id, updates)}
                onDeleteCampaign={(id) => centralStore.deleteCampaign(id)}
                onExecuteCampaignNow={(id) => centralStore.executeCampaignNow(id)}
                isRtl={isRtl}
              />
            )}

            {currentTab === 'schedules' && (
              <SchedulesView
                jobs={jobs}
                targets={targets}
                accounts={accounts}
                onRetryJob={(id) => centralStore.retryJob(id)}
                isRtl={isRtl}
              />
            )}

            {currentTab === 'proxies' && (
              <ProxiesView
                proxies={proxies}
                onAddProxy={(proxy) => centralStore.addProxy(proxy)}
                onUpdateProxy={(id, updates) => centralStore.updateProxy(id, updates)}
                onDeleteProxy={(id) => centralStore.deleteProxy(id)}
                onBulkDeleteProxies={(ids) => centralStore.bulkDeleteProxies(ids)}
                isRtl={isRtl}
              />
            )}

            {currentTab === 'failover' && (
              <FailoverView
                settings={systemSettings}
                accounts={accounts}
                proxies={proxies}
                onUpdateSettings={(newSettings) => centralStore.updateSettings(newSettings)}
                isRtl={isRtl}
              />
            )}

            {currentTab === 'monitoring' && (
              <MonitoringView
                health={centralStore.getHealth()}
                accounts={accounts}
                proxies={proxies}
                jobs={jobs}
                isRtl={isRtl}
              />
            )}

            {currentTab === 'workers' && (
              <WorkerPoolView
                jobs={jobs}
                isRtl={isRtl}
              />
            )}

            {currentTab === 'capacity' && (
              <CapacitySimulatorView
                accounts={accounts}
                targets={targets}
                campaigns={campaigns}
                isRtl={isRtl}
              />
            )}

            {currentTab === 'logs' && (
              <LogsView logs={auditLogs} isRtl={isRtl} />
            )}

            {currentTab === 'backups' && (
              <BackupView
                backups={backups || centralStore.getBackups()}
                onCreateBackup={(name) => centralStore.createBackup(name)}
                onRestoreBackup={(id) => centralStore.restoreBackup(id)}
                onDeleteBackup={(id) => centralStore.deleteBackup(id)}
                onExportBackup={(id) => centralStore.exportBackupJson(id)}
                onImportBackup={(jsonStr) => centralStore.importBackupJson(jsonStr)}
                isRtl={isRtl}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView
                settings={systemSettings}
                onUpdateSettings={(newSettings) => centralStore.updateSettings(newSettings)}
                isRtl={isRtl}
              />
            )}
          </main>
        </div>
      </div>

      {/* Global Command Palette (Cmd+K / Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(tab) => setCurrentTab(tab as NavTab)}
        onToggleEmergencyHalt={handleToggleEmergencyHalt}
        emergencyHaltActive={systemSettings.emergencyHalt}
        isRtl={isRtl}
      />
    </div>
  );
}

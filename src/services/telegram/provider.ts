/**
 * Telegram Provider Interface
 * Real MTProto Client & Bridge Interface
 */

export interface TelegramDialogInfo {
  id: string;
  title: string;
  username?: string;
  type: 'GROUP' | 'SUPERGROUP' | 'CHANNEL' | 'USER' | 'BOT';
  canSend: boolean;
  canPost: boolean;
  canInvite: boolean;
  memberCount?: number;
}

export interface TelegramAccountProfile {
  userId: string;
  phone: string;
  username?: string;
  displayName: string;
  dcId: number;
  isPremium: boolean;
  has2FA: boolean;
  phoneRegion: string;
}

export interface PublishResult {
  messageId: string;
  timestamp: string;
  durationMs: number;
}

export interface VerificationCodeResult {
  phone: string;
  attemptId: string;
  deliveryType: 'APP' | 'SMS' | 'CALL' | 'EMAIL';
  timeout: number;
  message: string;
}

export interface ProxyTestResult {
  status: 'ALIVE' | 'DEAD' | 'DEGRADED';
  latencyMs: number;
  ipInfo?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  isp?: string;
  flagEmoji?: string;
  checkError?: string;
}

export interface TelegramProvider {
  requestVerificationCode(phone: string, apiId?: string, apiHash?: string, proxy?: any): Promise<VerificationCodeResult>;
  resendVerificationCode?(attemptId: string): Promise<{ timeout: number; message: string }>;
  connect(accountId: string, proxyUrl?: string): Promise<boolean>;
  authenticate(
    phone: string,
    otpCode: string,
    attemptId?: string,
    password2FA?: string,
    proxy?: any
  ): Promise<{ sessionHash: string; profile: TelegramAccountProfile; requires2FA?: boolean }>;
  verify2FA(attemptId: string, password: string, proxy?: any): Promise<{ sessionHash: string; profile: TelegramAccountProfile }>;
  importSession(sessionData: string | ArrayBuffer, apiId?: string, apiHash?: string, proxy?: any): Promise<{ sessionHash: string; profile: TelegramAccountProfile }>;
  disconnect(accountId: string): Promise<void>;
  getAccountInfo(accountId: string, sessionString?: string): Promise<TelegramAccountProfile>;
  getDialogs(accountId: string, sessionString?: string, proxy?: any): Promise<TelegramDialogInfo[]>;
  resolveEntity(query: string, sessionString?: string, proxy?: any): Promise<TelegramDialogInfo>;
  joinAuthorizedTarget(accountId: string, targetIdentifier: string): Promise<boolean>;
  publishMessage(
    accountId: string,
    targetId: string,
    message: string,
    options?: { mediaUrls?: string[]; parseMode?: 'TEXT' | 'MARKDOWN' | 'HTML'; sessionString?: string; proxy?: any }
  ): Promise<PublishResult>;
  healthCheck(accountId: string): Promise<{
    connection: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    latencyMs: number;
    restrictionsDetected: boolean;
    restrictionReason?: string;
  }>;
  testProxy(proxy: { protocol?: string; host: string; port: number }): Promise<ProxyTestResult>;
  lookupIpGeo?(host: string): Promise<Partial<ProxyTestResult>>;
  batchTestProxies?(proxies: { id: string; protocol?: string; host: string; port: number }[]): Promise<Record<string, ProxyTestResult>>;
}

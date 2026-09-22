export type AccountStatus =
  | 'NEW'
  | 'ACTIVE'
  | 'AUTHENTICATING'
  | 'AUTHENTICATED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'RECONNECTING'
  | 'RESTRICTED'
  | 'DISCONNECTED'
  | 'SESSION_EXPIRED'
  | 'INVALID_SESSION'
  | 'DISABLED'
  | 'ERROR'
  | 'ARCHIVED';

export type RestrictionStatus =
  | 'NONE_DETECTED'
  | 'SIGNAL_DETECTED'
  | 'MESSAGING_RESTRICTED'
  | 'FLOOD_WAIT'
  | 'FROZEN'
  | 'TARGET_ACCESS_DENIED'
  | 'UNKNOWN';

export interface TelegramAccount {
  id: string;
  phone: string;
  username?: string;
  displayName: string;
  avatarUrl?: string;
  telegramUserId: string;
  dcId: number;
  phoneRegion: string;
  accountType: 'USER' | 'BOT';
  isPremium: boolean;
  has2FA: boolean;
  status: AccountStatus;
  restrictionStatus: RestrictionStatus;
  restrictionSource?: string;
  proxyId?: string;
  lastSeen: string;
  lastSuccessfulOp?: string;
  lastError?: string;
  encryptedSessionHash: string; // Redacted AES-256 reference
  healthScore: {
    connection: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    auth: 'VALID' | 'EXPIRED' | 'REVOKED';
    session: 'HEALTHY' | 'CORRUPTED';
    proxy: 'HEALTHY' | 'DEGRADED' | 'DOWN';
    restrictions: 'NONE' | 'ACTIVE';
  };
  stats: {
    messagesProcessed: number;
    successfulJobs: number;
    failedJobs: number;
    uptimePercent: number;
    avgLatencyMs: number;
  };
  dialogCount: {
    total: number;
    groups: number;
    channels: number;
    privateChats: number;
    bots: number;
  };
  deviceInfo?: {
    deviceModel: string;
    platform: string;
    systemVersion: string;
    appVersion: string;
    langCode?: string;
    officialApp?: boolean;
  };
  alias?: string;
  description?: string;
  tags?: string[];
  enabled?: boolean;
}

export interface ProxyItem {
  id: string;
  host: string;
  port: number;
  protocol: 'HTTP' | 'HTTPS' | 'SOCKS5' | 'MTPROXY';
  username?: string;
  password?: string;
  secret?: string;
  regionLabel: string;
  country?: string;
  countryCode?: string;
  city?: string;
  isp?: string;
  flagEmoji?: string;
  publicIp?: string;
  status: 'HEALTHY' | 'SLOW' | 'DEGRADED' | 'DOWN' | 'UNUSED' | 'ALIVE' | 'DEAD' | 'UNREACHABLE' | 'ERROR';
  latencyMs: number;
  pingMs?: number;
  icmpAvailable?: boolean;
  lastCheck: string;
  failureCount: number;
  assignedAccountCount: number;
  lastTested?: string;
  failCount?: number;
  uptimePercent?: number;
  checkError?: string;
}

export interface CanonicalTelegramIdentity {
  telegramId: string; // Real Telegram numerical ID, e.g. -1001429841029
  accessHash?: string;
  type: 'GROUP' | 'SUPERGROUP' | 'CHANNEL';
  title: string;
  username?: string;
  memberCount?: number;
  resolvedViaAccountId?: string;
  resolvedAt: string;
}

export interface TargetAccountAssignment {
  targetId: string;
  primaryAccountId: string;
  failoverAccountIds: string[];
}

export interface PublishingTarget {
  id: string;
  telegramId: string;
  title: string;
  username?: string;
  canonicalIdentity?: CanonicalTelegramIdentity;
  type: 'GROUP' | 'SUPERGROUP' | 'CHANNEL';
  membershipState: 'JOINED' | 'NOT_JOINED' | 'PENDING' | 'INVITE_REQUIRED' | 'DENIED' | 'RESTRICTED';
  adminState: 'ADMIN' | 'MEMBER' | 'OWNER';
  permissions: {
    canSend: boolean;
    canPost: boolean;
    canInvite: boolean;
  };
  assignedAccountId: string;
  failoverAccountIds: string[];
  scheduleIntervalMinutes?: number; // Message publication interval (minutes)
  syncIntervalMinutes?: number;     // Target metadata sync interval (minutes)
  scheduleEnabled: boolean;
  lastSync: string;
  nextSync?: string;
  status: 'HEALTHY' | 'BLOCKED' | 'RESTRICTED' | 'DEGRADED' | 'UNKNOWN';
  nextRun?: string;
  isArchived?: boolean;
  memberCount?: number;
  memberCountLastUpdated?: string;
  panelAlias?: string;
  description?: string;
  autoJoinPolicy?: 'AUTO' | 'MANUAL' | 'INVITE_ONLY';
}

export interface Campaign {
  id: string;
  name: string;
  status: 'DRAFT' | 'VALIDATING' | 'READY' | 'ACTIVE' | 'PAUSED' | 'DEGRADED' | 'BLOCKED' | 'COMPLETED' | 'ARCHIVED';
  messageContent: string;
  parseMode: 'TEXT' | 'MARKDOWN' | 'HTML';
  mediaUrls: string[];
  buttonLinks?: { label: string; url: string }[];
  targetIds: string[];
  accountIds: string[];
  targetAssignments?: TargetAccountAssignment[];
  scheduleType: 'INTERVAL' | 'DAILY' | 'WEEKLY' | 'SPECIFIC_DATES';
  intervalMinutes: number;
  timezone: string;
  startTime: string;
  pauseWindow?: { start: string; end: string };
  retryPolicy: {
    maxAttempts: number;
    backoffSeconds: number[];
  };
  createdAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
}

export type JobStatus =
  | 'CREATED'
  | 'SCHEDULED'
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED_RETRYABLE'
  | 'RETRYING'
  | 'FAILED_FINAL'
  | 'BLOCKED'
  | 'CANCELLED';

export interface JobAttempt {
  attemptNumber: number;
  timestamp: string;
  accountId: string;
  accountPhone: string;
  proxyId?: string;
  status: 'SUCCESS' | 'FAILED';
  durationMs: number;
  error?: string;
  errorCode?: string;
  isRetryable: boolean;
}

export interface PublishingJob {
  id: string;
  campaignId: string;
  campaignName: string;
  targetId: string;
  targetTitle: string;
  accountId: string;
  accountPhone: string;
  proxyId?: string;
  scheduledAt: string;
  executedAt?: string;
  status: JobStatus;
  executionKey: string;
  attempts: JobAttempt[];
  finalResult?: string;
}

export interface DeliveryLog {
  id: string;
  timestamp: string;
  campaignName: string;
  targetTitle: string;
  accountPhone: string;
  proxyLabel: string;
  messagePreview: string;
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  durationMs: number;
  errorDetails?: string;
  errorMessage?: string;
}

export interface ErrorLog {
  id: string;
  timestamp: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category:
    | 'AUTHENTICATION'
    | 'TELEGRAM_API'
    | 'NETWORK'
    | 'PROXY'
    | 'DATABASE'
    | 'QUEUE'
    | 'SCHEDULER'
    | 'PERMISSION'
    | 'TARGET'
    | 'SECURITY';
  accountId?: string;
  accountPhone?: string;
  targetId?: string;
  targetTitle?: string;
  jobId?: string;
  errorCode: string;
  message: string;
  stackTrace?: string;
  retryCount: number;
  resolutionText: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeState?: string;
  afterState?: string;
  ipAddress: string;
  userAgent: string;
  level?: 'INFO' | 'WARN' | 'ERROR';
  details?: string;
  entityId?: string;
  entityType?: string;
}

export interface WorkerNode {
  id: string;
  hostname: string;
  pid: number;
  cpuUsagePercent: number;
  memoryUsageMb: number;
  jobsProcessed: number;
  jobsFailed: number;
  currentJobId?: string;
  lastHeartbeat: string;
  status: 'ONLINE' | 'BUSY' | 'IDLE' | 'DEGRADED' | 'OFFLINE';
}

export interface SystemHealth {
  api: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  database: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  redis: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  scheduler: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  workerPool: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  telegramConnectivity: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  proxyPool: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  uptimePercent: number;
  queueDepth: number;
  jobsPerMinute: number;
  avgExecutionDurationMs: number;
  lastBackup: string;
  backupSizeMb: number;
}

export interface SystemSettings {
  emergencyHalt: boolean;
  minIntervalMinutes: number;
  maxMessagesPerMinutePerAccount: number;
  retryAttempts: number;
  workerConcurrency: number;
  telegramApiId: string;
  telegramApiHash: string;
  circuitBreakerCooldownMinutes?: number;
}

export interface Plan {
  id: string;
  name: string;
  internalName: string;
  description: string;
  price: number;
  currency: 'IRT' | 'TOMAN' | 'USD' | 'EUR';
  durationDays: number;
  trafficGb: number;
  trafficPolicy: 'UNLIMITED' | 'CAPPED' | 'THROTTLED';
  features: string[];
  status: 'ACTIVE' | 'ARCHIVED' | 'DISABLED';
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type ProxyConfig = ProxyItem;

export interface BackupRecord {
  id: string;
  name: string;
  type: 'MANUAL' | 'AUTOMATIC' | 'SAFETY_PRE_RESTORE';
  createdAt: string;
  sizeBytes: number;
  sizeFormatted: string;
  status: 'VERIFIED' | 'COMPLETED' | 'CORRUPTED';
  checksumSha256: string;
  encrypted: boolean;
  version: string;
  dataPayload?: string;
}

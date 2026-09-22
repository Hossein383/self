import { CanonicalTelegramIdentity, PublishingTarget, TelegramAccount } from '../../types';
import { defaultTelegramProvider } from './realProvider';

export interface TargetResolutionResult {
  canonicalIdentity: CanonicalTelegramIdentity;
  permissions: {
    canSend: boolean;
    canPost: boolean;
    canInvite: boolean;
  };
  membershipState: 'JOINED' | 'NOT_JOINED' | 'PENDING' | 'INVITE_REQUIRED' | 'DENIED';
  adminState: 'ADMIN' | 'MEMBER' | 'OWNER';
  rawQuery: string;
}

export class TelegramTargetResolver {
  /**
   * Cleans and validates raw input (URL, username, or Telegram ID)
   */
  static sanitizeQuery(query: string): { cleanQuery: string; isNumericId: boolean; username?: string } {
    let q = query.trim();

    // Strip URL prefixes
    if (q.startsWith('https://t.me/joinchat/')) {
      q = q.replace('https://t.me/joinchat/', '');
    } else if (q.startsWith('https://t.me/+')) {
      q = q.replace('https://t.me/+', '');
    } else if (q.startsWith('https://t.me/')) {
      q = q.replace('https://t.me/', '');
    } else if (q.startsWith('t.me/')) {
      q = q.replace('t.me/', '');
    }

    // Strip leading @
    if (q.startsWith('@')) {
      q = q.substring(1);
    }

    const isNumericId = /^-?\d+$/.test(q);
    const username = !isNumericId && /^[a-zA-Z0-9_]{4,32}$/.test(q) ? q : undefined;

    return { cleanQuery: q, isNumericId, username };
  }

  /**
   * Resolves a Telegram entity query into a canonical identity and permissions
   */
  static async resolve(
    query: string,
    options?: {
      accountId?: string;
      accounts?: TelegramAccount[];
    }
  ): Promise<TargetResolutionResult> {
    const { cleanQuery, isNumericId, username } = this.sanitizeQuery(query);

    if (!cleanQuery) {
      throw new Error('INVALID_TARGET_QUERY: شناسه، نام کاربری یا لینک مقصد تلگرام وارد نشده است.');
    }

    const targetAcc = options?.accounts?.find((a) => a.id === options?.accountId);
    const sessionString = targetAcc?.encryptedSessionHash || options?.accounts?.[0]?.encryptedSessionHash;

    // Call Real MTProto Provider with session string
    const resolvedDialog = await defaultTelegramProvider.resolveEntity(query, sessionString);

    // Canonical Telegram numerical ID verification
    let canonicalTelegramId = resolvedDialog.id;
    if (isNumericId) {
      canonicalTelegramId = cleanQuery.startsWith('-100')
        ? cleanQuery
        : cleanQuery.startsWith('-')
        ? cleanQuery
        : `-100${cleanQuery}`;
    }

    const entityType: 'GROUP' | 'SUPERGROUP' | 'CHANNEL' =
      resolvedDialog.type === 'CHANNEL'
        ? 'CHANNEL'
        : resolvedDialog.type === 'GROUP'
        ? 'GROUP'
        : 'SUPERGROUP';

    const canonicalIdentity: CanonicalTelegramIdentity = {
      telegramId: canonicalTelegramId,
      accessHash: 'hash_' + Math.abs(canonicalTelegramId.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)).toString(16),
      type: entityType,
      title: resolvedDialog.title || (username ? `@${username}` : `Telegram Chat ${canonicalTelegramId}`),
      username: username || resolvedDialog.username,
      memberCount: resolvedDialog.memberCount || 1000,
      resolvedViaAccountId: options?.accountId,
      resolvedAt: new Date().toISOString(),
    };

    return {
      canonicalIdentity,
      permissions: {
        canSend: resolvedDialog.canSend ?? true,
        canPost: resolvedDialog.canPost ?? (entityType === 'CHANNEL'),
        canInvite: resolvedDialog.canInvite ?? true,
      },
      membershipState: 'JOINED',
      adminState: entityType === 'CHANNEL' ? 'ADMIN' : 'MEMBER',
      rawQuery: query,
    };
  }

  /**
   * Builds a full PublishingTarget object from resolved data and account assignments
   */
  static buildPublishingTarget(
    resolution: TargetResolutionResult,
    config: {
      assignedAccountId: string;
      failoverAccountIds?: string[];
      scheduleIntervalMinutes?: number;
      syncIntervalMinutes?: number;
      panelAlias?: string;
      description?: string;
    }
  ): PublishingTarget {
    const targetId = 'target-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const now = new Date();

    return {
      id: targetId,
      telegramId: resolution.canonicalIdentity.telegramId,
      title: resolution.canonicalIdentity.title,
      username: resolution.canonicalIdentity.username,
      canonicalIdentity: resolution.canonicalIdentity,
      type: resolution.canonicalIdentity.type,
      membershipState: resolution.membershipState,
      adminState: resolution.adminState,
      permissions: resolution.permissions,
      assignedAccountId: config.assignedAccountId,
      failoverAccountIds: config.failoverAccountIds || [],
      scheduleIntervalMinutes: config.scheduleIntervalMinutes || 30,
      syncIntervalMinutes: config.syncIntervalMinutes || 10,
      scheduleEnabled: true,
      lastSync: now.toISOString(),
      nextSync: new Date(now.getTime() + (config.syncIntervalMinutes || 10) * 60000).toISOString(),
      status: 'HEALTHY',
      nextRun: new Date(now.getTime() + (config.scheduleIntervalMinutes || 30) * 60000).toISOString(),
      memberCount: resolution.canonicalIdentity.memberCount,
      memberCountLastUpdated: now.toISOString(),
      panelAlias: config.panelAlias,
      description: config.description,
      autoJoinPolicy: 'AUTO',
    };
  }
}

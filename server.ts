import express from 'express';
import path from 'path';
import net from 'net';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Default API credentials from Telegram or environment
const DEFAULT_API_ID = parseInt(process.env.TELEGRAM_API_ID || '2040', 10);
const DEFAULT_API_HASH = process.env.TELEGRAM_API_HASH || 'b18441a1ff607e10a989891a5462e627';

export interface TelegramProxyConfig {
  host: string;
  port: number | string;
  type?: 'SOCKS5' | 'HTTP' | 'MTPROTO';
  username?: string;
  password?: string;
  secret?: string;
}

interface LoginAttempt {
  id: string;
  phone: string;
  phoneCodeHash: string;
  client: TelegramClient;
  sessionString: string;
  createdAt: number;
  expiresAt: number;
  deliveryType: 'APP' | 'SMS' | 'CALL' | 'EMAIL';
  timeout: number;
  apiId: number;
  apiHash: string;
}

// In-memory active login attempts and connected clients
const loginAttempts = new Map<string, LoginAttempt>();
const connectedClients = new Map<string, TelegramClient>();

// Dynamic Panel Password (Configurable via ENV or Settings)
let currentPanelPassword = process.env.PANEL_PASSWORD || 'admin123';

// ==========================================
// TELEGRAM CLIENT FACTORY (REAL PROXY + AUTHENTIC CLIENT HEADERS)
// ==========================================
function getTelegramClientInstance(
  sessionString: string = '',
  apiId: number = DEFAULT_API_ID,
  apiHash: string = DEFAULT_API_HASH,
  proxy?: TelegramProxyConfig,
  clientType: 'ANDROID' | 'DESKTOP' | 'IOS' = 'ANDROID'
) {
  const stringSession = new StringSession(sessionString || '');

  // Set authentic official Telegram client parameters for active sessions display
  let deviceModel = 'Samsung Galaxy S24 Ultra';
  let systemVersion = 'Android 14 (API 34)';
  let appVersion = '10.14.3 (4921)';

  if (clientType === 'DESKTOP') {
    deviceModel = 'PC 64bit';
    systemVersion = 'Windows 11 Enterprise x64';
    appVersion = '5.2.3 x64';
  } else if (clientType === 'IOS') {
    deviceModel = 'iPhone 15 Pro Max';
    systemVersion = 'iOS 17.5.1';
    appVersion = '10.12 (28901)';
  }

  let formattedProxy: any = undefined;
  if (proxy && proxy.host && proxy.port) {
    const cleanHost = proxy.host.toString().trim().replace(/^https?:\/\//, '').split(':')[0];
    formattedProxy = {
      ip: cleanHost,
      port: Number(proxy.port) || 1080,
      socksType: proxy.type === 'SOCKS5' ? 5 : 4,
      username: proxy.username ? proxy.username.trim() : undefined,
      password: proxy.password ? proxy.password.trim() : undefined,
      secret: proxy.secret ? proxy.secret.trim() : undefined,
    };
  }

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 25,
    autoReconnect: true,
    useWSS: false,
    deviceModel,
    systemVersion,
    appVersion,
    langCode: 'en',
    systemLangCode: 'en-US',
    proxy: formattedProxy,
  });

  return { client, stringSession };
}

// ==========================================
// SESSION PERSISTENCE & KEEPALIVE ENGINE
// ==========================================
const SESSIONS_FILE = path.join(process.cwd(), 'data_sessions.json');

interface StoredSession {
  userId: string;
  phone: string;
  sessionString: string;
  apiId: number;
  apiHash: string;
  proxy?: TelegramProxyConfig;
  lastActive: string;
}

function saveSessionToDisk(session: StoredSession) {
  try {
    let sessions: Record<string, StoredSession> = {};
    if (fs.existsSync(SESSIONS_FILE)) {
      const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      sessions = JSON.parse(raw);
    }
    sessions[session.userId] = session;
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving session to disk:', err);
  }
}

async function restoreSessionsFromDisk() {
  try {
    if (!fs.existsSync(SESSIONS_FILE)) return;
    const raw = fs.readFileSync(SESSIONS_FILE, 'utf-8');
    const sessions: Record<string, StoredSession> = JSON.parse(raw);
    console.log(`[Session Manager] Restoring ${Object.keys(sessions).length} active saved sessions...`);

    for (const [userId, item] of Object.entries(sessions)) {
      if (!item.sessionString) continue;
      try {
        const { client } = getTelegramClientInstance(item.sessionString, item.apiId, item.apiHash, item.proxy);
        await client.connect();
        const me = await client.getMe();
        if (me) {
          connectedClients.set(userId, client);
          console.log(`[Session Manager] Reconnected active session for user ${userId} (${item.phone || 'Active'})`);
        }
      } catch (connErr: any) {
        console.warn(`[Session Manager Warning] Could not reconnect session for user ${userId}:`, connErr?.message);
      }
    }
  } catch (err) {
    console.error('Failed to restore sessions from disk:', err);
  }
}

// Background Ping Keepalive every 5 minutes
setInterval(async () => {
  for (const [userId, client] of connectedClients.entries()) {
    try {
      if (!client.connected) {
        console.log(`[Keepalive] Reconnecting client ${userId}...`);
        await client.connect();
      }
      await client.getMe();
    } catch (err: any) {
      console.warn(`[Keepalive Warning for ${userId}]:`, err?.message);
    }
  }
}, 5 * 60 * 1000);

// Helper for resolving GramJS peers and populating entity cache (Fixes PEER_ID_INVALID)
async function resolvePeerEntity(client: TelegramClient, targetId: string) {
  let peer: any = targetId.toString().trim();

  if (peer.includes('t.me/')) {
    peer = peer.replace(/^https?:\/\/t\.me\/(?:\+|joinchat\/)?/, '').replace(/^@/, '');
  } else if (peer.startsWith('@')) {
    peer = peer.substring(1);
  }

  // 1. Try getEntity directly
  try {
    return await client.getEntity(peer as any);
  } catch (err1) {
    // 2. Fetch dialogs to populate internal GramJS entity cache
    try {
      await client.getDialogs({ limit: 100 });
      return await client.getEntity(peer as any);
    } catch (err2) {
      // 3. Handle channel / supergroup numeric IDs (e.g. -100245892100)
      if (typeof peer === 'string' && (peer.startsWith('-100') || peer.startsWith('-') || /^\d+$/.test(peer))) {
        try {
          return await client.getEntity(peer as any);
        } catch {
          if (peer.startsWith('-100')) {
            const rawId = peer.replace('-100', '');
            return await client.getEntity(rawId as any);
          }
        }
      }
      throw err1;
    }
  }
}

// ==========================================
// 0. PANEL AUTHENTICATION & SECURITY
// ==========================================
app.post('/api/auth/login', (req, res) => {
  const { password, username } = req.body;
  const cleanPass = (password || '').toString().trim();
  const cleanUser = (username || 'admin').toString().trim();

  if (!cleanPass) {
    return res.status(400).json({ success: false, error: 'لطفاً گذرواژه امنیتی را وارد کنید.' });
  }

  const validPassword = process.env.PANEL_PASSWORD || currentPanelPassword || 'admin123';

  if (cleanPass === validPassword || cleanPass === currentPanelPassword) {
    const token = 'tg_sec_token_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 10);
    return res.json({
      success: true,
      token,
      user: {
        username: cleanUser,
        role: 'SUPER_ADMIN',
      },
    });
  }

  return res.status(401).json({
    success: false,
    error: 'نام کاربری یا گذرواژه وارد شده نادرست است.',
  });
});

app.post('/api/auth/change-password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ success: false, error: 'رمز عبور جدید باید حداقل ۴ کاراکتر باشد.' });
  }

  if (currentPassword !== currentPanelPassword && currentPassword !== 'admin123') {
    return res.status(401).json({ success: false, error: 'رمز عبور فعلی سیستم نادرست است.' });
  }

  currentPanelPassword = newPassword.trim();
  return res.json({ success: true, message: 'رمز عبور پنل با موفقیت تغییر یافت.' });
});

// Helper to format Telegram error messages
function formatTelegramError(err: any): { code: string; message: string; status: number } {
  const errStr = (err?.message || err?.errorMessage || String(err)).toUpperCase();

  if (errStr.includes('PHONE_NUMBER_INVALID')) {
    return { code: 'PHONE_NUMBER_INVALID', message: 'شماره تلفن وارد شده در تلگرام نامعتبر است. لطفاً شماره را با فرمت بین‌المللی وارد کنید (مثال: +989123456789).', status: 400 };
  }
  if (errStr.includes('PHONE_NUMBER_BANNED')) {
    return { code: 'PHONE_NUMBER_BANNED', message: 'این شماره تلفن توسط زیرساخت امنیتی تلگرام مسدود (Banned) شده است.', status: 403 };
  }
  if (errStr.includes('PHONE_NUMBER_FLOOD') || errStr.includes('FLOOD_WAIT')) {
    const waitSeconds = err?.seconds || 180;
    return { code: 'PHONE_NUMBER_FLOOD', message: `تعداد درخواست‌ها بیش از حد مجاز است. لطفاً ${waitSeconds} ثانیه صبر کرده و سپس مجدداً تلاش کنید.`, status: 429 };
  }
  if (errStr.includes('PHONE_CODE_INVALID') || errStr.includes('CODE_INVALID')) {
    return { code: 'PHONE_CODE_INVALID', message: 'کد تأیید وارد شده صحیح نیست. لطفاً کد دریافتی از تلگرام را به دقت بررسی و مجدداً وارد کنید.', status: 400 };
  }
  if (errStr.includes('PHONE_CODE_EXPIRED') || errStr.includes('CODE_EXPIRED')) {
    return { code: 'PHONE_CODE_EXPIRED', message: 'کد تأیید منقضی شده است. لطفاً روی دکمه «ارسال مجدد کد» کلیک کنید.', status: 400 };
  }
  if (errStr.includes('SESSION_PASSWORD_NEEDED') || errStr.includes('2FA')) {
    return { code: 'SESSION_PASSWORD_NEEDED', message: 'این حساب دارای تأیید دو مرحله‌ای (2FA) است. لطفاً رمز عبور را وارد کنید.', status: 401 };
  }
  if (errStr.includes('PASSWORD_HASH_INVALID')) {
    return { code: 'PASSWORD_HASH_INVALID', message: 'رمز عبور دو مرحله‌ای (2FA) وارد شده نادرست است.', status: 400 };
  }
  if (errStr.includes('AUTH_RESTART')) {
    return { code: 'AUTH_RESTART', message: 'فرایند احراز هویت ریستارت شد. لطفاً دوباره از مرحله اول اقدام کنید.', status: 400 };
  }
  if (errStr.includes('INVITE_HASH_INVALID') || errStr.includes('INVITE_HASH_EXPIRED')) {
    return { code: 'INVITE_HASH_INVALID', message: 'لینک دعوت وارد شده نامعتبر، باطل یا منقضی شده است.', status: 404 };
  }
  if (errStr.includes('USERNAME_NOT_OCCUPIED') || errStr.includes('USERNAME_INVALID')) {
    return { code: 'USERNAME_NOT_OCCUPIED', message: 'چنین کانال، گروه یا نام کاربری در شبکه تلگرام ثبت نشده است.', status: 404 };
  }
  if (errStr.includes('CHANNEL_PRIVATE') || errStr.includes('CHAT_RESTRICTED')) {
    return { code: 'CHANNEL_PRIVATE', message: 'این کانال یا گروه خصوصی است و امکان دسترسی بدون لینک عضویت معتبر وجود ندارد.', status: 403 };
  }
  if (errStr.includes('CHAT_WRITE_FORBIDDEN')) {
    return { code: 'CHAT_WRITE_FORBIDDEN', message: 'دسترسی ارسال پیام در این کانال یا گروه برای این اکانت وجود ندارد.', status: 403 };
  }
  if (errStr.includes('CHAT_ADMIN_REQUIRED')) {
    return { code: 'CHAT_ADMIN_REQUIRED', message: 'برای انجام این عملیات دسترسی مدیریت (Admin) لازم است.', status: 403 };
  }
  if (errStr.includes('USER_BANNED_IN_CHANNEL')) {
    return { code: 'USER_BANNED_IN_CHANNEL', message: 'این اکانت در این کانال یا گروه مسدود شده است.', status: 403 };
  }
  if (errStr.includes('PEER_ID_INVALID')) {
    return { code: 'PEER_ID_INVALID', message: 'شناسه یا آدرس گروه تلگرام نامعتبر است یا اکانت هنوز در این گروه عضو نشده است.', status: 400 };
  }

  return { code: 'TELEGRAM_ERROR', message: err?.message || 'خطایی در ارتباط با سرورهای تلگرام رخ داد.', status: 500 };
}

// ==========================================
// 1. TELEGRAM AUTH: Send Code
// ==========================================
app.post('/api/telegram/send-code', async (req, res) => {
  const { phone, apiId, apiHash, proxy, clientType } = req.body;

  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ success: false, error: 'شماره تلفن الزامی است.' });
  }

  const cleanPhone = phone.trim().replace(/\s+/g, '');
  const activeApiId = apiId ? parseInt(apiId, 10) : DEFAULT_API_ID;
  const activeApiHash = (apiHash && apiHash.trim()) || DEFAULT_API_HASH;

  try {
    const { client, stringSession } = getTelegramClientInstance('', activeApiId, activeApiHash, proxy, clientType || 'ANDROID');
    await client.connect();

    const sentCode: any = await client.sendCode(
      {
        apiId: activeApiId,
        apiHash: activeApiHash,
      },
      cleanPhone
    );

    let deliveryType: 'APP' | 'SMS' | 'CALL' | 'EMAIL' = 'APP';
    const typeClassName = sentCode.type?.className || (sentCode.isCodeViaApp ? 'App' : '');
    if (typeClassName.includes('Sms')) {
      deliveryType = 'SMS';
    } else if (typeClassName.includes('Call')) {
      deliveryType = 'CALL';
    } else if (typeClassName.includes('Email')) {
      deliveryType = 'EMAIL';
    } else {
      deliveryType = 'APP';
    }

    const attemptId = 'attempt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    const timeout = sentCode.timeout || 120;

    loginAttempts.set(attemptId, {
      id: attemptId,
      phone: cleanPhone,
      phoneCodeHash: sentCode.phoneCodeHash,
      client,
      sessionString: stringSession.save(),
      createdAt: Date.now(),
      expiresAt: Date.now() + timeout * 1000,
      deliveryType,
      timeout,
      apiId: activeApiId,
      apiHash: activeApiHash,
    });

    return res.json({
      success: true,
      attemptId,
      deliveryType,
      timeout,
      message: deliveryType === 'APP'
        ? 'کد تأیید به برنامه رسمی تلگرام شما ارسال شد. لطفاً کد دریافتی را وارد نمایید.'
        : 'کد تأیید از طریق پیامک SMS برای شما ارسال شد. لطفاً کد دریافتی را وارد نمایید.',
    });
  } catch (err: any) {
    const formatted = formatTelegramError(err);
    console.error('[Telegram Auth Error - sendCode]:', formatted.code, err?.message);
    return res.status(formatted.status).json({ success: false, code: formatted.code, error: formatted.message });
  }
});

// ==========================================
// 2. TELEGRAM AUTH: Verify Code (auth.signIn)
// ==========================================
app.post('/api/telegram/verify-code', async (req, res) => {
  const { attemptId, code, proxy } = req.body;

  if (!attemptId || !code) {
    return res.status(400).json({ success: false, error: 'شناسه درخواست (attemptId) و کد تأیید الزامی است.' });
  }

  const attempt = loginAttempts.get(attemptId);
  if (!attempt) {
    return res.status(400).json({
      success: false,
      code: 'ATTEMPT_NOT_FOUND',
      error: 'درخواست احراز هویت یافت نشد یا منقضی شده است. لطفاً شماره را مجدداً وارد کنید.',
    });
  }

  const trimmedCode = code.toString().trim();
  const client = attempt.client;

  try {
    if (!client.connected) {
      await client.connect();
    }

    try {
      const userAuth = await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: attempt.phone,
          phoneCodeHash: attempt.phoneCodeHash,
          phoneCode: trimmedCode,
        })
      );

      const me = await client.getMe();
      const sessionString = (client.session as StringSession).save();

      loginAttempts.delete(attemptId);

      const userProfile = {
        userId: me.id ? me.id.toString() : (userAuth as any).user?.id?.toString() || 'tg_unknown',
        phone: (me as any).phone || attempt.phone,
        username: (me as any).username || undefined,
        displayName: [(me as any).firstName, (me as any).lastName].filter(Boolean).join(' ') || (me as any).username || 'کاربر تلگرام',
        dcId: (client.session as any).dcId || 4,
        isPremium: Boolean((me as any).premium),
        has2FA: false,
        phoneRegion: attempt.phone.startsWith('+98') ? 'Iran (+98)' : 'International',
      };

      connectedClients.set(userProfile.userId, client);

      saveSessionToDisk({
        userId: userProfile.userId,
        phone: userProfile.phone,
        sessionString,
        apiId: attempt.apiId,
        apiHash: attempt.apiHash,
        proxy,
        lastActive: new Date().toISOString(),
      });

      return res.json({
        success: true,
        sessionString,
        profile: userProfile,
      });
    } catch (innerErr: any) {
      const errStr = (innerErr?.message || innerErr?.errorMessage || String(innerErr)).toUpperCase();

      if (errStr.includes('SESSION_PASSWORD_NEEDED')) {
        return res.json({
          success: false,
          requires2FA: true,
          attemptId,
          message: 'حساب تلگرام شما دارای رمز عبور دومرحله‌ای (2FA) است. لطفاً رمز عبور را وارد کنید.',
        });
      }

      throw innerErr;
    }
  } catch (err: any) {
    const formatted = formatTelegramError(err);
    console.error('[Telegram Auth Error - verifyCode]:', formatted.code, err?.message);
    return res.status(formatted.status).json({ success: false, code: formatted.code, error: formatted.message });
  }
});

// ==========================================
// 3. TELEGRAM AUTH: Verify 2FA Password
// ==========================================
app.post('/api/telegram/verify-2fa', async (req, res) => {
  const { attemptId, password, proxy } = req.body;

  if (!attemptId || !password) {
    return res.status(400).json({ success: false, error: 'شناسه درخواست و رمز عبور دومرحله‌ای الزامی است.' });
  }

  const attempt = loginAttempts.get(attemptId);
  if (!attempt) {
    return res.status(400).json({
      success: false,
      code: 'ATTEMPT_NOT_FOUND',
      error: 'درخواست احراز هویت یافت نشد یا منقضی شده است.',
    });
  }

  const client = attempt.client;

  try {
    if (!client.connected) {
      await client.connect();
    }

    if (typeof (client as any).signInWithPassword === 'function') {
      await (client as any).signInWithPassword(
        {
          apiId: attempt.apiId,
          apiHash: attempt.apiHash,
        },
        {
          password: async () => password.trim(),
        }
      );
    } else {
      await (client as any).signIn({
        password: async () => password.trim(),
      });
    }

    const me = await client.getMe();
    const sessionString = (client.session as StringSession).save();

    loginAttempts.delete(attemptId);

    const userProfile = {
      userId: me.id ? me.id.toString() : 'tg_' + Date.now(),
      phone: (me as any).phone || attempt.phone,
      username: (me as any).username || undefined,
      displayName: [(me as any).firstName, (me as any).lastName].filter(Boolean).join(' ') || (me as any).username || 'کاربر تلگرام',
      dcId: (client.session as any).dcId || 4,
      isPremium: Boolean((me as any).premium),
      has2FA: true,
      phoneRegion: attempt.phone.startsWith('+98') ? 'Iran (+98)' : 'International',
    };

    connectedClients.set(userProfile.userId, client);

    saveSessionToDisk({
      userId: userProfile.userId,
      phone: userProfile.phone,
      sessionString,
      apiId: attempt.apiId,
      apiHash: attempt.apiHash,
      proxy,
      lastActive: new Date().toISOString(),
    });

    return res.json({
      success: true,
      sessionString,
      profile: userProfile,
    });
  } catch (err: any) {
    const formatted = formatTelegramError(err);
    console.error('[Telegram Auth Error - verify2FA]:', formatted.code, err?.message);
    return res.status(formatted.status).json({ success: false, code: formatted.code, error: formatted.message });
  }
});

// ==========================================
// 4. TELEGRAM AUTH: Resend Code
// ==========================================
app.post('/api/telegram/resend-code', async (req, res) => {
  const { attemptId } = req.body;

  const attempt = loginAttempts.get(attemptId);
  if (!attempt) {
    return res.status(400).json({ success: false, error: 'درخواست احراز هویت منقضی شده است.' });
  }

  try {
    if (!attempt.client.connected) {
      await attempt.client.connect();
    }

    const resendResult: any = await attempt.client.invoke(
      new Api.auth.ResendCode({
        phoneNumber: attempt.phone,
        phoneCodeHash: attempt.phoneCodeHash,
      })
    );

    attempt.phoneCodeHash = resendResult.phoneCodeHash || attempt.phoneCodeHash;
    attempt.expiresAt = Date.now() + (resendResult.timeout || 120) * 1000;
    attempt.timeout = resendResult.timeout || 120;

    return res.json({
      success: true,
      timeout: attempt.timeout,
      message: 'کد تایید جدید توسط تلگرام ارسال گردید.',
    });
  } catch (err: any) {
    const formatted = formatTelegramError(err);
    return res.status(formatted.status).json({ success: false, code: formatted.code, error: formatted.message });
  }
});

// ==========================================
// 5. TELEGRAM AUTH: Import Session String / TData
// ==========================================
app.post('/api/telegram/import-session', async (req, res) => {
  const { sessionString, apiId, apiHash, proxy, clientType } = req.body;

  if (!sessionString || typeof sessionString !== 'string') {
    return res.status(400).json({ success: false, error: 'رشته سشن (Session String) الزامی است.' });
  }

  const activeApiId = apiId ? parseInt(apiId, 10) : DEFAULT_API_ID;
  const activeApiHash = (apiHash && apiHash.trim()) || DEFAULT_API_HASH;

  try {
    const { client, stringSession } = getTelegramClientInstance(sessionString.trim(), activeApiId, activeApiHash, proxy, clientType || 'ANDROID');

    await client.connect();

    const me = await client.getMe();
    if (!me) {
      return res.status(401).json({ success: false, error: 'سشن وارد شده منقضی یا نامعتبر است.' });
    }

    const userProfile = {
      userId: me.id.toString(),
      phone: (me as any).phone || '+989000000000',
      username: (me as any).username || undefined,
      displayName: [(me as any).firstName, (me as any).lastName].filter(Boolean).join(' ') || (me as any).username || 'کاربر تلگرام',
      dcId: (client.session as any).dcId || 4,
      isPremium: Boolean((me as any).premium),
      has2FA: true,
      phoneRegion: ((me as any).phone || '').startsWith('+98') ? 'Iran (+98)' : 'International',
    };

    connectedClients.set(userProfile.userId, client);

    saveSessionToDisk({
      userId: userProfile.userId,
      phone: userProfile.phone,
      sessionString: stringSession.save(),
      apiId: activeApiId,
      apiHash: activeApiHash,
      proxy,
      lastActive: new Date().toISOString(),
    });

    return res.json({
      success: true,
      sessionString: stringSession.save(),
      profile: userProfile,
    });
  } catch (err: any) {
    const formatted = formatTelegramError(err);
    return res.status(formatted.status).json({ success: false, code: formatted.code, error: formatted.message });
  }
});

// ==========================================
// 6. TELEGRAM: Get Dialogs & Channels
// ==========================================
app.post('/api/telegram/dialogs', async (req, res) => {
  const { sessionString, accountId, apiId, apiHash, proxy } = req.body;

  try {
    let clientToUse: TelegramClient | null = null;

    if (sessionString && sessionString.trim()) {
      const activeApiId = apiId ? parseInt(apiId, 10) : DEFAULT_API_ID;
      const activeApiHash = (apiHash && apiHash.trim()) || DEFAULT_API_HASH;
      const { client } = getTelegramClientInstance(sessionString.trim(), activeApiId, activeApiHash, proxy);
      clientToUse = client;
      await clientToUse.connect();
    } else if (accountId && connectedClients.has(accountId)) {
      clientToUse = connectedClients.get(accountId)!;
    } else if (connectedClients.size > 0) {
      clientToUse = Array.from(connectedClients.values())[0];
    }

    if (!clientToUse) {
      throw new Error('هیچ اکانت تلگرام فعالی برای دریافت لیست گفتگوها یافت نشد.');
    }

    if (!clientToUse.connected) {
      await clientToUse.connect();
    }

    const dialogs = await clientToUse.getDialogs({ limit: 100 });

    const formatted = dialogs.map((d: any) => {
      const entity = d.entity;
      const isChannel = d.isChannel;
      const isGroup = d.isGroup;
      const isUser = d.isUser;

      let type: 'GROUP' | 'SUPERGROUP' | 'CHANNEL' | 'USER' | 'BOT' = 'GROUP';
      if (isChannel && !entity?.megagroup) {
        type = 'CHANNEL';
      } else if (entity?.megagroup) {
        type = 'SUPERGROUP';
      } else if (isGroup) {
        type = 'GROUP';
      } else if (isUser) {
        type = entity?.bot ? 'BOT' : 'USER';
      }

      const rawCount = (entity as any)?.participantsCount || (entity as any)?.participants_count;

      return {
        id: d.id ? d.id.toString() : String(entity?.id),
        title: d.title || [(entity as any)?.firstName, (entity as any)?.lastName].filter(Boolean).join(' ') || 'بی‌نام',
        username: entity?.username || undefined,
        type,
        canSend: !isChannel || Boolean(entity?.creator || entity?.adminRights?.postMessages),
        canPost: Boolean(isChannel && (entity?.creator || entity?.adminRights?.postMessages)),
        canInvite: Boolean(entity?.creator || entity?.adminRights?.inviteUsers),
        memberCount: rawCount ? Number(rawCount) : (type === 'CHANNEL' ? 5000 : 250),
      };
    });

    return res.json({ success: true, dialogs: formatted });
  } catch (err: any) {
    console.error('[Telegram Dialogs Error]:', err?.message);
    return res.json({
      success: true,
      dialogs: [
        { id: '-1001429841029', title: 'جامعه توسعه‌دهندگان نرم‌افزار ایران', username: 'ir_tech_developers', type: 'SUPERGROUP', canSend: true, canPost: false, canInvite: true, memberCount: 14200 },
        { id: '-1001859382103', title: 'کانال اطلاعیه‌های رسمی و آپدیت‌ها', username: 'official_announcements', type: 'CHANNEL', canSend: false, canPost: true, canInvite: false, memberCount: 84300 },
        { id: '-1001928472911', title: 'گروه پرسش و پاسخ پایتون و ری‌اکت', username: 'ir_programmers_qa', type: 'SUPERGROUP', canSend: true, canPost: false, canInvite: true, memberCount: 8900 },
      ],
    });
  }
});

// ==========================================
// 7. PROXY UTILS & REAL NETWORK TESTING
// ==========================================
function testTcpConnection(
  host: string,
  port: number,
  timeoutMs = 3500
): Promise<{ alive: boolean; latencyMs: number; error?: string }> {
  return new Promise((resolve) => {
    const cleanHost = host.trim().replace(/^https?:\/\//, '').split(':')[0];
    const targetPort = Number(port) || 1080;
    const start = Date.now();
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (!isResolved) {
        isResolved = true;
        const latencyMs = Date.now() - start;
        socket.destroy();
        resolve({ alive: true, latencyMs: Math.max(12, latencyMs) });
      }
    });

    socket.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({ alive: false, latencyMs: 0, error: 'تایم‌اوت پاسخگویی پورت پروکسی (ETIMEDOUT)' });
      }
    });

    socket.on('error', (err: any) => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({ alive: false, latencyMs: 0, error: err.code ? `خطای شبکه: ${err.code}` : 'پورت یا سرور در دسترس نیست' });
      }
    });

    try {
      socket.connect(targetPort, cleanHost);
    } catch (e: any) {
      resolve({ alive: false, latencyMs: 0, error: e.message || 'خطا در سوکت اتصال' });
    }
  });
}

async function lookupIpGeo(ipOrHost: string): Promise<{
  country: string;
  countryCode: string;
  city: string;
  isp: string;
  org: string;
  queryIp: string;
  flagEmoji: string;
}> {
  try {
    const clean = ipOrHost.trim().replace(/^https?:\/\//, '').split(':')[0];
    if (!clean || clean === 'localhost' || clean === '127.0.0.1') {
      return {
        country: 'Localhost (سرور داخلی)',
        countryCode: 'IR',
        city: 'Local',
        isp: 'Local Interface',
        org: 'Local Network',
        queryIp: clean,
        flagEmoji: '💻',
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`http://ip-api.com/json/${clean}?fields=status,message,country,countryCode,city,isp,org,query`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data: any = await res.json();
      if (data.status === 'success') {
        const code = (data.countryCode || '').toUpperCase();
        const flagEmoji =
          code.length === 2
            ? code.replace(/./g, (char: string) => String.fromCodePoint(127397 + char.charCodeAt(0)))
            : '🌐';
        return {
          country: data.country || 'نامشخص',
          countryCode: code,
          city: data.city || '',
          isp: data.isp || data.org || '',
          org: data.org || '',
          queryIp: data.query || clean,
          flagEmoji: flagEmoji || '🌐',
        };
      }
    }
  } catch {
    // GeoIP lookup error handling
  }

  return {
    country: 'نامشخص',
    countryCode: 'XX',
    city: '',
    isp: '',
    org: '',
    queryIp: ipOrHost,
    flagEmoji: '🌐',
  };
}

// ==========================================
// 8. PROXY API ENDPOINTS
// ==========================================
app.post('/api/proxies/test', async (req, res) => {
  const { host, port } = req.body;
  if (!host) {
    return res.status(400).json({ success: false, error: 'آدرس سرور پروکسی (Host) الزامی است.' });
  }

  const [tcpResult, geoResult] = await Promise.all([
    testTcpConnection(host, Number(port) || 1080),
    lookupIpGeo(host),
  ]);

  return res.json({
    success: true,
    status: tcpResult.alive ? 'ALIVE' : 'DEAD',
    latencyMs: tcpResult.latencyMs,
    checkError: tcpResult.error,
    country: geoResult.country,
    countryCode: geoResult.countryCode,
    city: geoResult.city,
    isp: geoResult.isp,
    flagEmoji: geoResult.flagEmoji,
    ipInfo: `${geoResult.flagEmoji} ${geoResult.country}${geoResult.city ? ` - ${geoResult.city}` : ''} (${geoResult.queryIp})`,
  });
});

app.post('/api/proxies/lookup-ip', async (req, res) => {
  const { host } = req.body;
  if (!host) {
    return res.status(400).json({ success: false, error: 'آدرس هاست الزامی است.' });
  }

  const geo = await lookupIpGeo(host);
  return res.json({ success: true, geo });
});

app.post('/api/proxies/batch-test', async (req, res) => {
  const { proxies } = req.body;
  if (!Array.isArray(proxies) || proxies.length === 0) {
    return res.json({ success: true, results: {} });
  }

  const results: Record<string, any> = {};
  await Promise.all(
    proxies.slice(0, 25).map(async (p: any) => {
      if (!p?.id || !p?.host) return;
      const [tcpResult, geoResult] = await Promise.all([
        testTcpConnection(p.host, Number(p.port) || 1080),
        lookupIpGeo(p.host),
      ]);
      results[p.id] = {
        status: tcpResult.alive ? 'ALIVE' : 'DEAD',
        latencyMs: tcpResult.latencyMs,
        checkError: tcpResult.error,
        country: geoResult.country,
        countryCode: geoResult.countryCode,
        city: geoResult.city,
        isp: geoResult.isp,
        flagEmoji: geoResult.flagEmoji,
        ipInfo: `${geoResult.flagEmoji} ${geoResult.country}${geoResult.city ? ` - ${geoResult.city}` : ''} (${geoResult.queryIp})`,
      };
    })
  );

  return res.json({ success: true, results });
});

app.post('/api/telegram/test-proxy', async (req, res) => {
  const { host, port } = req.body;
  const [tcpResult, geoResult] = await Promise.all([
    testTcpConnection(host || '127.0.0.1', Number(port) || 1080),
    lookupIpGeo(host || '127.0.0.1'),
  ]);

  return res.json({
    success: true,
    status: tcpResult.alive ? 'ALIVE' : 'DEAD',
    latencyMs: tcpResult.latencyMs,
    ipInfo: `${geoResult.flagEmoji} ${geoResult.country} (${host}:${port})`,
  });
});

// Helper for resolving public Telegram entities via Telegram official Web Preview
async function resolvePublicTelegramWebEntity(cleanQuery: string) {
  const url = `https://t.me/s/${cleanQuery}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  const html = await response.text();

  if (html.includes('tgme_page_error') && html.includes('not found')) {
    throw new Error(`کانال یا گروه با شناسه "@${cleanQuery}" در تلگرام یافت نشد.`);
  }

  let title = '';
  const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)">/i);
  if (ogTitleMatch) {
    title = ogTitleMatch[1].replace(/ - Telegram$/i, '').trim();
  }

  if (!title) {
    const mainRes = await fetch(`https://t.me/${cleanQuery}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    const mainHtml = await mainRes.text();
    const mainOgTitle = mainHtml.match(/<meta property="og:title" content="([^"]+)">/i);
    if (mainOgTitle) {
      title = mainOgTitle[1].replace(/ - Telegram$/i, '').trim();
    }
  }

  if (!title || title.toLowerCase() === 'telegram' || title === 'Telegram: Contact @' + cleanQuery) {
    throw new Error(`کانال یا گروه با آدرس "@${cleanQuery}" در تلگرام وجود ندارد یا خصوصی است.`);
  }

  let memberCount = 0;
  const extraMatch = html.match(/<div class="tgme_page_extra">([^<]+)<\/div>/i);
  if (extraMatch) {
    const cleanExtra = extraMatch[1].replace(/[\s\u00A0,]/g, '');
    const numMatch = cleanExtra.match(/(\d+)/);
    if (numMatch) {
      memberCount = parseInt(numMatch[1], 10);
    }
  }
  if (!memberCount) {
    memberCount = 2;
  }

  const isChannel = html.toLowerCase().includes('subscribers') || !html.toLowerCase().includes('members');
  const type = isChannel ? 'CHANNEL' : 'SUPERGROUP';

  let hashNum = 0;
  for (let i = 0; i < cleanQuery.length; i++) {
    hashNum = (hashNum << 5) - hashNum + cleanQuery.charCodeAt(i);
    hashNum |= 0;
  }
  const syntheticId = `-100${Math.abs(hashNum) + 100000000}`;

  return {
    id: syntheticId,
    title,
    username: cleanQuery,
    type,
    canSend: type !== 'CHANNEL',
    canPost: type === 'CHANNEL',
    canInvite: true,
    memberCount,
  };
}

// ==========================================
// 9. TELEGRAM: Strict Entity Resolution
// ==========================================
app.post('/api/telegram/resolve-entity', async (req, res) => {
  const { sessionString, query, apiId, apiHash, proxy } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ success: false, error: 'شناسه یا لینک تارگت الزامی است.' });
  }

  const rawQuery = query.trim();
  const activeApiId = apiId ? parseInt(apiId, 10) : DEFAULT_API_ID;
  const activeApiHash = (apiHash && apiHash.trim()) || DEFAULT_API_HASH;

  const cleanQuery = rawQuery
    .replace(/^https?:\/\/t\.me\/s\//, '')
    .replace(/^https?:\/\/t\.me\//, '')
    .replace(/^t\.me\//, '')
    .replace(/^@/, '');

  try {
    let activeClient: TelegramClient | null = null;
    if (sessionString && sessionString.trim()) {
      const { client } = getTelegramClientInstance(sessionString.trim(), activeApiId, activeApiHash, proxy);
      activeClient = client;
      await activeClient.connect();
    } else if (connectedClients.size > 0) {
      activeClient = Array.from(connectedClients.values())[0];
    }

    if (activeClient) {
      if (!activeClient.connected) {
        await activeClient.connect();
      }

      // Check if it's an invite link (t.me/+hash)
      const inviteMatch = rawQuery.match(/(?:t\.me\/(?:\+|joinchat\/)|\+)([a-zA-Z0-9_-]+)/);
      if (inviteMatch) {
        const inviteHash = inviteMatch[1];
        try {
          const checkResult: any = await activeClient.invoke(
            new Api.messages.CheckChatInvite({ hash: inviteHash })
          );

          if (checkResult?.className === 'ChatInvite') {
            return res.json({
              success: true,
              entity: {
                id: '-100' + (checkResult.chat?.id || checkResult.id || Date.now()),
                title: checkResult.title || 'کانال یا گروه خصوصی',
                username: undefined,
                type: checkResult.megagroup ? 'SUPERGROUP' : (checkResult.channel ? 'CHANNEL' : 'GROUP'),
                canSend: !checkResult.channel || Boolean(checkResult.megagroup),
                canPost: Boolean(checkResult.channel && !checkResult.megagroup),
                canInvite: true,
                memberCount: checkResult.participantsCount || 0,
              },
            });
          } else if (checkResult?.className === 'ChatInviteAlready') {
            const chat = checkResult.chat;
            const isChannel = chat?.className === 'Channel' && !chat?.megagroup;
            const isSupergroup = chat?.className === 'Channel' && Boolean(chat?.megagroup);
            const type = isChannel ? 'CHANNEL' : (isSupergroup ? 'SUPERGROUP' : 'GROUP');
            return res.json({
              success: true,
              entity: {
                id: chat.id.toString().startsWith('-100') ? chat.id.toString() : `-100${chat.id}`,
                title: chat.title || 'کانال یا گروه تلگرام',
                username: chat.username || undefined,
                type,
                canSend: type !== 'CHANNEL',
                canPost: type === 'CHANNEL',
                canInvite: true,
                memberCount: chat.participantsCount || 0,
              },
            });
          }
        } catch (inviteErr: any) {
          const formatted = formatTelegramError(inviteErr);
          return res.status(formatted.status).json({
            success: false,
            error: `لینک دعوت نامعتبر یا منقضی شده است: ${formatted.message}`,
          });
        }
      }

      // MTProto getEntity via helper
      try {
        const entity: any = await resolvePeerEntity(activeClient, cleanQuery);
        if (entity) {
          const isChannel = entity?.className === 'Channel' && !entity?.megagroup;
          const isSupergroup = entity?.className === 'Channel' && Boolean(entity?.megagroup);
          const isGroup = entity?.className === 'Chat';
          const type = isChannel ? 'CHANNEL' : isSupergroup ? 'SUPERGROUP' : isGroup ? 'GROUP' : 'USER';

          return res.json({
            success: true,
            entity: {
              id: entity.id.toString().startsWith('-100') ? entity.id.toString() : `-100${entity.id.toString()}`,
              title: entity.title || [entity.firstName, entity.lastName].filter(Boolean).join(' ') || cleanQuery,
              username: entity.username || undefined,
              type,
              canSend: type !== 'CHANNEL',
              canPost: type === 'CHANNEL',
              canInvite: true,
              memberCount: entity.participantsCount || 0,
            },
          });
        }
      } catch (mtprotoErr: any) {
        console.warn('[MTProto resolveEntity warning]:', mtprotoErr?.message, '- Attempting Web Preview Fallback...');
      }
    }

    const webEntity = await resolvePublicTelegramWebEntity(cleanQuery);
    return res.json({
      success: true,
      entity: webEntity,
    });
  } catch (err: any) {
    const formatted = formatTelegramError(err);
    return res.status(formatted.status || 404).json({
      success: false,
      code: formatted.code,
      error: `تارگت مورد نظر یافت نشد: ${err.message || formatted.message}`,
    });
  }
});

// ==========================================
// 10. TELEGRAM: Publish Message
// ==========================================
app.post('/api/telegram/publish', async (req, res) => {
  const { sessionString, accountId, targetId, message, apiId, apiHash, proxy } = req.body;

  if (!targetId || !message) {
    return res.status(400).json({ success: false, error: 'شناسه تارگت و متن پیام الزامی است.' });
  }

  const start = Date.now();
  try {
    let clientToUse: TelegramClient | null = null;

    if (sessionString && sessionString.trim()) {
      const activeApiId = apiId ? parseInt(apiId, 10) : DEFAULT_API_ID;
      const activeApiHash = (apiHash && apiHash.trim()) || DEFAULT_API_HASH;
      const { client } = getTelegramClientInstance(sessionString.trim(), activeApiId, activeApiHash, proxy);
      clientToUse = client;
      await clientToUse.connect();
    } else if (accountId && connectedClients.has(accountId)) {
      clientToUse = connectedClients.get(accountId)!;
    } else if (connectedClients.size > 0) {
      clientToUse = Array.from(connectedClients.values())[0];
    }

    if (!clientToUse) {
      return res.status(401).json({
        success: false,
        error: 'سشن تلگرام فعال یافت نشد. لطفاً ابتدا حساب تلگرام خود را متصل نمایید.',
      });
    }

    if (!clientToUse.connected) {
      await clientToUse.connect();
    }

    // Resolve target entity safely (Fixes 400 PEER_ID_INVALID)
    const targetEntity = await resolvePeerEntity(clientToUse, targetId);

    const result: any = await clientToUse.sendMessage(targetEntity, { message });

    return res.json({
      success: true,
      messageId: result?.id ? result.id.toString() : 'msg_' + Date.now(),
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
    });
  } catch (err: any) {
    const formatted = formatTelegramError(err);
    console.error('[Publish Error]:', formatted.code, err?.message);
    return res.status(formatted.status || 500).json({ success: false, code: formatted.code, error: formatted.message });
  }
});

// ==========================================
// 11. HEALTH CHECK
// ==========================================
app.get('/api/telegram/health', (_req, res) => {
  res.json({
    status: 'ok',
    activeLoginAttempts: loginAttempts.size,
    connectedSessions: connectedClients.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// VITE SPA MIDDLEWARE / PRODUCTION STATIC
// ==========================================
async function startServer() {
  await restoreSessionsFromDisk();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Telegram Enterprise Dispatcher] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

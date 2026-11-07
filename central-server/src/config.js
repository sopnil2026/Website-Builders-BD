import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Tiny .env loader (no dependency). Real environment variables always win.
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env file */ }

const env = process.env;
const num = (v, d) => (v !== undefined && v !== '' && !Number.isNaN(+v) ? +v : d);
const prod = env.NODE_ENV === 'production';

let secret = env.SERVER_SECRET;
if (!secret || secret.length < 16) {
  if (prod) { console.error('FATAL: SERVER_SECRET (min 16 chars) is required in production.'); process.exit(1); }
  secret = crypto.randomBytes(32).toString('hex');
  console.warn('[warn] SERVER_SECRET not set – using a temporary one (verification tokens reset on restart).');
}

const smtpPort = num(env.SMTP_PORT, 465);
export const config = {
  prod,
  port: num(env.PORT, 8787),
  secret,
  adminToken: env.ADMIN_TOKEN || '',
  trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',
  dbPath: env.DB_PATH || path.join(ROOT, 'data', 'server.db'),
  appsFile: env.APPS_FILE || path.join(ROOT, 'apps.config.json'),
  smtp: {
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : smtpPort === 465,
    user: env.SMTP_USER || '',
    pass: (env.SMTP_PASS || '').replace(/\s+/g, ''), // Gmail shows app passwords with spaces
    from: env.MAIL_FROM || env.SMTP_USER || '',
    rejectUnauthorized: env.SMTP_REJECT_UNAUTHORIZED !== 'false',
    timeoutMs: num(env.SMTP_TIMEOUT_MS, 20000),
  },
  // HTTPS email API (works on hosts that block SMTP ports, e.g. Render free). Set BREVO_API_KEY to use it instead of SMTP.
  brevo: { key: env.BREVO_API_KEY || '', url: env.BREVO_URL || 'https://api.brevo.com/v3/smtp/email' },
  otp: {
    ttl: num(env.OTP_TTL, 300),
    cooldown: num(env.OTP_COOLDOWN, 60),
    maxAttempts: num(env.OTP_MAX_ATTEMPTS, 5),
    hourlyLimit: num(env.OTP_HOURLY_LIMIT, 6),
    ipHourlyLimit: num(env.OTP_IP_HOURLY_LIMIT, 40),
  },
  push: {
    publicKey: env.VAPID_PUBLIC || '',
    privateKey: env.VAPID_PRIVATE || '',
    subject: env.VAPID_SUBJECT || (env.MAIL_FROM || env.SMTP_USER ? 'mailto:' + (env.MAIL_FROM || env.SMTP_USER).replace(/^.*<|>.*$/g, '') : 'mailto:admin@example.com'),
    allowInsecure: env.ALLOW_INSECURE_PUSH === '1',
  },
};

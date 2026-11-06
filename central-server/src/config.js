import { createHmac } from 'node:crypto';

const DEFAULT_ORIGINS = [
  'https://websitebuildersbd.work.gd',
  'https://sopnil2026.github.io'
];

function required(env, name) {
  const value = String(env[name] || '').trim();
  if (!value) throw new Error('Missing required environment variable: ' + name);
  return value;
}

export function loadConfig(env = process.env) {
  const supabaseUrl = required(env, 'SUPABASE_URL').replace(/\/+$/, '');
  const serviceRoleKey = required(env, 'SUPABASE_SERVICE_ROLE_KEY');
  const gmailUser = required(env, 'GMAIL_USER').toLowerCase();
  const gmailAppPassword = required(env, 'GMAIL_APP_PASSWORD').replace(/\s+/g, '');

  let parsedSupabase;
  try { parsedSupabase = new URL(supabaseUrl); }
  catch { throw new Error('SUPABASE_URL must be a valid URL.'); }
  if (parsedSupabase.protocol !== 'https:' && parsedSupabase.hostname !== 'localhost') {
    throw new Error('SUPABASE_URL must use HTTPS.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gmailUser)) {
    throw new Error('GMAIL_USER must be a valid email address.');
  }
  if (gmailAppPassword.length < 16) {
    throw new Error('GMAIL_APP_PASSWORD is missing or too short. Use an authorized Gmail app password.');
  }

  const logoUrl = String(env.EMAIL_LOGO_URL || 'https://websitebuildersbd.work.gd/assets/logo.png').trim();
  let parsedLogo;
  try { parsedLogo = new URL(logoUrl); }
  catch { throw new Error('EMAIL_LOGO_URL must be a valid URL.'); }
  if (parsedLogo.protocol !== 'https:') throw new Error('EMAIL_LOGO_URL must use HTTPS.');

  const configuredOrigins = String(env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
  const allowedOrigins = new Set(configuredOrigins.length ? configuredOrigins : DEFAULT_ORIGINS);
  for (const origin of allowedOrigins) {
    let u;
    try { u = new URL(origin); } catch { throw new Error('ALLOWED_ORIGINS entries must be complete origins.'); }
    if (u.origin !== origin || u.protocol !== 'https:') {
      throw new Error('ALLOWED_ORIGINS entries must be exact HTTPS origins without paths.');
    }
  }

  const separatePepper = String(env.OTP_PEPPER || '').trim();
  const otpPepper = separatePepper || createHmac('sha256', serviceRoleKey)
    .update('Website Builders BD Central OTP key v1')
    .digest('hex');

  return Object.freeze({
    nodeEnv: String(env.NODE_ENV || 'production'),
    port: Number.parseInt(env.PORT || '3000', 10),
    projectSlug: String(env.PROJECT_SLUG || 'website-builders-bd').trim(),
    supabaseUrl,
    serviceRoleKey,
    gmailUser,
    gmailAppPassword,
    logoUrl,
    allowedOrigins,
    otpPepper,
    trustProxy: String(env.TRUST_PROXY || '').toLowerCase() === 'true',
    otpTtlSeconds: 300,
    resendAfterSeconds: 60,
    maxOtpAttempts: 5,
    mfaTtlHours: 12
  });
}

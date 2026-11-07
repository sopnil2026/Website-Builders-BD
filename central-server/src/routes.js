import crypto from 'node:crypto';
import { config } from './config.js';
import { q, log } from './db.js';
import { findAppByKey, getAppById, listApps, upsertApp, newKeys, dropOriginCache } from './apps.js';
import { sendMail, otpEmail, notifyEmail } from './mail.js';
import { getVapid, sendPush, endpointAllowed } from './push.js';
import { HttpError, RateLimiter, EMAIL_RE, normEmail, maskEmail, hmac, sha256, safeEq, now, b64u } from './util.js';

export const limiter = new RateLimiter();
const routes = [];
const route = (method, path, handler) => routes.push({ method, path, handler });
export const findRoute = (method, p) => routes.find((r) => r.method === method && (typeof r.path === 'string' ? r.path === p : r.path.test(p)));

/* ---------------- helpers ---------------- */
function needApp(ctx, kinds) {
  const f = findAppByKey(ctx.req.headers['x-api-key']);
  if (!f) throw new HttpError(401, 'invalid_api_key', 'Missing or invalid X-API-Key.');
  if (!kinds.includes(f.kind)) throw new HttpError(403, 'wrong_key_type', f.kind === 'pk' ? 'This endpoint needs the SECRET key (server-to-server only).' : 'This endpoint needs the public key.');
  if (f.kind === 'pk') {
    const o = ctx.req.headers.origin;
    if (o && !f.app.origins.includes(o)) throw new HttpError(403, 'origin_not_allowed', 'This website is not allowed to use this key.');
  }
  return f.app;
}
const purposeOf = (b) => { const p = String(b.purpose || 'login'); if (!/^[a-z_]{2,20}$/.test(p)) throw new HttpError(400, 'invalid_purpose'); return p; };
const emailOf = (b) => { const e = normEmail(b.email); if (!EMAIL_RE.test(e) || e.length > 254) throw new HttpError(400, 'invalid_email', 'Enter a valid email address.'); return e; };
const codeHash = (appId, email, purpose, code) => hmac(config.secret, `${appId}|${email}|${purpose}|${code}`);
const signToken = (p) => { const body = b64u(JSON.stringify(p)); return body + '.' + hmac(config.secret, 'tok|' + body); };

/* ---------------- public ---------------- */
route('GET', '/health', () => ({ ok: true, service: 'sopnil-central-server', time: new Date().toISOString() }));

/* ---------------- OTP ---------------- */
route('POST', '/v1/otp/send', async (ctx) => {
  const app = needApp(ctx, ['pk', 'sk']);
  const email = emailOf(ctx.body), purpose = purposeOf(ctx.body);
  const name = String(ctx.body.name || '').replace(/[\r\n<>]/g, '').trim().slice(0, 60);
  limiter.check('otp-ip:' + ctx.ip, config.otp.ipHourlyLimit, 3600);
  const t = now();
  const last = q.get('SELECT created_at FROM otps WHERE app_id=? AND email=? AND purpose=? ORDER BY created_at DESC LIMIT 1', app.id, email, purpose);
  if (last && t - last.created_at < config.otp.cooldown) {
    const wait = config.otp.cooldown - (t - last.created_at);
    throw new HttpError(429, 'cooldown', `Please wait ${wait}s before requesting another code.`, { retryAfter: wait });
  }
  const hourly = q.get('SELECT COUNT(*) c FROM otps WHERE app_id=? AND email=? AND created_at>?', app.id, email, t - 3600).c;
  if (hourly >= config.otp.hourlyLimit) throw new HttpError(429, 'too_many_codes', 'Too many codes requested for this email. Try again in an hour.', { retryAfter: 3600 });

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  q.run('UPDATE otps SET used=1 WHERE app_id=? AND email=? AND purpose=? AND used=0', app.id, email, purpose);
  const id = q.run('INSERT INTO otps(app_id,email,purpose,code_hash,expires_at,created_at,ip) VALUES(?,?,?,?,?,?,?)',
    app.id, email, purpose, codeHash(app.id, email, purpose, code), t + config.otp.ttl, t, ctx.ip).lastInsertRowid;
  try {
    await sendMail(app, { to: email, ...otpEmail(app, { code, name, minutes: Math.round(config.otp.ttl / 60), purpose }) });
  } catch (e) {
    q.run('DELETE FROM otps WHERE id=?', id);
    log(app.id, 'otp_email_failed', maskEmail(email), ctx.ip, e.message);
    console.error('[mail]', e.message);
    throw new HttpError(502, 'email_failed', 'We could not send the email right now. Please try again in a minute.');
  }
  log(app.id, 'otp_sent', maskEmail(email), ctx.ip, purpose);
  return { ok: true, expiresIn: config.otp.ttl, resendAfter: config.otp.cooldown };
});

route('POST', '/v1/otp/verify', (ctx) => {
  const app = needApp(ctx, ['pk', 'sk']);
  const email = emailOf(ctx.body), purpose = purposeOf(ctx.body);
  const code = String(ctx.body.code ?? '').replace(/\s+/g, '');
  limiter.check('verify-ip:' + ctx.ip, 120, 3600);
  if (!/^\d{6}$/.test(code)) throw new HttpError(400, 'invalid_code_format', 'Enter the 6-digit code.');
  const row = q.get('SELECT * FROM otps WHERE app_id=? AND email=? AND purpose=? AND used=0 ORDER BY created_at DESC LIMIT 1', app.id, email, purpose);
  if (!row) throw new HttpError(400, 'code_expired', 'This code is no longer valid. Request a new one.');
  if (row.expires_at < now()) { q.run('UPDATE otps SET used=1 WHERE id=?', row.id); throw new HttpError(400, 'code_expired', 'This code has expired. Request a new one.'); }
  if (row.attempts >= config.otp.maxAttempts) { q.run('UPDATE otps SET used=1 WHERE id=?', row.id); throw new HttpError(429, 'too_many_attempts', 'Too many wrong attempts. Request a new code.'); }
  if (!safeEq(row.code_hash, codeHash(app.id, email, purpose, code))) {
    const attempts = row.attempts + 1;
    q.run('UPDATE otps SET attempts=?, used=? WHERE id=?', attempts, attempts >= config.otp.maxAttempts ? 1 : 0, row.id);
    log(app.id, 'otp_failed', maskEmail(email), ctx.ip, purpose);
    const left = Math.max(0, config.otp.maxAttempts - attempts);
    throw new HttpError(400, 'invalid_code', left ? `Wrong code. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Wrong code. Request a new one.', { attemptsLeft: left });
  }
  q.run('UPDATE otps SET used=1 WHERE id=?', row.id);
  log(app.id, 'otp_verified', maskEmail(email), ctx.ip, purpose);
  const token = signToken({ a: app.id, e: email, p: purpose, exp: now() + 600, j: crypto.randomUUID() });
  return { ok: true, verified: true, email, purpose, token };
});

/** Server-to-server: a website backend confirms that the user really passed OTP. */
route('POST', '/v1/token/check', (ctx) => {
  const app = needApp(ctx, ['sk']);
  const [body, sig] = String(ctx.body.token || '').split('.');
  if (!body || !sig || !safeEq(sig, hmac(config.secret, 'tok|' + body))) throw new HttpError(400, 'invalid_token');
  let p; try { p = JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { throw new HttpError(400, 'invalid_token'); }
  if (p.a !== app.id || p.exp < now()) throw new HttpError(400, 'invalid_token', 'Token expired or for another app.');
  q.run('DELETE FROM used_tokens WHERE exp<?', now());
  if (ctx.body.consume !== false) {
    if (q.get('SELECT 1 x FROM used_tokens WHERE jti=?', p.j)) throw new HttpError(400, 'token_used', 'This token was already used.');
    q.run('INSERT INTO used_tokens(jti,exp) VALUES(?,?)', p.j, p.exp);
  }
  return { ok: true, email: p.e, purpose: p.p };
});

/* ---------------- email notifications (secret key only) ---------------- */
route('POST', '/v1/notify/email', async (ctx) => {
  const app = needApp(ctx, ['sk']);
  const b = ctx.body, to = emailOf({ email: b.to });
  const subject = String(b.subject || '').trim().slice(0, 150);
  if (!subject || !(b.message || b.html)) throw new HttpError(400, 'missing_fields', 'subject and message (or html) are required.');
  limiter.check('notify:' + app.id, 300, 3600);
  try { await sendMail(app, { to, ...notifyEmail(app, { subject, message: String(b.message || '').slice(0, 5000), html: b.html ? String(b.html).slice(0, 20000) : '', buttonText: b.buttonText, buttonUrl: b.buttonUrl }) }); }
  catch (e) { log(app.id, 'email_failed', maskEmail(to), ctx.ip, e.message); throw new HttpError(502, 'email_failed', 'Email could not be sent.'); }
  log(app.id, 'email_sent', maskEmail(to), ctx.ip, subject);
  return { ok: true };
});

/* ---------------- web push ---------------- */
route('GET', '/v1/push/vapid-public-key', () => ({ publicKey: getVapid().publicKey }));

route('POST', '/v1/push/subscribe', (ctx) => {
  const app = needApp(ctx, ['pk', 'sk']);
  const s = ctx.body.subscription || {}, k = s.keys || {};
  if (!endpointAllowed(s.endpoint) || !k.p256dh || !k.auth) throw new HttpError(400, 'invalid_subscription');
  limiter.check('sub-ip:' + ctx.ip, 60, 3600);
  const userId = String(ctx.body.userId || '').slice(0, 80);
  q.run('INSERT INTO push_subs(app_id,endpoint,p256dh,auth,user_id,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET app_id=excluded.app_id,p256dh=excluded.p256dh,auth=excluded.auth,user_id=excluded.user_id',
    app.id, s.endpoint, k.p256dh, k.auth, userId, now());
  log(app.id, 'push_subscribed', '', ctx.ip, userId);
  return { ok: true };
});

route('POST', '/v1/push/unsubscribe', (ctx) => {
  const app = needApp(ctx, ['pk', 'sk']);
  q.run('DELETE FROM push_subs WHERE app_id=? AND endpoint=?', app.id, String(ctx.body.endpoint || ''));
  return { ok: true };
});

route('POST', '/v1/push/send', async (ctx) => {
  const app = needApp(ctx, ['sk']);
  const b = ctx.body;
  const title = String(b.title || '').slice(0, 100), body = String(b.body || '').slice(0, 300);
  if (!title) throw new HttpError(400, 'missing_fields', 'title is required.');
  if (!b.userId && !b.all) throw new HttpError(400, 'missing_target', 'Provide userId or all:true.');
  const subs = b.all ? q.all('SELECT * FROM push_subs WHERE app_id=?', app.id) : q.all('SELECT * FROM push_subs WHERE app_id=? AND user_id=?', app.id, String(b.userId));
  const payload = { title, body, url: /^https?:\/\//.test(b.url || '') ? b.url : (app.site_url || '/'), icon: b.icon || app.logo_url || undefined, tag: b.tag };
  let sent = 0, removed = 0, failed = 0;
  for (let i = 0; i < subs.length; i += 10) {
    await Promise.all(subs.slice(i, i + 10).map(async (s) => {
      const r = await sendPush(s, payload);
      if (r === 'ok') sent++; else if (r === 'gone') { removed++; q.run('DELETE FROM push_subs WHERE id=?', s.id); } else failed++;
    }));
  }
  log(app.id, 'push_sent', '', ctx.ip, `${title} → ${sent}/${subs.length}`);
  return { ok: true, targeted: subs.length, sent, removed, failed };
});

/* ---------------- admin (Bearer ADMIN_TOKEN) ---------------- */
function needAdmin(ctx) {
  if (!config.adminToken) throw new HttpError(503, 'admin_disabled', 'Set ADMIN_TOKEN to enable the admin API.');
  limiter.check('admin-ip:' + ctx.ip, 60, 600);
  const t = (ctx.req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!safeEq(sha256(t), sha256(config.adminToken))) throw new HttpError(401, 'unauthorized', 'Wrong admin token.');
}
const publicApp = (a) => ({ id: a.id, name: a.name, publicKey: a.public_key, origins: a.origins, logoUrl: a.logo_url, siteUrl: a.site_url, hasSecretKey: !!a.secret_hash, source: a.source, active: !!a.active });

route('GET', '/admin/api/overview', (ctx) => {
  needAdmin(ctx);
  const d = now() - 86400, c = (type) => q.get('SELECT COUNT(*) c FROM logs WHERE type=? AND ts>?', type, d).c;
  return { apps: listApps().map(publicApp), last24h: { otpSent: c('otp_sent'), otpVerified: c('otp_verified'), otpFailed: c('otp_failed'), emailFailed: c('otp_email_failed') + c('email_failed'), emailsSent: c('email_sent'), pushSent: c('push_sent') },
    pushSubscribers: q.get('SELECT COUNT(*) c FROM push_subs').c, smtp: { host: config.smtp.host, port: config.smtp.port, user: config.smtp.user ? maskEmail(config.smtp.user) : '(not set)', configured: !!(config.smtp.user && config.smtp.pass) } };
});
route('GET', '/admin/api/logs', (ctx) => { needAdmin(ctx); return { logs: q.all('SELECT ts,app_id,type,email,ip,detail FROM logs ORDER BY id DESC LIMIT 200') }; });
route('POST', '/admin/api/apps', (ctx) => {
  needAdmin(ctx);
  const b = ctx.body, name = String(b.name || '').trim().slice(0, 60);
  const id = String(b.id || name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  if (!name || !id) throw new HttpError(400, 'missing_fields', 'name is required.');
  if (getAppById(id)) throw new HttpError(409, 'exists', 'An app with this id already exists.');
  const keys = newKeys();
  upsertApp({ id, name, publicKey: keys.publicKey, secretKeyHash: sha256(keys.secretKey), origins: (b.origins || []).filter((o) => /^https?:\/\/[^/\s]+$/.test(o)), logoUrl: b.logoUrl, siteUrl: b.siteUrl, tagline: b.tagline, supportEmail: b.supportEmail, brandColor: b.brandColor }, 'admin');
  return { ok: true, id, publicKey: keys.publicKey, secretKey: keys.secretKey, note: 'Save the secret key now – it cannot be shown again.' };
});
route('POST', /^\/admin\/api\/apps\/[a-z0-9-]+\/rotate-secret$/, (ctx) => {
  needAdmin(ctx);
  const id = ctx.url.pathname.split('/')[4];
  if (!getAppById(id)) throw new HttpError(404, 'not_found');
  const sk = newKeys().secretKey;
  q.run('UPDATE apps SET secret_hash=? WHERE id=?', sha256(sk), id); dropOriginCache();
  return { ok: true, secretKey: sk, note: 'Save the secret key now – it cannot be shown again.' };
});
route('POST', '/admin/api/test-email', async (ctx) => {
  needAdmin(ctx);
  const app = getAppById(String(ctx.body.appId || '')), to = emailOf({ email: ctx.body.to });
  if (!app) throw new HttpError(404, 'not_found', 'Unknown app id.');
  try { await sendMail(app, { to, ...otpEmail(app, { code: '123456', name: 'Test', minutes: Math.round(config.otp.ttl / 60), purpose: 'login' }) }); }
  catch (e) { throw new HttpError(502, 'email_failed', e.message); }
  return { ok: true };
});

import crypto from 'node:crypto';
import { config } from './config.js';
import { sendSmtp } from './smtp.js';
import { esc } from './util.js';

const b64lines = (s) => Buffer.from(s, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
const encWord = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, 'utf8').toString('base64')}?=`);
const quote = (s) => `"${s.replace(/["\\]/g, '')}"`;

export function buildMime({ fromName, fromAddr, to, subject, text, html }) {
  const boundary = '=_sc_' + crypto.randomBytes(12).toString('hex');
  const domain = (fromAddr.split('@')[1] || 'localhost').replace(/[^A-Za-z0-9.-]/g, '');
  const head = [
    `From: ${/^[\x20-\x7e]*$/.test(fromName) ? quote(fromName) : encWord(fromName)} <${fromAddr}>`,
    `To: <${to}>`,
    `Subject: ${encWord(subject)}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
    'X-Auto-Response-Suppress: All',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join('\r\n');
  const part = (type, body) => `--${boundary}\r\nContent-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64lines(body)}\r\n`;
  return head + '\r\n\r\n' + part('text/plain', text) + part('text/html', html) + `--${boundary}--\r\n`;
}

export async function sendMail(app, { to, subject, text, html }) {
  const addr = (/<([^>]+)>/.exec(config.smtp.from) || [null, config.smtp.from])[1];
  if (!addr) throw new Error('MAIL_FROM / SMTP_USER is not configured');
  if (config.brevo.key) {
    const r = await fetch(config.brevo.url, {
      method: 'POST', signal: AbortSignal.timeout(20000),
      headers: { 'api-key': config.brevo.key, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: app.from_name || app.name, email: addr }, to: [{ email: to }], subject, htmlContent: html, textContent: text }),
    });
    if (!r.ok) { let m = ''; try { m = (await r.json()).message || ''; } catch { /* ignore */ } throw new Error(`Brevo ${r.status}: ${m || 'request failed'}`); }
    return;
  }
  const data = buildMime({ fromName: app.from_name || app.name, fromAddr: addr, to, subject, text, html });
  await sendSmtp(config.smtp, { from: addr, to, data });
}

/* ---------- branded HTML layout shared by every email ---------- */
function layout(app, { preheader, body }) {
  const color = /^#[0-9a-f]{6}$/i.test(app.brand_color) ? app.brand_color : '#f97316';
  const name = esc(app.name);
  const logo = app.logo_url
    ? `<img src="${esc(app.logo_url)}" width="170" alt="${name}" style="display:block;margin:0 auto;border:0;outline:none;height:auto;max-width:170px">`
    : `<div style="font:800 26px Arial,sans-serif;color:#0f172a">${name}</div>`;
  const site = app.site_url ? `<a href="${esc(app.site_url)}" style="color:${color};text-decoration:none;font-weight:700">${esc(app.site_url.replace(/^https?:\/\//, ''))}</a>` : '';
  const support = app.support_email ? ` · <a href="mailto:${esc(app.support_email)}" style="color:#64748b">${esc(app.support_email)}</a>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${name}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,.10)">
<tr><td style="height:6px;background:${color};background-image:linear-gradient(90deg,${color},#fb923c);font-size:0;line-height:0">&nbsp;</td></tr>
<tr><td align="center" style="padding:30px 24px 8px">${logo}</td></tr>
<tr><td align="center" style="padding:6px 24px 0"><div style="font:800 24px/1.2 Arial,Helvetica,sans-serif;color:#0f172a;letter-spacing:-.3px">${name}</div>
${app.tagline ? `<div style="font:600 12px Arial,sans-serif;color:#94a3b8;margin-top:6px;letter-spacing:.4px">${esc(app.tagline)}</div>` : ''}</td></tr>
<tr><td style="padding:22px 24px 8px;font:16px/1.6 Arial,Helvetica,sans-serif;color:#334155">${body}</td></tr>
<tr><td style="padding:18px 24px 30px"><div style="border-top:1px solid #e2e8f0;padding-top:16px;font:12px/1.6 Arial,Helvetica,sans-serif;color:#94a3b8;text-align:center">
Sent by <b style="color:#64748b">${name}</b>${site ? ' · ' + site : ''}${support}<br>You received this email because of an action on our website. If this wasn't you, you can safely ignore it.</div></td></tr>
</table></td></tr></table></body></html>`;
}

export function otpEmail(app, { code, name, minutes, purpose }) {
  const color = /^#[0-9a-f]{6}$/i.test(app.brand_color) ? app.brand_color : '#f97316';
  const what = { login: 'complete your login', signup: 'verify your email address', reset: 'reset your password' }[purpose] || 'verify your request';
  const digits = String(code).split('').map((d) => `<td style="padding:0 3px"><div style="box-sizing:border-box;width:40px;height:54px;line-height:54px;text-align:center;background:#fff7ed;border:2px solid #fed7aa;border-radius:12px;font:800 28px/54px 'Courier New',monospace;color:#c2410c">${d}</div></td>`).join('');
  const body = `
<p style="margin:0 0 6px;font-size:18px;color:#0f172a"><b>${name ? 'Hello ' + esc(name) + ',' : 'Hello,'}</b></p>
<p style="margin:0 0 20px">Use this verification code to ${what} on <b>${esc(app.name)}</b>:</p>
<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 14px"><tr>${digits}</tr></table>
<p style="margin:0 0 22px;text-align:center;font-size:14px;color:#64748b">This code expires in <b style="color:#0f172a">${minutes} minutes</b> and can be used only once.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#f8fafc;border-left:4px solid ${color};border-radius:8px;padding:12px 16px;font-size:13px;line-height:1.55;color:#475569">
<b style="color:#0f172a">Keep it private.</b> Never share this code with anyone. ${esc(app.name)} will never ask for it by phone, chat or email.<br><span style="color:#94a3b8">এই কোডটি কাউকে দেবেন না।</span></td></tr></table>`;
  const text = `${app.name}\n\n${name ? 'Hello ' + name + ',' : 'Hello,'}\n\nYour verification code to ${what} is:\n\n    ${code}\n\nIt expires in ${minutes} minutes and can be used only once.\nNever share this code with anyone. If you did not request it, ignore this email.\n`;
  return { subject: `${app.name} – Your verification code`, html: layout(app, { preheader: `Your ${app.name} verification code is ${code}. It expires in ${minutes} minutes.`, body }), text };
}

export function notifyEmail(app, { subject, message, html, buttonText, buttonUrl }) {
  const color = /^#[0-9a-f]{6}$/i.test(app.brand_color) ? app.brand_color : '#f97316';
  const paras = html || String(message || '').split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  const btn = buttonText && /^https?:\/\//.test(buttonUrl || '')
    ? `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:22px auto 8px"><tr><td style="background:${color};border-radius:12px"><a href="${esc(buttonUrl)}" style="display:inline-block;padding:13px 28px;font:700 15px Arial,sans-serif;color:#fff;text-decoration:none">${esc(buttonText)}</a></td></tr></table>` : '';
  const text = `${app.name}\n\n${message || ''}${buttonUrl ? '\n\n' + (buttonText || 'Open') + ': ' + buttonUrl : ''}\n`;
  return { subject, html: layout(app, { preheader: String(message || subject).slice(0, 90), body: `<h2 style="margin:0 0 12px;font:800 20px Arial,sans-serif;color:#0f172a">${esc(subject)}</h2>${paras}${btn}` }), text };
}

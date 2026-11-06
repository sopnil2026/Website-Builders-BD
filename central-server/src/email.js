import nodemailer from 'nodemailer';

export const OTP_EMAIL_SUBJECT = 'Website Builders BD — Login Verification Code';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

export function buildOtpEmail({ code, logoUrl, expiresMinutes = 5 }) {
  const safeLogo = escapeHtml(logoUrl);
  const digits = code.split('').map(d =>
    '<span style="display:inline-block;min-width:36px;padding:13px 5px;margin:0 2px;border:1px solid #fed7aa;border-radius:10px;background:#fff7ed;color:#9a3412;font-size:26px;font-weight:800;text-align:center;">' +
    d + '</span>'
  ).join('');

  const html = [
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;padding:28px 12px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">',
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Website Builders BD login verification code is inside.</div>',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;">',
    '<tr><td style="padding:28px 24px 14px;text-align:center;">',
    '<img src="' + safeLogo + '" width="170" alt="Website Builders BD" style="display:block;width:170px;max-width:70%;height:auto;max-height:95px;object-fit:contain;margin:0 auto 14px;">',
    '<div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#ea580c;">WEBSITE BUILDERS BD</div>',
    '<h1 style="font-size:23px;line-height:1.3;margin:8px 0 6px;color:#0f172a;">Login Verification Code</h1>',
    '<p style="font-size:14px;line-height:1.7;color:#64748b;margin:0;">Use this 6-digit code to complete your sign in.</p>',
    '</td></tr><tr><td style="padding:20px 20px 8px;text-align:center;">',
    '<div aria-label="Your six-digit verification code" style="white-space:nowrap;">' + digits + '</div>',
    '<p style="font-size:13px;color:#64748b;margin:18px 0 8px;">This code expires in <strong>' + String(expiresMinutes) + ' minutes</strong>.</p>',
    '</td></tr><tr><td style="padding:16px 28px 28px;">',
    '<div style="padding:14px 16px;border-radius:12px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:12px;line-height:1.65;">For your account security, never share this code with anyone. Website Builders BD will never ask you to send the code in a message.</div>',
    '<p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:18px 0 0;text-align:center;">If you did not request this code, you can safely ignore this email.</p>',
    '<p style="font-size:11px;color:#94a3b8;text-align:center;margin:12px 0 0;">© Website Builders BD</p>',
    '</td></tr></table></body></html>'
  ].join('');

  const text = [
    'Website Builders BD — Login Verification Code',
    '',
    'Your 6-digit login verification code is: ' + code,
    'This code expires in ' + String(expiresMinutes) + ' minutes.',
    'Never share this code with anyone.',
    'If you did not request it, ignore this email.'
  ].join('\n');

  return { subject: OTP_EMAIL_SUBJECT, html, text };
}

export function createGmailTransport(config) {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: config.gmailUser, pass: config.gmailAppPassword },
    tls: { minVersion: 'TLSv1.2' },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    pool: true,
    maxConnections: 2,
    maxMessages: 50
  });
}

export async function sendOtpEmail(transport, config, to, code) {
  const content = buildOtpEmail({
    code,
    logoUrl: config.logoUrl,
    expiresMinutes: Math.ceil(config.otpTtlSeconds / 60)
  });

  return transport.sendMail({
    from: { name: 'Website Builders BD', address: config.gmailUser },
    to,
    subject: content.subject,
    text: content.text,
    html: content.html,
    headers: { 'X-Entity-Ref-ID': 'website-builders-bd-login-verification' }
  });
}

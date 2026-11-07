import crypto from 'node:crypto';

export const b64u = (b) => Buffer.from(b).toString('base64url');
export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const hmac = (key, s) => crypto.createHmac('sha256', key).update(s).digest('hex');
export const now = () => Math.floor(Date.now() / 1000);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function safeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[A-Za-z]{2,}$/;
export const normEmail = (e) => String(e ?? '').trim().toLowerCase();

export function maskEmail(e) {
  const [u, d] = String(e).split('@');
  if (!d) return '***';
  return (u.length <= 2 ? u[0] + '*' : u.slice(0, 2) + '***') + '@' + d;
}

export class HttpError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message || code);
    this.status = status; this.code = code; this.extra = extra;
  }
}

/** Simple in-memory sliding-window limiter. */
export class RateLimiter {
  constructor() {
    this.hits = new Map();
    setInterval(() => {
      const t = Date.now();
      for (const [k, v] of this.hits) if (!v.length || t - v[v.length - 1] > 3600e3) this.hits.delete(k);
    }, 60e3).unref();
  }
  /** Throws 429 when `limit` hits were recorded within `windowSec`. */
  check(key, limit, windowSec) {
    const t = Date.now(), from = t - windowSec * 1000;
    const arr = (this.hits.get(key) || []).filter((x) => x > from);
    if (arr.length >= limit) {
      const retry = Math.max(1, Math.ceil((arr[0] + windowSec * 1000 - t) / 1000));
      this.hits.set(key, arr);
      throw new HttpError(429, 'rate_limited', 'Too many requests. Please try again later.', { retryAfter: retry });
    }
    arr.push(t); this.hits.set(key, arr);
  }
}

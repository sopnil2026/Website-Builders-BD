// Web Push (RFC 8030 + VAPID RFC 8292 + aes128gcm payload encryption RFC 8291) using only node:crypto.
import crypto from 'node:crypto';
import { b64u } from './util.js';
import { config } from './config.js';
import { kvGet, kvSet } from './db.js';

let vapid = null;
export function getVapid() {
  if (vapid) return vapid;
  let { publicKey, privateKey } = config.push;
  if (!publicKey || !privateKey) { publicKey = kvGet('vapid_public'); privateKey = kvGet('vapid_private'); }
  if (!publicKey || !privateKey) {
    const kp = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const j = kp.privateKey.export({ format: 'jwk' });
    publicKey = b64u(Buffer.concat([Buffer.from([4]), Buffer.from(j.x, 'base64url'), Buffer.from(j.y, 'base64url')]));
    privateKey = j.d; kvSet('vapid_public', publicKey); kvSet('vapid_private', privateKey);
    console.warn('[warn] Generated VAPID keys and stored them in the database. On hosts with a temporary disk set VAPID_PUBLIC / VAPID_PRIVATE (run: npm run keys).');
  }
  const pub = Buffer.from(publicKey, 'base64url');
  const key = crypto.createPrivateKey({ key: { kty: 'EC', crv: 'P-256', x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)), d: privateKey }, format: 'jwk' });
  vapid = { publicKey, key };
  return vapid;
}

export function vapidJwt(endpoint, v = getVapid()) {
  const h = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const c = b64u(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: config.push.subject }));
  const sig = crypto.sign('sha256', Buffer.from(`${h}.${c}`), { key: v.key, dsaEncoding: 'ieee-p1363' });
  return `${h}.${c}.${b64u(sig)}`;
}

export function encryptPayload(payload, p256dh, authSecret) {
  const ua = Buffer.from(p256dh, 'base64url'), auth = Buffer.from(authSecret, 'base64url');
  if (ua.length !== 65 || ua[0] !== 4 || auth.length < 16) throw new Error('invalid subscription keys');
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
  const asPub = ecdh.getPublicKey();
  const shared = ecdh.computeSecret(ua);
  const salt = crypto.randomBytes(16);
  const prk = Buffer.from(crypto.hkdfSync('sha256', shared, auth, Buffer.concat([Buffer.from('WebPush: info\0'), ua, asPub]), 32));
  const cek = Buffer.from(crypto.hkdfSync('sha256', prk, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', prk, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const ct = Buffer.concat([cipher.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([salt, rs, Buffer.from([65]), asPub, ct]);
}

const ALLOWED_HOSTS = ['fcm.googleapis.com', 'android.googleapis.com', 'updates.push.services.mozilla.com', 'push.services.mozilla.com', 'web.push.apple.com', 'notify.windows.com'];
export function endpointAllowed(endpoint) {
  let u; try { u = new URL(endpoint); } catch { return false; }
  if (config.push.allowInsecure) return true;
  return u.protocol === 'https:' && ALLOWED_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith('.' + h));
}

/** Returns 'ok' | 'gone' | 'error'. */
export async function sendPush(sub, payloadObj) {
  const body = encryptPayload(JSON.stringify(payloadObj), sub.p256dh, sub.auth);
  const v = getVapid();
  try {
    const r = await fetch(sub.endpoint, {
      method: 'POST', body, signal: AbortSignal.timeout(15000),
      headers: { 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '86400', Urgency: 'normal', Authorization: `vapid t=${vapidJwt(sub.endpoint, v)}, k=${v.publicKey}` },
    });
    if (r.status === 404 || r.status === 410) return 'gone';
    return r.status >= 200 && r.status < 300 ? 'ok' : 'error';
  } catch { return 'error'; }
}

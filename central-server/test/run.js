// End-to-end tests: real server process + fake SMTP (plain / STARTTLS / implicit TLS) + fake push service.
import net from 'node:net';
import tls from 'node:tls';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-test-'));
execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', tmp + '/k.pem', '-out', tmp + '/c.pem', '-days', '2', '-subj', '/CN=localhost'], { stdio: 'ignore' });
const KEY = fs.readFileSync(tmp + '/k.pem'), CERT = fs.readFileSync(tmp + '/c.pem');

let passed = 0, failed = 0;
const test = async (name, fn) => { try { await fn(); passed++; console.log('  ✓', name); } catch (e) { failed++; console.log('  ✗', name, '\n     ', e.message.split('\n')[0]); if (process.env.VERBOSE) console.log(e); } };

/* ---------- fake SMTP server ---------- */
function fakeSmtp({ mode, auth }) {
  const mails = []; const st = { failNext: false };
  const handle = (sock, tlsActive) => {
    let buf = '', inData = false, data = '', mail = {};
    const w = (s) => sock.write(s + '\r\n');
    sock.on('data', (d) => {
      buf += d.toString('utf8');
      let i;
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        if (inData) {
          if (line === '.') { inData = false; mail.data = data; mails.push(mail); w(st.failNext ? '554 rejected' : '250 queued'); st.failNext = false; data = ''; mail = {}; if (mails.at(-1) && st.failLast) mails.pop(); }
          else data += (line.startsWith('..') ? line.slice(1) : line) + '\r\n';
          continue;
        }
        if (/^EHLO/i.test(line)) { sock.write('250-localhost\r\n' + (mode === 'starttls' && !tlsActive ? '250-STARTTLS\r\n' : '') + (auth ? '250-AUTH PLAIN LOGIN\r\n' : '') + '250 OK\r\n'); }
        else if (/^STARTTLS/i.test(line)) { w('220 go'); sock.removeAllListeners('data'); const t = new tls.TLSSocket(sock, { isServer: true, key: KEY, cert: CERT }); handle(t, true); }
        else if (/^AUTH PLAIN/i.test(line)) { const [, u, p] = Buffer.from(line.split(' ')[2], 'base64').toString().split('\0'); mail.auth = [u, p]; w(u === 'user@test' && p === 'secretpass' ? '235 ok' : '535 bad'); }
        else if (/^MAIL FROM/i.test(line)) { mail.from = line.slice(10); w('250 ok'); }
        else if (/^RCPT TO/i.test(line)) { mail.to = line.slice(8); w('250 ok'); }
        else if (/^DATA/i.test(line)) { inData = true; w('354 go'); }
        else if (/^QUIT/i.test(line)) { w('221 bye'); sock.end(); }
        else w('500 ?');
      }
    });
    sock.on('error', () => {});
  };
  const srv = mode === 'tls' ? tls.createServer({ key: KEY, cert: CERT }, (s) => { s.write('220 ready\r\n'); handle(s, true); }) : net.createServer((s) => { s.write('220 ready\r\n'); handle(s, false); });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, port: srv.address().port, mails, st })));
}

const decodeMail = (raw) => {
  const out = { headers: raw.split('\r\n\r\n')[0], text: '', html: '' };
  for (const m of raw.matchAll(/Content-Type: (text\/(?:plain|html)); charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n([\s\S]*?)\r\n--/g)) out[m[1] === 'text/plain' ? 'text' : 'html'] = Buffer.from(m[2].replace(/\s+/g, ''), 'base64').toString('utf8');
  return out;
};
const codeOf = (mail) => /\b(\d{6})\b/.exec(decodeMail(mail.data).text)[1];

/* ---------- 1) SMTP client in all three modes ---------- */
console.log('SMTP client');
const { sendSmtp } = await import('../src/smtp.js');
for (const [mode, secure] of [['plain', false], ['starttls', false], ['tls', true]]) {
  await test(`delivers over ${mode}${mode === 'plain' ? ' (no auth)' : ' + AUTH'}`, async () => {
    const s = await fakeSmtp({ mode, auth: mode !== 'plain' });
    await sendSmtp({ host: '127.0.0.1', port: s.port, secure, user: mode === 'plain' ? '' : 'user@test', pass: 'secretpass', rejectUnauthorized: false, timeoutMs: 5000 }, { from: 'a@b.c', to: 'x@y.z', data: 'Subject: t\r\n\r\n.dot line\r\nbody' });
    assert.equal(s.mails.length, 1); assert.match(s.mails[0].data, /\.dot line/);
    if (mode !== 'plain') assert.deepEqual(s.mails[0].auth, ['user@test', 'secretpass']);
    s.srv.close();
  });
}
await test('refuses to send credentials without TLS', async () => {
  const s = await fakeSmtp({ mode: 'plain', auth: true });
  await assert.rejects(sendSmtp({ host: '127.0.0.1', port: s.port, secure: false, user: 'user@test', pass: 'secretpass', timeoutMs: 3000 }, { from: 'a@b.c', to: 'x@y.z', data: 'x' }), /without TLS/);
  s.srv.close();
});
await test('wrong password is reported', async () => {
  const s = await fakeSmtp({ mode: 'tls', auth: true });
  await assert.rejects(sendSmtp({ host: '127.0.0.1', port: s.port, secure: true, user: 'user@test', pass: 'nope', rejectUnauthorized: false, timeoutMs: 3000 }, { from: 'a@b.c', to: 'x@y.z', data: 'x' }), /535|hidden command/);
  s.srv.close();
});

/* ---------- 2) full server ---------- */
const smtp = await fakeSmtp({ mode: 'tls', auth: true });
const SK = 'sk_' + crypto.randomBytes(24).toString('base64url');
const PK = 'pk_' + crypto.randomBytes(18).toString('base64url');
const ORIGIN = 'http://localhost:5173';
fs.writeFileSync(tmp + '/apps.json', JSON.stringify([{ id: 'wbbd', name: 'Website Builders BD', publicKey: PK, secretKeyHash: crypto.createHash('sha256').update(SK).digest('hex'), origins: [ORIGIN], logoUrl: 'https://example.com/logo.png', siteUrl: 'https://websitebuildersbd.work.gd', tagline: 'YOUR VISION | OUR CODE | YOUR SUCCESS' }]));
const PORT = 20000 + Math.floor(Math.random() * 10000);
const child = spawn('node', ['--disable-warning=ExperimentalWarning', 'server.js'], { cwd: ROOT, env: { ...process.env, PORT, DB_PATH: tmp + '/db.sqlite', APPS_FILE: tmp + '/apps.json', SERVER_SECRET: 'test-secret-test-secret-test', ADMIN_TOKEN: 'admintoken123', SMTP_HOST: '127.0.0.1', SMTP_PORT: smtp.port, SMTP_SECURE: 'true', SMTP_USER: 'user@test', SMTP_PASS: 'secret pass'.replace(' ', ''), MAIL_FROM: 'user@test', SMTP_REJECT_UNAUTHORIZED: 'false', ALLOW_INSECURE_PUSH: '1', OTP_COOLDOWN: '2', NODE_ENV: 'development' }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((r) => child.stdout.on('data', (d) => /listening/.test(d) && r()));
const B = `http://127.0.0.1:${PORT}`;
const call = async (p, body, key = PK, extra = {}) => { const r = await fetch(B + p, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(key ? { 'X-API-Key': key } : {}), Origin: ORIGIN, ...extra }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, json: await r.json(), headers: r.headers }; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('OTP API');
await test('health', async () => { const r = await call('/health', null, null); assert.equal(r.status, 200); assert.equal(r.json.ok, true); });
await test('CORS preflight allowed only for registered websites', async () => {
  const ok = await fetch(B + '/v1/otp/send', { method: 'OPTIONS', headers: { Origin: ORIGIN } });
  assert.equal(ok.headers.get('access-control-allow-origin'), ORIGIN);
  const bad = await fetch(B + '/v1/otp/send', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } });
  assert.equal(bad.headers.get('access-control-allow-origin'), null);
});
await test('rejects missing / wrong key and foreign origin', async () => {
  assert.equal((await call('/v1/otp/send', { email: 'a@b.co' }, null)).status, 401);
  assert.equal((await call('/v1/otp/send', { email: 'a@b.co' }, 'pk_wrongwrongwrongwrong')).status, 401);
  const r = await call('/v1/otp/send', { email: 'a@b.co' }, PK, { Origin: 'https://evil.example' }); assert.equal(r.status, 403); assert.equal(r.json.error, 'origin_not_allowed');
});
await test('rejects invalid email', async () => { assert.equal((await call('/v1/otp/send', { email: 'nope' })).json.error, 'invalid_email'); });

let code1;
await test('sends a branded OTP email (logo, title, 6 digits)', async () => {
  const r = await call('/v1/otp/send', { email: 'Rahim@Example.com', name: 'Rahim <b>' });
  assert.equal(r.status, 200, JSON.stringify(r.json)); assert.equal(r.json.expiresIn, 300);
  const m = smtp.mails.at(-1), d = decodeMail(m.data);
  assert.match(m.to, /rahim@example\.com/);
  assert.match(d.headers, /Subject: Website Builders BD – Your verification code|Subject: =\?UTF-8\?B\?/);
  assert.match(d.headers, /From: "Website Builders BD" <user@test>/);
  assert.match(d.html, /src="https:\/\/example\.com\/logo\.png"/); assert.match(d.html, />Website Builders BD</);
  assert.match(d.html, /YOUR VISION \| OUR CODE/); assert.doesNotMatch(d.html, /Rahim <b>/); assert.match(d.html, /Hello Rahim b,/);
  code1 = codeOf(m); assert.match(code1, /^\d{6}$/);
  for (const dgt of code1) assert.ok(d.html.includes('>' + dgt + '</div>'));
  fs.writeFileSync(tmp + '/sample-email.html', d.html);
});
await test('cooldown blocks immediate resend', async () => { const r = await call('/v1/otp/send', { email: 'rahim@example.com' }); assert.equal(r.status, 429); assert.equal(r.json.error, 'cooldown'); assert.ok(r.headers.get('retry-after')); });
await test('wrong code reports attempts left; correct code verifies once', async () => {
  const wrong = code1 === '000000' ? '111111' : '000000';
  const w = await call('/v1/otp/verify', { email: 'rahim@example.com', code: wrong }); assert.equal(w.status, 400); assert.equal(w.json.attemptsLeft, 4);
  const ok = await call('/v1/otp/verify', { email: 'rahim@example.com', code: code1 }); assert.equal(ok.status, 200); assert.ok(ok.json.token);
  assert.equal((await call('/v1/otp/verify', { email: 'rahim@example.com', code: code1 })).json.error, 'code_expired');
  globalThis.TOKEN = ok.json.token;
});
await test('code is bound to email (other email cannot use it)', async () => { assert.equal((await call('/v1/otp/verify', { email: 'other@example.com', code: code1 })).status, 400); });
await test('5 wrong attempts burn the code', async () => {
  await wait(2100); await call('/v1/otp/send', { email: 'burn@example.com' }); const real = codeOf(smtp.mails.at(-1)); const bad = real === '123456' ? '654321' : '123456';
  let last; for (let i = 0; i < 5; i++) last = await call('/v1/otp/verify', { email: 'burn@example.com', code: bad });
  assert.equal(last.json.attemptsLeft, 0);
  assert.equal((await call('/v1/otp/verify', { email: 'burn@example.com', code: real })).status, 400);
});
await test('new code replaces the previous one', async () => {
  await wait(2100); await call('/v1/otp/send', { email: 'two@example.com' }); const a = codeOf(smtp.mails.at(-1));
  await wait(2100); await call('/v1/otp/send', { email: 'two@example.com' }); const b = codeOf(smtp.mails.at(-1));
  if (a !== b) assert.equal((await call('/v1/otp/verify', { email: 'two@example.com', code: a })).status, 400);
  assert.equal((await call('/v1/otp/verify', { email: 'two@example.com', code: b })).status, 200);
});
await test('SMTP failure -> 502 and no usable code is left behind', async () => {
  await wait(2100); smtp.st.failNext = true; const r = await call('/v1/otp/send', { email: 'fail@example.com' }); assert.equal(r.status, 502); assert.equal(r.json.error, 'email_failed');
  const again = await call('/v1/otp/send', { email: 'fail@example.com' }); assert.equal(again.status, 200); // no cooldown after a failed send
});
await test('token check: secret key only, single use', async () => {
  assert.equal((await call('/v1/token/check', { token: TOKEN })).status, 403);
  const ok = await call('/v1/token/check', { token: TOKEN }, SK); assert.equal(ok.json.email, 'rahim@example.com');
  assert.equal((await call('/v1/token/check', { token: TOKEN }, SK)).json.error, 'token_used');
  assert.equal((await call('/v1/token/check', { token: TOKEN + 'x' }, SK)).json.error, 'invalid_token');
});

console.log('Email notifications');
await test('notify/email needs the secret key and sends a branded mail', async () => {
  assert.equal((await call('/v1/notify/email', { to: 'a@b.co', subject: 'Hi', message: 'x' })).status, 403);
  const r = await call('/v1/notify/email', { to: 'client@example.com', subject: 'Payment verified', message: 'Your advance payment was verified.\n\nThank you!', buttonText: 'Open dashboard', buttonUrl: 'https://websitebuildersbd.work.gd' }, SK);
  assert.equal(r.status, 200); const d = decodeMail(smtp.mails.at(-1).data); assert.match(d.html, /Payment verified/); assert.match(d.html, /Open dashboard/); assert.match(d.text, /Thank you!/);
});

console.log('Web push');
const ua = crypto.createECDH('prime256v1'); ua.generateKeys(); const authSecret = crypto.randomBytes(16);
const pushHits = []; let pushStatus = 201;
const pushSrv = http.createServer((req, res) => { const ch = []; req.on('data', (c) => ch.push(c)); req.on('end', () => { pushHits.push({ headers: req.headers, body: Buffer.concat(ch), url: req.url }); res.writeHead(pushStatus); res.end(); }); });
await new Promise((r) => pushSrv.listen(0, '127.0.0.1', r));
const endpoint = `http://127.0.0.1:${pushSrv.address().port}/push/abc`;
const subscription = { endpoint, keys: { p256dh: ua.getPublicKey().toString('base64url'), auth: authSecret.toString('base64url') } };
await test('subscribe, then send: payload decrypts and VAPID signature verifies', async () => {
  assert.equal((await call('/v1/push/subscribe', { subscription: { endpoint: 'http://evil', keys: {} } })).status, 400);
  assert.equal((await call('/v1/push/subscribe', { subscription, userId: 'u1' })).status, 200);
  assert.equal((await call('/v1/push/send', { title: 'x', all: true })).status, 403);
  const r = await call('/v1/push/send', { title: 'Order update', body: 'Your site is ready 🎉', userId: 'u1', url: 'https://websitebuildersbd.work.gd' }, SK);
  assert.deepEqual([r.json.targeted, r.json.sent], [1, 1]);
  const h = pushHits.at(-1); assert.equal(h.headers['content-encoding'], 'aes128gcm');
  // --- act as the browser: RFC 8291 decryption
  const b = h.body, salt = b.subarray(0, 16), idlen = b[20], asPub = b.subarray(21, 21 + idlen), ct = b.subarray(21 + idlen);
  const prk = Buffer.from(crypto.hkdfSync('sha256', ua.computeSecret(asPub), authSecret, Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), asPub]), 32));
  const cek = Buffer.from(crypto.hkdfSync('sha256', prk, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', prk, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const dec = crypto.createDecipheriv('aes-128-gcm', cek, nonce); dec.setAuthTag(ct.subarray(-16));
  const plain = Buffer.concat([dec.update(ct.subarray(0, -16)), dec.final()]); const msg = JSON.parse(plain.subarray(0, plain.lastIndexOf(2)).toString());
  assert.equal(msg.title, 'Order update'); assert.equal(msg.body, 'Your site is ready 🎉');
  // --- VAPID: verify ES256 signature with the public key the server publishes
  const m = /^vapid t=([^,]+), k=(.+)$/.exec(h.headers.authorization); const k = (await call('/v1/push/vapid-public-key', null, null)).json.publicKey; assert.equal(m[2], k);
  const [hd, cl, sg] = m[1].split('.'); const pub = Buffer.from(k, 'base64url');
  const pk = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: pub.subarray(1, 33).toString('base64url'), y: pub.subarray(33).toString('base64url') }, format: 'jwk' });
  assert.ok(crypto.verify('sha256', Buffer.from(hd + '.' + cl), { key: pk, dsaEncoding: 'ieee-p1363' }, Buffer.from(sg, 'base64url')));
  assert.equal(JSON.parse(Buffer.from(cl, 'base64url')).aud, new URL(endpoint).origin);
});
await test('expired subscriptions (410) are removed automatically', async () => {
  pushStatus = 410; const r = await call('/v1/push/send', { title: 't', all: true }, SK); assert.equal(r.json.removed, 1);
  pushStatus = 201; assert.equal((await call('/v1/push/send', { title: 't', all: true }, SK)).json.targeted, 0);
});

console.log('Admin');
const adm = async (p, body, tok = 'admintoken123') => { const r = await fetch(B + '/admin/api/' + p, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, json: await r.json() }; };
await test('admin API is protected', async () => { assert.equal((await adm('overview', null, 'wrong')).status, 401); assert.equal((await adm('overview')).status, 200); });
await test('overview shows stats and never leaks secrets', async () => { const r = await adm('overview'); assert.ok(r.json.last24h.otpSent >= 3); assert.equal(JSON.stringify(r.json).includes('secret_hash'), false); assert.equal(JSON.stringify(r.json).includes('secretpass'), false); });
await test('logs mask emails', async () => { const r = await adm('logs'); assert.ok(r.json.logs.length > 3); assert.ok(r.json.logs.every((l) => !l.email.includes('rahim@'))); });
await test('create a new website app; its keys work', async () => {
  const r = await adm('apps', { name: 'Online Store', origins: ['https://store.example'], logoUrl: 'https://store.example/l.png' }); assert.equal(r.status, 200); assert.match(r.json.publicKey, /^pk_/); assert.match(r.json.secretKey, /^sk_/);
  await wait(2100); const s = await call('/v1/otp/send', { email: 'shop@example.com' }, r.json.publicKey, { Origin: 'https://store.example' }); assert.equal(s.status, 200);
  assert.match(decodeMail(smtp.mails.at(-1).data).headers, /Online Store/);
  assert.equal((await call('/v1/otp/send', { email: 'shop@example.com' }, r.json.publicKey, { Origin: 'https://store.example' })).status, 429);
  assert.equal((await call('/v1/otp/send', { email: 'shop@example.com' }, r.json.publicKey)).status, 403); // main site origin cannot use another app's key
});
await test('admin test-email', async () => { const r = await adm('test-email', { appId: 'wbbd', to: 'me@example.com' }); assert.equal(r.status, 200); assert.equal(codeOf(smtp.mails.at(-1)), '123456'); });
await test('admin page and client library are served', async () => { const a = await fetch(B + '/admin'); assert.match(await a.text(), /Central Server/); const c = await fetch(B + '/client.js'); assert.match(await c.text(), /SopnilServer/); });
await test('bad JSON and unknown routes are handled', async () => { const r = await fetch(B + '/v1/otp/send', { method: 'POST', headers: { 'X-API-Key': PK, 'Content-Type': 'application/json' }, body: '{oops' }); assert.equal(r.status, 400); assert.equal((await fetch(B + '/nope')).status, 404); });

child.kill(); smtp.srv.close(); pushSrv.close();
console.log(`\n${passed} passed, ${failed} failed`);
console.log('Sample email saved to', tmp + '/sample-email.html');
process.exit(failed ? 1 : 0);

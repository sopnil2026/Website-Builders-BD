// Minimal SMTP client (implicit TLS on 465 or STARTTLS on 587/25, AUTH PLAIN/LOGIN). No dependencies.
import net from 'node:net';
import tls from 'node:tls';
import os from 'node:os';

class Conn {
  constructor(sock, timeoutMs) {
    this.sock = sock; this.buf = ''; this.cur = []; this.queue = []; this.waiters = []; this.dead = null;
    sock.setEncoding('utf8');
    sock.setTimeout(timeoutMs, () => this.fail(new Error('SMTP timeout')));
    this.onData = (d) => {
      this.buf += d;
      let i;
      while ((i = this.buf.indexOf('\r\n')) >= 0) {
        const line = this.buf.slice(0, i); this.buf = this.buf.slice(i + 2);
        this.cur.push(line);
        if (/^\d{3}( |$)/.test(line)) { this.deliver({ code: +line.slice(0, 3), text: this.cur.join('\n') }); this.cur = []; }
      }
    };
    this.onClose = () => this.fail(new Error('SMTP connection closed'));
    sock.on('data', this.onData); sock.on('error', (e) => this.fail(e)); sock.on('close', this.onClose);
  }
  deliver(r) { const w = this.waiters.shift(); if (w) w.resolve(r); else this.queue.push(r); }
  fail(e) { if (this.dead) return; this.dead = e; this.waiters.splice(0).forEach((w) => w.reject(e)); this.sock.destroy(); }
  read() {
    if (this.queue.length) return Promise.resolve(this.queue.shift());
    if (this.dead) return Promise.reject(this.dead);
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
  }
  async cmd(line, expect, secret = false) {
    if (line !== null) this.sock.write(line + '\r\n');
    const r = await this.read();
    if (!expect.includes(r.code)) throw new Error(`SMTP ${secret ? '(hidden command)' : line} -> ${r.text.slice(0, 200)}`);
    return r;
  }
}

const addr = (s) => (/<([^>]+)>/.exec(s) || [null, s])[1].trim();

export async function sendSmtp(cfg, { from, to, data }) {
  if (!cfg.host) throw new Error('SMTP_HOST is not configured');
  const opts = { host: cfg.host, port: cfg.port, servername: cfg.host, rejectUnauthorized: cfg.rejectUnauthorized };
  const sock = await new Promise((resolve, reject) => {
    const s = cfg.secure ? tls.connect(opts, () => resolve(s)) : net.connect({ host: cfg.host, port: cfg.port }, () => resolve(s));
    s.once('error', (e) => {
      const why = e.message || e.code || (e.errors && e.errors.map((x) => x.code || x.message).join('/')) || 'unknown';
      reject(new Error(`Cannot connect to ${cfg.host}:${cfg.port} (${why}). Some hosts (e.g. Render free) block SMTP ports – set BREVO_API_KEY to send over HTTPS instead.`));
    });
    s.setTimeout(cfg.timeoutMs, () => { s.destroy(); reject(new Error(`Connection to ${cfg.host}:${cfg.port} timed out. Some hosts (e.g. Render free) block SMTP ports – set BREVO_API_KEY to send over HTTPS instead.`)); });
  });
  let c = new Conn(sock, cfg.timeoutMs);
  try {
    await c.cmd(null, [220]);
    const me = os.hostname().replace(/[^A-Za-z0-9.-]/g, '') || 'localhost';
    let ehlo = await c.cmd('EHLO ' + me, [250]);
    if (!cfg.secure && /STARTTLS/i.test(ehlo.text)) {
      await c.cmd('STARTTLS', [220]);
      sock.removeListener('data', c.onData); sock.removeListener('close', c.onClose); sock.setTimeout(0);
      const t = tls.connect({ socket: sock, servername: cfg.host, rejectUnauthorized: cfg.rejectUnauthorized });
      await new Promise((res, rej) => { t.once('secureConnect', res); t.once('error', rej); });
      c = new Conn(t, cfg.timeoutMs);
      ehlo = await c.cmd('EHLO ' + me, [250]);
    }
    if (cfg.user) {
      if (!cfg.secure && !(c.sock instanceof tls.TLSSocket)) throw new Error('Refusing to send credentials without TLS');
      if (/AUTH[^\n]*PLAIN/i.test(ehlo.text) || !/AUTH/i.test(ehlo.text)) {
        await c.cmd('AUTH PLAIN ' + Buffer.from(`\0${cfg.user}\0${cfg.pass}`).toString('base64'), [235], true);
      } else {
        await c.cmd('AUTH LOGIN', [334]);
        await c.cmd(Buffer.from(cfg.user).toString('base64'), [334], true);
        await c.cmd(Buffer.from(cfg.pass).toString('base64'), [235], true);
      }
    }
    await c.cmd(`MAIL FROM:<${addr(from)}>`, [250]);
    await c.cmd(`RCPT TO:<${addr(to)}>`, [250, 251]);
    await c.cmd('DATA', [354]);
    const body = data.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
    c.sock.write(body + '\r\n.\r\n');
    const r = await c.read();
    if (r.code !== 250) throw new Error('SMTP DATA -> ' + r.text.slice(0, 200));
    try { c.sock.write('QUIT\r\n'); } catch { /* ignore */ }
    c.sock.end();
    return true;
  } catch (e) { c.fail(e); throw e; }
}

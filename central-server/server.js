import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { config, ROOT } from './src/config.js';
import './src/db.js';
import { seedApps, allOrigins } from './src/apps.js';
import { findRoute } from './src/routes.js';
import { HttpError } from './src/util.js';

const seeded = seedApps();
const STATIC = { '/admin': ['admin.html', 'text/html; charset=utf-8'], '/client.js': ['sopnil-client.js', 'text/javascript; charset=utf-8'] };

function clientIp(req) {
  if (config.trustProxy) { const f = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(); if (f) return f; }
  return req.socket.remoteAddress || '';
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new HttpError(413, 'payload_too_large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { const v = JSON.parse(Buffer.concat(chunks).toString('utf8')); resolve(v && typeof v === 'object' && !Array.isArray(v) ? v : {}); } catch { reject(new HttpError(400, 'invalid_json')); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const send = (status, obj, extra = {}) => {
    const body = JSON.stringify(obj);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra });
    res.end(body);
  };
  const cors = {};
  if (origin && allOrigins().has(origin)) Object.assign(cors, { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' });
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { ...cors, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,X-API-Key', 'Access-Control-Max-Age': '600' });
      return res.end();
    }
    const st = req.method === 'GET' && STATIC[url.pathname];
    if (st) {
      const file = path.join(ROOT, 'public', st[0]);
      res.writeHead(200, { 'Content-Type': st[1], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', ...(url.pathname === '/admin' ? { 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; frame-ancestors 'none'" } : { 'Access-Control-Allow-Origin': '*' }) });
      return res.end(fs.readFileSync(file));
    }
    const r = findRoute(req.method, url.pathname);
    if (!r) throw new HttpError(404, 'not_found', 'Unknown endpoint.');
    const body = req.method === 'POST' ? await readBody(req) : {};
    const out = await r.handler({ req, res, url, body, ip: clientIp(req) });
    send(200, out, cors);
  } catch (e) {
    if (e instanceof HttpError) {
      const extra = { ...cors }; if (e.extra.retryAfter) extra['Retry-After'] = String(e.extra.retryAfter);
      return send(e.status, { ok: false, error: e.code, message: e.message, ...e.extra }, extra);
    }
    console.error('[error]', e);
    send(500, { ok: false, error: 'server_error', message: 'Something went wrong.' }, cors);
  }
});

server.listen(config.port, () => {
  console.log(`Sopnil Central Server listening on :${config.port}  (apps loaded: ${seeded}, smtp: ${config.smtp.user ? config.smtp.host : 'NOT CONFIGURED'}, admin: ${config.adminToken ? 'on' : 'off'})`);
});
process.on('unhandledRejection', (e) => console.error('[unhandled]', e));

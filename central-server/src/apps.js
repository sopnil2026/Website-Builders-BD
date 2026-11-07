import fs from 'node:fs';
import crypto from 'node:crypto';
import { q } from './db.js';
import { config } from './config.js';
import { sha256, now } from './util.js';

const parse = (r) => r && { ...r, origins: JSON.parse(r.origins || '[]') };
export const getAppById = (id) => parse(q.get('SELECT * FROM apps WHERE id=? AND active=1', id));
export const listApps = () => q.all('SELECT * FROM apps ORDER BY created_at').map(parse);

export function findAppByKey(key) {
  key = String(key || '');
  if (key.startsWith('pk_')) { const a = parse(q.get('SELECT * FROM apps WHERE public_key=? AND active=1', key)); return a && { app: a, kind: 'pk' }; }
  if (key.startsWith('sk_')) { const a = parse(q.get('SELECT * FROM apps WHERE secret_hash=? AND active=1', sha256(key))); return a && { app: a, kind: 'sk' }; }
  return null;
}

let originCache = { t: 0, set: new Set() };
export function allOrigins() {
  if (Date.now() - originCache.t > 5000) {
    originCache = { t: Date.now(), set: new Set(listApps().filter((a) => a.active).flatMap((a) => a.origins)) };
  }
  return originCache.set;
}
export const dropOriginCache = () => { originCache.t = 0; };

export function upsertApp(a, source = 'admin') {
  const origins = JSON.stringify((a.origins || []).map((o) => String(o).replace(/\/+$/, '')));
  const ex = q.get('SELECT id FROM apps WHERE id=?', a.id);
  if (ex) {
    q.run(`UPDATE apps SET name=?,public_key=?,origins=?,logo_url=?,brand_color=?,site_url=?,tagline=?,support_email=?,from_name=?,secret_hash=COALESCE(?,secret_hash),source=?,active=1 WHERE id=?`,
      a.name, a.publicKey, origins, a.logoUrl || '', a.brandColor || '#f97316', a.siteUrl || '', a.tagline || '', a.supportEmail || '', a.fromName || '', a.secretKeyHash || null, source, a.id);
  } else {
    q.run(`INSERT INTO apps(id,name,public_key,secret_hash,origins,logo_url,brand_color,site_url,tagline,support_email,from_name,source,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      a.id, a.name, a.publicKey, a.secretKeyHash || null, origins, a.logoUrl || '', a.brandColor || '#f97316', a.siteUrl || '', a.tagline || '', a.supportEmail || '', a.fromName || '', source, now());
  }
  dropOriginCache();
}

export function newKeys() {
  return { publicKey: 'pk_' + crypto.randomBytes(18).toString('base64url'), secretKey: 'sk_' + crypto.randomBytes(32).toString('base64url') };
}

/** Apps listed in apps.config.json are (re)created at every start, so they survive hosts with a temporary disk. */
export function seedApps() {
  let list = [];
  try { list = JSON.parse(fs.readFileSync(config.appsFile, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') console.warn('[warn] apps file:', e.message); }
  for (const a of list) {
    if (!a.id || !a.name || !/^pk_[A-Za-z0-9_-]{16,}$/.test(a.publicKey || '')) { console.warn('[warn] skipping invalid app in apps file:', a.id); continue; }
    upsertApp(a, 'config');
  }
  return list.length;
}

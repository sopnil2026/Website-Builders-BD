import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
const db = new DatabaseSync(config.dbPath);
db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
db.exec(`
CREATE TABLE IF NOT EXISTS apps(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, public_key TEXT UNIQUE NOT NULL, secret_hash TEXT,
  origins TEXT NOT NULL DEFAULT '[]', logo_url TEXT DEFAULT '', brand_color TEXT DEFAULT '#f97316',
  site_url TEXT DEFAULT '', tagline TEXT DEFAULT '', support_email TEXT DEFAULT '', from_name TEXT DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1, source TEXT NOT NULL DEFAULT 'admin', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS otps(
  id INTEGER PRIMARY KEY AUTOINCREMENT, app_id TEXT NOT NULL, email TEXT NOT NULL, purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  used INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, ip TEXT DEFAULT '');
CREATE INDEX IF NOT EXISTS otps_lookup ON otps(app_id,email,purpose,created_at);
CREATE TABLE IF NOT EXISTS logs(
  id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, app_id TEXT, type TEXT NOT NULL,
  email TEXT DEFAULT '', ip TEXT DEFAULT '', detail TEXT DEFAULT '');
CREATE INDEX IF NOT EXISTS logs_ts ON logs(ts);
CREATE TABLE IF NOT EXISTS push_subs(
  id INTEGER PRIMARY KEY AUTOINCREMENT, app_id TEXT NOT NULL, endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL, auth TEXT NOT NULL, user_id TEXT DEFAULT '', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS used_tokens(jti TEXT PRIMARY KEY, exp INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT NOT NULL);
`);

export const q = {
  get: (sql, ...p) => db.prepare(sql).get(...p),
  all: (sql, ...p) => db.prepare(sql).all(...p),
  run: (sql, ...p) => db.prepare(sql).run(...p),
};
export const kvGet = (k) => q.get('SELECT v FROM kv WHERE k=?', k)?.v;
export const kvSet = (k, v) => q.run('INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v', k, v);
export function log(appId, type, email = '', ip = '', detail = '') {
  try { q.run('INSERT INTO logs(ts,app_id,type,email,ip,detail) VALUES(?,?,?,?,?,?)', Math.floor(Date.now() / 1000), appId || '', type, email, ip, String(detail).slice(0, 300)); } catch { /* never break a request because of logging */ }
}
export default db;

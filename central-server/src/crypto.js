import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export function makeOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function makeOneTimeTicket() {
  return randomBytes(32).toString('base64url');
}

export function digestOtp(pepper, projectSlug, userId, sessionId, challengeId, code) {
  const message = ['otp', projectSlug, userId, sessionId, challengeId, code].join('|');
  return createHmac('sha256', pepper).update(message).digest('hex');
}

export function digestTicket(pepper, projectSlug, userId, sessionId, ticket) {
  const message = ['ticket', projectSlug, userId, sessionId, ticket].join('|');
  return createHmac('sha256', pepper).update(message).digest('hex');
}

export function safeEqualHex(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  if (!/^[0-9a-f]{64}$/i.test(left) || !/^[0-9a-f]{64}$/i.test(right)) return false;
  const a = Buffer.from(left, 'hex');
  const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

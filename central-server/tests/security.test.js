import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeOtp, makeOneTimeTicket, digestOtp, digestTicket, safeEqualHex
} from '../src/crypto.js';
import { buildOtpEmail, OTP_EMAIL_SUBJECT } from '../src/email.js';

test('OTP generator always returns six digits', () => {
  for (let i = 0; i < 500; i++) assert.match(makeOtp(), /^[0-9]{6}$/);
});

test('OTP digest is bound to the user, session and challenge', () => {
  const digest = digestOtp('test-secret', 'website-builders-bd', 'user-1', 'session-1', 'challenge-1', '123456');
  assert.equal(digest.length, 64);
  assert.equal(digest, digestOtp('test-secret', 'website-builders-bd', 'user-1', 'session-1', 'challenge-1', '123456'));
  assert.notEqual(digest, digestOtp('test-secret', 'website-builders-bd', 'user-2', 'session-1', 'challenge-1', '123456'));
  assert.notEqual(digest, digestOtp('test-secret', 'website-builders-bd', 'user-1', 'session-2', 'challenge-1', '123456'));
});

test('ticket token is random-format and its digest is context-bound', () => {
  const ticket = makeOneTimeTicket();
  assert.match(ticket, /^[A-Za-z0-9_-]{40,64}$/);
  const digest = digestTicket('test-secret', 'website-builders-bd', 'user-1', 'session-1', ticket);
  assert.equal(digest.length, 64);
  assert.notEqual(digest, digestTicket('test-secret', 'website-builders-bd', 'user-2', 'session-1', ticket));
});

test('hex digest comparison rejects malformed and different values', () => {
  const a = 'a'.repeat(64);
  const b = 'b'.repeat(64);
  assert.equal(safeEqualHex(a, a), true);
  assert.equal(safeEqualHex(a, b), false);
  assert.equal(safeEqualHex('abc', a), false);
  assert.equal(safeEqualHex(null, a), false);
});

test('branded email uses requested subject and official logo URL', () => {
  const email = buildOtpEmail({
    code: '012345',
    logoUrl: 'https://websitebuildersbd.work.gd/assets/logo.png',
    expiresMinutes: 5
  });
  assert.equal(email.subject, OTP_EMAIL_SUBJECT);
  assert.match(email.subject, /Website Builders BD/);
  assert.match(email.subject, /Login Verification Code/);
  assert.match(email.html, /https:\/\/websitebuildersbd\.work\.gd\/assets\/logo\.png/);
  assert.match(email.html, /012345/);
  assert.match(email.text, /012345/);
});

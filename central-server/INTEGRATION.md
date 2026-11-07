# Integration guide – Sopnil Central Server
*(Give this file to an AI assistant together with the server URL and the website's PUBLIC key, and say: "Connect this server to my website's login.")*

**Base URL:** `https://YOUR-SERVER` **Public key:** `pk_…` (browser-safe) **Secret key:** `sk_…` (server-side only)

All requests are JSON. Send the key in the header `X-API-Key`. Browser requests must come from an origin registered for that key (the server answers CORS automatically).
Errors look like `{ "ok": false, "error": "code", "message": "human text", ... }`.

## 1. Email OTP login flow (recommended)
1. User enters email + password. The website verifies the password with its own system.
2. Website calls **`POST /v1/otp/send`** `{ "email": "user@gmail.com", "purpose": "login", "name": "Rahim" }` → `{ ok, expiresIn: 300, resendAfter: 60 }`. The server e-mails a branded 6-digit code.
3. User types the code. Website calls **`POST /v1/otp/verify`** `{ "email": "...", "code": "123456", "purpose": "login" }` → `{ ok, verified: true, token }`.
4. Only now complete the login (create the session / open the dashboard).
5. *Strict mode (when the website has a backend):* send the `token` to your backend and have it call **`POST /v1/token/check`** `{ "token": "..." }` with the **secret key**. It returns `{ ok, email, purpose }` and invalidates the token (single use). Never trust step 3 alone for sensitive data.

```js
// browser, with the tiny client (<script src="https://YOUR-SERVER/client.js"></script>)
const sc = SopnilServer({ url: 'https://YOUR-SERVER', key: 'pk_…' });
await sc.sendOtp(email, { name });
const r = await sc.verifyOtp(email, code);   // throws Error with .code on failure
```

| `error` | meaning / UI action |
|---|---|
| `invalid_email`, `invalid_code_format` | show the message |
| `cooldown` (429, `retryAfter`) | a code was sent <60 s ago – keep the code box open, enable "Resend" after `retryAfter` s |
| `too_many_codes` (429) | >6 codes in an hour for this email |
| `invalid_code` (400, `attemptsLeft`) | wrong code |
| `code_expired`, `too_many_attempts` | ask the user to request a new code |
| `origin_not_allowed` (403) | the website's origin is not registered – add it in `/admin` or `apps.config.json` |
| `email_failed` (502) | SMTP problem on the server – tell the user to retry in a minute |

Purposes: `login`, `signup`, `reset` (any `[a-z_]{2,20}` works; each purpose has its own code).

## 2. Email notifications (server-to-server, SECRET key)
`POST /v1/notify/email` `{ "to": "client@gmail.com", "subject": "Payment verified", "message": "Plain text…\n\nSecond paragraph", "buttonText": "Open dashboard", "buttonUrl": "https://…" }` → `{ ok: true }`. Sent with the website's logo and name. Optional `html` replaces `message`.

## 3. Web push notifications
Browser (public key):
```js
await sc.enablePush('/push-sw.js', userIdOrEmail);   // asks permission, subscribes, stores on the server
```
`/push-sw.js` on the website (same folder as index.html):
```js
self.addEventListener('push', e => { const d = e.data ? e.data.json() : {}; e.waitUntil(self.registration.showNotification(d.title || 'Notification', { body: d.body, icon: d.icon, data: { url: d.url } })); });
self.addEventListener('notificationclick', e => { e.notification.close(); e.waitUntil(clients.openWindow(e.notification.data.url || '/')); });
```
Send (SECRET key, from the backend): `POST /v1/push/send` `{ "title": "Order update", "body": "Your site is ready", "url": "https://…", "userId": "rahim@gmail.com" }` or `"all": true`. → `{ targeted, sent, removed, failed }`. Dead subscriptions are removed automatically.
Other endpoints: `GET /v1/push/vapid-public-key`, `POST /v1/push/subscribe` `{subscription, userId}`, `POST /v1/push/unsubscribe` `{endpoint}`.

## 4. Rules for the integrating developer / AI
* Put only the **public** key in browser code. The secret key lives in the website's backend environment variables.
* Never create the OTP UI without a "Resend" button, an error line and a spam-folder hint.
* Do not keep the user logged in before the OTP is verified (for example, sign out of the password system and sign in again after verification; reloading the page must not skip the code).
* Register every new website (name, logo URL, allowed origins) in `/admin` first; the email uses that name and logo.
* Health check: `GET /health`.

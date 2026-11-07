# Sopnil Central Server

One small Node.js server that every website you build can share:

* **Email OTP** – 6-digit codes sent from your Gmail, with a professional branded email (logo + website name) per website.
* **Email notifications** – send branded emails (payment verified, order ready …) from any website's backend.
* **Web push notifications** – browser push to subscribed visitors.
* **Admin dashboard** – `/admin`: statistics, activity log, test email, create/manage websites and keys.

No Firebase, no Supabase, **no npm packages** (nothing to install). Needs Node.js 22.5 or newer. Data is stored in a local SQLite file.

## Deploy on Render (free) – about 5 minutes

1. Render.com → **New → Blueprint** → pick the GitHub repository `Website-Builders-BD` (the file `render.yaml` in the repo root does the rest).
2. When asked, fill in only these values:
   * `SMTP_USER` – your Gmail address
   * `SMTP_PASS` – a Google **App password** (Google Account → Security → 2-Step Verification → App passwords). Not your normal password.
   * `MAIL_FROM` – the same Gmail address
   * `VAPID_PUBLIC` / `VAPID_PRIVATE` – optional, only for push notifications (`npm run keys` prints them)
3. Deploy. Render gives you a URL like `https://sopnil-central-server.onrender.com`.
4. Open `https://YOUR-URL/admin`, log in with the generated `ADMIN_TOKEN` (Render → Environment) and press **Send test OTP email**.

### If the test email fails on Render (SMTP ports are blocked on free plans)
Render's free plan blocks outgoing SMTP (ports 25/465/587). Use the HTTPS email API of **Brevo** instead (free, 300 emails/day):
1. Create a free account at brevo.com → **Senders, domains & dedicated IPs → Senders → Add a sender** with your Gmail address and click the verification link Brevo e-mails you.
2. Brevo → **SMTP & API → API keys → Generate a new API key**.
3. In Render → your service → **Environment**: add `BREVO_API_KEY` = that key, and keep `MAIL_FROM` = the verified Gmail address. Save (Render redeploys).
When `BREVO_API_KEY` is set the server uses it instead of SMTP. `SMTP_USER` / `SMTP_PASS` are then not needed.

> Free Render servers sleep after ~15 minutes without traffic; the first request afterwards takes ~30 s. Use a paid plan or any always-on host (Railway, Fly.io, Koyeb, a VPS, or the Dockerfile) for instant codes.

## Adding another website
Admin page → **Add a new website**, or add an entry to `apps.config.json` (survives restarts on hosts with a temporary disk). Then give your AI assistant **INTEGRATION.md** and the website's *public key*.

## Run locally
```
cp .env.example .env     # fill in values
npm start
npm test                 # 27 end-to-end tests, no internet needed
```

## Security notes
* The **public key** (`pk_…`) may live in website code; it only allows OTP + push-subscribe, only from the website's registered origins, with strict rate limits (60 s cooldown, 6 codes/hour per email, 5 wrong tries per code, per-IP limits).
* The **secret key** (`sk_…`) is for a website's own backend only. Never put it in browser code or in a public repository.
* OTP codes are stored only as HMAC hashes, expire after 5 minutes and work once.
* Emails are masked in the activity log.

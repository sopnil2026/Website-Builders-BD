# Website Builders BD — Central OTP ও Browser Push Deployment

বর্তমান Supabase Auth, Admin/Manager/User role routing, HTML page এবং visual design অপরিবর্তিত রেখে email OTP flow যোগ করা হয়েছে।

## Browser flow

1. Signup Supabase Auth-এ account তৈরি করে এবং Login page-এ ফেরে।
2. Login-এর password Supabase Auth যাচাই করে। প্রথম session non-persistent।
3. Browser authenticated Supabase access token সহ Central Server-এ OTP send request পাঠায়।
4. Central Server Gmail-এ fresh 6-digit code পাঠায়। Server-side expiry 300 seconds, one-time use, resend cooldown এবং rate/attempt limit বাধ্যতামূলক।
5. Verify এবং ticket redeem সফল হলে browser temporary Supabase session persistent করে।
6. Browser is_mfa_verified() RPC দিয়ে server-side MFA row পরীক্ষা করে। তা true না হলে login বন্ধ থাকবে।
7. Role আগের Supabase profiles row থেকেই পড়া হয়; existing Admin/Manager/User panel খোলে।
8. User Panel থেকে push subscription করা যায়; Admin Panel-এর Central Push Admin link server-এর admin interface খোলে।

## Files

- wbbd-central-config.js — public API URL placeholder এবং public Supabase config।
- wbbd-central-auth.js — signup/login flow, OTP interface, authenticated API, session enforcement, push subscription।
- wbbd-central-auth.css — mobile/desktop OTP styling।
- sw.js — existing network-first cache behavior plus push display/click handlers।
- supabase/central-otp-mfa.sql — server-side MFA session table and RLS gates।
- README-CENTRAL-OTP-BN.md — deployment guide.

## Mandatory Supabase migration

Supabase Dashboard → SQL Editor-এ supabase/central-otp-mfa.sql একবার চালান। Migration auth_mfa_sessions table ও is_mfa_verified() function তৈরি করে। RPC JWT-এর Supabase session_id claim-কে server-created record-এর সঙ্গে মেলায়। Browser-এর localStorage marker security authority নয়।

নিজের profile read OTP-এর আগে allow করা আছে, যাতে login role read করতে পারে। Payment data, staff messages, staff profile access, profile edits, payment review, message management এবং admin site-content writes MFA-তে gated। Public content read ও anonymous contact form insert আগের মতোই থাকে।

Central Server-এর ticket redeem route OTP success-এর পর bearer JWT signature/issuer/audience/expiry যাচাই করে ওই একই JWT-এর sub এবং session_id claim দিয়ে auth_mfa_sessions row insert করবে। Supabase service_role key কেবল Central Server-এর environment variable-এ থাকবে; browser-কে table write permission দেওয়া হয়নি। expires_at সর্বোচ্চ 12 ঘণ্টা। Logout বা server-side revoke-এ row delete করতে হবে।

## Central Server REST contract

সব authenticated route-এ Authorization: Bearer <Supabase access token> যাচাই করতে হবে। শুধু browser থেকে পাঠানো email, userId, projectSlug অথবা CORS বিশ্বাস করবেন না।

| Route | Server requirement |
|---|---|
| POST /api/v1/public/otp/send | Supabase JWT verify; email-confirmed user, sub ও session binding; random fresh 6-digit OTP পাঠানো; challengeId, expiresIn=300, resendAfter return |
| POST /api/v1/public/otp/verify | JWT/challenge/user binding; 5-minute expiry; max attempts; atomic one-time consume; short-lived single-use ticket return |
| POST /api/v1/public/otp/ticket/redeem | Ticket one-time redeem; same user/session binding; service_role দিয়ে MFA row write; verified/email/userId return |
| GET /api/v1/push/public-key | VAPID public key return |
| POST /api/v1/public/push/subscribe | JWT verify; subscription-এর owner JWT user id থেকে derive করে store |
| POST /api/v1/admin/push/send | Bearer JWT verify; Supabase profiles-এ role=admin server-side lookup; active subscriptions-এ notification send; sentCount return |

Admin broadcast route-এ browser-এর role value বিশ্বাস করবেন না: server JWT verify করে database থেকে profiles.role=admin নিশ্চিত করবে, তারপর শুধু active push subscriptions-এ notification পাঠাবে। title/body length সীমা এবং same-origin URL validation server-side-ও enforce করুন। OTP plain text database-এ store করবেন না; hash/HMAC, constant-time compare, atomic consume, resend invalidation, IP/email/user rate limits এবং explicit exact-origin CORS allow-list implement করুন। SMTP credentials, VAPID private key, service_role এবং API private keys only server environment variables.

## Deploy checklist

1. Central Node.js server deploy করুন; HTTPS origin সংগ্রহ করুন।
2. wbbd-central-config.js-এর apiBase-এ actual HTTPS origin বসান। Placeholder থাকলে OTP login fail-closed থাকবে।
3. Server-এ routes, Gmail SMTP, VAPID keypair, JWT verification, database MFA row write এবং admin-only push sender deploy করুন।
4. CORS allow-list-এ website origin যোগ করুন (GitHub Pages: https://sopnil2026.github.io; custom domain থাকলে সেটিও)।
5. Supabase migration চালান।
6. Signup, email confirmation, নতুন OTP every login, wrong/expired/reused code, resend, user/admin/manager dashboards, logout/re-login, browser push ও admin send test করুন।

## Not yet live

Repository/ZIP-এ Central Node.js Server source বা deployed API URL নেই। তাই frontend, migration, API contract ও GitHub workflow প্রস্তুত করা যায়; Gmail delivery, OTP validation endpoint, trusted ticket redemption, VAPID delivery এবং end-to-end production tests Central Server না থাকায় সম্পন্ন হয়েছে বলা যাবে না। কোনো mock/demo OTP বা fake login fallback নেই.

# Website Builders BD — Central OTP Deployment

বর্তমান Website Builders BD-এর UI/UX, pages এবং মূল Admin/User Dashboard অপরিবর্তিত রেখে password login-এর পর email OTP যোগ করা হয়েছে। OTP-এর জন্য আলাদা Admin Panel বা push-notification composer নেই।

## Login flow

1. Signup আগের Supabase Auth-এ account তৈরি করে।
2. Login-এর password Supabase Auth যাচাই করে; temporary session persist হয় না।
3. Central Server bearer token যাচাই করে account email-এ নতুন ৬ সংখ্যার OTP পাঠায়।
4. ইমেইলের subject: Website Builders BD — Login Verification Code। ইমেইলে Website Builders BD-এর আসল logo ব্যবহার করা হয়।
5. OTP ৫ মিনিটে expire হয়; resend cooldown ৬০ সেকেন্ড; প্রতি code-এ সর্বোচ্চ ৫টি ভুল চেষ্টা।
6. সঠিক OTP verify হলে one-time ticket redeem হয় এবং একই Supabase session-এর MFA verified record তৈরি হয়।
7. আগের role routing অনুযায়ী মূল User/Admin Dashboard খোলে।

## API routes

- POST /api/v1/public/otp/send
- POST /api/v1/public/otp/verify
- POST /api/v1/public/otp/ticket/redeem
- GET /healthz

## Files

- wbbd-central-config.js — public API URL setting; live URL deploy-এর পর বসবে।
- wbbd-central-auth.js — password, OTP UI, ticket redeem এবং session gate।
- wbbd-central-auth.css — responsive OTP interface।
- central-server/ — Node.js API, Gmail template, tests এবং Dockerfile।
- supabase/central-otp-mfa.sql — MFA, OTP challenge ও one-time ticket schema/functions।

## Security

Server Supabase getUser(token) দিয়ে bearer token যাচাই করে। User ID, email এবং session ID authenticated identity থেকে আসে। OTP/ticket hash ছাড়া database-এ raw OTP/ticket থাকে না। Constant-time hash compare, database row lock-এ attempt count ও atomic single-use, 60-second cooldown, per-user send limit, IP rate limit এবং exact-origin CORS রয়েছে।

Supabase service-role key ও Gmail app password শুধু backend environment-এ থাকবে। Frontend বা GitHub-এ যাবে না। OTP verify না হলে database RLS protected data access আটকে দেয়।

## Database migration

Updated single migration: supabase/central-otp-mfa.sql। এটি Supabase SQL Editor-এ একবার run করতে হবে। Existing policies এবং project schema দেখে apply করার আগে migration review করবেন।

## Backend deployment values

central-server/.env.example-এ environment variable names আছে। Hosting server-এ এগুলো প্রয়োজন:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- GMAIL_USER
- GMAIL_APP_PASSWORD
- ALLOWED_ORIGINS
- EMAIL_LOGO_URL

Gmail SMTP sender account-এর owner-authorized app password প্রয়োজন। Supabase service-role secret Supabase project থেকে owner-authorizedভাবে নিতে হবে। এগুলো ChatGPT chat বা GitHub repository-তে দেবেন না।

Backend deploy হওয়ার পর পাওয়া HTTPS origin root-এর wbbd-central-config.js-এর apiBase-এ বসাতে হবে। তারপর SQL migration, Gmail test email, wrong/expired/reused code test এবং existing User/Admin dashboard e2e test চালাতে হবে।

## Live status

Backend source, SQL, branded email template, API routes এবং automated security tests repository-তে আছে। Hosting service, Gmail sender authorization এবং Supabase service-role secret এই repository-এর অংশ নয়। তাই API এখনো live নয় এবং Gmail OTP production-এ চালু হয়েছে বলা যাবে না। এগুলো owner-authorizedভাবে configure ও end-to-end test না হওয়া পর্যন্ত existing branch merge করা উচিত নয়।

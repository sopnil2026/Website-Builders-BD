# Website Builders BD — Central OTP Backend

এই ফোল্ডারটি Website Builders BD-এর আলাদা OTP API। এখানে কোনো OTP Admin Panel, notification manager বা নতুন dashboard নেই। মূল Website Builders BD-এর Admin/User Dashboard আগের মতোই থাকবে।

## ইমেইলের চেহারা

- Subject: Website Builders BD — Login Verification Code
- Sender display name: Website Builders BD
- Logo: https://websitebuildersbd.work.gd/assets/logo.png
- Code: ৬ সংখ্যার, প্রতি Login-এ নতুন
- মেয়াদ: ৫ মিনিট
- Resend cooldown: ৬০ সেকেন্ড
- প্রতি User/Supabase session: সর্বোচ্চ ১০ মিনিটে ৩টি code
- ভুল চেষ্টা: প্রতি code-এ সর্বোচ্চ ৫ বার
- Verification ticket: স্বল্পমেয়াদি, একবার ব্যবহারযোগ্য

ইমেইলটি authenticated Supabase user-এর account email-এ যাবে। Server browser-এ OTP পাঠাবে না এবং OTP response-এ ফেরত দেবে না।

## API

- POST /api/v1/public/otp/send
- POST /api/v1/public/otp/verify
- POST /api/v1/public/otp/ticket/redeem
- GET /healthz

Frontend contract আগের Website Builders BD integration-এর সঙ্গে মেলানো হয়েছে।

## Backend Environment Variables

এই নামগুলো hosting provider-এর Server Environment Variables-এ দিতে হবে। বাস্তব secret GitHub-এ বা website JavaScript-এ রাখা যাবে না।

- NODE_ENV=production
- PORT=3000
- PROJECT_SLUG=website-builders-bd
- SUPABASE_URL=https://YOUR_PROJECT.supabase.co
- SUPABASE_SERVICE_ROLE_KEY=server-only service role secret
- GMAIL_USER=the Gmail account that sends Website Builders BD login emails
- GMAIL_APP_PASSWORD=that Gmail account's app password
- ALLOWED_ORIGINS=https://websitebuildersbd.work.gd,https://sopnil2026.github.io
- EMAIL_LOGO_URL=https://websitebuildersbd.work.gd/assets/logo.png
- TRUST_PROXY=true only when the hosting provider is a trusted reverse proxy

OTP_PEPPER optional. না দিলে server-only Supabase service-role secret থেকে derived key তৈরি হয়।

Gmail SMTP-তে sender account-এর অনুমোদিত SMTP credential প্রয়োজন। Account owner অনুমতি না দিলে Backend সেই Gmail থেকে ইমেইল পাঠাতে পারবে না। Gmail password বা service-role key chat বা repository-তে paste করবেন না।

## Database setup

Updated single SQL migration file: supabase/central-otp-mfa.sql। এটি Supabase SQL Editor-এ একবার run করতে হবে। এতে private MFA session, OTP challenge এবং one-time ticket table/function তৈরি হয় এবং verified-session check দিয়ে protected website data সুরক্ষিত হয়।

SQL functions শুধু service_role-এর জন্য callable। Database-এ raw OTP বা raw ticket নয়, keyed hash রাখা হয়। Attempt counting ও one-time consume PostgreSQL row lock দিয়ে atomic।

## Local validation

এই folder থেকে:
1. npm install
2. .env.example কপি করে .env তৈরি করুন এবং server-only values বসান।
3. npm test
4. npm start

Mandatory secret না থাকলে server startup fail করবে। কোনো fake/demo OTP mode নেই।

## Deployment

Node.js 22 বা তার বেশি (Node.js 26 LTS preferred), HTTPS এবং persistent environment variables সমর্থন করে এমন Node web service-এ এই folder deploy করতে হবে। Server PORT environment variable-এ listen করবে এবং /healthz endpoint দেবে।

Hosting থেকে HTTPS API URL পাওয়ার পর root-এর wbbd-central-config.js-এ apiBase ঠিক সেই origin-এ সেট করতে হবে। এরপর Supabase migration apply করে live login test করতে হবে।

## বাস্তব সীমাবদ্ধতা

Repository-তে backend source, SQL, branded email template, routes এবং tests তৈরি আছে। কিন্তু live Gmail sender identity এবং private Supabase service-role secret external owner-authorized credentials। এগুলো fabricate বা GitHub-এ commit করা হয়নি। এই credentials ও hosted API URL ছাড়া actual Gmail OTP delivery এবং production login activate করা যাবে না।

# Website Builders BD

Responsive HTML, CSS and JavaScript website for Website Builders BD.

## Included sections
- Home, About, Services, Pricing, Portfolio and Gallery
- Customer Reviews (the default cards are clearly marked sample placeholders)
- Blog, Training, Our Program, Process, FAQ and Policies
- Contact form, WhatsApp, Messenger and Telegram links
- Bogura, Bangladesh map section and footer map links
- Client-side Admin Panel, user panel, website content editor and JSON export

## Deploy the website
1. Extract the final ZIP so `index.html`, `style.css`, `app.js`, `sw.js`, `manifest.webmanifest` and the `assets/` folder are together in the site root.
2. Upload those files to your hosting root, or push them to the repository's `main` branch.
3. For GitHub Pages, open **Settings → Pages**, choose the `main` branch and `/(root)`, then save if using branch-based deployment.
4. Open the published URL and perform a hard refresh after deployment.

## Admin access
- Admin email: `sopnilprodhan13@gmail.com`
- Admin login opens the Admin Panel. Regular registered users open the User Panel.
- Review placeholders can be edited in **Admin Panel → Reviews**. Replace sample text with real customer feedback shared with permission, and uncheck the sample marker only after it is verified.
- Service location and the Google Maps link can be edited in **Admin Panel → Contact & Links**.

## Contact and location
The default contact links are the project's WhatsApp and Telegram links. The map is centered on **Bogura, Bangladesh**. It is a city-level map, not a confirmed street address or an exact office pin. Add an exact address only once confirmed. No telephone-call button or `tel:` link is included.

## Important limitations
This is a static GitHub Pages site. Website content, user accounts, orders and activity are stored in the current browser and are not shared automatically between visitors or devices. The contact form opens an email draft; the visitor must press Send in their email app. Messaging platforms do not automatically forward private chats into this site's Admin Panel. Shared customer records and production-grade authentication require a server-side backend/database.

## Mobile install
The site includes a web app manifest and service worker. HTTPS is required for service-worker behavior.


## Footer social logos
The footer uses the supplied Facebook and YouTube icon artwork, saved as transparent WebP assets in `assets/`.

## Pages
Every page is its own HTML file (`index`, `services`, `pricing`, `portfolio`, `gallery`, `blog`, `training`, `program`, `process`, `faq`, `contact`).
They are generated from `tools/partials` and `tools/sections` with `python3 tools/build_pages.py`. All text, prices, reviews, blog posts etc. are edited in the Admin Panel, not in these files.

## Making an account the admin (one time, Supabase → SQL Editor)
1. Sign up on the website with the admin email.
2. Run:
```sql
update public.profiles set role = 'admin' where email = 'sopnilprodhan13@gmail.com';
```
There is no admin password in the website code. The password is the one chosen at sign-up and is managed by Supabase (Authentication → Users to reset it).


## Central OTP Authentication & Browser Push

The existing Supabase email/password authentication and Admin/User/Manager dashboards are extended with mandatory email OTP. The original pages and design are retained.

- Sign-up creates the Supabase account, then returns the user to the Login page.
- Login checks the password first, then requests a fresh six-digit email OTP through Sopnil Central. The server must expire codes after 300 seconds, enforce one-time use, resend cooldowns and attempt limits.
- No dashboard session is created until OTP verification and the database-side MFA check both succeed.
- User Panel includes a browser notification opt-in. Admin Panel includes a browser-notification composer that sends through the authenticated Central API.
- The Central Server base URL is intentionally a placeholder in wbbd-central-config.js. Login remains fail-closed until a real HTTPS server is configured.

### Required setup

1. Deploy the Central Node.js API and implement the routes, JWT verification, OTP ticket redemption, SMTP and VAPID behavior described in README-CENTRAL-OTP-BN.md.
2. Set apiBase in wbbd-central-config.js to that server's HTTPS origin. No private API secret or VAPID private key belongs in frontend files.
3. Run supabase/central-otp-mfa.sql in the Supabase SQL Editor. The Central Server must write auth_mfa_sessions only after successful OTP ticket redemption using its server-only service_role.
4. Add the exact GitHub Pages/custom domain origin to the Central Server CORS allow-list.
5. Test signup, login, new OTP on every login, invalid/expired/reused code, resend, each role dashboard, logout and push notifications.

Important: The GitHub repository and supplied ZIP do not contain the Central Node.js Server source or a deployed Central API URL. This repository contains the frontend integration, Supabase MFA migration and complete server API contract, but email delivery and real push sending cannot be tested or enabled until the Central Server is deployed and configured. No fake/demo login is provided.

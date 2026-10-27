# Website Builders BD
Static site (HTML/CSS/JS). Upload all files to a GitHub repo, then Settings → Pages → deploy from main branch.
- Admin login: sopnilprodhan13@gmail.com (password stored only as a SHA-256 hash in app.js)
- Edit content: Login → Admin Panel. Export JSON from Admin → Settings.
- Limitation: edits/accounts are saved in the browser only (no server). For shared accounts/orders use Supabase.


## Mobile and app installation
The site includes a web app manifest and service worker so it can be added to a supported phone's home screen and can cache the core site shell for offline reopening. HTTPS is required for service-worker behavior.

## New sections and Telegram
Gallery, Blog, Training and Our Program have editable Admin Panel content. Set your Telegram username/link in Admin Panel → Contact & Links; the default link is the generic Telegram home page until configured.

## Important data limitation
This is still a static GitHub Pages site. Browser-local Admin edits do not publish themselves to GitHub and cannot update every visitor's device. Edits sync across open tabs in the same browser. For shared data across all visitors, configure a real backend (such as Supabase) with server-side authorization and database policies before production use.

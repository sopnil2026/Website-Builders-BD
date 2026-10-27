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

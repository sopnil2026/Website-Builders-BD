/* Network-first: visitors always get the newest site when online; the cache is only an offline fallback.
   No manual version bumping is needed for normal updates. */
const CACHE_NAME='wbbd-shell-v19';
const CORE=['./','./index.html','./services.html','./pricing.html','./portfolio.html','./gallery.html','./blog.html','./training.html','./program.html','./process.html','./faq.html','./contact.html','./style.css','./app.js','./manifest.webmanifest','./assets/logo-mark.png','./assets/logo.png','./assets/icon-192.png','./assets/icon-512.png','./assets/facebook-logo.webp','./assets/youtube-logo.webp','./assets/messenger-logo.webp','./assets/telegram-logo.webp','./assets/whatsapp-logo.webp'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET')return;
 const url=new URL(event.request.url);
 if(url.origin!==self.location.origin)return; // Supabase, fonts, CDN: straight to the network
 event.respondWith(fetch(event.request,{cache:'no-cache'}).then(response=>{
  if(response&&response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));}
  return response;
 }).catch(()=>caches.match(event.request).then(c=>c||caches.match('./index.html'))));
});

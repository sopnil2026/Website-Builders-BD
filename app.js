/* Website Builders BD – static site + client-side login/admin (see README for limits) */
(function(){
'use strict';
/* Every page of the site has its own HTML file. Page-content containers that a page does not have are replaced
   by a detached element, so the shared code can fill them without errors. */
const OPTIONAL=/^#(h-1|h-2|h-3|h-p|a-tag|a-p1|a-p2|trustGrid|stats|heroList|svGrid|pkGrid|pkSel|flt|pfGrid|galleryGrid|reviewGrid|blogGrid|trainingGrid|programGrid|steps|faqList|polList|cinfo|orderForm|ftServices|locationMap|exploreGrid)$/;
const $=(s,r=document)=>r.querySelector(s)||(OPTIONAL.test(s)?document.createElement('div'):null), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const PAGE=document.body.dataset.page||'home';
const AUTHPAGE=PAGE==='login'||PAGE==='signup';
const PAGEURL={home:'index.html',about:'index.html#about',reviews:'index.html#reviews',services:'services.html',pricing:'pricing.html',portfolio:'portfolio.html',gallery:'gallery.html',blog:'blog.html',training:'training.html',program:'program.html',process:'process.html',faq:'faq.html',policy:'faq.html#policy',contact:'contact.html',location:'contact.html#location'};
const pg=u=>{const m=/^#([a-z]+)$/.exec(String(u||''));return m&&PAGEURL[m[1]]?PAGEURL[m[1]]:u};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ADMIN_EMAIL='sopnilprodhan13@gmail.com';
const K={g:'wbbd_managers',p:'wbbd_pay',c:'wbbd_content',u:'wbbd_users',o:'wbbd_orders',m:'wbbd_messages',l:'wbbd_login_events',a:'wbbd_admin_hash_v2',s:'wbbd_session'};
const ls={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}};

const DEFAULT={
 brand:{h1:'Your Vision.',h2:'Our Code.',h3:'Your Success.',lead:'We design and build fast, modern, mobile-friendly websites that help your business look professional and win more customers.',tagline:'আপনার স্বপ্নের ওয়েবসাইট'},
 about:{p1:'Website Builders BD is a web design and development studio in Bangladesh. We turn your ideas into clean, fast and easy-to-use websites — from business sites and portfolios to online shops.',p2:'Our mission is simple: <i>make a professional web presence easy, effective and affordable for every business.</i>'},
 contact:{messenger:'https://m.me/website.builders.bdcom',whatsapp:'https://wa.me/message/SRU4QQYVDKZLP1',telegram:'https://t.me/WebsiteBuildersBD',facebook:'https://www.facebook.com/website.builders.bdcom',youtube:'https://www.youtube.com/@WebTech25',portfolio:'https://sopnil2026.github.io/sopnilPortfolio',email:'sopnilprodhan13@gmail.com',location:'Bogura, Bangladesh',mapLink:'https://www.google.com/maps/search/?api=1&query=Bogura%2C%20Bangladesh',hours:'Sat – Thu · 9 AM – 9 PM',bkash:'01740304436',webmoney:'Ask on Messenger for account details',wmz:''},
 payCfg:{percent:50,bkashMode:'Send Money',note:'Send the amount from your bKash app, then enter the Transaction ID (TrxID) on the next step.'},
 payments:[{n:'bKash',c:'#e2136e',img:''},{n:'Webmoney',c:'#1d6fb8',img:''}],
 trust:[{n:'10+',l:'Websites Delivered'},{n:'9+',l:'Happy Clients'},{n:'2+',l:'Years Experience'},{n:'100%',l:'Client Satisfaction'}],
 stats:[{n:'50%',l:'Advance to start'},{n:'30 Days',l:'Refund window'},{n:'100%',l:'Mobile responsive'}],
 services:[
  {i:'💻',t:'Website Design & Development',d:'Custom, fast and responsive websites for any business.'},
  {i:'🛒',t:'E-Commerce Websites',d:'Online shops with product pages, cart and order flow.'},
  {i:'🎨',t:'Portfolio Websites',d:'Show your work beautifully with animated, personal sites.'},
  {i:'🚀',t:'Landing Pages',d:'High-converting single pages for campaigns and offers.'},
  {i:'🔍',t:'SEO Setup',d:'Titles, meta tags, sitemap and speed tuning to rank better.'},
  {i:'🧩',t:'UI/UX Design',d:'Clean layouts and smooth interactions your visitors enjoy.'},
  {i:'🛠️',t:'Maintenance & Updates',d:'Fixes, content updates and backups after launch.'},
  {i:'🌐',t:'Domain & Hosting Help',d:'We help you pick, buy and connect your domain and hosting.'},
  {i:'🖼️',t:'Logo & Branding',d:'Simple, memorable branding that matches your website.'}],
 packages:[
  {n:'Basic',price:'৳ 1,000',feat:['1–3 page website','Mobile responsive','Contact form','Messenger button','7 days delivery'],hot:false},
  {n:'Standard',price:'৳ 3,000',feat:['Up to 8 pages','Custom animations','SEO basics','Admin-editable content','2 free revisions','14 days delivery'],hot:true},
  {n:'Premium',price:'৳ 5,000',feat:['E-commerce or web app','Login & admin panel','Payment integration','Advanced SEO & speed','Priority support','21 days delivery'],hot:false}],
 portfolio:[
  {t:'My Portfolio Website',c:'Portfolio',d:'Our own animated portfolio website — a live, real project.',url:'https://sopnil2026.github.io/sopnilPortfolio',demo:false,color:'#f97316,#ea580c'},
  {t:'Spice Garden Restaurant',c:'Business',d:'Menu, gallery and table-booking style layout.',url:'',demo:true,color:'#b45309,#78350f'},
  {t:'Fashion Hub Store',c:'E-Commerce',d:'Product grid, cart and checkout flow.',url:'',demo:true,color:'#db2777,#9d174d'},
  {t:'Smart Clinic',c:'Business',d:'Doctor profiles and appointment request page.',url:'',demo:true,color:'#0891b2,#155e75'}],
 gallery:[
  {t:'Modern Business Website',c:'Web Design',d:'A clean, responsive layout concept for a growing business.',color:'#2563eb,#7c3aed'},
  {t:'Creative Portfolio',c:'Portfolio',d:'A visual showcase for creators, freelancers and developers.',color:'#0891b2,#0f766e'},
  {t:'Online Store Concept',c:'E-Commerce',d:'A product-focused design idea for online selling.',color:'#db2777,#9d174d'}],
 reviews:[
   {name:'Sample client 01',role:'Demo business website',rating:5,quote:'Replace this sample with a real customer comment about the website and result.',demo:true},
   {name:'Sample client 02',role:'Demo portfolio project',rating:5,quote:'Add genuine feedback about communication, revisions or the finished project here.',demo:true},
   {name:'Sample client 03',role:'Demo online store',rating:5,quote:'Paste a real review shared with the customer’s permission before publishing.',demo:true}],
 blog:[
  {t:'Why Every Business Needs a Website',category:'Web Strategy',date:'Featured article',d:'Understand how a professional online presence helps people discover and trust your business.',url:''},
  {t:'A Beginner’s Guide to Responsive Design',category:'Web Development',date:'Learning guide',d:'Learn why websites should adapt cleanly to phones, tablets and desktop screens.',url:''},
  {t:'Website Speed: Small Fixes That Matter',category:'Performance',date:'Practical tips',d:'Simple ways to make a website feel faster and easier to use.',url:''}],
 training:[
  {t:'HTML & CSS Foundations',level:'Beginner',format:'Online learning',d:'Start with page structure, styling, layout and responsive foundations.',url:''},
  {t:'JavaScript Essentials',level:'Beginner to Intermediate',format:'Hands-on practice',d:'Learn core JavaScript ideas and use them to make a website interactive.',url:''},
  {t:'Build and Publish a Website',level:'Project-based',format:'Guided project',d:'Practice taking a project from local files to a live website.',url:''}],
 program:[
  {t:'Website Launch Program',d:'Plan, build and publish a professional website for your idea or business.',details:'A guided path from requirements to launch.',cta:'Start a Project',url:'contact.html'},
  {t:'Web Skills Starter Program',d:'A clear starting path for people learning HTML, CSS and JavaScript.',details:'Practice with small, real projects.',cta:'Ask About Training',url:'contact.html'},
  {t:'Business Growth Program',d:'Improve your online presentation with a website, portfolio and useful content.',details:'Focus on a reliable, mobile-friendly digital presence.',cta:'Get a Quote',url:'contact.html'}],
 faq:[
  {q:'How long does a website take?',a:'Most websites take 7–21 days depending on the package and how quickly you send content.'},
  {q:'How does payment work?',a:'You pay 50% in advance by bKash or Webmoney before work starts, and the rest on delivery after you approve the result.'},
  {q:'What if I am not happy?',a:'If there is a problem we cannot solve within 30 days, we refund your payment. See our refund policy below.'},
  {q:'Can I edit the website myself later?',a:'Yes. Standard and Premium packages include an easy admin panel so you can update content yourself.'},
  {q:'Do I need to buy hosting and a domain?',a:'Yes, but we guide you step by step and can set everything up for you.'}],
 steps:[{t:'Discuss',d:'Tell us your needs on Messenger'},{t:'Advance',d:'Pay 50% via bKash/Webmoney'},{t:'Design',d:'We design & build your site'},{t:'Review',d:'You review and request changes'},{t:'Deliver',d:'Pay the rest, we go live'}],
 policies:[
  {q:'Refund Policy',a:'If you tell us about a problem within 30 days and we cannot fix it, we refund the money you paid. The 50% advance is used to start work, so please share your requirements clearly.'},
  {q:'Privacy Policy',a:'We only use your name, phone and email to respond to your order. We never sell your data.'},
  {q:'Terms of Service',a:'Work starts after the advance payment. Content you provide must be legal and owned by you. Delivery time depends on timely feedback.'}]
};
const stored=ls.get(K.c,{});
let C=Object.assign({},DEFAULT,stored);
C.contact=Object.assign({},DEFAULT.contact,stored.contact||{}); // keep new fields for older saved data
delete C.contact.phone; // Remove the call option, including from older browser-saved settings.
if(!C.contact.location)C.contact.location=DEFAULT.contact.location;
if(!C.contact.mapLink)C.contact.mapLink=DEFAULT.contact.mapLink;
if(!Array.isArray(C.reviews))C.reviews=DEFAULT.reviews.map(r=>({...r}));
if(!C.contact.portfolio)C.contact.portfolio=DEFAULT.contact.portfolio;
if(!stored.contact||!stored.contact.telegram||stored.contact.telegram==='https://t.me/'||stored.contact.telegram==='https://t.me')C.contact.telegram=DEFAULT.contact.telegram;
const save=()=>{ls.set(K.c,C);pushContent()};

/* ---------- utils ---------- */
const _pc=()=>{C.payCfg=Object.assign({percent:50,bkashMode:'Send Money',note:'Send the amount from your bKash app, then enter the Transaction ID (TrxID) on the next step.'},C.payCfg||{})};
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('sh');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('sh'),3200)}
function sha(s){
 if(window.crypto&&crypto.subtle) return crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)).then(b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join(''));
 return Promise.resolve(sha256fb(s));
}
function sha256fb(m){ // fallback for non-secure contexts
 const r=(n,x)=>(x>>>n)|(x<<(32-n)),K2=[];let h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
 for(let c=2,n=0;n<64;c++){let p=1;for(let i=2;i*i<=c;i++)if(c%i==0){p=0;break}if(p){K2[n++]=(Math.pow(c,1/3)%1*4294967296)|0}}
 const b=[...new TextEncoder().encode(m)],l=b.length*8;b.push(0x80);while(b.length%64!=56)b.push(0);
 for(let i=7;i>=0;i--)b.push(i>3?0:(l>>>(i*8))&255);
 for(let o=0;o<b.length;o+=64){const w=[];for(let i=0;i<16;i++)w[i]=(b[o+i*4]<<24)|(b[o+i*4+1]<<16)|(b[o+i*4+2]<<8)|b[o+i*4+3];
  for(let i=16;i<64;i++){const s0=r(7,w[i-15])^r(18,w[i-15])^(w[i-15]>>>3),s1=r(17,w[i-2])^r(19,w[i-2])^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)|0}
  let[a,bb,c,d,e,f,g,hh]=h;
  for(let i=0;i<64;i++){const S1=r(6,e)^r(11,e)^r(25,e),ch=(e&f)^(~e&g),t1=(hh+S1+ch+K2[i]+w[i])|0,S0=r(2,a)^r(13,a)^r(22,a),mj=(a&bb)^(a&c)^(bb&c),t2=(S0+mj)|0;hh=g;g=f;f=e;e=(d+t1)|0;d=c;c=bb;bb=a;a=(t1+t2)|0}
  h=[h[0]+a|0,h[1]+bb|0,h[2]+c|0,h[3]+d|0,h[4]+e|0,h[5]+f|0,h[6]+g|0,h[7]+hh|0]}
 return h.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('');
}
const session=()=>{try{return JSON.parse(sessionStorage.getItem(K.s))}catch{return null}};
function addLocalRecord(key,item,limit=500){
 const list=ls.get(key,[]);
 list.unshift(item);
 ls.set(key,list.slice(0,limit));
 return item;
}
function recordActivity(action,identity){
 const s=identity||session()||{};
 return addLocalRecord(K.l,{
  id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),
  action:String(action||'Activity'),
  name:String(s.name||''),
  email:String(s.email||'').trim().toLowerCase(),
  role:String(s.role||'visitor'),
  at:new Date().toISOString()
 },1000);
}


function textOn(hex){const h=(hex||'#334155').replace('#','');const n=parseInt(h.length===3?h.replace(/./g,'$&$&'):h,16),r=n>>16&255,g=n>>8&255,b=n&255;return (r*299+g*587+b*114)/1000>170?'#111827':'#fff'}
function payBadge(p){return p.img?`<span class="pb im" title="${esc(p.n)}"><img src="${esc(p.img)}" alt="${esc(p.n)}"></span>`:`<span class="pb" style="background:${esc(p.c||'#334155')};color:${textOn(p.c)}">${esc(p.n)}</span>`}
/* ---------- render public site ---------- */
function render(){
 const b=C.brand,ct=C.contact;
 $('#h-1').textContent=b.h1;$('#h-2').textContent=b.h2;$('#h-3').textContent=b.h3;$('#h-p').textContent=b.lead;$('#a-tag').textContent=b.tagline;
 $('#a-p1').textContent=C.about.p1;$('#a-p2').innerHTML=C.about.p2;
 $('#trustGrid').innerHTML=(C.trust||DEFAULT.trust).map(t=>`<div class="trust-metric"><b>${esc(t.n)}</b><span>${esc(t.l)}</span></div>`).join('');
 $('#stats').innerHTML=C.stats.map(s=>`<div><b>${esc(s.n)}</b><small>${esc(s.l)}</small></div>`).join('');
 $('#heroList').innerHTML=C.services.slice(0,5).map(s=>`<a class="li" href="services.html"><i>${esc(s.i)}</i>${esc(s.t)}</a>`).join('')+`<a class="li" href="services.html" style="color:var(--o2)"><i>＋</i>View all ${C.services.length} services</a>`;
 $('#svGrid').innerHTML=C.services.map((s,i)=>`<div class="sv rv d${i%3}"><i>${esc(s.i)}</i><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></div>`).join('');
 $('#pkGrid').innerHTML=C.packages.map((p,i)=>`<div class="pk rv d${i}${p.hot?' hot':''}">${p.hot?'<span class="pop">MOST POPULAR</span>':''}<h3>${esc(p.n)}</h3><div class="price">${esc(p.price)}</div><small style="color:var(--mut)">One-time · 50% advance</small><ul>${p.feat.map(f=>`<li>${esc(f)}</li>`).join('')}</ul><button class="btn p" style="margin-bottom:10px" data-pay-pkg="${i}">💳 Pay ${(C.payCfg&&C.payCfg.percent)||50}% Advance</button><a class="btn o" href="contact.html?pkg=${encodeURIComponent(p.n)}#orderForm">Choose ${esc(p.n)}</a></div>`).join('');
 $('#pkSel').innerHTML=C.packages.map(p=>`<option>${esc(p.n)} – ${esc(p.price)}</option>`).join('')+'<option>Custom / Not sure</option>';
 {const w=new URLSearchParams(location.search).get('pkg');if(w){const o=[...$('#pkSel').options].find(o=>o.text.startsWith(w));if(o)$('#pkSel').value=o.value}}
 const cats=['All',...new Set(C.portfolio.map(p=>p.c))];
 $('#flt').innerHTML=cats.map((c,i)=>`<button class="${i?'':'on'}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
 drawPf('All');drawGallery();drawReviews();drawBlog();drawTraining();drawProgram();
 $('#steps').innerHTML=C.steps.map((s,i)=>`<div class="st rv d${i%3}"><b>${i+1}</b><h4>${esc(s.t)}</h4><p>${esc(s.d)}</p></div>`).join('');
 const acc=l=>l.map(f=>`<div class="fq"><button>${esc(f.q)}</button><div>${esc(f.a)}</div></div>`).join('');
 $('#faqList').innerHTML=acc(C.faq);$('#polList').innerHTML=acc(C.policies);
 $('#cinfo').innerHTML=[
  ['<img class="brand-contact-logo" src="assets/whatsapp-logo.webp" alt="">','WhatsApp','Chat with us',ct.whatsapp||'https://wa.me/message/SRU4QQYVDKZLP1','Message us on WhatsApp'],
  ['✉️','Email',ct.email,'mailto:'+ct.email,'We reply as soon as we can'],
  ['<img class="brand-contact-logo" src="assets/messenger-logo.webp" alt="">','Messenger','Chat with us',ct.messenger,'Fastest way to reach us'],
  ['<img class="brand-contact-logo" src="assets/telegram-logo.webp" alt="">','Telegram','Chat with us',ct.telegram,'Message us on Telegram'],
  ['📍','Location',ct.location||'Bogura, Bangladesh',ct.mapLink||'https://www.google.com/maps/search/?api=1&query=Bogura%2C%20Bangladesh','Open map and directions'],
  ['🌐','Our Portfolio Website',ct.portfolio.replace(/^https?:\/\//,''),ct.portfolio,'See a live project'],
  ['📘','Facebook','Website Builders BD',ct.facebook,''],
  ['▶️','YouTube','WebTech25',ct.youtube,''],
  ['💳','bKash',ct.bkash+' (Send Money)',null,'Pay 50% advance to start'],
  ['🪙','Webmoney',ct.webmoney,null,'']
 ].map(([i,t,s,h,sub])=>`<${h?`a href="${esc(h)}" ${/^mailto/i.test(h)?'':'target="_blank" rel="noopener"'}`:'div'} class="ci"><i>${i}</i><div><small>${t}</small><b>${esc(s)}</b>${sub?`<small>${esc(sub)}</small>`:''}</div></${h?'a':'div'}>`).join('');
 $$('[data-msgr]').forEach(a=>a.href=ct.messenger);$$('[data-tg]').forEach(a=>a.href=ct.telegram||'https://t.me/WebsiteBuildersBD');$$('[data-fb]').forEach(a=>a.href=ct.facebook);$$('[data-yt]').forEach(a=>a.href=ct.youtube);$$('[data-pf]').forEach(a=>a.href=ct.portfolio);
  $$('[data-mail]').forEach(a=>a.href='mailto:'+ct.email);$$('[data-wa]').forEach(a=>{a.href=ct.whatsapp||'https://wa.me/message/SRU4QQYVDKZLP1';a.target='_blank';a.rel='noopener'});
  const mapQuery=ct.location||'Bogura, Bangladesh';
  const mapUrl=ct.mapLink||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(mapQuery);
  const mapFrame=$('#locationMap');if(mapFrame)mapFrame.src='https://maps.google.com/maps?q='+encodeURIComponent(mapQuery)+'&output=embed';
  $$('[data-map]').forEach(a=>{a.href=mapUrl;a.target='_blank';a.rel='noopener'});
  $$('[data-location-text]').forEach(el=>el.textContent=mapQuery);
  $$('a[href^="tel:"],[data-call]').forEach(el=>el.remove());
 $$('[data-t]').forEach(s=>s.textContent=ct[s.dataset.t]||'');
 $('#ftServices').innerHTML=C.services.slice(0,6).map(s=>`<a href="services.html">${esc(s.t)}</a>`).join('');
 const pays=(C.payments||[]).map(payBadge).join('');$$('[data-pay]').forEach(el=>el.innerHTML=pays);
 $('#yr').textContent=new Date().getFullYear();
 observe();authUI();
}
function drawPf(cat){
 $('#pfGrid').innerHTML=C.portfolio.filter(p=>cat==='All'||p.c===cat).map((p,i)=>{
  const colors=(p.color||'#f97316,#ea580c').split(',');
  const a=/^#[0-9a-f]{6}$/i.test(colors[0]||'')?colors[0]:'#f97316';
  const b=/^#[0-9a-f]{6}$/i.test(colors[1]||'')?colors[1]:a;
  const title=String(p.t||'Project');
  const initials=title.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'WB';
  const tag=p.url?'a':'article';
  const state=p.demo?'demo':(p.url?'live':'concept');
  const cardClass='pf rv in '+(p.url?'has-live-link':'is-demo');
  const open='<'+tag+' class="'+cardClass+'" '+(p.url?'href="'+esc(p.url)+'" target="_blank" rel="noopener"':'')+'>';
  const banner='<div class="th pf-banner" style="--pf-a:'+a+';--pf-b:'+b+'">'+
   '<span class="pf-banner-glow pf-banner-glow-one"></span><span class="pf-banner-glow pf-banner-glow-two"></span>'+
   '<div class="pf-banner-top"><span class="pf-banner-brand"><i>WB</i><span>'+esc(p.c||'Portfolio')+'</span></span><span class="pf-banner-status '+state+'">'+(state==='live'?'LIVE PROJECT':state==='demo'?'DEMO PROJECT':'CONCEPT')+'</span></div>'+
   '<div class="pf-banner-main"><div class="pf-monogram">'+esc(initials)+'</div>'+
    '<div class="pf-browser" aria-hidden="true"><div class="pf-browser-head"><span><i></i><i></i><i></i></span><b>'+esc((p.c||'Website')+' Studio')+'</b><em>↗</em></div>'+
     '<div class="pf-browser-content"><span class="pf-browser-kicker">DIGITAL EXPERIENCE</span><span class="pf-browser-title"></span><span class="pf-browser-title short"></span><span class="pf-browser-button"></span><div class="pf-browser-cards"><i></i><i></i><i></i></div></div></div></div>'+
   '<div class="pf-banner-bottom"><span>SELECTED WORK</span><span class="pf-banner-index">'+String(i+1).padStart(2,'0')+' <b>／</b> '+String(C.portfolio.length).padStart(2,'0')+'</span></div></div>';
  return open+banner+'<div class="bd"><div class="pf-bd-top"><small>'+esc(p.c||'Portfolio')+(p.demo?' · Demo':'')+'</small><span class="pf-state-pill '+state+'">'+(state==='live'?'Live project':state==='demo'?'Demo project':'Concept preview')+'</span></div><h3>'+esc(title)+'</h3><p>'+esc(p.d||'Explore this project and its design concept.')+'</p><div class="pf-card-foot"><span>'+(p.url?'Explore live website':'Project concept')+'</span><span class="pf-card-arrow">↗</span></div></div></'+tag+'>';
 }).join('');
}
function drawGallery(){
 const items=C.gallery||[];
 $('#galleryGrid').innerHTML=items.map((it,i)=>{
  const colors=(it.color||'#f97316,#ea580c').split(',');
  const a=/^#[0-9a-f]{6}$/i.test(colors[0]||'')?colors[0]:'#f97316';
  const b=/^#[0-9a-f]{6}$/i.test(colors[1]||'')?colors[1]:a;
  const title=String(it.t||'Gallery design');
  const initials=title.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'WB';
  const banner='<div class="gallery-banner" style="--gallery-a:'+a+';--gallery-b:'+b+'">'+
   '<span class="gallery-glow gallery-glow-a"></span><span class="gallery-glow gallery-glow-b"></span>'+
   '<div class="gallery-banner-top"><span class="gallery-brand"><i>WB</i><span>'+esc(it.c||'Gallery')+'</span></span><span class="gallery-banner-tag">DESIGN SHOWCASE</span></div>'+
   '<div class="gallery-banner-main"><div class="gallery-lettermark">'+esc(initials)+'</div>'+
    '<div class="gallery-browser" aria-hidden="true"><div class="gallery-browser-bar"><span><i></i><i></i><i></i></span><b>'+esc((it.c||'Creative')+' Studio')+'</b><em>↗</em></div>'+
     '<div class="gallery-browser-body"><small>DIGITAL EXPERIENCE</small><i class="gallery-line wide"></i><i class="gallery-line"></i><i class="gallery-action"></i><div class="gallery-preview-tiles"><i></i><i></i><i></i></div></div></div></div>'+
   '<div class="gallery-banner-foot"><span>WEBSITE BUILDERS BD</span><span>'+String(i+1).padStart(2,'0')+' <b>/</b> '+String(items.length).padStart(2,'0')+'</span></div></div>';
  return '<article class="content-card gallery-card rv">'+banner+'<div class="content-body"><div class="gallery-card-meta"><span class="content-meta">'+esc(it.c||'Gallery')+'</span><span class="gallery-index">PROJECT '+String(i+1).padStart(2,'0')+'</span></div><h3>'+esc(title)+'</h3><p>'+esc(it.d||'Explore this design concept and visual direction.')+'</p><a class="btn o sm" href="#contact">Ask about this design <span aria-hidden="true">↗</span></a></div></article>';
 }).join('');
}
function drawReviews(){
 const reviews=Array.isArray(C.reviews)?C.reviews:[];
 const target=$('#reviewGrid');
 if(!reviews.length){target.innerHTML='<div class="review-empty"><h3>No reviews added yet</h3><p>Add verified customer feedback from Admin Panel → Reviews.</p></div>';return}
 target.innerHTML=reviews.map((r,i)=>{
  const rating=Math.max(1,Math.min(5,Math.round(Number(r.rating)||5)));
  const stars='★'.repeat(rating)+'☆'.repeat(5-rating);
  return '<article class="review-card rv d'+(i%3)+'"><div class="review-top"><span class="review-stars" aria-label="'+rating+' out of 5 stars">'+stars+'</span><span class="review-mark '+(r.demo?'sample':'real')+'">'+(r.demo?'SAMPLE REVIEW':'CLIENT FEEDBACK')+'</span></div><blockquote>“'+esc(r.quote||'Add a verified customer review here.')+'”</blockquote><div class="review-author"><span class="review-avatar">'+esc((r.name||'C').trim().slice(0,1).toUpperCase())+'</span><span><b>'+esc(r.name||'Customer')+'</b><small>'+esc(r.role||'Website project')+'</small></span></div></article>';
 }).join('');
}
function drawBlog(){
 $('#blogGrid').innerHTML=(C.blog||[]).map(it=>{
  const hasLink=!!it.url&&/^https?:\/\//i.test(it.url);
  const href=hasLink?esc(pg(it.url)):'contact.html';
  return '<article class="content-card rv"><div class="content-body"><span class="content-meta">'+esc(it.category||'Blog')+' · '+esc(it.date||'Latest')+'</span><h3>'+esc(it.t)+'</h3><p>'+esc(it.d)+'</p><a class="btn o sm" href="'+href+'" '+(hasLink?'target="_blank" rel="noopener"':'')+'>'+(hasLink?'Read article':'Discuss this topic')+' →</a></div></article>';
 }).join('');
}
function drawTraining(){
 $('#trainingGrid').innerHTML=(C.training||[]).map(it=>{
  const hasLink=!!it.url&&/^https?:\/\//i.test(it.url);
  const href=hasLink?esc(pg(it.url)):'contact.html';
  return '<article class="content-card rv"><div class="content-body"><span class="content-meta">'+esc(it.level||'Training')+' · '+esc(it.format||'Course')+'</span><h3>'+esc(it.t)+'</h3><p>'+esc(it.d)+'</p><a class="btn o sm" href="'+href+'" '+(hasLink?'target="_blank" rel="noopener"':'')+'>'+(hasLink?'Open training':'Ask about training')+' →</a></div></article>';
 }).join('');
}
function drawProgram(){
 $('#programGrid').innerHTML=(C.program||[]).map(it=>{
  const raw=pg(String(it.url||'contact.html'));
  const href=/^(https?:\/\/|#[A-Za-z][\w-]*|[\w-]+\.html)/i.test(raw)?esc(raw):'contact.html';
  return '<article class="content-card rv"><div class="content-body"><span class="content-meta">Website Builders BD</span><h3>'+esc(it.t)+'</h3><p>'+esc(it.d)+'</p><p>'+esc(it.details||'')+'</p><a class="btn p sm" href="'+href+'">'+esc(it.cta||'Learn more')+' →</a></div></article>';
 }).join('');
}
function observe(){
 const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12});
 $$('.rv:not(.in)').forEach(el=>io.observe(el));
}

/* ---------- page interactions ---------- */
const hd=$('#hd'),prog=$('#prog'),topb=$('#top');
function onScroll(){const y=scrollY,h=document.documentElement.scrollHeight-innerHeight;hd.classList.toggle('sc',y>30);prog.style.width=(h>0?y/h*100:0)+'%';topb.classList.toggle('sh',y>500);
 }
addEventListener('scroll',onScroll,{passive:true});onScroll();
$$('#pill a').forEach(a=>a.classList.toggle('on',a.dataset.p===PAGE));
topb.onclick=()=>scrollTo({top:0});
$('#burger').onclick=()=>{const opened=$('#pill').classList.toggle('op');$('#burger').setAttribute('aria-expanded',String(opened));};
$('#pill').onclick=e=>{if(e.target.closest('a')){$('#pill').classList.remove('op');$('#burger').setAttribute('aria-expanded','false');}};
document.addEventListener('click',e=>{if(!e.target.closest('.nav')){$('#pill').classList.remove('op');$('#burger').setAttribute('aria-expanded','false');}});
document.addEventListener('click',e=>{
 const fq=e.target.closest('.fq button');if(fq)fq.parentElement.classList.toggle('op');
 const f=e.target.closest('[data-cat]');if(f){$$('#flt button').forEach(b=>b.classList.remove('on'));f.classList.add('on');drawPf(f.dataset.cat)}
 const pp=e.target.closest('[data-pay-pkg]');if(pp)openPay(+pp.dataset.payPkg);
});

/* order form */
$('#orderForm').addEventListener('submit',e=>{
 e.preventDefault();
 const f=Object.fromEntries(new FormData(e.target));
 const at=new Date().toISOString();
 const id=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
 const order={...f,id,at,status:'New'};
 addLocalRecord(K.o,order,500);
 addLocalRecord(K.m,{
  id,at,name:f.name,phone:f.phone,email:f.email,
  subject:'Website order — '+f.pkg,type:'Order enquiry',pkg:f.pkg,
  message:f.msg,status:'New'
 },1000);
 recordActivity('Order / message submitted',{name:f.name,email:f.email,role:'visitor'});
 sbSendMessage({id,name:f.name||'',phone:f.phone||'',email:f.email||'',company:f.company||'',service:f.service||'',pkg:f.pkg||'',budget:f.budget||'',subject:'Website order — '+(f.pkg||''),type:'Order enquiry',message:f.msg||''});
 const body=[
  'New website order request','',
  'Name: '+f.name,'Phone: '+f.phone,'Email: '+f.email,
  'Package: '+f.pkg,'','Project:',f.msg
 ].join('\n');
 try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(body).catch(()=>{});}catch{}
 toast('Request saved in this browser. Opening an email draft; press Send in your email app to deliver it.');
 location.href='mailto:'+C.contact.email+'?subject='+encodeURIComponent('Website order – '+f.pkg)+'&body='+encodeURIComponent(body);
 e.target.reset();
});

/* ---------- auth ----------
/* ---------- auth ---------- */
let mode='login';
const mo=$('#authMo');
let captchaExpected=0;
function newCaptcha(){const x=2+Math.floor(Math.random()*8),y=1+Math.floor(Math.random()*9);captchaExpected=x+y;const q=$('#captchaQuestion'),a=$('#captchaAnswer');if(q)q.textContent=x+' + '+y+' = ?';if(a)a.value=''}
$('#captchaRefresh').addEventListener('click',newCaptcha);
newCaptcha();
function setMode(m){mode=m;if(typeof otpReset==='function'&&$('#otpBox').style.display==='block')otpReset();$$('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab===m));
 $('#nmL').style.display=m==='signup'?'grid':'none';$('#authTitle').textContent=m==='signup'?'Create account':'Welcome back';
 $('#authSubmit').textContent=m==='signup'?'Sign up':'Login';if(AUTHPAGE){try{history.replaceState(null,'',m+'.html')}catch{}document.title=(m==='signup'?'Sign up':'Login')+' – Website Builders BD'}$('#aPass').autocomplete=m==='signup'?'new-password':'current-password';$('#authErr').textContent='';newCaptcha()}
$$('[data-tab]').forEach(b=>b.onclick=()=>setMode(b.dataset.tab));
let pendingPay=null;
$('[data-close]').onclick=()=>{if(AUTHPAGE){location.href='index.html';return}mo.classList.remove('sh');pendingPay=null};
mo.onclick=e=>{if(!AUTHPAGE&&e.target===mo){mo.classList.remove('sh');pendingPay=null}};
if(AUTHPAGE){const mn=$('main');if(mn)mn.appendChild(mo);mo.classList.add('sh','inline');setMode(PAGE)}
function authUI(){const s=session();const b=$('#authBtn');
 if(s){b.textContent=s.role==='admin'?'⚙ Admin Panel':s.role==='manager'?'🧑‍💼 Manager Panel':'👤 My Panel';b.onclick=()=>(s.role==='admin'||s.role==='manager')?openAdmin():openUser()}
 else{b.textContent='Login / Sign up';b.onclick=()=>{if(AUTHPAGE){setMode('login');mo.classList.add('sh')}else location.href='login.html'}}}
function logoutMenu(){if(confirm('Logout?')){doLogout();authUI();toast('Logged out')}}
$('#authForm').addEventListener('submit',async e=>{
 e.preventDefault();const em=$('#aEmail').value.trim().toLowerCase(),pw=$('#aPass').value,err=$('#authErr');err.textContent='';
 const answer=$('#captchaAnswer').value;
 if(answer===''||Number(answer)!==captchaExpected){err.textContent='Human verification failed. Please solve the new question.';newCaptcha();return}
 newCaptcha();
 const btn=$('#authSubmit');btn.disabled=true;
 try{await BACKEND;
  if(!SB_READY){err.textContent='Cannot reach the server right now. Check your internet connection and try again.';return}
  await sbAuthSubmit(em,pw,err)}
 finally{btn.disabled=false}
});

/* ---------- admin ---------- */
const ADM=['Dashboard','Payments','Managers','Hero & About','Contact & Links','Payment Methods','Services','Packages','Portfolio','Gallery','Reviews','Blog','Training','Our Program','FAQ & Policies','Users','Orders','Messages','Login Activity','Settings'];
let tab='Dashboard';
const MGR_TABS=['Payments','Orders','Messages'];
const roleTabs=()=>{const s=session();return s&&s.role==='manager'?MGR_TABS:ADM};
function openAdmin(){const s=session();if(!s||(s.role!=='admin'&&s.role!=='manager'))return;const mg=s.role==='manager';$('#admin aside h4').lastChild.textContent=mg?'Manager Panel':'Admin Panel';$('#adUser').style.display=mg?'none':'';if(!roleTabs().includes(tab))tab=roleTabs()[0];$('#admin').classList.add('sh');document.body.style.overflow='hidden';drawAdmin()}
function closeAdmin(){$('#admin').classList.remove('sh');document.body.style.overflow='';if(AUTHPAGE&&!mo.classList.contains('sh')&&!upEl.classList.contains('sh'))location.href='index.html'}
$('#adExit').onclick=closeAdmin;
$('#adUser').onclick=()=>{closeAdmin();openUser()};
$('#adOut').onclick=()=>{doLogout();closeAdmin();authUI();toast('Logged out')};
function drawAdmin(){
 $('#adNav').innerHTML=roleTabs().map(t=>`<button class="${t===tab?'on':''}" data-t="${t}">${t}</button>`).join('');
 $$('#adNav button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;drawAdmin()});
 const m=$('#adMain'),F={Dashboard:dash,Payments:paymentsV,Managers:managersV,'Hero & About':heroEd,'Contact & Links':contactEd,'Payment Methods':payEd,Services:listEd('services',[['i','Icon'],['t','Title'],['d','Description']],{i:'⭐',t:'New service',d:''}),
  Packages:pkEd,Portfolio:listEd('portfolio',[['t','Title'],['c','Category'],['d','Description'],['url','Live link (https://…)'],['color','Colors e.g. #f97316,#ea580c']],{t:'New project',c:'Business',d:'',url:'',demo:true,color:'#f97316,#ea580c'}),
  Gallery:listEd('gallery',[['t','Title'],['c','Category'],['d','Description'],['color','Colors e.g. #f97316,#ea580c']],{t:'New gallery item',c:'Web Design',d:'',color:'#f97316,#ea580c'}),
  Reviews:listEd('reviews',[['name','Reviewer name'],['role','Business / project'],['rating','Rating (1–5)'],['quote','Review text']],{name:'Sample client',role:'Sample project',rating:5,quote:'Replace with a verified customer review shared with permission.',demo:true}),
  Blog:listEd('blog',[['t','Title'],['category','Category'],['date','Date / label'],['d','Summary'],['url','Article link (https://…)']],{t:'New article',category:'Web Development',date:'New post',d:'',url:''}),
  Training:listEd('training',[['t','Title'],['level','Level'],['format','Format'],['d','Description'],['url','Training link (https://…)']],{t:'New training',level:'Beginner',format:'Online',d:'',url:''}),
  'Our Program':listEd('program',[['t','Title'],['d','Description'],['details','Details'],['cta','Button label'],['url','Button link (#contact or https://…)']],{t:'New program',d:'',details:'',cta:'Learn more',url:'#contact'}),
  'FAQ & Policies':faqEd,Users:(SB_READY?sbUsersV:usersV),Orders:ordersV,Messages:messagesV,'Login Activity':activityV,Settings:settingsV};
 if(!roleTabs().includes(tab))tab=roleTabs()[0];
 const pre=SB_READY?({Dashboard:()=>Promise.all([syncPayments(),syncMessages()]),Payments:syncPayments,Orders:syncMessages,Messages:syncMessages})[tab]:null;
 const run=()=>{try{const r=F[tab](m);if(r&&r.catch)r.catch(x=>fail(x))}catch(x){fail(x)}};
 const fail=x=>{console.error(x);m.insertAdjacentHTML('beforeend','<div class="pn"><h3>Something went wrong</h3><p class="note">This tab could not be shown ('+esc(x&&x.message||'unknown error')+'). Reload the page and try again.</p></div>')};
 if(pre){const t0=tab;m.innerHTML=`<h2>${tab}</h2><p class="note">Loading…</p>`;pre().catch(()=>{}).then(()=>{if(tab!==t0)return;m.innerHTML=`<h2>${tab}</h2>`;run()});return}
 m.innerHTML=`<h2>${tab}</h2>`;run();
}
const inp=(k,l,v,tag='input')=>`<label>${l}<${tag} data-k="${k}">${tag==='textarea'?esc(v):''}</${tag==='textarea'?'textarea':'input'}></label>`.replace('<input data-k',`<input value="${esc(v)}" data-k`);
function panel(m,title,html){const d=document.createElement('div');d.className='pn';d.innerHTML=(title?`<h3>${title}</h3>`:'')+html;m.appendChild(d);return d}
function commit(msg='Saved ✓'){save();render();if($('#userpanel').classList.contains('sh'))drawUser();toast(msg)}
function dash(m){
 const pays=ls.get(K.p,[]),messages=ls.get(K.m,[]),orders=ls.get(K.o,[]),events=ls.get(K.l,[]);
 const pend=pays.filter(x=>x.status==='pending').length,ver=pays.filter(x=>x.status==='verified').length;
 const live=SB_READY?'Live database':'This browser';
 const cards=[
  ['Pending payments',pend,live],
  ['Verified payments',ver,live],
  ['Order requests',orders.length,live],
  ['Messages / enquiries',messages.length,live],
  ['Services',C.services.length,'Website content'],
  ['Portfolio items',C.portfolio.length,'Website content']
 ];
 m.insertAdjacentHTML('beforeend','<div class="sc4">'+cards.map(x=>'<div class="admin-stat"><b>'+x[1]+'</b><span>'+esc(x[0])+'</span><small>'+esc(x[2])+'</small></div>').join('')+'</div>');
 panel(m,'Quick access','<div class="admin-shortcuts"><button class="btn o sm" data-admin-shortcut="Payments">Review payments</button><button class="btn o sm" data-admin-shortcut="Orders">View orders</button><button class="btn o sm" data-admin-shortcut="Messages">View messages</button><button class="btn o sm" data-admin-shortcut="Users">Manage users</button><button class="btn o sm" data-admin-shortcut="Packages">Edit packages</button><button class="btn o sm" data-admin-shortcut="Reviews">Edit reviews</button></div>');
 $$('[data-admin-shortcut]',m).forEach(b=>b.onclick=()=>{tab=b.dataset.adminShortcut;drawAdmin()});
 const newest=messages.slice(0,5);
 const messageRows=newest.map(x=>'<tr><td>'+esc((x.at||'').slice(0,10))+'</td><td>'+esc(x.name||'—')+'<br><small>'+esc(x.email||x.phone||'')+'</small></td><td>'+esc(x.subject||x.type||'Website enquiry')+'</td><td>'+esc(x.status||'New')+'</td></tr>').join('');
 panel(m,'Recent messages and enquiries',newest.length?'<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Date</th><th>Sender</th><th>Subject</th><th>Status</th></tr></thead><tbody>'+messageRows+'</tbody></table></div>':'<p class="note">No messages yet.</p>');
 const recent=events.slice(0,8);
 if(recent.length&&!SB_READY){const recentRows=recent.map(x=>'<tr><td>'+esc((x.at||'').replace('T',' ').slice(0,16))+'</td><td>'+esc(x.action||'Activity')+'</td><td>'+esc(x.name||'—')+'</td><td>'+esc(x.email||'—')+'</td><td>'+esc(x.role||'visitor')+'</td></tr>').join('');panel(m,'Recent account activity','<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Date / time</th><th>Activity</th><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>'+recentRows+'</tbody></table></div>')}
 panel(m,'Database',SB_READY?'<p class="note"><span class="st-verified">connected</span> — payments, messages, accounts and website content are shared across all devices. Account sign-ins are managed in Supabase → Authentication → Users.</p>':'<p class="note"><span class="st-pending">not connected</span> — the database could not be reached from this browser.</p>');
}
function trustEd(m){
 const T=C.trust||DEFAULT.trust;
 const p=panel(m,'Achievement numbers (shown under the hero)','<p class="note" style="margin-bottom:10px">Only show numbers that are true and that you can prove. Set the value to match your real work.</p>'+T.map((t,i)=>`<div class="r2" data-ti="${i}" style="margin-bottom:8px"><label>Number<input data-k="n" value="${esc(t.n)}"></label><label>Label<input data-k="l" value="${esc(t.l)}"></label></div>`).join('')+'<button class="btn p sm" style="margin-top:8px">Save numbers</button>');
 p.querySelector('button').onclick=()=>{C.trust=$$('[data-ti]',p).map(r=>({n:$('[data-k=n]',r).value.trim(),l:$('[data-k=l]',r).value.trim()})).filter(t=>t.n||t.l);commit()};
}
function heroEd(m){trustEd(m);
 const p=panel(m,'Hero section',['h1','h2','h3'].map((k,i)=>inp(k,'Headline line '+(i+1),C.brand[k])).join('')+inp('lead','Intro text',C.brand.lead,'textarea')+inp('tagline','Bengali tagline',C.brand.tagline)+'<button class="btn p sm" style="margin-top:12px">Save</button>');
 p.querySelector('button').onclick=()=>{$$('[data-k]',p).forEach(i=>C.brand[i.dataset.k]=i.value);commit()};
 const q=panel(m,'About section',inp('p1','Paragraph 1',C.about.p1,'textarea')+inp('p2','Paragraph 2 (HTML allowed: <i>, <b>)',C.about.p2,'textarea')+'<button class="btn p sm" style="margin-top:12px">Save</button>');
 q.querySelector('button').onclick=()=>{$$('[data-k]',q).forEach(i=>C.about[i.dataset.k]=i.value);commit()};
}
function contactEd(m){
 const L={messenger:'Messenger link',whatsapp:'WhatsApp link (https://wa.me/...)',telegram:'Telegram link (https://t.me/username)',facebook:'Facebook page link',youtube:'YouTube link',portfolio:'Portfolio website link',location:'Service location (e.g. Bogura, Bangladesh)',mapLink:'Google Maps link',hours:'Working hours',email:'Email',bkash:'bKash number',webmoney:'Webmoney details (shown to customers)',wmz:'Webmoney purse number (e.g. Z123456789012)'};
 const p=panel(m,'Contact, social & payment',Object.keys(L).map(k=>inp(k,L[k],C.contact[k])).join('')+'<button class="btn p sm" style="margin-top:12px">Save</button>');
 p.querySelector('button').onclick=()=>{$$('[data-k]',p).forEach(i=>C.contact[i.dataset.k]=i.value.trim());commit()};
}
function listEd(key,fields,blank){return m=>{
 const p=panel(m,'',C[key].map((it,ix)=>`<div class="pn" style="background:#f8fafc" data-ix="${ix}">${fields.map(([k,l])=>inp(k,l,it[k]??'')).join('')}${(key==='portfolio'||key==='reviews')?`<label style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" data-demo style="width:auto" ${it.demo?'checked':''}> ${key==='reviews'?'Mark as sample — not a verified review':'Mark as Demo'}</label>`:''}<div style="display:flex;gap:8px;margin-top:12px"><button class="btn p sm" data-save>Save</button><button class="dl" data-del>Delete</button></div></div>`).join('')+'<button class="btn o sm" data-add>＋ Add new</button>');
 p.onclick=e=>{const box=e.target.closest('[data-ix]'),ix=box&&+box.dataset.ix;
  if(e.target.matches('[data-add]')){C[key].push({...blank});commit('Added');drawAdmin()}
  if(e.target.matches('[data-save]')){$$('[data-k]',box).forEach(i=>C[key][ix][i.dataset.k]=i.value);const d=$('[data-demo]',box);if(d)C[key][ix].demo=d.checked;commit()}
  if(e.target.matches('[data-del]')&&confirm('Delete this item?')){C[key].splice(ix,1);commit('Deleted');drawAdmin()}};
}}
function pkEd(m){
 const p=panel(m,'',C.packages.map((it,ix)=>`<div class="pn" style="background:#f8fafc" data-ix="${ix}">${inp('n','Name',it.n)}${inp('price','Price',it.price)}${inp('feat','Features (one per line)',it.feat.join('\n'),'textarea')}<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-hot style="width:auto" ${it.hot?'checked':''}> Highlight as most popular</label><div style="display:flex;gap:8px;margin-top:12px"><button class="btn p sm" data-save>Save</button><button class="dl" data-del>Delete</button></div></div>`).join('')+'<button class="btn o sm" data-add>＋ Add package</button>');
 p.onclick=e=>{const box=e.target.closest('[data-ix]'),ix=box&&+box.dataset.ix;
  if(e.target.matches('[data-add]')){C.packages.push({n:'New',price:'৳ 0',feat:['Feature'],hot:false});commit('Added');drawAdmin()}
  if(e.target.matches('[data-save]')){const g=k=>$(`[data-k=${k}]`,box).value;C.packages[ix]={n:g('n'),price:g('price'),feat:g('feat').split('\n').map(s=>s.trim()).filter(Boolean),hot:$('[data-hot]',box).checked};commit()}
  if(e.target.matches('[data-del]')&&confirm('Delete this package?')){C.packages.splice(ix,1);commit('Deleted');drawAdmin()}};
}
function faqEd(m){['faq','policies'].forEach(key=>listEd(key,[['q','Question / Title'],['a','Answer']],{q:'New question',a:''})(Object.assign(document.createElement('div'),{appendChild(n){m.appendChild(n);n.querySelector('h3')||n.insertAdjacentHTML('afterbegin',`<h3>${key==='faq'?'FAQ':'Policies'}</h3>`)}})))}
function adminTable(headers,rows){
 return '<div class="admin-table-wrap"><table class="admin-table"><thead><tr>'+headers.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function usersV(m){
 const users=ls.get(K.u,[]);
 const rows=users.map((u,i)=>'<tr><td>'+esc(u.name||'—')+'</td><td>'+esc(u.email||'')+'</td><td>'+esc((u.at||'').slice(0,10))+'</td><td>'+esc((u.lastLogin||'').replace('T',' ').slice(0,16)||'—')+'</td><td>'+Number(u.loginCount||0)+'</td><td><button class="mini" data-rm-user="'+i+'">Remove</button></td></tr>').join('');
 const p=panel(m,'Registered users — this browser only',rows?adminTable(['Name','Email','Joined','Last sign-in','Sign-ins','Action'],rows):'<p class="note">No registered accounts are saved in this browser yet.</p>');
 p.onclick=e=>{const b=e.target.closest('[data-rm-user]');if(!b)return;if(confirm('Remove this locally saved account?')){users.splice(Number(b.dataset.rmUser),1);ls.set(K.u,users);recordActivity('User account removed',{name:'Admin',email:ADMIN_EMAIL,role:'admin'});drawAdmin()}};
}
function ordersV(m){
 const orders=ls.get(K.o,[]);
 const rows=orders.map((o,i)=>'<tr><td>'+esc((o.at||'').slice(0,10))+'</td><td>'+esc(o.name||'—')+'</td><td>'+'<b>'+esc(o.phone||'')+'</b> '+waBtn(o.phone)+'<br>'+esc(o.email||'')+'</td><td>'+esc(o.pkg||'—')+'</td><td class="message-cell">'+esc(o.msg||'')+'</td><td>'+esc(o.status||'New')+'</td><td><div class="admin-row-actions"><button class="mini" data-order-status="'+i+'">Mark contacted</button><button class="mini danger" data-order-delete="'+i+'">Delete</button></div></td></tr>').join('');
 const toolbar='<div class="admin-toolbar"><label class="admin-search-label">Search orders<input id="orderSearch" type="search" placeholder="Name, phone, email, package or message"></label><div class="admin-toolbar-actions"><button class="btn o sm" id="exportOrders">Export JSON</button><button class="dl" id="clearOrders" '+(orders.length?'':'disabled')+'>Delete all order records</button></div></div>';
 const table=rows?adminTable(['Date','Name','Contact','Package','Message','Status','Actions'],rows):'<p class="note">No order requests have been stored in this browser. Form requests are saved here before an email draft opens.</p>';
 const p=panel(m,'Order requests — saved in this browser',toolbar+'<div id="ordersTable">'+table+'</div><p class="note admin-data-note">Only records saved in this browser are shown. A visitor must still press Send in the email app for an email request to be delivered.</p>');
 const search=$('#orderSearch',p);
 search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();$$('tbody tr',p).forEach(row=>row.hidden=!row.innerText.toLowerCase().includes(q))});
 $('#exportOrders',p).onclick=()=>downloadAdminJSON('website-builders-bd-orders.json',orders);
 $('#clearOrders',p).onclick=()=>{if(!orders.length)return;if(confirm('Delete all locally saved order records? This does not delete message records.')){sbMsgClear('Order enquiry');ls.set(K.o,[]);drawAdmin()}};
 p.onclick=e=>{
  const status=e.target.closest('[data-order-status]');
  if(status){const i=Number(status.dataset.orderStatus);if(!orders[i])return;orders[i].status='Contacted';sbMsgStatus(orders[i].id,'Contacted');ls.set(K.o,orders);const messages=ls.get(K.m,[]),msg=messages.find(x=>x.id===orders[i].id);if(msg)msg.status='Contacted';ls.set(K.m,messages);recordActivity('Order marked contacted',{name:'Admin',email:ADMIN_EMAIL,role:'admin'});drawAdmin();return}
  const del=e.target.closest('[data-order-delete]');
  if(del){const i=Number(del.dataset.orderDelete);if(!orders[i])return;if(!confirm('Delete this order record? Its linked website-enquiry message will also be removed.'))return;const item=orders.splice(i,1)[0];sbMsgDelete(item.id);ls.set(K.o,orders);ls.set(K.m,ls.get(K.m,[]).filter(x=>x.id!==item.id));drawAdmin()}
 }
}
function downloadAdminJSON(filename,data){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function messagesV(m){
 const messages=ls.get(K.m,[]);
 const rows=messages.map((x,i)=>'<tr><td>'+esc((x.at||'').slice(0,10))+'</td><td>'+esc(x.name||'—')+'<br><small>'+esc(x.email||'')+'<br>'+esc(x.phone||'')+'</small> '+waBtn(x.phone)+'</td><td>'+esc(x.subject||x.type||'Website enquiry')+'</td><td class="message-cell">'+esc(x.message||x.msg||'')+'</td><td>'+esc(x.status||'New')+'</td><td><div class="admin-row-actions"><button class="mini" data-message-replied="'+i+'">Mark replied</button><button class="mini danger" data-message-delete="'+i+'">Delete</button></div></td></tr>').join('');
 const toolbar='<div class="admin-toolbar"><label class="admin-search-label">Search messages<input id="messageSearch" type="search" placeholder="Sender, email, phone, subject or message"></label><div class="admin-toolbar-actions"><button class="btn o sm" id="exportMessages">Export JSON</button><button class="dl" id="clearMessages" '+(messages.length?'':'disabled')+'>Delete all messages</button></div></div>';
 const table=rows?adminTable(['Date','Sender','Subject','Message','Status','Actions'],rows):'<p class="note">No website messages are saved in this browser yet. This list does not automatically receive Messenger, WhatsApp or email conversations.</p>';
 const p=panel(m,'Messages and enquiries — saved in this browser',toolbar+'<div id="messagesTable">'+table+'</div><p class="note admin-data-note">This page includes all message records stored in this browser. To see records from other visitors or devices, connect a shared database / backend.</p>');
 const search=$('#messageSearch',p);
 search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();$$('tbody tr',p).forEach(row=>row.hidden=!row.innerText.toLowerCase().includes(q))});
 $('#exportMessages',p).onclick=()=>downloadAdminJSON('website-builders-bd-messages.json',messages);
 $('#clearMessages',p).onclick=()=>{if(!messages.length)return;if(confirm('Delete all locally saved messages and enquiries?')){sbMsgClear();ls.set(K.m,[]);drawAdmin()}};
 p.onclick=e=>{
  const reply=e.target.closest('[data-message-replied]');
  if(reply){const i=Number(reply.dataset.messageReplied);if(!messages[i])return;messages[i].status='Replied';sbMsgStatus(messages[i].id,'Replied');ls.set(K.m,messages);const orders=ls.get(K.o,[]),order=orders.find(x=>x.id===messages[i].id);if(order)order.status='Replied';ls.set(K.o,orders);recordActivity('Message marked replied',{name:'Admin',email:ADMIN_EMAIL,role:'admin'});drawAdmin();return}
  const del=e.target.closest('[data-message-delete]');
  if(del){const i=Number(del.dataset.messageDelete);if(!messages[i])return;if(!confirm('Delete this locally saved message?'))return;sbMsgDelete(messages[i].id);messages.splice(i,1);ls.set(K.m,messages);drawAdmin()}
 };
}
function activityV(m){
 const events=ls.get(K.l,[]);
 const rows=events.map(x=>'<tr><td>'+esc((x.at||'').replace('T',' ').slice(0,16))+'</td><td>'+esc(x.action||'Activity')+'</td><td>'+esc(x.name||'—')+'</td><td>'+esc(x.email||'—')+'</td><td>'+esc(x.role||'visitor')+'</td></tr>').join('');
 const toolbar='<div class="admin-toolbar"><label class="admin-search-label">Search activity<input id="activitySearch" type="search" placeholder="Activity, name, email or role"></label><div class="admin-toolbar-actions"><button class="btn o sm" id="exportActivity">Export JSON</button><button class="dl" id="clearActivity" '+(events.length?'':'disabled')+'>Clear activity log</button></div></div>';
 const p=panel(m,'Login and activity history — saved in this browser',toolbar+(rows?adminTable(['Date / time','Activity','Name','Email','Role'],rows):'<p class="note">No login history is saved in this browser yet.</p>'));
 const search=$('#activitySearch',p);
 search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();$$('tbody tr',p).forEach(row=>row.hidden=!row.innerText.toLowerCase().includes(q))});
 $('#exportActivity',p).onclick=()=>downloadAdminJSON('website-builders-bd-login-activity.json',events);
 $('#clearActivity',p).onclick=()=>{if(!events.length)return;if(confirm('Clear all activity records saved in this browser?')){ls.set(K.l,[]);drawAdmin()}};
}
function settingsV(m){backendPanel(m);
 const p=panel(m,SB_READY?'Change your password':'Change admin password',`<label>New password (min 8 chars)<input type="password" id="np" autocomplete="new-password"></label><button class="btn p sm" style="margin-top:12px" id="cp">Update password</button><p class="note" style="margin-top:8px">Your password is stored securely by the login service (Supabase), never in this website's code.</p>`);
 $('#cp',p).onclick=async()=>{const v=$('#np',p).value;if(v.length<8)return toast('Use at least 8 characters');if(SB_READY){const {error}=await SB.auth.updateUser({password:v});$('#np',p).value='';return toast(error?'Could not update: '+error.message:'Password updated')}toast('Server not connected')};
 const b=panel(m,'Backup & restore',`<button class="btn o sm" id="ex">⬇ Export content (JSON)</button> <label class="btn o sm" style="display:inline-flex">⬆ Import<input type="file" accept=".json" id="im" hidden></label> <button class="dl" id="rs" style="margin-left:8px">Reset to defaults</button>`);
 $('#ex',b).onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(C,null,2)],{type:'application/json'}));a.download='wbbd-content.json';a.click()};
 $('#im',b).onchange=e=>{const r=new FileReader();r.onload=()=>{try{C=Object.assign({},DEFAULT,JSON.parse(r.result));commit('Imported');drawAdmin()}catch{toast('Invalid file')}};r.readAsText(e.target.files[0])};
 $('#rs',b).onclick=()=>{if(confirm('Reset all content to defaults?')){localStorage.removeItem(K.c);C=Object.assign({},DEFAULT);render();drawAdmin();toast('Reset')}};
   const records=panel(m,'Export locally stored admin records','<p class="note">Export all registered users, order records, enquiries and activity saved in this browser. Passwords are excluded. This is a local-browser backup, not a central server export.</p><button class="btn o sm" id="exportRecords">Export records (JSON)</button>');
  $('#exportRecords',records).onclick=()=>{
   const payload={scope:'This browser only',exportedAt:new Date().toISOString(),users:ls.get(K.u,[]).map(u=>({name:u.name,email:u.email,at:u.at,lastLogin:u.lastLogin||'',loginCount:u.loginCount||0})),orders:ls.get(K.o,[]),messages:ls.get(K.m,[]),activity:ls.get(K.l,[])};
   const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='website-builders-bd-admin-records.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  panel(m,'Important: where your data lives','<p class="note">This site is a static GitHub Pages site. Content, accounts and requests are stored in this browser. Changes update the public sections immediately and are shared with other open tabs on this same browser, but they do not automatically sync to other visitors or devices. To publish Admin edits for everyone, connect a shared database and server-side authentication (for example Supabase) before production use. Browser-only visitor logins are not strong security.</p>');
}

/* payment methods editor (admin) */
const PRESETS=[['Nagad','#ee3124'],['Rocket','#8c3494'],['PayPal','#003087'],['Payoneer','#ff4800'],['Visa','#1a1f71'],['Mastercard','#eb001b'],['American Express','#2e77bc'],['Binance Pay','#f0b90b'],['Cash on Delivery','#16a34a'],['Bank Transfer','#475569']];
function fileToLogo(file,cb){const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const sc=Math.min(56/im.height,160/im.width),w=Math.max(1,Math.round(im.width*sc)),h=Math.max(1,Math.round(im.height*sc)),c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,0,0,w,h);cb(c.toDataURL('image/png'))};im.onerror=()=>toast('Could not read that image');im.src=r.result};r.readAsDataURL(file)}
function payEd(m){
 const P=C.payments;
 const p=panel(m,'Payment methods shown on the website',
 `<p class="note" style="margin-bottom:12px">These badges appear in Pricing, Footer and User Panel. Upload a logo image for any method (PNG/JPG, small is fine), or leave it empty to show a colored name badge. Add only the methods you actually accept.</p>
 <div class="paybadges" style="margin-bottom:16px">${P.map(payBadge).join('')||'<span class="note">No payment methods yet.</span>'}</div>`+
 P.map((x,i)=>`<div class="pe" data-ix="${i}"><label>Name<input data-k="n" value="${esc(x.n)}"></label><label>Logo image<input type="file" accept="image/*" data-logo></label><label>Badge color<input type="color" data-k="c" value="${esc(x.c||'#334155')}" style="padding:4px;height:46px"></label><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn p sm" data-save>Save</button>${x.img?'<button class="mini" data-rmlogo>Remove logo</button>':''}<button class="dl" data-del>Delete</button></div></div>`).join('')+
 `<h3 style="margin-top:20px">Quick add</h3><div class="presets">${PRESETS.map(([n,c])=>`<button data-preset="${esc(n)}|${c}">＋ ${esc(n)}</button>`).join('')}<button data-preset="New method|#334155">＋ Custom</button></div>`);
 p.onclick=e=>{const row=e.target.closest('[data-ix]'),ix=row&&+row.dataset.ix;
  if(e.target.dataset.preset){const [n,c]=e.target.dataset.preset.split('|');if(C.payments.some(x=>x.n===n)&&n!=='New method')return toast(n+' is already added');C.payments.push({n,c,img:''});commit('Added');drawAdmin()}
  if(e.target.matches('[data-save]')){C.payments[ix].n=$('[data-k=n]',row).value.trim()||'Method';C.payments[ix].c=$('[data-k=c]',row).value;commit();drawAdmin()}
  if(e.target.matches('[data-rmlogo]')){C.payments[ix].img='';commit('Logo removed');drawAdmin()}
  if(e.target.matches('[data-del]')&&confirm('Delete this payment method?')){C.payments.splice(ix,1);commit('Deleted');drawAdmin()}};
 p.onchange=e=>{if(e.target.matches('[data-logo]')&&e.target.files[0]){const ix=+e.target.closest('[data-ix]').dataset.ix;fileToLogo(e.target.files[0],d=>{C.payments[ix].img=d;commit('Logo saved');drawAdmin()})}};
}

/* ---------- user panel ---------- */
const upEl=$('#userpanel');
function openUser(){const s=session();if(!s||s.role==='manager')return;if(SB_READY)syncPayments().then(()=>{if(upEl.classList.contains('sh'))drawUser()});upEl.classList.add('sh');document.body.style.overflow='hidden';$('#upAdmin').style.display=s.role==='admin'?'':'none';drawUser()}
function closeUser(){upEl.classList.remove('sh');document.body.style.overflow='';if(AUTHPAGE&&!mo.classList.contains('sh')&&!$('#admin').classList.contains('sh'))location.href='index.html'}
$('#upClose').onclick=closeUser;
$('#upOut').onclick=()=>{doLogout();closeUser();authUI();toast('Logged out')};
$('#upAdmin').onclick=()=>{closeUser();openAdmin()};
upEl.addEventListener('click',e=>{if(e.target.closest('[data-closeup]'))closeUser()});
function myPayHTML(s){
 const L=ls.get(K.p,[]).filter(x=>(x.account||x.email)===s.email);if(!L.length)return'';
 const rej=L.filter(x=>x.status==='rejected');
 const alert=rej.length?'<div class="rej-banner" role="alert"><b>⚠ Payment rejected</b>'+rej.map(x=>'<p>TrxID <b>'+esc(x.trx)+'</b> · '+money(x.amount)+(x.reason?' — '+esc(x.reason):'')+'</p>').join('')+'<p>Please pay again with the correct details, or contact us.</p></div>':'';
 return alert+'<div class="pn"><h3>My payments</h3>'+L.map(x=>'<div class="mypay st-b-'+esc(x.status)+'"><div><b>'+esc(x.pkg)+'</b> · '+money(x.amount)+'<br><small>TrxID '+esc(x.trx)+' · '+esc((x.at||'').slice(0,10))+'</small>'+(x.status==='rejected'&&x.reason?'<br><small>Reason: '+esc(x.reason)+'</small>':'')+'</div><span class="st-'+esc(x.status)+'">'+(x.status==='pending'?'Checking…':esc(x.status))+'</span></div>').join('')+'</div>';
}
async function showRejectAlert(){
 const s=session();if(!s||s.role!=='user')return;if(SB_READY)await syncPayments();const L=ls.get(K.p,[]);
 const rej=L.filter(x=>(x.account||x.email)===s.email&&x.status==='rejected'&&!x.seen);if(!rej.length)return;
 let el=$('#rejMo');if(!el){el=document.createElement('div');el.className='mo';el.id='rejMo';document.body.appendChild(el)}
 const ct=C.contact;
 el.innerHTML='<div class="md rejbox" role="alertdialog" aria-modal="true"><div class="rejico">✕</div><h3>Payment Rejected</h3>'+rej.map(x=>'<div class="rejitem"><b>'+esc(x.pkg)+' · '+money(x.amount)+'</b><br>TrxID: '+esc(x.trx)+(x.reason?'<br>Reason: <b>'+esc(x.reason)+'</b>':'')+'</div>').join('')+'<p class="note" style="margin:12px 0">The details you submitted could not be verified. Please pay again with the correct information, or contact us.</p><div style="display:grid;gap:10px"><button class="btn p" id="rejAgain" style="justify-content:center">Submit payment again</button><a class="btn m" href="'+esc(ct.messenger)+'" target="_blank" rel="noopener" style="justify-content:center">💬 Contact us</a><button class="btn o" id="rejOk" style="justify-content:center">I understand</button></div></div>';
 el.classList.add('sh');
 const done=()=>{if(SB_READY)SB.rpc('mark_rejections_seen').then(()=>{},()=>{});const A=ls.get(K.p,[]);A.forEach(x=>{if((x.account||x.email)===s.email&&x.status==='rejected')x.seen=true});ls.set(K.p,A);el.classList.remove('sh');if(upEl.classList.contains('sh'))drawUser()};
 $('#rejOk',el).onclick=done;$('#rejAgain',el).onclick=()=>{done();closeUser();const i=Math.max(0,C.packages.findIndex(p=>p.n===rej[0].pkg));openPay(i)};
}
function drawUser(){
 const s=session();if(!s)return;const ct=C.contact,b=$('#upBody');
 const orders=ls.get(K.o,[]).filter(o=>(o.email||'').toLowerCase()===s.email);
 const isAdmin=s.role==='admin';
 b.innerHTML=`<div class="hello"><h2>Hello, ${esc(s.name)} 👋</h2><p>${esc(s.email)}${isAdmin?' · <b>Admin preview of the user panel</b>':''}</p></div>
 ${isAdmin?'':myPayHTML(s)}
 <div class="qa"><a href="contact.html" data-closeup>✉ Send a message</a><a href="${esc(ct.messenger)}" target="_blank" rel="noopener"><img class="brand-icon-inline" src="assets/messenger-logo.webp" alt=""> Chat on Messenger</a><a href="pricing.html" data-closeup>📦 View packages</a></div>
 <div class="pn" style="margin-top:20px"><h3>How to pay</h3><p class="note">Pay 50% in advance to start and the rest on delivery. bKash: <b>${esc(ct.bkash)}</b> (Send Money). Webmoney: ${esc(ct.webmoney)}. After paying, send the transaction ID to us on Messenger.</p><div class="paybadges" style="margin-top:12px">${(C.payments||[]).map(payBadge).join('')}</div></div>
 <div class="pn"><h3>My requests</h3>${orders.length?`<table><tr><th>Date</th><th>Package</th><th>Message</th></tr>${orders.map(o=>`<tr><td>${esc(o.at.slice(0,10))}</td><td>${esc(o.pkg)}</td><td>${esc(o.msg)}</td></tr>`).join('')}</table>`:'<p class="note">No requests from this browser yet. Use “Send a message” to start your project.</p>'}</div>
 ${isAdmin?'':`<div class="pn"><h3>My profile</h3><label>Name<input id="upName" value="${esc(s.name)}"></label><label style="margin-top:10px">New password (optional, min 6)<input id="upPw" type="password" autocomplete="new-password"></label><button class="btn p sm" id="upSave" style="margin-top:12px">Save profile</button></div>`}`;
 const sv=$('#upSave');if(sv)sv.onclick=async()=>{const nm=$('#upName').value.trim(),pw=$('#upPw').value;if(!nm)return toast('Enter your name');
  const us=ls.get(K.u,[]),u=us.find(x=>x.email===s.email);if(!u)return toast('Account not found');
  u.name=nm;if(pw){if(pw.length<6)return toast('Password needs 6+ characters');u.hash=await sha(pw)}
  ls.set(K.u,us);sessionStorage.setItem(K.s,JSON.stringify({...s,name:nm}));authUI();drawUser();toast('Profile saved')};
}


/* ---------- managers (admin only) ---------- */
function managersV(m){if(SB_READY)return sbManagersV(m);
 const sx=session();if(!sx||sx.role!=='admin'){m.insertAdjacentHTML('beforeend','<p class="note">Only the admin can manage managers.</p>');return}
 const G=ls.get(K.g,[]);
 const add=panel(m,'Add a manager','<p class="note" style="margin-bottom:10px">Managers can <b>verify / reject payments</b> and <b>read orders and messages</b>. They cannot edit the website, settings, users or other managers.</p><label>Name<input id="mgN" autocomplete="off"></label><label>Email (their login)<input id="mgE" type="email" autocomplete="off"></label><label>Password (min 8)<input id="mgP" type="password" autocomplete="new-password"></label><div class="err" id="mgErr"></div><button class="btn p sm" id="mgAdd" style="margin-top:10px">Add manager</button>');
 $('#mgAdd',add).onclick=async()=>{const n=$('#mgN',add).value.trim(),e=$('#mgE',add).value.trim().toLowerCase(),p=$('#mgP',add).value,er=$('#mgErr',add);er.textContent='';
  if(!n||!e||!/^\S+@\S+\.\S+$/.test(e)){er.textContent='Enter a name and a valid email.';return}
  if(p.length<8){er.textContent='Password needs at least 8 characters.';return}
  if(e===ADMIN_EMAIL||G.some(x=>x.email===e)||ls.get(K.u,[]).some(x=>x.email===e)){er.textContent='This email is already in use.';return}
  G.push({name:n,email:e,hash:await sha(p),at:new Date().toISOString()});ls.set(K.g,G);toast('Manager added');drawAdmin()};
 const rows=G.map((x,i)=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.email)+'</td><td>'+esc((x.at||'').slice(0,10))+'</td><td><div class="admin-row-actions"><button class="mini" data-gp="'+i+'">Reset password</button><button class="mini danger" data-gd="'+i+'">Remove</button></div></td></tr>').join('');
 const p=panel(m,'Your managers',(rows?adminTable(['Name','Email','Added','Actions'],rows):'<p class="note">No managers yet.</p>')+'<p class="note admin-data-note">Manager accounts are stored in this browser, like all other data. A manager can only sign in on a browser where this list exists, and sees only that browser\'s records. For managers on their own phones, a shared database (backend) is required.</p>');
 p.onclick=async e=>{const d=e.target.dataset;
  if(d.gp!==undefined){const np=prompt('New password for '+G[+d.gp].name+' (min 8 characters)');if(!np)return;if(np.length<8)return toast('Password needs at least 8 characters');G[+d.gp].hash=await sha(np);ls.set(K.g,G);toast('Password updated')}
  if(d.gd!==undefined&&confirm('Remove this manager?')){G.splice(+d.gd,1);ls.set(K.g,G);drawAdmin()}};
}

/* ---------- advance payment (bKash / Webmoney) — manual verification ---------- */
function waBtn(n,text,label){let d=String(n||'').replace(/\D/g,'');if(!d)return'';if(d.startsWith('01'))d='88'+d;return '<a class="mini" href="https://wa.me/'+d+(text?'?text='+encodeURIComponent(text):'')+'" target="_blank" rel="noopener">'+(label||'WhatsApp')+'</a>'}
const money=n=>'৳ '+Number(n).toLocaleString('en-US');
const priceNum=p=>parseInt(String(p||'').replace(/[^\d]/g,''),10)||0;
const trxOk=t=>/^[A-Z0-9]{8,14}$/.test(t);
const payMo=document.createElement('div');payMo.className='mo';payMo.id='payMo';payMo.innerHTML='<div class="md wide"><button class="x" data-closepay aria-label="Close">×</button><div id="payBody"></div></div>';document.body.appendChild(payMo);
payMo.addEventListener('click',e=>{if(e.target===payMo||e.target.closest('[data-closepay]'))payMo.classList.remove('sh')});
let PAY={};
function openPay(i){
 _pc();const p=C.packages[i];if(!p)return;const ss=session();
 if(!ss){pendingPay=i;setMode('login');mo.classList.add('sh');toast('Please login (or sign up) first to pay');return}
 if(ss.role!=='user'){toast('Payments are made from a customer account. Use a customer login.');return}
 const total=priceNum(p.price),adv=Math.round(total*C.payCfg.percent/100);
 PAY={step:1,pkg:p.n,total,adv,method:'bKash',name:ss.name,email:ss.email,wa:''};
 drawPay();payMo.classList.add('sh');
}
function drawPay(){
 const ct=C.contact,b=$('#payBody'),P=PAY;
 const head='<h3 style="margin-bottom:4px">Pay '+C.payCfg.percent+'% advance</h3><p class="note" style="margin-bottom:14px">'+esc(P.pkg)+' package · total '+money(P.total)+' · <b>advance '+money(P.adv)+'</b></p>';
 if(P.step===1){
  b.innerHTML=head+`<form id="pf1" style="display:grid;gap:12px"><label>Your name *<input name="name" required value="${esc(P.name)}"></label><label>WhatsApp number *<input name="wa" type="tel" required placeholder="01XXXXXXXXX" value="${esc(P.wa)}"></label><label>Account email<input name="email" type="email" readonly value="${esc(P.email)}"></label>
  <div><small class="note">Pay with</small><div class="presets" id="pm">${['bKash','Webmoney'].map(n=>`<button type="button" class="${n===P.method?'sel':''}" data-pm="${n}">${n}</button>`).join('')}</div></div>
  <button class="btn p" style="justify-content:center">Next →</button></form>`;
  $('#pm').onclick=e=>{const t=e.target.closest('[data-pm]');if(!t)return;P.method=t.dataset.pm;$$('#pm button').forEach(x=>x.classList.toggle('sel',x===t))};
  $('#pf1').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));Object.assign(P,{name:f.name.trim(),wa:f.wa.trim(),email:f.email.trim().toLowerCase(),step:2});drawPay()};
 }else if(P.step===2){
  const bk=P.method==='bKash',dest=bk?ct.bkash:(ct.wmz||ct.webmoney);
  b.innerHTML=head+`<div class="payc"><small>${bk?'Send Money to this bKash number':'Send to this Webmoney purse'}</small><b>${esc(dest)}</b><button type="button" class="mini" id="cpy">Copy</button></div>
  <p class="note" style="margin:12px 0"><b>Amount: ${money(P.adv)}</b>${bk?' · Choose: '+esc(C.payCfg.bkashMode):''}<br>${esc(C.payCfg.note)}</p>
  <form id="pf2" style="display:grid;gap:12px"><label>Transaction ID (TrxID) *<input name="trx" required maxlength="14" placeholder="e.g. 9K7A1B2C3D" style="text-transform:uppercase"></label><label>Number / account you paid from *<input name="from" required placeholder="01XXXXXXXXX"></label><div class="err" id="payErr"></div>
  <div style="display:flex;gap:10px"><button type="button" class="btn o" id="pback">← Back</button><button class="btn p" style="flex:1;justify-content:center">I have paid — Submit</button></div></form>`;
  $('#cpy').onclick=()=>{try{navigator.clipboard.writeText(dest).catch(()=>{})}catch{};toast('Copied')};
  $('#pback').onclick=()=>{P.step=1;drawPay()};
  $('#pf2').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target)),trx=f.trx.trim().toUpperCase(),err=$('#payErr');
   if(!trxOk(trx)){err.textContent='TrxID should be 8–14 letters/numbers. Please check your payment SMS.';return}
   const log=ls.get(K.p,[]);if(log.some(x=>x.trx===trx)){err.textContent='This TrxID was already submitted.';return}
   const rec={id:'P'+Date.now().toString(36).toUpperCase(),at:new Date().toISOString(),account:P.email,name:P.name,wa:P.wa,email:P.email,pkg:P.pkg,total:P.total,amount:P.adv,method:P.method,trx,from:f.from.trim(),status:'pending'};
   if(SB_READY){const sub=$('#pf2 .btn.p');sub.disabled=true;let ie=null;try{ie=(await SB.from('payments').insert({id:rec.id,account:rec.account,name:rec.name,wa:rec.wa,email:rec.email,pkg:rec.pkg,total:rec.total,amount:rec.amount,method:rec.method,trx:rec.trx,paid_from:rec.from})).error}catch(x){ie={code:'net'}}
    sub.disabled=false;if(ie){err.textContent=ie.code==='23505'?'This TrxID was already submitted.':(ie.code==='42501'||ie.code==='PGRST301'?'Your login expired. Please login again.':'Could not send your payment details. Check your internet and try again.');return}}
   log.unshift(rec);ls.set(K.p,log.slice(0,500));P.rec=rec;P.step=3;
   P.body='NEW ADVANCE PAYMENT (needs verification)\n\nRef: '+rec.id+'\nName: '+rec.name+'\nWhatsApp: '+rec.wa+'\nEmail: '+rec.email+'\nPackage: '+rec.pkg+' (total '+money(rec.total)+')\nAdvance: '+money(rec.amount)+' via '+rec.method+'\nTrxID: '+rec.trx+'\nPaid from: '+rec.from;
   try{navigator.clipboard.writeText(P.body).catch(()=>{})}catch{};drawPay()};
 }else{
  const r=P.rec;
  b.innerHTML=`<div style="text-align:center"><div style="font-size:54px">✅</div><h3>Payment details received</h3><p class="note" style="margin:8px 0 14px">Reference <b>${esc(r.id)}</b> · TrxID <b>${esc(r.trx)}</b> · ${money(r.amount)}.<br>We will check it in our ${esc(r.method)} account and confirm with you.</p>
  <p class="note" style="margin-bottom:12px"><b>Last step:</b> send us this confirmation so we see it right away (the text is already copied).</p>
  <div style="display:grid;gap:10px"><a class="btn m" href="${esc(ct.messenger)}" target="_blank" rel="noopener" style="justify-content:center">💬 Send on Messenger</a><a class="btn p" href="${esc(ct.whatsapp||'#')}" target="_blank" rel="noopener" style="justify-content:center;background:#25d366">WhatsApp</a><a class="btn o" href="${esc(ct.telegram||'#')}" target="_blank" rel="noopener" style="justify-content:center">✈ Telegram</a><a class="btn o" href="mailto:${esc(ct.email)}?subject=${encodeURIComponent('Advance payment '+r.id)}&body=${encodeURIComponent(P.body||'')}" style="justify-content:center">✉ Email</a></div></div>`;
 }
}
const rejText=x=>'Hello '+x.name+', your advance payment (TrxID '+x.trx+', '+money(x.amount)+') could not be verified'+(x.reason?': '+x.reason:'')+'. Please login to Website Builders BD and submit the correct payment details, or contact us. — Website Builders BD';
const rejMail=x=>'mailto:'+encodeURIComponent(x.email)+'?subject='+encodeURIComponent('Payment rejected – '+x.id)+'&body='+encodeURIComponent(rejText(x));
function paymentsV(m){
 _pc();const L=ls.get(K.p,[]),sx=session(),isAdm=!sx||sx.role==='admin';
 const pend=L.filter(x=>x.status==='pending').length,tot=L.filter(x=>x.status==='verified').reduce((a,x)=>a+x.amount,0);
 panel(m,'','<div class="sc4" style="margin:0 0 14px"><div><b>'+pend+'</b>To verify</div><div><b>'+money(tot)+'</b>Verified total</div><div><b>'+L.length+'</b>All submissions</div><div><b>'+C.payCfg.percent+'%</b>Advance rate</div></div><p class="note"><b>How to verify:</b> open your bKash app or SMS, find the TrxID shown below and check the amount and sender number. Press <b>Verify</b> only after you see the money in your account.</p>');
 const rows=L.map((x,i)=>'<tr><td>'+esc((x.at||'').slice(0,16).replace('T',' '))+'<br><small>'+esc(x.id)+'</small></td><td>'+esc(x.name)+'<br><small>'+esc(x.email)+'</small></td><td><b>'+esc(x.wa)+'</b> '+waBtn(x.wa)+'</td><td>'+esc(x.pkg)+'<br><small>total '+money(x.total)+'</small></td><td><b>'+money(x.amount)+'</b></td><td>'+esc(x.method)+'</td><td><b>'+esc(x.trx)+'</b></td><td>'+esc(x.from)+'</td><td><span class="st-'+esc(x.status)+'">'+esc(x.status)+'</span></td><td><div class="admin-row-actions"><button class="mini" data-pv="'+i+'">Verify</button><button class="mini" data-px="'+i+'">Reject</button>'+(x.status==='rejected'?'<a class="mini" href="'+rejMail(x)+'">Email customer</a>'+waBtn(x.wa,rejText(x),'WhatsApp customer'):'')+(isAdm?'<button class="mini danger" data-pd="'+i+'">Delete</button>':'')+'</div>'+(x.reason?'<small>Reason: '+esc(x.reason)+'</small>':'')+(x.by?'<small>By '+esc(x.by)+'</small>':'')+'</td></tr>').join('');
 const p=panel(m,'Advance payments submitted on this website — saved in this browser',(rows?adminTable(['Date','Customer','WhatsApp','Package','Advance','Method','TrxID','Paid from','Status','Actions'],rows):'<p class="note">No payments have been submitted in this browser yet.</p>')+'<p class="note admin-data-note">Payments are saved in the browser the customer used, so this list only shows submissions made in this same browser. Every customer also gets a ready message to send to you on Messenger / WhatsApp / Telegram / email, which arrives with the TrxID. A shared database (backend) is needed to see all customers here automatically.</p>');
 p.onclick=e=>{const d=e.target.dataset;
  if(d.pv!==undefined){reviewPay(L[+d.pv],'verified','',sx.name)}
  if(d.px!==undefined){const why=prompt('Why is this payment rejected? (the customer will see this)','TrxID or amount did not match our bKash record');if(why===null)return;reviewPay(L[+d.px],'rejected',why.trim(),sx.name).then(ok=>{if(ok)toast('Rejected. The customer sees an alert at their next login. You can also use "Email customer" or "WhatsApp customer".')})}
  if(d.pd!==undefined&&isAdm&&confirm('Delete this payment record?')){deletePay(L[+d.pd],+d.pd,L)}};
 if(!isAdm)return;
 const cfg=panel(m,'Advance payment settings',`<label>Advance percent (%)<input type="number" min="1" max="100" id="pcPct" value="${esc(C.payCfg.percent)}"></label><label>bKash option customers should choose<input id="pcMode" value="${esc(C.payCfg.bkashMode)}"></label><label>Instruction text<textarea id="pcNote">${esc(C.payCfg.note)}</textarea></label><p class="note">bKash number and Webmoney purse are edited in <b>Contact &amp; Links</b>.</p><button class="btn p sm" style="margin-top:10px" id="pcSave">Save</button>`);
 $('#pcSave',cfg).onclick=()=>{C.payCfg.percent=Math.min(100,Math.max(1,+$('#pcPct',cfg).value||50));C.payCfg.bkashMode=$('#pcMode',cfg).value;C.payCfg.note=$('#pcNote',cfg).value;commit()};
}

addEventListener('keydown',e=>{if(e.key==='Escape'){if(!AUTHPAGE)mo.classList.remove('sh');const _p=$('#payMo');if(_p)_p.classList.remove('sh');$('#pill').classList.remove('op');$('#burger').setAttribute('aria-expanded','false');}});
window.addEventListener('storage',e=>{
 if(e.key===K.c&&e.newValue){
  try{
   const incoming=JSON.parse(e.newValue);
   C=Object.assign({},DEFAULT,incoming);
   C.brand=Object.assign({},DEFAULT.brand,incoming.brand||{});
   C.about=Object.assign({},DEFAULT.about,incoming.about||{});
   C.contact=Object.assign({},DEFAULT.contact,incoming.contact||{});
   render();
   if($('#userpanel').classList.contains('sh'))drawUser();
  }catch{}
 }
});
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
/* ---------- Supabase backend (shared database + real logins) ---------- */
const SUPA_URL='https://khwcsytjkmzqacyhthmq.supabase.co';
const SUPA_KEY='sb_publishable_YCx1YzRzbX6YrIPeWQKkdg_Pd4aVulu'; // public "publishable" key — safe in the browser; access is limited by database row-level security
/* Central OTP server. Leave `url` empty to turn the email-code step off. The key is the PUBLIC key (safe in the browser). */
const OTP={url:'https://sopnil-central-server.onrender.com',key:'pk_WUruBr4wr4Sl-TSkHn9j6DJg'};
let SB=null,SB_READY=false,_pushT=null,BACKEND=Promise.resolve();
const isAdminNow=()=>{const s=session();return !!s&&s.role==='admin'};
const isStaffNow=()=>{const s=session();return !!s&&(s.role==='admin'||s.role==='manager')};
function doLogout(){sessionStorage.removeItem(K.s);if(SB_READY)SB.auth.signOut().catch(()=>{})}
function niceAuthErr(e){const m=String(e&&e.message||'').toLowerCase();
 if(m.includes('invalid login'))return 'Wrong email or password. No account? Use Sign up.';
 if(m.includes('not confirmed'))return 'Please confirm your email first (check your inbox and spam folder).';
 if(m.includes('already registered')||m.includes('already been registered'))return 'Account already exists. Please login.';
 if(m.includes('rate limit')||e&&e.status===429)return 'Too many attempts. Please wait a few minutes and try again.';
 if(m.includes('password'))return 'Password must be at least 6 characters.';
 return 'Something went wrong. Please try again.'}
function setSession(p){sessionStorage.setItem(K.s,JSON.stringify({email:p.email,name:p.name||p.email,role:p.role,uid:p.id,loginAt:new Date().toISOString()}))}
async function sbLoadProfile(user){
 const {data,error}=await SB.from('profiles').select('id,email,name,role').eq('id',user.id).maybeSingle();
 return error?null:data}
async function sbAuthSubmit(em,pw,err){
 try{
  if(mode==='signup'){
   const nm=$('#aName').value.trim();if(!nm){err.textContent='Please enter your name.';return}
   const {data,error}=await SB.auth.signUp({email:em,password:pw,options:{data:{name:nm}}});
   if(error){err.textContent=niceAuthErr(error);return}
   const auto=!!data.session;if(auto)await SB.auth.signOut();
   recordActivity('Account created',{name:nm,email:em,role:'user'});
   setMode('login');$('#aEmail').value=em;$('#aPass').value='';
   toast(auto?'Account created. Please sign in to continue.':'Account created. Check your email to confirm, then sign in.');return}
  const {data,error}=await SB.auth.signInWithPassword({email:em,password:pw});
  if(error){err.textContent=niceAuthErr(error);return}
  const prof=await sbLoadProfile(data.user);
  if(!prof){await SB.auth.signOut();err.textContent='Your account is not fully set up yet. Please contact us.';return}
  if(em===ADMIN_EMAIL&&prof.role!=='admin'){await SB.auth.signOut();err.textContent='This account is not set as Admin in the database yet. Run the one-line admin SQL (see README), then login again.';return}
  if(OTP.url){await SB.auth.signOut();await otpStart(em,pw,prof.name,err);return}
  finishLogin(prof);
 }catch(x){err.textContent='Network problem. Please check your internet and try again.'}}

function finishLogin(prof){
 otpReset();setSession(prof);mo.classList.remove('sh');authUI();
 recordActivity(prof.role==='admin'?'Admin sign in':prof.role==='manager'?'Manager sign in':'Sign in',{name:prof.name,email:prof.email,role:prof.role});
 if(prof.role==='admin'||prof.role==='manager'){pendingPay=null;openAdmin();return}
 toast('Welcome back, '+prof.name+'!');
 if(pendingPay!==null){const pi=pendingPay;pendingPay=null;openPay(pi)}else{openUser();showRejectAlert()}}

/* ---------- email OTP (second login step, handled by the central OTP server) ---------- */
async function otpApi(path,body){
 let r;try{r=await fetch(OTP.url.replace(/\/+$/,'')+path,{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':OTP.key},body:JSON.stringify(body)})}
 catch{throw new Error('Cannot reach the verification service. Check your internet and try again.')}
 let j={};try{j=await r.json()}catch{}
 if(!r.ok||j.ok===false){const e=new Error(j.message||'Verification service error. Please try again.');e.code=j.error;e.retry=j.retryAfter;throw e}
 return j}
let otpTimer=null;
function otpCooldown(sec){const b=$('#otpResend');clearInterval(otpTimer);let n=sec;
 const tick=()=>{b.disabled=n>0;b.textContent=n>0?'Resend code in '+n+'s':'Resend code';if(n--<=0)clearInterval(otpTimer)};tick();otpTimer=setInterval(tick,1000)}
function otpReset(){otpCtx=null;clearInterval(otpTimer);$('#otpBox').style.display='none';['#authForm','#authTabs','#authSub'].forEach(s=>$(s).style.display='');$('#nmL').style.display=mode==='signup'?'grid':'none';$('#otpCode').value='';$('#otpErr').textContent=''}
let otpCtx=null;
async function otpStart(em,pw,name,err){
 let wait=0,info='';
 try{const r=await otpApi('/v1/otp/send',{email:em,purpose:'login',name});wait=r.resendAfter||60}
 catch(x){
  if(x.code==='cooldown'){wait=x.retry||30;info='A code was sent a moment ago. Enter it below, or resend when the timer ends.'}
  else if(em===ADMIN_EMAIL&&(!x.code||x.code==='email_failed'||x.code==='server_error')){ /* never lock the owner out when the mail service is down */
   const {data,error}=await SB.auth.signInWithPassword({email:em,password:pw});
   if(error){err.textContent=niceAuthErr(error);return}
   const prof=await sbLoadProfile(data.user);if(!prof){await SB.auth.signOut();err.textContent='Your account is not fully set up yet.';return}
   finishLogin(prof);toast('Email code service is unavailable – signed in with password only.');return}
  else{err.textContent=x.message;return}}
 otpCtx={em,pw,name};
 ['#authForm','#authTabs','#authSub'].forEach(s=>$(s).style.display='none');
 $('#authTitle').textContent='Check your email';$('#otpTo').textContent=em;$('#otpBox').style.display='block';$('#otpErr').textContent=info;$('#otpCode').value='';
 otpCooldown(wait);setTimeout(()=>$('#otpCode').focus(),50)}
$('#otpForm').addEventListener('submit',async e=>{e.preventDefault();
 if(!otpCtx)return;const er=$('#otpErr'),b=$('#otpSubmit'),code=$('#otpCode').value.replace(/\D/g,'');er.textContent='';
 if(code.length!==6){er.textContent='Enter the 6-digit code from your email.';return}
 b.disabled=true;
 try{await otpApi('/v1/otp/verify',{email:otpCtx.em,code,purpose:'login'});
  const {data,error}=await SB.auth.signInWithPassword({email:otpCtx.em,password:otpCtx.pw});
  if(error){er.textContent=niceAuthErr(error);return}
  const prof=await sbLoadProfile(data.user);
  if(!prof){await SB.auth.signOut();er.textContent='Your account is not fully set up yet. Please contact us.';return}
  finishLogin(prof)}
 catch(x){er.textContent=x.message;if(x.code==='code_expired'||x.code==='too_many_attempts')$('#otpCode').value=''}
 finally{b.disabled=false}});
$('#otpResend').onclick=async()=>{if(!otpCtx)return;const er=$('#otpErr');er.textContent='';
 try{const r=await otpApi('/v1/otp/send',{email:otpCtx.em,purpose:'login',name:otpCtx.name});otpCooldown(r.resendAfter||60);toast('A new code was sent')}
 catch(x){er.textContent=x.message;if(x.retry)otpCooldown(Math.min(x.retry,120))}};
$('#otpBack').onclick=()=>{otpReset();setMode('login')};
$('#otpCode').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,6);if(e.target.value.length===6)$('#otpForm').requestSubmit()});

/* shared website content */
function applyContent(remote){C=Object.assign({},DEFAULT,remote);C.contact=Object.assign({},DEFAULT.contact,remote.contact||{});_pc()}
function pushContent(now){
 if(!SB_READY||!isAdminNow())return;clearTimeout(_pushT);
 const go=async()=>{try{const {error}=await SB.from('site_content').upsert({id:1,data:C,updated_at:new Date().toISOString()});if(error)toast('Saved here, but could not publish to all visitors: '+error.message);else if(now)toast('Published to all visitors ✓')}catch{toast('Could not publish (no connection)')}};
 if(now)return go();_pushT=setTimeout(go,700)}

/* data sync (RLS decides what each account can see) */
const payFromDB=r=>({id:r.id,at:r.created_at,account:r.account,name:r.name,wa:r.wa,email:r.email,pkg:r.pkg,total:r.total,amount:r.amount,method:r.method,trx:r.trx,from:r.paid_from,status:r.status,reason:r.reason,by:r.reviewed_by,seen:r.seen});
async function syncPayments(){
 if(!SB_READY||!session())return;
 const {data,error}=await SB.from('payments').select('*').order('created_at',{ascending:false}).limit(1000);
 if(error){toast('Could not load payments');return}ls.set(K.p,data.map(payFromDB))}
async function syncMessages(){
 if(!SB_READY||!isStaffNow())return;
 const {data,error}=await SB.from('messages').select('*').order('created_at',{ascending:false}).limit(1000);
 if(error){toast('Could not load messages');return}
 const m=data.map(r=>({id:r.id,at:r.created_at,name:r.name,phone:r.phone,email:r.email,subject:r.subject,type:r.type,pkg:r.pkg,message:r.message,status:r.status}));
 ls.set(K.m,m);ls.set(K.o,m.filter(x=>x.type==='Order enquiry').map(x=>({...x,msg:x.message})))}
async function sbSendMessage(row){if(!SB_READY)return;try{await SB.from('messages').insert(row)}catch{}}
async function sbMsgStatus(id,status){if(!SB_READY)return;try{const {error}=await SB.from('messages').update({status}).eq('id',id);if(error)toast('Could not update status')}catch{}}
async function sbMsgDelete(id){if(!SB_READY)return;try{const {error}=await SB.from('messages').delete().eq('id',id);if(error)toast('Only the admin can delete messages')}catch{}}
async function sbMsgClear(type){if(!SB_READY)return;try{let q=SB.from('messages').delete();q=type?q.eq('type',type):q.neq('id','');const {error}=await q;if(error)toast('Only the admin can delete messages')}catch{}}
async function reviewPay(r,status,reason,by){
 if(!r)return false;
 if(SB_READY){let error=null;try{error=(await SB.from('payments').update({status,reason,reviewed_by:by,seen:false}).eq('id',r.id)).error}catch(x){error={message:'no connection'}}
  if(error){toast('Could not save: '+error.message);return false}}
 Object.assign(r,{status,reason,by,seen:false});
 const L=ls.get(K.p,[]),i=L.findIndex(x=>x.id===r.id);if(i>-1)L[i]=r;ls.set(K.p,L);drawAdmin();return true}
async function deletePay(r,i,L){
 if(SB_READY){let error=null;try{error=(await SB.from('payments').delete().eq('id',r.id)).error}catch(x){error={message:'no connection'}}
  if(error){toast('Only the admin can delete: '+error.message);return}}
 L.splice(i,1);ls.set(K.p,L);drawAdmin()}

/* admin: users and managers from the database */
async function sbUsersV(m){
 m.insertAdjacentHTML('beforeend','<p class="note">Loading…</p>');
 const {data,error}=await SB.from('profiles').select('*').order('created_at',{ascending:false});
 m.innerHTML='<h2>Users</h2>';
 if(error){m.insertAdjacentHTML('beforeend','<p class="note">Could not load users.</p>');return}
 const rows=data.map(u=>'<tr><td>'+esc(u.name||'—')+'</td><td>'+esc(u.email)+'</td><td>'+esc(u.role)+'</td><td>'+esc((u.created_at||'').slice(0,10))+'</td></tr>').join('');
 panel(m,'All accounts ('+data.length+')',adminTable(['Name','Email','Role','Joined'],rows)+'<p class="note admin-data-note">Accounts live in your Supabase database. To delete an account, use Supabase → Authentication → Users.</p>')}
async function sbManagersV(m){
 const sx=session();if(!sx||sx.role!=='admin'){m.insertAdjacentHTML('beforeend','<p class="note">Only the admin can manage managers.</p>');return}
 m.insertAdjacentHTML('beforeend','<p class="note">Loading…</p>');
 const {data,error}=await SB.from('profiles').select('*').in('role',['manager','admin']).order('created_at');
 m.innerHTML='<h2>Managers</h2>';if(error){m.insertAdjacentHTML('beforeend','<p class="note">Could not load managers.</p>');return}
 const add=panel(m,'Make someone a manager','<p class="note" style="margin-bottom:10px">Ask the person to <b>Sign up</b> on the website first. Then enter their email here. Managers can verify / reject payments and read orders and messages. They cannot edit the website, settings or other accounts.</p><label>Their account email<input id="mgE" type="email" autocomplete="off"></label><div class="err" id="mgErr"></div><button class="btn p sm" id="mgAdd" style="margin-top:10px">Make manager</button>');
 $('#mgAdd',add).onclick=async()=>{const e=$('#mgE',add).value.trim().toLowerCase(),er=$('#mgErr',add);er.textContent='';
  if(!/^\S+@\S+\.\S+$/.test(e)){er.textContent='Enter a valid email.';return}
  const {data:f,error:fe}=await SB.from('profiles').select('id,role').eq('email',e).maybeSingle();
  if(fe||!f){er.textContent='No account with this email. Ask them to sign up first.';return}
  if(f.role==='admin'){er.textContent='This account is the admin already.';return}
  const {error:ue}=await SB.from('profiles').update({role:'manager'}).eq('id',f.id);
  if(ue){er.textContent='Could not change role: '+ue.message;return}toast('Manager added');drawAdmin()};
 const rows=data.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.email)+'</td><td>'+esc(x.role)+'</td><td>'+(x.role==='manager'?'<button class="mini danger" data-dm="'+esc(x.id)+'">Remove manager</button>':'—')+'</td></tr>').join('');
 const p=panel(m,'Admin and managers',adminTable(['Name','Email','Role','Action'],rows));
 p.onclick=async e=>{const id=e.target.dataset.dm;if(!id||!confirm('Remove this manager? Their account stays as a normal customer.'))return;
  const {error:ue}=await SB.from('profiles').update({role:'user'}).eq('id',id);if(ue)return toast('Could not change role');drawAdmin()}}
function backendPanel(m){
 const on=SB_READY;
 const p=panel(m,'Database & publishing',`<p class="note"><b>Database:</b> ${on?'<span class="st-verified">connected</span> — payments, messages, logins and website content are shared.':'<span class="st-pending">not connected</span> — this browser is using local mode.'}</p>${on&&isAdminNow()?'<p class="note" style="margin-top:8px">Changes you save are published to all visitors automatically. Use the button if you want to push everything now.</p><button class="btn p sm" id="pubNow" style="margin-top:10px">Publish current content to all visitors</button>':''}`);
 const b=$('#pubNow',p);if(b)b.onclick=()=>pushContent(true)}
async function initBackend(){
 if(!window.supabase||!window.supabase.createClient)return;
 try{
  SB=window.supabase.createClient(SUPA_URL,SUPA_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
  const r=await Promise.race([SB.from('site_content').select('data').eq('id',1).maybeSingle(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),8000))]);
  if(r.error){SB=null;return}                       // tables not created yet, or offline: stay in local mode
  SB_READY=true;
  if(r.data&&r.data.data&&Object.keys(r.data.data).length){applyContent(r.data.data);render()}
  const {data:{session:ss}}=await SB.auth.getSession();
  if(ss){const prof=await sbLoadProfile(ss.user);if(prof)setSession(prof);else sessionStorage.removeItem(K.s)}
  else sessionStorage.removeItem(K.s);              // no real login => no admin/manager/customer UI
  authUI()
 }catch(e){SB=null;SB_READY=false}}

render();
BACKEND=initBackend();
})();

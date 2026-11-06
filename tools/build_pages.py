#!/usr/bin/env python3
"""Builds every HTML page of the site from tools/partials and tools/sections.
Run from the repository root:  python3 tools/build_pages.py
Website text (services, prices, blog, …) is edited in the Admin Panel, not here."""
import re, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(ROOT, 'tools', p), encoding='utf-8').read()
BRAND = 'Website Builders BD'

HEAD, HEADER, FOOTER, TAIL = (rd('partials/%s.html' % n) for n in ('head', 'header', 'footer', 'tail'))

EXPLORE = [
 ('🛠️', 'Services', 'Web design, online stores, SEO and more.', 'services.html'),
 ('💳', 'Pricing', 'Clear packages. Pay 50% to start.', 'pricing.html'),
 ('🖼️', 'Portfolio', 'See projects we have built.', 'portfolio.html'),
 ('🎨', 'Gallery', 'Design ideas and previews.', 'gallery.html'),
 ('📰', 'Blog', 'Tips to grow your online presence.', 'blog.html'),
 ('🎓', 'Training', 'Learn web design and digital skills.', 'training.html'),
 ('🚀', 'Our Program', 'Structured paths from idea to launch.', 'program.html'),
 ('🧭', 'Process', 'Our 5-step way of working.', 'process.html'),
 ('❓', 'FAQ & Policies', 'Answers, refund and privacy policy.', 'faq.html'),
 ('✉️', 'Contact', 'Send a message or chat with us.', 'contact.html'),
]

def explore():
    cards = ''.join('<a class="sv ex rv d%d" href="%s"><i>%s</i><h3>%s</h3><p>%s</p><em>Open page →</em></a>' % (i % 3, u, ic, t, d)
                    for i, (ic, t, d, u) in enumerate(EXPLORE))
    return ('<section class="alt" id="explore"><div class="wrap"><div class="head c rv"><span class="tag">Explore</span>'
            '<h2>Everything in <span class="grad">One Place</span></h2><p>Pick a page to see our services, packages, work and more.</p></div>'
            '<div class="grid exg" id="exploreGrid">%s</div></div></section>' % cards)

def section(name):
    return rd('sections/%s.html' % name)

def split_head(sec):
    """Returns (section without its own heading, (tag, h2, p)) so an inner page can show the heading as a banner."""
    m = re.search(r'\n\s*<div class="head[^\n]*?<span class="tag">(.*?)</span><h2>(.*?)</h2>(?:<p>(.*?)</p>)?</div>', sec)
    if not m:
        return sec, None
    return sec.replace(m.group(0), '', 1), (m.group(1), m.group(2), m.group(3) or '')

def banner(title, tag, h, p):
    return ('<section class="pghead"><div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span><b>%s</b></nav>'
            '<span class="tag rv">%s</span><h1>%s</h1>%s</div></section>' % (title, tag, h.replace('<h2>', '').replace('</h2>', ''), '<p>%s</p>' % p if p else ''))

# page key -> (file, nav title, <title>, description, [sections])
PAGES = [
 ('home', 'index.html', 'Home', BRAND + ' – Your Vision. Our Code. Your Success.',
  'Website Builders BD builds fast, modern, mobile-friendly websites for businesses in Bangladesh. Custom design, e-commerce, portfolios and more.',
  ['home', 'trust', 'about', 'EXPLORE', 'reviews']),
 ('services', 'services.html', 'Services', 'Web Design Services – ' + BRAND, 'Custom websites, online stores, portfolios, SEO and maintenance from Website Builders BD.', ['services']),
 ('pricing', 'pricing.html', 'Pricing', 'Website Packages & Pricing – ' + BRAND, 'Simple website packages from ৳1,000. Pay 50% advance by bKash or Webmoney to start.', ['pricing', 'PRICENOTE']),
 ('portfolio', 'portfolio.html', 'Portfolio', 'Our Portfolio – ' + BRAND, 'Projects and demos built by Website Builders BD.', ['portfolio', 'reviews']),
 ('gallery', 'gallery.html', 'Gallery', 'Design Gallery – ' + BRAND, 'Design ideas, previews and visual work from our studio.', ['gallery']),
 ('blog', 'blog.html', 'Blog', 'Blog – ' + BRAND, 'Useful ideas to help you build and grow your online presence.', ['blog']),
 ('training', 'training.html', 'Training', 'Training – ' + BRAND, 'Practical learning paths for web design and digital skills.', ['training']),
 ('program', 'program.html', 'Our Program', 'Our Programs – ' + BRAND, 'Structured programs to turn an idea into a useful digital project.', ['program']),
 ('process', 'process.html', 'Process', 'How It Works – ' + BRAND, 'Our clear 5-step process from idea to launch.', ['process']),
 ('faq', 'faq.html', 'FAQ & Policies', 'FAQ & Policies – ' + BRAND, 'Answers to common questions, plus our refund, privacy and terms.', ['faq', 'policy']),
 ('contact', 'contact.html', 'Contact', 'Contact Us – ' + BRAND, 'Send a message, chat on Messenger, Telegram or WhatsApp, and find us in Bogura.', ['contact', 'location']),
]
PRICENOTE = '<div class="wrap"><p class="pk-note">Questions about payment or refunds? Read our <a href="faq.html#policy">refund policy</a> or <a href="contact.html">send us a message</a>.</p></div>'

def build():
    for key, fname, nav, title, desc, parts in PAGES:
        out, first = [], True
        for part in parts:
            if part == 'EXPLORE': out.append(explore()); continue
            if part == 'PRICENOTE': out.append(PRICENOTE); continue
            sec = section(part)
            if key != 'home' and first:
                sec, hd = split_head(sec)
                if hd:
                    out.append(banner(nav, *hd))
            first = False
            out.append(sec)
        html = (HEAD.replace('{{title}}', title).replace('{{desc}}', desc).replace('{{page}}', key)
                + '\n<div id="prog"></div>\n\n' + HEADER + '\n<main>\n' + '\n'.join(out) + '\n</main>\n\n' + FOOTER + '\n' + TAIL)
        open(os.path.join(ROOT, fname), 'w', encoding='utf-8').write(html)
        print('built', fname)

if __name__ == '__main__':
    build()

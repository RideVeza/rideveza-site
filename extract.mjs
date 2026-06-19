import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'https://www.rideveza.com';
const PAGES = [
  { name: 'home', url: `${BASE}/` },
  { name: 'support', url: `${BASE}/support` },
  { name: 'privacy', url: `${BASE}/Privacy-Policy` },
];
const WIDTHS = [390, 768, 1024, 1280, 1440, 1920];

const PROPS = [
  'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing',
  'color', 'textTransform', 'textAlign', 'position',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
  'maxWidth', 'width', 'height',
  'borderTopLeftRadius', 'borderTopRightRadius',
  'borderTopWidth', 'borderTopStyle', 'borderTopColor',
  'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'backgroundColor', 'backgroundImage', 'boxShadow',
  'gap', 'display', 'flexDirection', 'justifyContent', 'alignItems',
];

const browser = await chromium.launch();
const page = await browser.newPage();
const all = {};

for (const pg of PAGES) {
  all[pg.name] = {};
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    try {
      await page.goto(pg.url, { waitUntil: 'networkidle' });
    } catch { await page.goto(pg.url, { waitUntil: 'load' }); }
    await page.waitForTimeout(350);

    const data = await page.evaluate((PROPS) => {
      const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const visible = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
      };
      const pick = (el) => {
        if (!el) return null;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const o = { tag: el.tagName.toLowerCase(), rectW: Math.round(r.width), rectH: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) };
        for (const p of PROPS) o[p] = cs[p];
        return o;
      };
      const innermost = (text) => {
        const t = text.toLowerCase();
        const m = [...document.querySelectorAll('*')].filter((el) => visible(el) && norm(el.textContent).toLowerCase() === t);
        return m.find((el) => !m.some((o) => o !== el && el.contains(o))) || null;
      };
      const startsWith = (prefix) =>
        [...document.querySelectorAll('p,div,span,h1,h2,h3,h4,li')].find(
          (el) => visible(el) && el.children.length === 0 && norm(el.textContent).startsWith(prefix)
        ) || null;
      const styledBox = (el) => {
        let cur = el;
        while (cur && cur !== document.body) {
          const cs = getComputedStyle(cur);
          if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopLeftRadius) > 0) return cur;
          cur = cur.parentElement;
        }
        return null;
      };
      const allByText = (text) => {
        const t = text.toLowerCase();
        const m = [...document.querySelectorAll('*')].filter((el) => visible(el) && norm(el.textContent).toLowerCase() === t);
        return m.filter((el) => !m.some((o) => o !== el && el.contains(o)));
      };

      const out = {};
      const add = (k, el) => { out[k] = pick(el); };

      // page-level
      out._bodyBg = getComputedStyle(document.body).backgroundColor;

      // ---- HERO ----
      add('hero.eyebrowText', innermost('Introducing Veza'));
      add('hero.eyebrowPill', styledBox(innermost('Introducing Veza')));
      add('hero.h1', innermost('Bussing done different'));
      add('hero.lead', startsWith('Experience the future'));
      add('hero.section', [...document.querySelectorAll('[data-framer-name="Hero Section"],[data-framer-name="Hero"]')].find(visible));
      add('hero.bgShape', [...document.querySelectorAll('[data-framer-name="Hero Bg Shape"]')].find(visible));

      // ---- FEATURES ----
      add('feat.eyebrow', innermost('All-in-One Solution'));
      add('feat.heading', innermost('Seamless management for dispatchers, drivers and guardians'));
      for (const card of ['Desktop App', 'Driver App', 'Guardian App']) {
        add(`feat.card.${card}.title`, innermost(card));
        add(`feat.card.${card}.box`, styledBox(innermost(card)));
      }
      add('feat.desc.desktop', startsWith('Centralize control'));
      add('feat.desc.driver', startsWith('Empower drivers'));
      add('feat.desc.guardian', startsWith('Offer guardians'));

      // Feature card container = ancestor of title carrying "Feature" framer-name
      const featTitle = innermost('Desktop App');
      const closestFramer = (el, re) => {
        let cur = el;
        while (cur && cur !== document.body) {
          const n = cur.getAttribute && cur.getAttribute('data-framer-name');
          if (n && re.test(n)) return cur;
          cur = cur.parentElement;
        }
        return null;
      };
      add('feat.card.container', closestFramer(featTitle, /^(Feature 0?1|Feature Section 0?1|Feature$)/i)
        || closestFramer(featTitle, /Feature/i));
      add('feat.content', closestFramer(featTitle, /Feature Content/i));
      add('feat.titleDesc', closestFramer(featTitle, /Title.?Description/i));
      // icon img + container
      const allIcons = [...document.querySelectorAll('[data-framer-name="Icon"]')].filter(visible);
      allIcons.slice(0,3).forEach((el,i)=>{ add(`feat.icon.${i}`, el); const img=el.querySelector('img'); if(img) add(`feat.iconImg.${i}`, img); });
      // feature image container
      const featImgs = [...document.querySelectorAll('[data-framer-name="Feature Image"]')].filter(visible);
      featImgs.slice(0,3).forEach((el,i)=>{ add(`feat.image.${i}`, el); const img=el.querySelector('img'); if(img) add(`feat.imageImg.${i}`, img); });
      add('feat.list', [...document.querySelectorAll('[data-framer-name="Feature List"]')].find(visible));

      // ---- CTA BAND ----
      add('cta.heading', innermost("Ready to Transform Your School’s Transportation?")
        || innermost("Ready to Transform Your School's Transportation?"));
      add('cta.lead', startsWith('Discover how Veza'));
      add('cta.section', [...document.querySelectorAll('[data-framer-name="CTA"],[data-framer-name="CTA Section"]')].find(visible));
      // CTA container = styled box behind heading
      add('cta.box', styledBox(innermost("Ready to Transform Your School’s Transportation?")
        || innermost("Ready to Transform Your School's Transportation?")));
      add('cta.image', [...document.querySelectorAll('[data-framer-name="feature-wide"],[data-framer-name="Feature Wide"]')].find(visible));

      // ---- BUTTONS (all "Get in Touch") ----
      const btns = allByText('Get in Touch');
      out['buttons.count'] = btns.length;
      btns.forEach((b, i) => { add(`buttons.${i}.text`, b); add(`buttons.${i}.box`, styledBox(b)); });

      // ---- FOOTER ----
      const footerEl = [...document.querySelectorAll('[data-framer-name="Footer"]')].find(visible);
      add('footer.section', footerEl);
      // navy panel inside footer = first descendant with non-transparent bg
      add('footer.panel', footerEl ? (styledBox([...footerEl.querySelectorAll('*')].find(el=>{const cs=getComputedStyle(el);return visible(el)&&cs.backgroundColor!=='rgba(0, 0, 0, 0)'})) || footerEl) : null);
      add('footer.support', innermost('Support'));
      add('footer.privacy', innermost('Privacy Policy'));
      add('footer.email', innermost('info@rideveza.com'));

      // ---- HEADER position (logo/button gutter + vertical centering) ----
      const headerEl = [...document.querySelectorAll('[data-framer-name="Header"]')].find(visible);
      add('header.el', headerEl);
      if (headerEl) {
        const row = [...headerEl.children].find(visible) || headerEl;
        add('header.row', row); // the flex row holding logo + button
      }
      add('header.logo', [...document.querySelectorAll('header svg, [data-framer-name="Brand Logo"] svg, [data-framer-name="Main Logo"] svg')].find(visible));

      // ---- IMAGES (borders/radius). Biggest 5 visible imgs across the page. ----
      const imgs = [...document.querySelectorAll('img')].filter(visible)
        .sort((a, b) => {
          const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
          return rb.width * rb.height - ra.width * ra.height;
        });
      imgs.slice(0, 5).forEach((im, i) => {
        // capture the img AND its immediate wrapper (Framer often borders the wrapper, not the img)
        add(`img.${i}`, im);
        add(`img.${i}.wrap`, im.parentElement);
      });

      // ---- generic page headings (for support/privacy) ----
      const h1s = [...document.querySelectorAll('h1')].filter(visible);
      h1s.forEach((h, i) => add(`page.h1.${i}`, h));
      const h2s = [...document.querySelectorAll('h2')].filter(visible).slice(0, 6);
      h2s.forEach((h, i) => add(`page.h2.${i}`, h));

      return out;
    }, PROPS);

    all[pg.name][width] = data;
    console.error(`  ${pg.name} @ ${width}`);
  }
}

await browser.close();
writeFileSync('original-spec.json', JSON.stringify(all, null, 2));
console.log('Full multi-page spec written to original-spec.json');
console.log('pages:', Object.keys(all).join(', '), '| widths:', WIDTHS.join(','));

import { chromium } from 'playwright';

const URL = 'https://www.rideveza.com/';
const WIDTHS = [390, 768, 1024, 1280, 1440];
const PROPS = ['position', 'top', 'fontSize', 'paddingTop', 'paddingBottom',
  'paddingLeft', 'paddingRight', 'borderTopLeftRadius', 'backgroundColor',
  'backgroundImage', 'marginTop', 'marginBottom', 'height'];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const width of WIDTHS) {
  await page.setViewportSize({ width, height: 1000 });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const data = await page.evaluate((PROPS) => {
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const visible = (el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
    };
    const pick = (el, label) => {
      if (!el) return `${label}: (not found)`;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      // r.y is relative to viewport AFTER any scroll=0, so it's doc position
      const o = { tag: el.tagName.toLowerCase(), y: Math.round(r.y + window.scrollY), bottom: Math.round(r.y + window.scrollY + r.height), w: Math.round(r.width), h: Math.round(r.height) };
      for (const p of PROPS) o[p] = cs[p];
      return `${label}: ` + JSON.stringify(o);
    };
    const byAttr = (sel) => [...document.querySelectorAll(sel)].find(visible);
    const innermost = (text) => {
      const t = text.toLowerCase();
      const m = [...document.querySelectorAll('*')].filter((el) => visible(el) && norm(el.textContent).toLowerCase() === t);
      return m.find((el) => !m.some((o) => o !== el && el.contains(o))) || null;
    };
    const styledBox = (el) => {
      let cur = el;
      while (cur && cur !== document.body) {
        const cs = getComputedStyle(cur);
        if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopLeftRadius) > 0) return cur;
        cur = cur.parentElement;
      }
      return null;
    };
    // biggest image on the page (the hero screenshot)
    const imgs = [...document.querySelectorAll('img')].filter(visible)
      .sort((a, b) => (b.getBoundingClientRect().width * b.getBoundingClientRect().height) - (a.getBoundingClientRect().width * a.getBoundingClientRect().height));

    const out = [];
    out.push(pick(byAttr('[data-framer-name="Header"]'), 'HEADER'));
    out.push(pick(styledBox(innermost('Get in Touch')), 'NAV_BUTTON'));
    out.push(pick(byAttr('[data-framer-name="Hero Bg Shape"]'), 'HERO_BG_SHAPE'));
    out.push(pick(byAttr('[data-framer-name="Hero Section"],[data-framer-name="Hero"]'), 'HERO_SECTION'));
    out.push(pick(imgs[0], 'BIGGEST_IMG(hero screenshot)'));
    return out;
  }, PROPS);

  console.log(`\n========== WIDTH ${width} ==========`);
  for (const line of data) console.log(line);
}

await browser.close();

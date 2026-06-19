import { chromium } from 'playwright';

const TARGETS = [
  { label: 'LIVE', url: 'https://www.rideveza.com/' },
  { label: 'OURS', url: 'http://localhost:4322/' },
];
const WIDTHS = [1280, 1440];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const w of WIDTHS) {
  console.log(`\n===== WIDTH ${w} =====`);
  for (const t of TARGETS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(t.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const info = await page.evaluate(() => {
      const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const logo = [...document.querySelectorAll('header svg, nav svg, header img, [data-framer-name="Brand Logo"] svg, .nav__brand img')].find(vis);
      const btn = [...document.querySelectorAll('a')].find((el) => vis(el) && norm(el.textContent) === 'Get in Touch');
      const r = (el) => el ? { left: Math.round(el.getBoundingClientRect().left), right: Math.round(el.getBoundingClientRect().right), top: Math.round(el.getBoundingClientRect().top), bottom: Math.round(el.getBoundingClientRect().bottom), h: Math.round(el.getBoundingClientRect().height) } : null;
      const vw = window.innerWidth;
      const L = r(logo), B = r(btn);
      return {
        vw,
        logo: L ? { ...L, gutterLeft: L.left, vCenter: Math.round((L.top + L.bottom) / 2) } : null,
        button: B ? { ...B, gutterRight: vw - B.right, vCenter: Math.round((B.top + B.bottom) / 2) } : null,
      };
    });
    console.log(`${t.label}:`);
    console.log('  logo  ', JSON.stringify(info.logo));
    console.log('  button', JSON.stringify(info.button));
  }
}
await browser.close();

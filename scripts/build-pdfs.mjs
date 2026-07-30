/* Renders the downloadable PDFs offered by the built site.
 *
 * Runs after `astro build`, serves dist/ over a throwaway local HTTP server so
 * that relative asset URLs resolve exactly as they will in production, and
 * writes the results back into dist/pdf/, mirroring the page's route:
 *
 *   dist/support/guardian/signing-in/index.html
 *     → dist/pdf/support/guardian/signing-in.pdf
 *
 * The work list comes from the pages themselves: every `<a class="pdf">`
 * download link in the built HTML names the file it expects, and this builds
 * exactly that set. The alternative — walking dist/support for index.html —
 * made the page and the build disagree about which routes have a PDF, and
 * quietly shipped a 26MB render of the marketing landing page that nothing
 * linked to. Whichever pages opt in are the pages that get built.
 *
 * A link's data-pdf attribute says which kind of file it wants:
 *
 *   data-pdf="page"     render this route            → signing-in.pdf
 *   data-pdf="section"  bind this section's guides   → guardian.pdf
 *
 * A section's guides are bound in the order its hub page lists them, so the
 * combined file reads in the same order as the cards someone just scrolled.
 *
 * The PDFs are build output, not source — they are never committed, and each
 * deploy regenerates them from the current HTML.
 */

import { createServer } from "node:http";
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import astroConfig from "../astro.config.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");

// Chromium spends most of its time rasterising, which parallelises well. Four
// pages is where the wall-clock gain flattens out on a typical laptop.
const POOL = 4;

// Chromium resolves a link against the address it loaded the page from, and
// writes the result into the PDF as an absolute URL. Served from a throwaway
// local server, that means every internal link lands on a dead 127.0.0.1 port
// once the build finishes. Pointing them at the real origin first makes them
// work for good — which matters, since these are read on screen as often as
// on paper.
const SITE = astroConfig.site?.replace(/\/$/, "");
if (!SITE) {
  console.warn("[pdf] no `site` in astro.config.mjs — internal links will point at the build server.");
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

/* ---------- static server over dist/ ---------- */

function serve(dir) {
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    let file = path.join(dir, url);

    // Guard against path traversal, then fall back to index.html for directories.
    if (!file.startsWith(dir)) {
      res.writeHead(403).end();
      return;
    }
    if (!path.extname(file)) file = path.join(file, "index.html");

    const body = createReadStream(file);
    body.on("error", () => res.writeHead(404).end());
    res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream" });
    body.pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

/* ---------- find the PDFs the built pages ask for ---------- */

const PDF_LINK = /<a\b[^>]*class="pdf"[^>]*>/g;
const HREF = /href="(\/pdf\/[^"]+\.pdf)"/;
const KIND = /data-pdf="(page|section)"/;

async function findRequested(dir, out = new Map()) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await findRequested(full, out);
    else if (entry.name.endsWith(".html")) {
      const html = await fs.readFile(full, "utf8");
      for (const [tag] of html.matchAll(PDF_LINK)) {
        const href = tag.match(HREF)?.[1];
        if (!href) continue;
        out.set(href, {
          href,
          kind: tag.match(KIND)?.[1] ?? "page",
          // /pdf/support/guardian/signing-in.pdf → /support/guardian/signing-in
          route: href.slice("/pdf".length).replace(/\.pdf$/, ""),
          // the page that asked, so a section can be read back for its order
          source: full,
        });
      }
    }
  }
  return out;
}

/* ---------- bind a section's guides into one file ---------- */

/* The hub lists its guides in a deliberate reading order, so take the order
   from the hub's own markup rather than sorting names. Anything it links that
   has no PDF of its own (an outside link, a page that never opted in) simply
   drops out. */
async function bind({ href, route, source }, rendered) {
  const html = await fs.readFile(source, "utf8");
  const wanted = [];
  for (const [, guide] of html.matchAll(/href="(\/support\/[^"?#]+?)\/"/g)) {
    const pdf = `/pdf${guide}.pdf`;
    if (rendered.has(pdf) && !wanted.includes(pdf)) wanted.push(pdf);
  }

  if (!wanted.length) {
    console.warn(`[pdf] ${route}: no guides to bind — skipped.`);
    return 0;
  }

  const merged = await PDFDocument.create();
  for (const pdf of wanted) {
    const bytes = await fs.readFile(path.join(DIST, pdf.slice(1)));
    const doc = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }

  const out = path.join(DIST, href.slice(1));
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, await merged.save());

  console.log(`[pdf] ${route} → ${path.relative(DIST, out)} (${wanted.length} guides, ${merged.getPageCount()} pages)`);
  return wanted.length;
}

/* ---------- footer drawn by Chromium in the @page bottom margin ---------- */

// The 11mm inset lines the footer up with the text edge on a wide guide:
// 6mm of @page margin in public/print.css plus .wrap's own 18px of padding.
const footer = (label) => `
  <div style="width:100%;margin:0 11mm;font:8pt Inter,-apple-system,sans-serif;color:#54586b;
              display:flex;justify-content:space-between;align-items:baseline;">
    <span>${label}</span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  </div>`;

/* ---------- render one route ---------- */

async function render(page, { href, route }, port) {
  await page.goto(`http://127.0.0.1:${port}${route}/`, { waitUntil: "load" });

  await page.evaluate(async (site) => {
    // Screenshots are lazy-loaded; a PDF has no viewport to scroll, so promote
    // them to eager and wait for every one to actually decode before rendering.
    document.querySelectorAll("img[loading='lazy']").forEach((img) => {
      img.loading = "eager";
    });

    // Root-relative links only: anything already absolute is either an outside
    // reference or points at the real site, and // is protocol-relative.
    if (site) {
      document.querySelectorAll('a[href^="/"]').forEach((a) => {
        const href = a.getAttribute("href");
        if (!href.startsWith("//")) a.setAttribute("href", site + href);
      });
    }

    // Collapsed <details> render as a closed row, so their contents would be
    // missing from the PDF entirely — on the passkey guide that is the whole
    // per-device checklist. Paper has nothing to expand, so open them all.
    document.querySelectorAll("details:not([open])").forEach((d) => {
      d.open = true;
    });

    await Promise.all(
      [...document.images].map((img) => (img.complete ? null : img.decode().catch(() => {}))),
    );
    await document.fonts.ready;
  }, SITE);

  const title = (await page.title()).replace(/ · Veza$/, "");
  const out = path.join(DIST, href.slice(1));
  await fs.mkdir(path.dirname(out), { recursive: true });

  await page.pdf({
    path: out,
    printBackground: true,
    preferCSSPageSize: true, // @page in public/print.css sets size and margins
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: footer(`Veza · ${title}`),
  });

  console.log(`[pdf] ${route} → ${path.relative(DIST, out)}`);
}

/* ---------- main ---------- */

try {
  await fs.access(DIST);
} catch {
  console.error("[pdf] dist/ not found — run `astro build` first.");
  process.exit(1);
}

const requested = await findRequested(DIST);
const all = [...requested.values()].sort((a, b) => a.route.localeCompare(b.route));
const pages = all.filter((j) => j.kind === "page");
const sections = all.filter((j) => j.kind === "section");

if (!pages.length) {
  console.error("[pdf] no page links a /pdf/*.pdf download — nothing to render.");
  process.exit(1);
}

const { server, port } = await serve(DIST);
const browser = await chromium.launch();

// Each worker keeps one page and pulls from the shared queue until it is empty,
// so a slow render never leaves a worker idle behind a barrier.
const queue = pages.slice();
await Promise.all(
  Array.from({ length: Math.min(POOL, pages.length) }, async () => {
    const page = await browser.newPage();
    for (let job; (job = queue.shift()); ) await render(page, job, port);
    await page.close();
  }),
);

await browser.close();
server.close();

// Sections are bound from the files just rendered, so this has to follow them.
const rendered = new Set(pages.map((j) => j.href));
for (const section of sections) await bind(section, rendered);

console.log(`[pdf] ${pages.length} page(s) rendered, ${sections.length} section(s) bound.`);

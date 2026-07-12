// Build-time loader for stored newsletter editions.
//
// The stored files are the full sent email HTML (a whole <html> document). We
// inject only the visible email markup with set:html, so we must strip the
// document scaffolding (<html>/<head>/<body>, <meta>/<title>/<link>, the email's
// own <style> block, and MSO conditional comments). If we left the <style> block
// in, its bare `body`/`a`/`img` rules would leak out and restyle the whole site.
//
// The logo-src swap and preheader strip are already applied to the stored files;
// they're re-applied here defensively so a raw drop-in still renders correctly.

// Eagerly load every edition's raw HTML at build time.
const files = import.meta.glob("./*.html", {
  query: "?raw",
  import: "default",
  eager: true,
});

// slug ("2026-07-06") -> raw html string
const bySlug = Object.fromEntries(
  Object.entries(files).map(([path, raw]) => [
    path.replace(/^\.\//, "").replace(/\.html$/, ""),
    raw,
  ]),
);

export function renderEdition(slug) {
  let html = bySlug[slug];
  if (!html) throw new Error(`No newsletter HTML for slug "${slug}"`);

  // Keep only what's inside <body>…</body>.
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (body) html = body[1];

  // Email-only footer (unsubscribe, "does not accept replies", archive link):
  // cut at the marker and re-close the content + wrapper tables it took with it.
  const footer = html.indexOf("<!-- Footer -->");
  if (footer !== -1) html = html.slice(0, footer) + "</table></td></tr></table>";

  html = html
    // Drop head-level tags that don't belong inside the page body.
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<meta[^>]*>/gi, "")
    .replace(/<title[\s\S]*?<\/title>/gi, "")
    .replace(/<link[^>]*>/gi, "")
    // MSO conditional comments.
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, "")
    // Preheader (hidden preview text) — email-client only.
    .replace(
      /\s*<!-- Preheader \(hidden preview text\) -->\s*<div style="display:none;[\s\S]*?<\/div>/gi,
      "",
    )
    // Any stray inline-image logo reference -> hosted logo.
    .replace(/src="cid:[^"]*"/gi, 'src="/email/veza-logo.png"');

  return html.trim();
}

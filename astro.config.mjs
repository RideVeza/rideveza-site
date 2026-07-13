// @ts-check
import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { articles } from './src/data/mobile-articles.js';

// https://astro.build/config
export default defineConfig({
  integrations: [
    {
      // Draft mobile guides (ready: false in src/data/mobile-articles.js)
      // render greyed-out in dev but must not ship: the hub already hides
      // their cards in prod, and this removes the built pages (and their
      // image folders) from dist. It fails the build on registry drift —
      // a slug with no built page, or a built page with no registry entry —
      // so a typo can't silently ship a draft.
      name: 'prune-draft-guides',
      hooks: {
        'astro:build:done': ({ dir, logger }) => {
          const outDir = fileURLToPath(dir);
          const hubDir = path.join(outDir, 'support/mobile');
          for (const a of articles) {
            if (a.ready) continue;
            if (!a.slug) {
              throw new Error(`mobile-articles: "${a.title}" is a draft but has no slug — static pages can't be drafts.`);
            }
            const page = path.join(hubDir, a.slug);
            if (!fs.existsSync(page)) {
              throw new Error(`mobile-articles: draft "${a.slug}" has no built page at ${page} — slug out of sync with src/pages/support/mobile/?`);
            }
            fs.rmSync(page, { recursive: true });
            fs.rmSync(path.join(outDir, 'images/support/mobile', a.slug), { recursive: true, force: true });
            logger.info(`pruned draft guide /support/mobile/${a.slug}`);
          }
          // Anything still under /support/mobile/ must be registered, so an
          // unregistered (and therefore unfiltered) page fails the build.
          const expected = new Set(['troubleshooting']);
          for (const a of articles) {
            if (a.ready) expected.add(a.href.replace('/support/mobile/', '').split('/')[0]);
          }
          for (const entry of fs.readdirSync(hubDir, { withFileTypes: true })) {
            if (entry.isDirectory() && !expected.has(entry.name)) {
              throw new Error(`Unregistered page /support/mobile/${entry.name}/ would ship — add it to src/data/mobile-articles.js as ready or draft.`);
            }
          }
        },
      },
    },
  ],
  vite: {
    plugins: [
      {
        // Dev only: serve index.html for public/ dir URLs like /help/mobile/
        // (prod hosting does this; astro dev doesn't).
        name: 'dev-public-dir-index',
        apply: 'serve',
        configureServer(server) {
          server.middlewares.use((req, _res, next) => {
            const url = (req.url || '').split('?')[0];
            if (url && !path.extname(url)) {
              const rel = (url.endsWith('/') ? url : url + '/') + 'index.html';
              if (fs.existsSync(path.join(process.cwd(), 'public', rel))) {
                req.url = rel;
              }
            }
            next();
          });
        },
      },
    ],
  },
});

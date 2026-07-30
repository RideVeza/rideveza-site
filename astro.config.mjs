// @ts-check
import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';

// https://astro.build/config
export default defineConfig({
  // Where the site actually lives. scripts/build-pdfs.mjs reads this to turn
  // the root-relative links in a guide into absolute ones before rendering —
  // without it Chromium bakes the throwaway build server's address into the
  // PDF and every internal link points at a dead localhost port.
  site: "https://rideveza.com",

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

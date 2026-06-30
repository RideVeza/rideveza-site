// @ts-check
import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';

// https://astro.build/config
export default defineConfig({
  // Keep the original Framer URL working; canonical is the clean kebab route.
  redirects: {
    '/Privacy-Policy': '/privacy-policy',
  },
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

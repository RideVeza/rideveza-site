// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Keep the original Framer URL working; canonical is the clean kebab route.
  redirects: {
    '/Privacy-Policy': '/privacy-policy',
    // Let /troubleshooting (no trailing slash) resolve to the static index in dev.
    '/troubleshooting': '/troubleshooting/index.html',
  },
});

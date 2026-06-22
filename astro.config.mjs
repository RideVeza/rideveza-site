// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Keep the original Framer URL working; canonical is the clean kebab route.
  redirects: {
    '/Privacy-Policy': '/privacy-policy',
    // Clean FAQ entry → the static index (so /troubleshooting works in dev too).
    '/troubleshooting': '/troubleshooting/index.html',
    '/faq': '/troubleshooting/index.html',
  },
});

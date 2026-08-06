// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Change this to your real domain before deploying.
  site: 'https://example.com',
  markdown: {
    smartypants: true,
  },
  build: {
    // Clean URLs: /work/vistas instead of /work/vistas.html
    format: 'directory',
  },
});

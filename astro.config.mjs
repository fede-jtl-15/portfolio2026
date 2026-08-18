// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://federico-torres.com',
  integrations: [sitemap()],
  markdown: {
    smartypants: true,
  },
  build: {
    // Clean URLs: /work/vistas instead of /work/vistas.html
    format: 'directory',
  },
});

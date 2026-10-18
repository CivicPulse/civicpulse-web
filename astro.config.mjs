import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({ site: 'https://www.civpulse.org', output: 'static',
  vite: { resolve: { alias: process.env.PUBLIC_CONTENT_SOURCE === 'supabase'
    ? [{ find: /^(?:.*\/)?scripts\/map(?:\.ts)?$/, replacement: fileURLToPath(new URL('./src/scripts/cms-map.ts', import.meta.url)) }] : [] } },
  publicDir: process.env.PUBLIC_CONTENT_SOURCE === 'supabase' ? './.civicpulse/cms-public' : './public',
  devToolbar: { enabled: false } });

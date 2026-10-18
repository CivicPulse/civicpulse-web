import { defineConfig } from 'astro/config';
export default defineConfig({ site: 'https://www.civpulse.org', output: 'static',
  publicDir: process.env.PUBLIC_CONTENT_SOURCE === 'supabase' ? './.civicpulse/cms-public' : './public',
  devToolbar: { enabled: false } });

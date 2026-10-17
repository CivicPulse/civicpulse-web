import { createCmsJsonFetch } from './admin-json.mjs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../vendor/civicpulse-api/database.types';

let client: SupabaseClient<Database> | undefined;

export function getCmsSupabase() {
  if (client) return client;
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error('CMS is not configured. Add the public Supabase URL and publishable key.');
  client = createClient<Database>(url, publishableKey, {
    global: { fetch: createCmsJsonFetch(globalThis.fetch, url) },
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

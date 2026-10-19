/** Exact approved public Supabase build configuration. Never a service-role key. */
import { createHash } from 'node:crypto';
export const APPROVED_PUBLIC_SUPABASE_URL = 'https://drzcrodqflzkzzbqsags.supabase.co';
export const APPROVED_PUBLIC_CONFIG_SHA256 = '2ed4bfc577c8b63fb94b20332fbb9335a12a3581ea83fe92215c3476f2fbcfc6';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
export function approvedPublicConfigBytes(url, publishableKey) {
  return `PUBLIC_SUPABASE_URL=${url}\nPUBLIC_SUPABASE_PUBLISHABLE_KEY=${publishableKey}\nPUBLIC_CONTENT_SOURCE=local\n`;
}
export function validateApprovedPublicConfig({ url, publishableKey } = {}) {
  if (url !== APPROVED_PUBLIC_SUPABASE_URL) throw new Error('Public Supabase URL is not the approved hosted project');
  if (typeof publishableKey !== 'string' || publishableKey.length < 20 || /\s/u.test(publishableKey)) throw new Error('Public Supabase publishable key is missing or malformed');
  const bytes = approvedPublicConfigBytes(url, publishableKey);
  if (sha256(bytes) !== APPROVED_PUBLIC_CONFIG_SHA256) throw new Error('Public Supabase config does not match the approved public-only config');
  return Object.freeze({ url, publishableKey, config_sha256: APPROVED_PUBLIC_CONFIG_SHA256 });
}

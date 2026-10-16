/** Resolve the statically selected public-content source without assuming Astro. */
export function resolvePublicContentSource(value) {
  if (value === undefined || value === null) return 'local';
  if (value === 'local' || value === 'supabase') return value;
  throw new Error(`Unsupported PUBLIC_CONTENT_SOURCE: ${String(value)}`);
}

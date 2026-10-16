export type PublicContentSource = 'local' | 'supabase';
export function resolvePublicContentSource(value: string | undefined | null): PublicContentSource;

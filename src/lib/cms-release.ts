import cms from '../data/cms-published.json';
import { resolvePublicContentSource } from './content-source.mjs';

const metadata = (cms as unknown as { _snapshot?: { sha256?: string } })._snapshot;
export const cmsSnapshotSha = resolvePublicContentSource(import.meta.env?.PUBLIC_CONTENT_SOURCE) === 'supabase'
  ? metadata?.sha256 : undefined;
if (resolvePublicContentSource(import.meta.env?.PUBLIC_CONTENT_SOURCE) === 'supabase' && !/^[0-9a-f]{64}$/.test(cmsSnapshotSha || '')) {
  throw new Error('CMS resident build requires verified materialized snapshot identity');
}
export const cmsContentPrefix = cmsSnapshotSha ? `/_content/${cmsSnapshotSha}` : '';

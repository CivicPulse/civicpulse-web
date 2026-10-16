import { resolvePublicContentSource } from './content-source.mjs';

export function cmsRefreshStatus(source?: string) {
  return resolvePublicContentSource(source) === 'local'
    ? 'Resident pages use reviewed local snapshots. CMS-to-website refresh is not enabled in this build.'
    : 'API publication does not start a website refresh. Resident changes require a separately approved CMS snapshot build and deployment.';
}

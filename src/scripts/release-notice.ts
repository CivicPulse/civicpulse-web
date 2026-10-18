// A static freshness hint, never a dependency of rendered resident content.
const pinned = document.querySelector<HTMLMetaElement>('meta[name="civicpulse-snapshot"]')?.content;
let checkedAt = 0;
let checking = false;
async function checkRelease() {
  if (!pinned || checking || Date.now() - checkedAt < 60_000 || document.visibilityState === 'hidden') return;
  checking = true; checkedAt = Date.now();
  try {
    const response = await fetch('/data/cms-snapshot.json', { cache: 'no-store' });
    if (!response.ok) return;
    const marker = await response.json();
    if (typeof marker?.manifest_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(marker.manifest_sha256) || marker.manifest_sha256 === pinned || document.getElementById('release-notice')) return;
    const notice = document.createElement('p'); notice.id = 'release-notice'; notice.className = 'data-notice'; notice.setAttribute('role', 'status');
    notice.append('A newer website snapshot is available. This page is showing an earlier snapshot. ');
    const link = document.createElement('a'); link.href = location.href; link.textContent = 'Reload to view the current website'; notice.append(link);
    document.querySelector('main')?.prepend(notice);
  } catch { /* Keep the already-rendered static page fully usable during failure. */ }
  finally { checking = false; }
}
document.addEventListener('visibilitychange', () => { void checkRelease(); });
window.addEventListener('focus', () => { void checkRelease(); });
void checkRelease();

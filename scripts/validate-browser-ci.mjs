// Credential-free tests of committed public behavior. No hosted CMS session.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { resolvePublicContentSource } from '../src/lib/content-source.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
if (resolvePublicContentSource(process.env.PUBLIC_CONTENT_SOURCE) !== 'local') throw new Error('Browser CI requires local public content');
const base = 'http://127.0.0.1:4325';
const env = { ...process.env, PUBLIC_CONTENT_SOURCE: 'local', TEST_BASE_URL: base };
const dist = await realpath(path.join(root, 'dist'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.geojson': 'application/geo+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ics': 'text/calendar' };
const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, base).pathname);
    let file = path.resolve(dist, `.${pathname}`);
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    file = await realpath(file);
    if (!file.startsWith(dist + path.sep)) throw Error('outside static root');
    const bytes = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  } catch { response.writeHead(404).end(); }
});
function execute(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], { cwd: root, env, stdio: 'inherit' });
    child.on('error', reject); child.on('exit', (code, signal) => code === 0 ? resolve() : reject(new Error(`Browser suite failed: ${path.basename(file)} (${signal || code})`)));
  });
}
try {
  // Binding is exclusive: an occupied port fails instead of testing another app.
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(4325, '127.0.0.1', resolve); });
  for (const name of ['smoke', 'bcsd-calendar', 'organization-markers', 'libraries', 'dsa-markers', 'election-districts']) await execute(`tests/${name}.mjs`);
} finally {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}

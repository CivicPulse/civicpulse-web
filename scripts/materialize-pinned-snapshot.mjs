import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadPinnedSnapshot } from './read-pinned-snapshot.mjs';
import { stableSerialize } from './snapshot-integrity.mjs';

function payloads(snapshot, kind) {
  return snapshot.records[kind].map(row => row.payload);
}
function cmsData(snapshot) {
  const layerMode = new Map(snapshot.manifest.layers.map(layer => [layer.id, layer.mode]));
  const layers = payloads(snapshot, 'layer').map(layer =>
    layerMode.get(layer.id) === 'events' ? { ...layer, dynamic: 'events' } : layer);
  return {
    _snapshot: { sha256: snapshot.manifest.sha256 },
    organizations: payloads(snapshot, 'organization'),
    calendars: payloads(snapshot, 'calendar'),
    events: payloads(snapshot, 'event'),
    layers,
    maps: payloads(snapshot, 'map'),
  };
}

async function replaceFile(file, content) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, content, { flag: 'wx' });
    await rename(temporary, file);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

/**
 * Consume one explicit, fully validated immutable generation into Astro's
 * source-shaped CMS inputs. Call this only in a disposable build workspace.
 * The function loads and verifies the pinned directory before its first write.
 */
export async function materializePinnedSnapshot(snapshotPath, { dataDirectory, publicDirectory }) {
  if (!dataDirectory || !publicDirectory) throw new Error('Snapshot materialization requires explicit Astro data and public directories');
  const snapshot = await loadPinnedSnapshot(snapshotPath);
  const data = cmsData(snapshot);
  const layerOutputs = [];
  const outputPaths = new Set();
  for (const layer of snapshot.manifest.layers) {
    const collection = snapshot.layers[layer.id];
    const relative = layer.mode === 'events' ? 'data/calendar-events.geojson' : `data/cms/${encodeURIComponent(layer.id)}.geojson`;
    if (outputPaths.has(relative)) throw new Error(`Snapshot layers collide at public output ${relative}`);
    outputPaths.add(relative);
    layerOutputs.push([path.join(publicDirectory, relative), `${stableSerialize(collection)}\n`]);
  }
  const cmsPath = path.join(dataDirectory, 'cms-published.json');
  const markerPath = path.join(publicDirectory, 'data/cms-snapshot.json');
  const outputs = [
    [cmsPath, `${stableSerialize(data)}\n`],
    [markerPath, `${stableSerialize({ directory: path.basename(snapshot.directory), manifest_sha256: snapshot.manifest.sha256 })}\n`],
    ...layerOutputs,
  ];
  for (const [file, content] of outputs) await replaceFile(file, content);
  return { snapshot, files: outputs.map(([file]) => file) };
}

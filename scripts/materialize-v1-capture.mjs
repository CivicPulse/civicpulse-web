import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadV1Capture } from './v1-public-capture.mjs';
import { stableSerialize } from './snapshot-integrity.mjs';

function payloads(snapshot, kind) {
  const byId = new Map(snapshot.records[kind].map((row) => [row.id, row.payload]));
  return snapshot.manifest.inventory.presentation_order[kind].map((id) => byId.get(id));
}

function captureData(snapshot) {
  const layerMode = new Map(snapshot.manifest.layers.map((layer) => [layer.id, layer.mode]));
  const layers = payloads(snapshot, 'layer').map((layer) =>
    layerMode.get(layer.id) === 'events' ? { ...layer, dynamic: 'events' } : layer);
  return {
    _snapshot: {
      sha256: snapshot.manifest.sha256,
      format: snapshot.manifest.format,
      source_sha: snapshot.manifest.source_sha,
      captured_at: snapshot.manifest.captured_at,
      inventory_label: snapshot.manifest.inventory.label,
    },
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

/** Materialize one explicit v1 cutover capture into Astro source-shaped inputs. */
export async function materializeV1Capture(snapshotPath, { dataDirectory, publicDirectory }) {
  if (!dataDirectory || !publicDirectory) throw new Error('V1 capture materialization requires explicit Astro data and public directories');
  const snapshot = await loadV1Capture(snapshotPath);
  const data = captureData(snapshot);
  const layerOutputs = [];
  const outputPaths = new Set();
  for (const layer of snapshot.manifest.layers) {
    const collection = snapshot.layers[layer.id];
    const relative = layer.mode === 'events' ? 'data/calendar-events.geojson' : `data/cms/${encodeURIComponent(layer.id)}.geojson`;
    if (outputPaths.has(relative)) throw new Error(`V1 capture layers collide at public output ${relative}`);
    outputPaths.add(relative);
    layerOutputs.push([path.join(publicDirectory, relative), `${stableSerialize(collection)}\n`]);
  }
  const cmsPath = path.join(dataDirectory, 'cms-published.json');
  const markerPath = path.join(publicDirectory, 'data/cms-snapshot.json');
  const outputs = [
    [cmsPath, `${stableSerialize(data)}\n`],
    [markerPath, `${stableSerialize({
      format: snapshot.manifest.format,
      manifest_sha256: snapshot.manifest.sha256,
      capture_sha256: snapshot.manifest.sha256,
      source_sha: snapshot.manifest.source_sha,
      captured_at: snapshot.manifest.captured_at,
      inventory_label: snapshot.manifest.inventory.label,
    })}\n`],
    ...layerOutputs,
  ];
  for (const [file, content] of outputs) await replaceFile(file, content);
  return { snapshot, files: outputs.map(([file]) => file) };
}

export { loadV1Capture };

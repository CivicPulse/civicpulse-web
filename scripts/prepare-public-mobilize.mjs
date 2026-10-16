import { createHash } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadEnv } from 'vite';
import { assertPublicPrivateEvent, PRIVATE_EVENT_KEYS, PRIVATE_LOCATION } from '../src/lib/private-event-policy.mjs';

export const REVIEWED_MOBILIZE_SHA256 = 'bc7f96e0faff7b3bf69058a3ef5d8826ea8ba71141bc874f8075af6b38d5c740';
export const REVIEWED_MOBILIZE_COUNT = 119;
export const REVIEWED_PRIVATE_COUNT = 81;

export function assertLocalContentSource(source) {
  if (source !== undefined && source !== '' && source !== 'local') {
    throw new Error('PUBLIC_CONTENT_SOURCE=supabase is gated until the reviewed immutable snapshot consumer is complete');
  }
}

export function prepareReviewedMobilize(rawBytes) {
  const bytes = Buffer.isBuffer(rawBytes) ? rawBytes : Buffer.from(rawBytes);
  const digest = createHash('sha256').update(bytes).digest('hex');
  if (digest !== REVIEWED_MOBILIZE_SHA256) throw new Error('Mobilize source snapshot hash is not the reviewed version');

  let records;
  try {
    records = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new Error('Mobilize source snapshot is not valid JSON');
  }
  if (!Array.isArray(records) || records.length !== REVIEWED_MOBILIZE_COUNT) {
    throw new Error('Mobilize source snapshot record count does not match the reviewed version');
  }
  const privateRecords = records.filter(record => record?.addressPrivate === true);
  if (privateRecords.length !== REVIEWED_PRIVATE_COUNT) {
    throw new Error('Mobilize private record count does not match the reviewed version');
  }

  const output = records.map(record => {
    if (record?.addressPrivate !== true) return record;
    if (record.coordinates !== undefined && record.coordinates !== null) {
      throw new Error('Reviewed private Mobilize event contains coordinates');
    }
    const projected = Object.fromEntries(Object.entries(record).filter(([key]) => PRIVATE_EVENT_KEYS.includes(key)));
    projected.location = PRIVATE_LOCATION;
    projected.address = PRIVATE_LOCATION;
    assertPublicPrivateEvent(projected);
    return projected;
  });
  return { records: output, sourceSha256: digest, recordCount: records.length, privateCount: privateRecords.length };
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const developmentEnv = loadEnv('development', root, 'PUBLIC_');
  const productionEnv = loadEnv('production', root, 'PUBLIC_');
  assertLocalContentSource(process.env.PUBLIC_CONTENT_SOURCE || developmentEnv.PUBLIC_CONTENT_SOURCE || productionEnv.PUBLIC_CONTENT_SOURCE || 'local');
  const sourcePath = path.join(root, 'src/data/mobilize-events.json');
  const outputPath = path.join(root, 'src/data/mobilize-events.public.json');
  const bytes = await readFile(sourcePath);
  const result = prepareReviewedMobilize(bytes);
  const temporaryPath = `${outputPath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(result.records, null, 2)}\n`, { flag: 'wx' });
    await rename(temporaryPath, outputPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
  process.stdout.write(`Prepared public Mobilize data (${result.recordCount} records, ${result.privateCount} normalized private records; source ${result.sourceSha256}).\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    process.stderr.write(`Public Mobilize preparation failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

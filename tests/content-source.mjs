import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePublicContentSource } from '../src/lib/content-source.mjs';

test('plain Node imports default to the explicit local content source', () => {
  assert.equal(resolvePublicContentSource(undefined), 'local');
  assert.equal(resolvePublicContentSource(null), 'local');
});

test('Astro-selected content sources remain explicit and invalid values fail closed', () => {
  assert.equal(resolvePublicContentSource('local'), 'local');
  assert.equal(resolvePublicContentSource('supabase'), 'supabase');
  assert.throws(() => resolvePublicContentSource('preview'), /Unsupported PUBLIC_CONTENT_SOURCE/);
  assert.throws(() => resolvePublicContentSource(''), /Unsupported PUBLIC_CONTENT_SOURCE/);
});

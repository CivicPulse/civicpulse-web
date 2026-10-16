import { createHash } from 'node:crypto';

export const CONTENT_KINDS = ['organization', 'calendar', 'event', 'layer', 'map'];

export function stableSerialize(value) {
  const ancestors = new Set();
  function encode(item) {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return JSON.stringify(item);
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) throw new Error('Snapshot JSON requires finite numbers');
      return JSON.stringify(item);
    }
    if (typeof item !== 'object') throw new Error('Snapshot JSON contains an unsupported value');
    if (ancestors.has(item)) throw new Error('Snapshot JSON contains a cycle');
    const array = Array.isArray(item);
    if (!array && Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) {
      throw new Error('Snapshot JSON requires plain objects');
    }
    if (Object.getOwnPropertySymbols(item).length) throw new Error('Snapshot JSON contains symbol keys');
    const keys = Object.keys(item);
    if (array && (keys.length !== item.length || keys.some((key, index) => key !== String(index)))) {
      throw new Error('Snapshot JSON requires dense arrays without extra properties');
    }
    for (const key of Object.getOwnPropertyNames(item)) {
      if (array && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) throw new Error('Snapshot JSON requires enumerable data properties');
    }
    ancestors.add(item);
    try {
      if (array) return `[${item.map(encode).join(',')}]`;
      return `{${keys.sort().map(key => `${JSON.stringify(key)}:${encode(item[key])}`).join(',')}}`;
    } finally {
      ancestors.delete(item);
    }
  }
  return encode(value);
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

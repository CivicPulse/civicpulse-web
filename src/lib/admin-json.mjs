const MAX_TEXT_UNITS = 16 * 1024 * 1024;
const MAX_NUMBER_UNITS = 4096;
const MAX_DEPTH = 128;

export class CmsJsonValueError extends Error {
  constructor() {
    super('This record cannot be read or edited as supported JSON without risking a changed value. Editing is paused. Check the saved state or ask an API administrator to preserve the original value.');
    this.name = 'CmsJsonValueError';
  }
}

export function isCmsJsonValueError(error) {
  // PostgREST wraps processResponse exceptions into its error.message.
  return error instanceof CmsJsonValueError || (typeof error?.message === 'string' && error.message.startsWith('CmsJsonValueError: '));
}

function decimalValue(token) {
  const match = /^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(token);
  if (!match) throw new CmsJsonValueError();
  const fraction = match[3] || '';
  let digits = (match[2] + fraction).replace(/^0+/, '');
  if (!digits) return '0';
  const trailing = /0+$/.exec(digits)?.[0].length || 0;
  if (trailing) digits = digits.slice(0, -trailing);
  // Never expand an exponent into a string of zeros. Token length is bounded.
  const exponent = BigInt(match[4] || 0) - BigInt(fraction.length) + BigInt(trailing);
  return `${match[1]}${digits}e${exponent}`;
}

/** Supported decimal VALUE roundtrip, not preservation of numeric token spelling. */
export function parseCmsJson(text) {
  if (typeof text !== 'string' || text.length > MAX_TEXT_UNITS) throw new CmsJsonValueError();
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      for (i++; i < text.length; i++) {
        if (text[i] === '\\') i++;
        else if (text[i] === '"') break;
      }
    } else if (ch === '{' || ch === '[') {
      if (++depth > MAX_DEPTH) throw new CmsJsonValueError();
    } else if (ch === '}' || ch === ']') depth--;
    else if (ch === '-' || /[0-9]/.test(ch)) {
      const start = i;
      while (i + 1 < text.length && /[0-9eE+.\-]/.test(text[i + 1])) {
        if (++i - start >= MAX_NUMBER_UNITS) throw new CmsJsonValueError();
      }
      const token = text.slice(start, i + 1);
      if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(token)) throw new CmsJsonValueError();
      const value = Number(token);
      if (!Number.isFinite(value) || decimalValue(token) !== decimalValue(String(value))) throw new CmsJsonValueError();
    }
  }
  // The FIRST native parse is after every numeric token passes the value guard.
  try { return JSON.parse(text); } catch { throw new CmsJsonValueError(); }
}

const guarded = new WeakSet();
function guardResponse(response) {
  if (guarded.has(response)) return response;
  const read = response.text.bind(response), clone = response.clone.bind(response);
  // Keep a native Response and all status/headers/request semantics. Guard when
  // the pinned consumers read text/json, OUTSIDE PostgREST's fetch retry loop.
  Object.defineProperties(response, {
    text: { value: async () => { const text = await read(); if (text.trim()) parseCmsJson(text); return text; } },
    json: { value: async () => parseCmsJson(await read()) },
    clone: { value: () => guardResponse(clone()) },
  });
  guarded.add(response);
  return response;
}

export function createCmsJsonFetch(request, projectUrl) {
  const origin = new URL(projectUrl).origin;
  return async (input, init) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url);
    const response = await request(input, init);
    return url.origin === origin && url.pathname.startsWith('/rest/v1/') ? guardResponse(response) : response;
  };
}

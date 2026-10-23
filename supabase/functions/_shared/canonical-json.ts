/**
 * Canonical JSON for content hashing (R&D finding F01).
 *
 * The previous snapshot hash used JSON.stringify(value, Object.keys(value).sort()).
 * An array replacer is a key ALLOW-LIST applied at every depth, so nested keys
 * that weren't also top-level keys were silently dropped: two inputs with
 * different financialInputs produced the same hash.
 *
 * Rules (version CANONICAL_JSON_VERSION):
 *  - object keys sorted (code-unit order) at every depth; array order kept
 *  - numbers serialized by JSON.stringify (shortest round-trip), never rounded
 *  - NaN / Infinity / -Infinity, bigint, functions and symbols are rejected,
 *    never coerced (JSON.stringify would turn NaN into null and collide)
 *  - object properties whose value is undefined are omitted (as JSON does);
 *    undefined inside an array is rejected
 *  - null is kept and is distinct from a missing key
 */
export const CANONICAL_JSON_VERSION = 'canonical-json-v2';

export class CanonicalJsonError extends Error {}

export function canonicalJson(value: unknown, path = '$'): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'number':
      if (!Number.isFinite(value)) throw new CanonicalJsonError(`non-finite number at ${path}`);
      return JSON.stringify(value);
    case 'string':
    case 'boolean':
      return JSON.stringify(value);
    case 'object': {
      if (Array.isArray(value)) {
        return '[' + value.map((v, i) => {
          if (v === undefined) throw new CanonicalJsonError(`undefined in array at ${path}[${i}]`);
          return canonicalJson(v, `${path}[${i}]`);
        }).join(',') + ']';
      }
      if (value instanceof Date) return JSON.stringify(value.toISOString());
      const rec = value as Record<string, unknown>;
      const keys = Object.keys(rec).filter((k) => rec[k] !== undefined).sort();
      return '{' + keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(rec[k], `${path}.${k}`)}`).join(',') + '}';
    }
    default:
      throw new CanonicalJsonError(`unsupported ${typeof value} at ${path}`);
  }
}

export async function canonicalSha256(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJson(value)));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

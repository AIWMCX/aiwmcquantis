/**
 * Content-plan dedup fingerprint.
 *
 * Reuses the exact hash64 (djb2+sdbm) technique already proven in
 * qoc-orchestrate/qoc/dedupe.ts, rather than inventing a second hashing
 * mechanism -- confirmed via repo audit that no other dedup/similarity code
 * exists anywhere in the content pipeline before writing this.
 *
 * This is deliberately EXACT/near-exact duplicate detection (normalized
 * token overlap), not semantic similarity -- it catches copy-paste and
 * near-identical rewording of the same headline/brief, not "same lesson,
 * different words." True semantic dedup would need embeddings, a separate,
 * larger lift not attempted here. Do not oversell this function's coverage.
 */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'to', 'of', 'for', 'in', 'on', 'with',
  'is', 'are', 'my', 'our', 'we', 'i', 'this', 'that', 'it', 'you', 'your',
]);

function hash64(s: string): string {
  let d = 5381; // djb2
  let g = 0; // sdbm
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    d = ((d << 5) + d + c) >>> 0;
    g = (c + (g << 6) + (g << 16) - g) >>> 0;
  }
  return d.toString(16).padStart(8, '0') + g.toString(16).padStart(8, '0');
}

/** Lowercase, strip punctuation, drop stopwords, sort tokens -- so word
 *  order and minor rewording don't change the fingerprint. */
export function normalizeContentText(...parts: (string | null | undefined)[]): string {
  const core = parts.filter(Boolean).join(' ');
  const tokens = core
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t))
    .sort();
  return tokens.join('|');
}

export function contentFingerprint(...parts: (string | null | undefined)[]): string {
  return hash64(normalizeContentText(...parts));
}

import type { PRIMACY, SOURCE_KINDS } from '../evidence-v1.ts';

type Kind = (typeof SOURCE_KINDS)[number];
type Primacy = (typeof PRIMACY)[number];

/**
 * Predicta/Analytica `sourceType` mixes how primary a source is with what kind it is.
 * v1 keeps the two apart, as System A already does.
 */
const LEGACY: Record<string, { source_kind: Kind; primacy: Primacy }> = {
  PRIMARY: { source_kind: 'other', primacy: 'primary' },
  SECONDARY: { source_kind: 'other', primacy: 'secondary' },
  AGGREGATOR: { source_kind: 'aggregator', primacy: 'secondary' },
  COMMUNITY: { source_kind: 'community', primacy: 'unknown' },
  UNKNOWN: { source_kind: 'other', primacy: 'unknown' },
};

export function splitLegacySourceType(raw: string): { source_kind: Kind; primacy: Primacy } {
  const hit = LEGACY[raw];
  if (!hit) throw new Error(`Unknown legacy sourceType ${JSON.stringify(raw)}`);
  return hit;
}

const SYSTEM_A_KIND: Record<string, Kind> = {
  OFFICIAL: 'official', GOVERNMENT: 'government', FILING: 'filing', COMPANY: 'company', LICENSED: 'licensed',
  ACADEMIC: 'academic', NEWS: 'news', COMMUNITY: 'community', DOCUMENTATION: 'documentation',
  LOCAL_BUSINESS: 'local_business', OTHER: 'other',
};

export function systemASourceKind(raw: string): Kind {
  const hit = SYSTEM_A_KIND[raw];
  if (!hit) throw new Error(`Unknown System A sourceType ${JSON.stringify(raw)}`);
  return hit;
}

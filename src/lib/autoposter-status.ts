/**
 * Publication state of one platform row, as the founder needs to read it.
 * Pure — no I/O — so the rules for what may be cancelled, rescheduled or
 * recorded are testable and identical everywhere they are shown.
 *
 * Statuses written by the system: draft, scheduled, publishing (claimed by
 * the publisher), published, failed (definite rejection), needs_credentials,
 * unknown (timeout / 5xx — the post may be live; see publish-due-posts/outcome.ts).
 * external_scheduled: scheduled natively inside LinkedIn (or another platform),
 * mirrored here for one shared calendar. The publisher only claims
 * status='scheduled', so it never posts these — that is what prevents a
 * second copy.
 */

export type PlatformStatus =
  | 'draft' | 'scheduled' | 'external_scheduled' | 'publishing' | 'published' | 'failed' | 'needs_credentials' | 'unknown';

export interface StatusView {
  label: string;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  hint: string | null;
}

const VIEWS: Record<PlatformStatus, StatusView> = {
  draft: { label: 'Draft', tone: 'neutral', hint: null },
  scheduled: { label: 'Scheduled', tone: 'info', hint: null },
  external_scheduled: {
    label: 'Scheduled in LinkedIn',
    tone: 'info',
    hint: 'Scheduled directly on the platform. Autoposter will not publish it. Change the time on the platform; after it goes live, record its URL here.',
  },
  publishing: { label: 'Publishing…', tone: 'info', hint: 'The publisher has picked this up. Do not change it now.' },
  published: { label: 'Published', tone: 'success', hint: null },
  failed: { label: 'Failed', tone: 'danger', hint: 'The platform rejected the post. Fix the cause, then reschedule.' },
  needs_credentials: { label: 'Needs reconnect', tone: 'warning', hint: 'Reconnect the account in Connections, then reschedule.' },
  unknown: {
    label: 'Status unknown',
    tone: 'warning',
    hint: 'No definite answer from the platform — the post may be live. Check the platform before doing anything else.',
  },
};

export function normalizeStatus(status: string | null | undefined): PlatformStatus {
  if (!status) return 'draft';
  // An unrecognised status is never treated as a schedulable draft: it could
  // be live somewhere. Fail closed to 'unknown' (check before acting).
  return status in VIEWS ? (status as PlatformStatus) : 'unknown';
}

export function statusView(status: string | null | undefined): StatusView {
  return VIEWS[normalizeStatus(status)];
}

/** Only a not-yet-claimed scheduled row can be cancelled. */
export function canCancel(status: string | null | undefined): boolean {
  return normalizeStatus(status) === 'scheduled';
}

/**
 * Rescheduling is allowed where nothing can already be live. Never for
 * 'unknown' (reconcile first), 'publishing' or 'published'.
 */
export function canReschedule(status: string | null | undefined): boolean {
  return ['draft', 'scheduled', 'failed', 'needs_credentials'].includes(normalizeStatus(status));
}

/** A URL can be recorded for anything not mid-publish. */
export function canRecordUrl(status: string | null | undefined): boolean {
  return normalizeStatus(status) !== 'publishing';
}

const HOSTS: Record<string, RegExp> = {
  linkedin: /(^|\.)linkedin\.com$/i,
  facebook: /(^|\.)(facebook\.com|fb\.com)$/i,
  instagram: /(^|\.)instagram\.com$/i,
};

/** Returns an error message, or null when the URL is acceptable for the platform. */
export function validatePublishedUrl(platform: string, raw: string): string | null {
  const value = raw.trim();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return 'Paste the full link, starting with https://';
  }
  if (url.protocol !== 'https:') return 'The link must start with https://';
  if (/\s/.test(value)) return 'The link must not contain spaces';
  const host = HOSTS[platform];
  if (host && !host.test(url.hostname)) return `That is not a ${platform} link`;
  return null;
}

/** LinkedIn's public URL for a ugcPost/share URN returned by the publisher. */
export function linkedinUrlFromUrn(urn: string | null | undefined): string | null {
  if (!urn || !/^urn:li:(share|ugcPost|activity):\d+$/.test(urn)) return null;
  return `https://www.linkedin.com/feed/update/${urn}/`;
}

export function publishedUrlFor(row: { platform: string; published_url?: string | null; platform_post_id?: string | null }): string | null {
  if (row.published_url) return row.published_url;
  return row.platform === 'linkedin' ? linkedinUrlFromUrn(row.platform_post_id) : null;
}

/**
 * A calendar date ("2026-10-28") as a local-midnight Date for display.
 * new Date("2026-10-28") is UTC midnight, which is Oct 27 in Denver, so the
 * queue showed every post a day before the day it publishes.
 */
export function calendarDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
}

/** "2026-10-19T16:00:00Z" -> { date: "2026-10-19", time: "10:00" } in America/Denver. */
export function toDenverParts(iso: string): { date: string; time: string } {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  const p = Object.fromEntries(f.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

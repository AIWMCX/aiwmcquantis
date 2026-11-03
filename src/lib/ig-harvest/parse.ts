/**
 * Instagram Harvest: read the JSON files of the official Instagram data export
 * (Accounts Center > Download your information, format JSON).
 * Ported from marketing-team/tools/ig-harvest/harvest.py (walk_messages, walk_saved).
 * Pure: takes already-parsed JSON, never touches the network or the archive.
 *
 * Privacy: full message text is never returned. A mention keeps at most
 * MAX_CONTEXT characters around its link; a media ref keeps at most 200.
 */
import { MAX_CONTEXT, clip, safeSlice, type LinkMention } from './classify';

export const MESSAGE_PATH = /messages\/(inbox|message_requests|archived_threads)\/[^/]+\/message_\d+\.json$/;
export const SAVED_PATH = /saved\/(saved_posts|saved_collections)\.json$/;

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const BARE_RE = /\b((?:github\.com|gitlab\.com|huggingface\.co)\/[\w.-]+\/[\w.-]+)/gi;
const TRAIL = /[.,;:!?]+$/;

export type MediaType = 'photos' | 'videos' | 'files' | 'audio_files';
export const MEDIA_TYPES: MediaType[] = ['photos', 'videos', 'files', 'audio_files'];

/** A photo, video, file or voice note shared in a DM; `path` is relative to the export root. */
export interface MediaRef {
  thread: string;
  sender: string;
  date: string;
  type: MediaType;
  path: string;
  context: string;
}

/** A post you saved on Instagram (the link points back to Instagram). */
export interface SavedPostRef {
  owner: string;
  url: string;
  date: string;
  collection: string;
}

/**
 * Instagram writes UTF-8 bytes as one \u00XX code point per byte ("ðŸ”¥" for 🔥).
 * Re-read those code points as bytes; leave the string alone if it isn't that.
 */
export function fixMojibake(s: unknown): string {
  if (typeof s !== 'string') return '';
  if (!/[\u0080-ÿ]/.test(s)) return s;
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 0xff) return s;
    bytes[i] = c;
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return s;
  }
}

/** Epoch milliseconds to YYYY-MM-DD (UTC); '' when missing or invalid. */
export function isoDate(ms: unknown): string {
  const n = typeof ms === 'string' ? Number(ms) : ms;
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return '';
  const d = new Date(n);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

/** l.instagram.com/?u=<encoded> wraps outbound links; return the real target. */
export function unwrapRedirect(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === 'l.instagram.com' || u.hostname === 'l.facebook.com') {
      const target = u.searchParams.get('u');
      if (target && /^https?:\/\//i.test(target)) return target;
    }
  } catch {
    /* not a URL: keep as is */
  }
  return url;
}

/** Every URL in the text, plus bare github.com/gitlab.com/huggingface.co owner/repo mentions. */
export function linksIn(text: string): string[] {
  if (!text) return [];
  const found = (text.match(URL_RE) ?? []).map((u) => u.replace(TRAIL, ''));
  for (const m of text.matchAll(BARE_RE)) {
    const bare = m[1].replace(TRAIL, '');
    if (!found.some((u) => u.includes(bare))) found.push(`https://${bare}`);
  }
  return found.map(unwrapRedirect);
}

/** At most `max` characters of `text`, centred on the first occurrence of `needle`. */
export function contextAround(text: string, needle: string, max = MAX_CONTEXT): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  let at = needle ? flat.indexOf(needle) : -1;
  if (at < 0 && needle.startsWith('https://')) at = flat.indexOf(needle.slice(8));
  if (at < 0) return clip(flat, max);
  const pad = Math.max(0, Math.floor((max - needle.length) / 2));
  const start = Math.max(0, Math.min(at - pad, flat.length - max));
  return safeSlice(flat, start, start + max);
}

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Thread folder name from a message_N.json path. */
export function threadFolder(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 2] ?? path;
}

export interface MessageFileResult {
  mentions: LinkMention[];
  media: MediaRef[];
}

/** One messages/<box>/<thread>/message_N.json file. */
export function parseMessageFile(data: unknown, path: string): MessageFileResult {
  const mentions: LinkMention[] = [];
  const media: MediaRef[] = [];
  if (!isObj(data)) return { mentions, media };
  const thread = fixMojibake(data.title) || threadFolder(path);
  const messages = Array.isArray(data.messages) ? data.messages : [];
  for (const raw of messages) {
    if (!isObj(raw)) continue;
    const sender = fixMojibake(raw.sender_name);
    const date = isoDate(raw.timestamp_ms);
    const text = fixMojibake(raw.content);
    const share = isObj(raw.share) ? raw.share : {};
    const shareText = fixMojibake(share.share_text);
    const postOwner = fixMojibake(share.original_content_owner);
    const joined = [text, shareText].filter(Boolean).join(' ');
    const urls = linksIn(joined);
    const shareLink = fixMojibake(share.link);
    if (shareLink) urls.push(unwrapRedirect(shareLink));
    for (const url of new Set(urls)) {
      mentions.push({ where: 'dm', thread, sender, date, url, postOwner, context: contextAround(joined, url) });
    }
    for (const type of MEDIA_TYPES) {
      const list = raw[type];
      if (!Array.isArray(list)) continue;
      for (const f of list) {
        const uri = isObj(f) && typeof f.uri === 'string' ? f.uri : '';
        if (uri) media.push({ thread, sender, date, type, path: uri, context: clip(joined.replace(/\s+/g, ' ').trim(), 200) });
      }
    }
  }
  return { mentions, media };
}

/** Every string inside a JSON value, depth-first. */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (isObj(v)) Object.values(v).forEach((x) => strings(x, out));
  return out;
}

/** First numeric `timestamp` (epoch seconds in saved_*.json) anywhere inside the value. */
function firstTimestamp(v: unknown): number | null {
  if (Array.isArray(v)) {
    for (const x of v) {
      const t = firstTimestamp(x);
      if (t) return t;
    }
  } else if (isObj(v)) {
    if (typeof v.timestamp === 'number' && v.timestamp > 0) return v.timestamp;
    for (const x of Object.values(v)) {
      const t = firstTimestamp(x);
      if (t) return t;
    }
  }
  return null;
}

export interface SavedFileResult {
  mentions: LinkMention[];
  saved: SavedPostRef[];
}

/** saved/saved_posts.json or saved/saved_collections.json. */
export function parseSavedFile(data: unknown, path: string): SavedFileResult {
  const mentions: LinkMention[] = [];
  const saved: SavedPostRef[] = [];
  const items = Array.isArray(data) ? data : isObj(data) ? (Object.values(data).find(Array.isArray) as unknown[] | undefined) ?? [] : [];
  const file = path.split('/').pop() ?? path;
  let collection = '';
  for (const it of items) {
    if (!isObj(it)) continue;
    const title = fixMojibake(it.title);
    const ts = firstTimestamp(it);
    const date = ts ? isoDate(ts < 1e12 ? ts * 1000 : ts) : '';
    const urls = [...new Set(strings(it).map(fixMojibake).flatMap(linksIn))];
    if (!urls.length) {
      // In saved_collections.json a row without a link names the collection that follows.
      if (file.startsWith('saved_collections')) {
        const smd = isObj(it.string_map_data) ? it.string_map_data : {};
        collection = (isObj(smd.Name) ? fixMojibake(smd.Name.value) : '') || title || collection;
      }
      continue;
    }
    for (const url of urls) {
      mentions.push({ where: 'saved', thread: file, sender: title, date, url, postOwner: title, context: clip(title, MAX_CONTEXT) });
    }
    const post = urls.find((u) => /instagram\.com\//i.test(u)) ?? urls[0];
    saved.push({ owner: title, url: post, date, collection });
  }
  return { mentions, saved };
}

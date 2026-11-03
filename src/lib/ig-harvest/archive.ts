/**
 * Instagram Harvest: read the export ZIP(s) in the browser without loading
 * them into memory. zip.js reads the central directory through Blob slices,
 * then inflates only the messages/saved JSON entries. Media entries are
 * inflated one at a time, on demand, for preview.
 */
import { BlobReader, BlobWriter, TextWriter, ZipReader, configure, type Entry, type FileEntry } from '@zip.js/zip.js';
import { aggregate, type HarvestItem, type LinkMention } from './classify';
import { MESSAGE_PATH, SAVED_PATH, parseMessageFile, parseSavedFile, type MediaRef, type SavedPostRef } from './parse';

// The site CSP has no blob: worker-src, so inflate on the main thread (native DecompressionStream).
configure({ useWebWorkers: false });

export interface HarvestProgress {
  phase: 'index' | 'json' | 'done';
  done: number;
  total: number;
  file: string;
}

export interface HarvestStats {
  archives: number;
  jsonFiles: number;
  threads: number;
  linkMentions: number;
  distinctItems: number;
  media: number;
  savedPosts: number;
  unreadable: number;
}

export interface Harvest {
  stats: HarvestStats;
  items: HarvestItem[];
  media: MediaRef[];
  saved: SavedPostRef[];
  /** Keeps the archives open for media previews; call close() when done. */
  archive: OpenArchive;
}

export interface OpenArchive {
  /** Inflate one entry by its export-relative path (as written in message JSON). */
  readMedia(path: string): Promise<Blob | null>;
  close(): Promise<void>;
}

const isFile = (e: Entry): e is FileEntry => !e.directory;

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic',
  mp4: 'video/mp4', mov: 'video/quicktime', m4a: 'audio/mp4', aac: 'audio/aac', mp3: 'audio/mpeg', pdf: 'application/pdf',
};
export const mimeFor = (path: string): string => MIME[path.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';

export async function harvestArchives(files: File[], onProgress?: (p: HarvestProgress) => void): Promise<Harvest> {
  const readers: ZipReader<Blob>[] = [];
  const byPath = new Map<string, FileEntry>();
  const wanted: FileEntry[] = [];
  try {
    for (const file of files) {
      onProgress?.({ phase: 'index', done: readers.length, total: files.length, file: file.name });
      const reader = new ZipReader(new BlobReader(file));
      readers.push(reader);
      for (const e of await reader.getEntries()) {
        if (!isFile(e)) continue;
        const name = e.filename.replace(/\\/g, '/');
        byPath.set(name, e);
        if (MESSAGE_PATH.test(name) || SAVED_PATH.test(name)) wanted.push(e);
      }
    }
  } catch (err) {
    await Promise.allSettled(readers.map((r) => r.close()));
    throw err;
  }

  const mentions: LinkMention[] = [];
  const media: MediaRef[] = [];
  const saved: SavedPostRef[] = [];
  const threads = new Set<string>();
  let unreadable = 0;
  for (let i = 0; i < wanted.length; i++) {
    const e = wanted[i];
    const name = e.filename.replace(/\\/g, '/');
    onProgress?.({ phase: 'json', done: i, total: wanted.length, file: name });
    let data: unknown;
    try {
      data = JSON.parse(await e.getData(new TextWriter()));
    } catch {
      unreadable += 1;
      continue;
    }
    if (MESSAGE_PATH.test(name)) {
      threads.add(name.slice(0, name.lastIndexOf('/')));
      const r = parseMessageFile(data, name);
      mentions.push(...r.mentions);
      media.push(...r.media);
    } else {
      const r = parseSavedFile(data, name);
      mentions.push(...r.mentions);
      saved.push(...r.saved);
    }
  }
  onProgress?.({ phase: 'done', done: wanted.length, total: wanted.length, file: '' });

  const items = aggregate(mentions);
  media.sort((a, b) => b.date.localeCompare(a.date));
  saved.sort((a, b) => b.date.localeCompare(a.date));

  const findEntry = (path: string): FileEntry | undefined => {
    const p = path.replace(/\\/g, '/').replace(/^\/+/, '');
    const exact = byPath.get(p);
    if (exact) return exact;
    // Re-zipped exports gain a top folder; match on the path suffix.
    for (const [name, e] of byPath) if (name.endsWith(`/${p}`)) return e;
    return undefined;
  };

  return {
    stats: {
      archives: files.length,
      jsonFiles: wanted.length,
      threads: threads.size,
      linkMentions: mentions.length,
      distinctItems: items.length,
      media: media.length,
      savedPosts: saved.length,
      unreadable,
    },
    items,
    media,
    saved,
    archive: {
      async readMedia(path) {
        const e = findEntry(path);
        return e ? e.getData(new BlobWriter(mimeFor(path))) : null;
      },
      async close() {
        await Promise.allSettled(readers.map((r) => r.close()));
      },
    },
  };
}

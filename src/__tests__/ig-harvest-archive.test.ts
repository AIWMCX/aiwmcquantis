import { describe, it, expect } from 'vitest';
import { BlobWriter, TextReader, Uint8ArrayReader, ZipWriter } from '@zip.js/zip.js';
import { harvestArchives, type HarvestProgress } from '@/lib/ig-harvest/archive';

/** Build a small synthetic export ZIP in memory, shaped like Instagram's (JSON format). */
async function exportZip(files: Record<string, string | Uint8Array>, name = 'instagram-export.zip'): Promise<File> {
  const writer = new ZipWriter(new BlobWriter('application/zip'));
  for (const [path, body] of Object.entries(files)) {
    await writer.add(path, typeof body === 'string' ? new TextReader(body) : new Uint8ArrayReader(body));
  }
  return new File([await writer.close()], name, { type: 'application/zip' });
}

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const thread = {
  title: 'Creator',
  messages: [
    { sender_name: 'Creator', timestamp_ms: Date.UTC(2026, 9, 1), content: 'Repo: https://github.com/acme/kit' },
    { sender_name: 'Creator', timestamp_ms: Date.UTC(2026, 9, 2), photos: [{ uri: 'your_instagram_activity/messages/inbox/creator_1/photos/a.png' }] },
  ],
};

describe('ig-harvest archive (zip.js)', () => {
  it('reads only the messages/saved JSON entries and extracts media on demand', async () => {
    const zip = await exportZip({
      'your_instagram_activity/messages/inbox/creator_1/message_1.json': JSON.stringify(thread),
      'your_instagram_activity/messages/inbox/creator_1/message_2.json': JSON.stringify({ messages: [{ content: 'also github.com/acme/kit' }] }),
      'your_instagram_activity/messages/inbox/creator_1/photos/a.png': PNG,
      'your_instagram_activity/saved/saved_posts.json': JSON.stringify({ saved_saved_media: [{ title: 'acme', string_map_data: { 'Saved on': { href: 'https://www.instagram.com/p/1/', timestamp: 1759500000 } } }] }),
      'your_instagram_activity/messages/inbox/broken_2/message_1.json': '{not json',
      'personal_information/personal_information.json': JSON.stringify({ secret: 'https://not-read.example.com' }),
    });
    const phases: HarvestProgress['phase'][] = [];
    const h = await harvestArchives([zip], (p) => phases.push(p.phase));
    try {
      expect(h.stats).toEqual({
        archives: 1, jsonFiles: 4, threads: 1, linkMentions: 3, distinctItems: 1, media: 1, savedPosts: 1, unreadable: 1,
      });
      expect(h.items.map((i) => [i.item_key, i.mentions])).toEqual([['github.com/acme/kit', 2]]);
      expect(phases[0]).toBe('index');
      expect(phases[phases.length - 1]).toBe('done');

      const blob = await h.archive.readMedia(h.media[0].path);
      expect(blob?.type).toBe('image/png');
      expect(new Uint8Array(await blob!.arrayBuffer())).toEqual(PNG);
      expect(await h.archive.readMedia('your_instagram_activity/messages/inbox/creator_1/photos/missing.png')).toBeNull();
    } finally {
      await h.archive.close();
    }
  });

  it('finds media in a re-zipped export that gained a top folder', async () => {
    const zip = await exportZip({
      'export/your_instagram_activity/messages/inbox/creator_1/message_1.json': JSON.stringify(thread),
      'export/your_instagram_activity/messages/inbox/creator_1/photos/a.png': PNG,
    });
    const h = await harvestArchives([zip]);
    try {
      expect(h.stats.media).toBe(1);
      expect(await h.archive.readMedia(h.media[0].path)).not.toBeNull();
    } finally {
      await h.archive.close();
    }
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { aggregate, classify, clip, isSkippedHost, type LinkMention } from '@/lib/ig-harvest/classify';
import { contextAround, fixMojibake, isoDate, linksIn, parseMessageFile, parseSavedFile, unwrapRedirect } from '@/lib/ig-harvest/parse';
import { chunk, filterItems, itemsToCsv, safeHref, sortItems, EMPTY_FILTER, type IgItemRow } from '@/lib/ig-harvest/triage';

// Instagram writes each UTF-8 byte as its own \u00XX code point.
const FIRE_MOJIBAKE = 'ð\u009f\u0094¥'; // 🔥
const CAFE_MOJIBAKE = 'cafÃ©'; // café

/** A synthetic messages/inbox/<thread>/message_1.json, shaped like the real export. */
const THREAD_JSON = {
  participants: [{ name: 'Founder' }, { name: `Creator ${FIRE_MOJIBAKE}` }],
  title: `AI Tools ${FIRE_MOJIBAKE}`,
  messages: [
    {
      sender_name: `Creator ${FIRE_MOJIBAKE}`,
      timestamp_ms: Date.UTC(2026, 9, 3, 12),
      content: `Here you go ${FIRE_MOJIBAKE} https://github.com/Acme/Agent-Kit.git, and the doc https://docs.google.com/document/d/AbC123/edit?usp=sharing.`,
    },
    {
      sender_name: 'Founder',
      timestamp_ms: Date.UTC(2026, 9, 5, 9),
      share: {
        link: 'https://www.instagram.com/reel/XYZ/',
        share_text: `Comment AGENT and I'll DM you. Repo: github.com/acme/agent-kit plus ${CAFE_MOJIBAKE} budget model at https://l.instagram.com/?u=https%3A%2F%2Fcashflow.example.com%2Fsheet&e=AT0`,
        original_content_owner: 'acme.ai',
      },
    },
    {
      sender_name: `Creator ${FIRE_MOJIBAKE}`,
      timestamp_ms: Date.UTC(2026, 9, 6, 9),
      photos: [{ uri: 'your_instagram_activity/messages/inbox/aitools_123/photos/1.jpg', creation_timestamp: 1 }],
      content: 'screenshot of the setup',
    },
    { sender_name: 'Founder', timestamp_ms: Date.UTC(2026, 9, 7), content: 'Liked a message' },
  ],
};
const THREAD_PATH = 'your_instagram_activity/messages/inbox/aitools_123/message_1.json';

const SAVED_POSTS_JSON = {
  saved_saved_media: [
    { title: 'acme.ai', string_map_data: { 'Saved on': { href: 'https://www.instagram.com/reel/XYZ/', timestamp: 1759500000 } } },
    { title: 'growth.lab', string_map_data: { 'Saved on': { href: 'https://www.instagram.com/p/ABC/', timestamp: 1759600000 } } },
  ],
};

const SAVED_COLLECTIONS_JSON = {
  saved_saved_collections: [
    { title: 'Collection', string_map_data: { Name: { value: `Tools ${FIRE_MOJIBAKE}` }, 'Creation Time': { timestamp: 1759000000 } } },
    { title: 'acme.ai', string_map_data: { Name: { value: 'acme.ai', href: 'https://www.instagram.com/p/DEF/' }, 'Added Time': { timestamp: 1759100000 } } },
  ],
};

describe('ig-harvest parse', () => {
  it('fixes Instagram mojibake and leaves clean text alone', () => {
    expect(fixMojibake(`Fire ${FIRE_MOJIBAKE}`)).toBe('Fire 🔥');
    expect(fixMojibake(CAFE_MOJIBAKE)).toBe('café');
    expect(fixMojibake('café')).toBe('café'); // a lone é is not valid UTF-8: keep the original
    expect(fixMojibake('plain ascii')).toBe('plain ascii');
    expect(fixMojibake('already 🔥')).toBe('already 🔥');
    expect(fixMojibake(undefined)).toBe('');
  });

  it('finds URLs, strips trailing punctuation, adds bare repo mentions once, unwraps l.instagram.com', () => {
    expect(linksIn('see https://tool.dev/x. and github.com/a/b!')).toEqual(['https://tool.dev/x', 'https://github.com/a/b']);
    expect(linksIn('https://github.com/a/b and github.com/a/b')).toEqual(['https://github.com/a/b']);
    expect(unwrapRedirect('https://l.instagram.com/?u=https%3A%2F%2Fx.io%2Fa&e=1')).toBe('https://x.io/a');
    expect(unwrapRedirect('https://l.instagram.com/?u=javascript%3Aalert(1)')).toBe('https://l.instagram.com/?u=javascript%3Aalert(1)');
    expect(linksIn('')).toEqual([]);
  });

  it('keeps at most 300 characters of context, centred on the link', () => {
    const text = `${'a '.repeat(400)}https://x.io/tool ${'b '.repeat(400)}`;
    const ctx = contextAround(text, 'https://x.io/tool');
    expect(ctx.length).toBeLessThanOrEqual(300);
    expect(ctx).toContain('https://x.io/tool');
    expect(contextAround('short https://x.io', 'https://x.io')).toBe('short https://x.io');
  });

  it('never cuts an emoji in half when truncating (Postgres rejects lone surrogates)', () => {
    const c = clip('🔥'.repeat(200), 301);
    expect(c.length).toBe(300);
    expect(() => encodeURIComponent(c)).not.toThrow();
    const ctx = contextAround(`${'🔥'.repeat(300)} https://x.io ${'🔥'.repeat(300)}`, 'https://x.io');
    expect(ctx).toContain('https://x.io');
    expect(ctx.length).toBeLessThanOrEqual(300);
    expect(() => encodeURIComponent(ctx)).not.toThrow();
  });

  it('dates epoch ms as UTC days', () => {
    expect(isoDate(Date.UTC(2026, 0, 2, 23, 59))).toBe('2026-01-02');
    expect(isoDate(undefined)).toBe('');
    expect(isoDate('nope')).toBe('');
  });

  it('parses a DM thread: links from content, share text and share link, plus media refs', () => {
    const { mentions, media } = parseMessageFile(THREAD_JSON, THREAD_PATH);
    const urls = mentions.map((m) => m.url);
    expect(urls).toEqual([
      'https://github.com/Acme/Agent-Kit.git',
      'https://docs.google.com/document/d/AbC123/edit?usp=sharing',
      'https://cashflow.example.com/sheet',
      'https://github.com/acme/agent-kit',
      'https://www.instagram.com/reel/XYZ/',
    ]);
    expect(mentions[0].thread).toBe('AI Tools 🔥');
    expect(mentions[0].sender).toBe('Creator 🔥');
    expect(mentions[0].date).toBe('2026-10-03');
    expect(mentions[0].context).toContain('Here you go 🔥');
    expect(mentions[2].postOwner).toBe('acme.ai');
    expect(mentions[3].context).toContain('café budget model');
    expect(mentions.every((m) => m.context.length <= 300)).toBe(true);
    expect(media).toEqual([{
      thread: 'AI Tools 🔥', sender: 'Creator 🔥', date: '2026-10-06', type: 'photos',
      path: 'your_instagram_activity/messages/inbox/aitools_123/photos/1.jpg', context: 'screenshot of the setup',
    }]);
  });

  it('survives malformed files', () => {
    expect(parseMessageFile(null, THREAD_PATH)).toEqual({ mentions: [], media: [] });
    expect(parseMessageFile({ messages: [null, 3, { share: 'x' }] }, THREAD_PATH).mentions).toEqual([]);
    expect(parseSavedFile('nope', 'saved/saved_posts.json')).toEqual({ mentions: [], saved: [] });
  });

  it('parses saved_posts and saved_collections into saved refs', () => {
    const posts = parseSavedFile(SAVED_POSTS_JSON, 'your_instagram_activity/saved/saved_posts.json');
    expect(posts.saved).toEqual([
      { owner: 'acme.ai', url: 'https://www.instagram.com/reel/XYZ/', date: '2025-10-03', collection: '' },
      { owner: 'growth.lab', url: 'https://www.instagram.com/p/ABC/', date: '2025-10-04', collection: '' },
    ]);
    expect(posts.mentions.map((m) => m.where)).toEqual(['saved', 'saved']);
    // Saved posts point back to Instagram, so they never become triage items.
    expect(aggregate(posts.mentions)).toEqual([]);

    const cols = parseSavedFile(SAVED_COLLECTIONS_JSON, 'your_instagram_activity/saved/saved_collections.json');
    expect(cols.saved).toEqual([{ owner: 'acme.ai', url: 'https://www.instagram.com/p/DEF/', date: '2025-09-28', collection: 'Tools 🔥' }]);
  });
});

describe('ig-harvest classify', () => {
  it('classifies kinds and stable keys', () => {
    expect(classify('https://github.com/Acme/Agent-Kit.git')).toMatchObject({ kind: 'repo', name: 'Acme/Agent-Kit', key: 'github.com/acme/agent-kit' });
    expect(classify('https://github.com/acme')).toMatchObject({ kind: 'profile', name: 'acme', key: 'github.com/acme' });
    expect(classify('https://huggingface.co/spaces/acme/demo')).toMatchObject({ kind: 'repo', name: 'spaces/acme/demo' });
    expect(classify('https://apps.apple.com/us/app/notes-pro/id12345')).toMatchObject({ kind: 'mobile app', name: 'notes-pro', key: 'apps.apple.com/id12345' });
    expect(classify('https://play.google.com/store/apps/details?id=com.acme.app')).toMatchObject({ kind: 'mobile app', name: 'com.acme.app' });
    expect(classify('https://docs.google.com/document/d/AbC123/edit')).toMatchObject({ kind: 'file/doc', key: 'docs.google.com/document/d/AbC123' });
    expect(classify('https://acme.notion.site/Playbook-1')).toMatchObject({ kind: 'file/doc', name: 'acme.notion.site/Playbook-1' });
    expect(classify('https://www.youtube.com/watch?v=1')).toMatchObject({ kind: 'social', name: 'youtube.com' });
    expect(classify('https://www.Cursor.com/pricing')).toMatchObject({ kind: 'site/tool', host: 'cursor.com', key: 'cursor.com' });
  });

  it('routes by keyword to AIWMC products', () => {
    expect(classify('https://x.io', 'free cash flow forecast template').routes).toEqual(['quantis']);
    expect(classify('https://github.com/a/b', 'claude agent for video editing').routes).toEqual(['build', 'video']);
    expect(classify('https://x.io', 'nothing relevant here').routes).toEqual([]);
  });

  it('skips Instagram and its CDN', () => {
    for (const h of ['instagram.com', 'l.instagram.com', 'scontent.cdninstagram.com', 'help.instagram.com']) expect(isSkippedHost(h)).toBe(true);
    expect(isSkippedHost('github.com')).toBe(false);
  });

  it('groups mentions per item: counts, dates, senders, context', () => {
    const { mentions } = parseMessageFile(THREAD_JSON, THREAD_PATH);
    const items = aggregate(mentions);
    expect(items.map((i) => i.item_key)).toEqual(['github.com/acme/agent-kit', 'cashflow.example.com', 'docs.google.com/document/d/AbC123']);
    const repo = items[0];
    expect(repo).toMatchObject({ kind: 'repo', mentions: 2, first_seen: '2026-10-03', last_seen: '2026-10-05', senders: ['Creator 🔥', 'acme.ai'] });
    expect(repo.urls).toEqual(['https://github.com/Acme/Agent-Kit.git', 'https://github.com/acme/agent-kit']);
    expect(repo.routes).toContain('build');
    expect(items.every((i) => (i.context ?? '').length <= 300)).toBe(true);
  });

  it('caps urls and senders per item', () => {
    const many: LinkMention[] = Array.from({ length: 80 }, (_, i) => ({
      where: 'dm', thread: 't', sender: `s${i}`, date: '', url: `https://tool.dev/p/${i}`, postOwner: '', context: '',
    }));
    const [item] = aggregate(many);
    expect(item.mentions).toBe(80);
    expect(item.urls).toHaveLength(50);
    expect(item.senders).toHaveLength(50);
    expect(item.first_seen).toBeNull();
  });
});

const row = (over: Partial<IgItemRow>): IgItemRow => ({
  id: 'id', item_key: 'k', kind: 'site/tool', host: 'h', name: 'n', example_url: 'https://h', urls: [], mentions: 1,
  routes: [], senders: [], first_seen: null, last_seen: null, context: null, status: 'new', product: null, notes: null,
  last_run_id: null, created_at: '', updated_at: '', ...over,
});

describe('ig-harvest triage', () => {
  const rows = [
    row({ id: '1', name: 'acme/agent', kind: 'repo', routes: ['build'], mentions: 5, last_seen: '2026-10-01' }),
    row({ id: '2', name: 'cashflow.io', routes: ['quantis'], mentions: 2, last_seen: '2026-10-09', status: 'adopted', product: 'quantis' }),
    row({ id: '3', name: 'random.site', mentions: 9, last_seen: '2026-09-01', notes: 'Try for Store demos' }),
  ];

  it('filters by kind, route, status, product and text', () => {
    expect(filterItems(rows, { ...EMPTY_FILTER, kind: 'repo' }).map((r) => r.id)).toEqual(['1']);
    expect(filterItems(rows, { ...EMPTY_FILTER, route: 'none' }).map((r) => r.id)).toEqual(['3']);
    expect(filterItems(rows, { ...EMPTY_FILTER, route: 'quantis' }).map((r) => r.id)).toEqual(['2']);
    expect(filterItems(rows, { ...EMPTY_FILTER, status: 'new' }).map((r) => r.id)).toEqual(['1', '3']);
    expect(filterItems(rows, { ...EMPTY_FILTER, product: 'unset' }).map((r) => r.id)).toEqual(['1', '3']);
    expect(filterItems(rows, { ...EMPTY_FILTER, query: 'store demos' }).map((r) => r.id)).toEqual(['3']);
  });

  it('sorts by mentions or last seen', () => {
    expect(sortItems(rows, 'mentions').map((r) => r.id)).toEqual(['3', '1', '2']);
    expect(sortItems(rows, 'last_seen').map((r) => r.id)).toEqual(['2', '1', '3']);
  });

  it('exports CSV with formula-safe cells', () => {
    const csv = itemsToCsv([row({ name: '=HYPERLINK("x")', routes: ['build', 'video'], context: 'a, b' })]);
    const line = csv.split('\n')[1];
    expect(line.startsWith(`"'=HYPERLINK(""x"")"`)).toBe(true);
    expect(line).toContain('build; video');
    expect(line).toContain('"a, b"');
  });

  it('chunks and only links http(s)', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(safeHref('javascript:alert(1)')).toBeUndefined();
    expect(safeHref('https://x.io')).toBe('https://x.io');
  });
});

describe('ig-harvest migration', () => {
  const sql = readFileSync('supabase/migrations/20261102090000_admin_instagram_harvest.sql', 'utf8');

  it('is admin-only with RLS on both tables and the merge function', () => {
    expect(sql).toContain('ALTER TABLE public.ig_harvest_runs  ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE public.ig_harvest_items ENABLE ROW LEVEL SECURITY');
    expect(sql.match(/USING \(public\.has_role\(auth\.uid\(\), 'admin'::app_role\)\)/g)).toHaveLength(2);
    expect(sql).toContain("IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::app_role)");
    expect(sql).toContain('REVOKE ALL ON FUNCTION public.ig_harvest_merge_items(uuid, jsonb) FROM PUBLIC, anon');
    expect(sql).not.toMatch(/SECURITY DEFINER/);
  });

  it('caps stored context at 300 characters and never overwrites triage fields on merge', () => {
    expect(sql).toContain('char_length(context) <= 300');
    expect(sql).toContain("status IN ('new', 'reviewing', 'adopted', 'rejected')");
    const onConflict = sql.slice(sql.indexOf('ON CONFLICT'));
    expect(onConflict).not.toMatch(/\b(status|product|notes)\s*=/);
    expect(onConflict).toContain('mentions    = GREATEST(t.mentions, EXCLUDED.mentions)');
  });
});

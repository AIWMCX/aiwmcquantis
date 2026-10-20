import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('supabase/functions/publish-due-posts/index.ts', 'utf8');

describe('LinkedIn image publishing', () => {
  it('reads the post image from the content-assets bucket', () => {
    expect(src).toContain("const POST_ASSET_BUCKET = 'content-assets';");
    expect(src).toContain("select('asset_path, asset_alt, hook')");
  });
  it('registers, uploads, then references the asset as an IMAGE share', () => {
    expect(src).toContain('v2/assets?action=registerUpload');
    expect(src).toContain("urn:li:digitalmediaRecipe:feedshare-image");
    expect(src).toContain("shareMediaCategory: media ? 'IMAGE' : 'NONE'");
  });
  it('never downgrades to a text-only post when the image step fails', () => {
    expect(src).toContain("if (!up.asset) return { ok: false, error: up.error ?? 'LinkedIn image upload failed' };");
    expect(src).toContain('? { ok: false, error: imageError }');
  });
  it('image upload calls carry the publish timeout', () => {
    const block = src.slice(src.indexOf('async function uploadLinkedInImage'), src.indexOf('async function publishLinkedIn'));
    expect(block.match(/AbortSignal\.timeout\(PUBLISH_TIMEOUT_MS\)/g)?.length).toBe(2);
  });
});

describe('parent post status', () => {
  it("marks the parent post 'posted' (allowed by autoposter_posts_status_check)", () => {
    expect(src).toContain("update({ status: 'posted' }).eq('id', row.post_id)");
    expect(src).not.toContain("update({ status: 'published' }).eq('id', row.post_id)");
  });
});

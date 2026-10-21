import { describe, expect, it } from 'vitest';
import { ADMIN_READ_PAGE_SIZE, readAdminRows } from '@/lib/admin-read-all';

describe('admin metric paging', () => {
  it('fetches all pages instead of treating the first page as the total', async () => {
    const pages: Array<[number, number]> = [];
    const rows = await readAdminRows(async (from, to) => {
      pages.push([from, to]);
      return { data: from === 0 ? Array.from({ length: ADMIN_READ_PAGE_SIZE }, (_, i) => i) : [500], error: null };
    });
    expect(rows).toHaveLength(501);
    expect(pages).toEqual([[0, 499], [500, 999]]);
  });

  it('fails explicitly at the ceiling rather than returning a truncated KPI', async () => {
    await expect(readAdminRows(
      async () => ({ data: Array.from({ length: ADMIN_READ_PAGE_SIZE }, (_, i) => i), error: null }),
      ADMIN_READ_PAGE_SIZE,
    )).rejects.toThrow(/exceeded the 500-row safety limit/);
  });

  it('propagates a database query failure instead of returning partial rows', async () => {
    await expect(readAdminRows(async () => ({ data: null, error: { message: 'permission denied' } })))
      .rejects.toThrow('permission denied');
  });
});

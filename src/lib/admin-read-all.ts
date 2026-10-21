/**
 * PostgREST limits a response page (commonly 1,000 rows). Admin KPIs must not
 * silently present a capped slice as a complete window, so read bounded,
 * ordered pages and fail the panel closed if the safe ceiling is exceeded.
 */
export const ADMIN_READ_PAGE_SIZE = 500;
export const ADMIN_READ_MAX_ROWS = 20_000;

interface PageResult<T> {
  data: T[] | null;
  error: { message?: string } | null;
}

export async function readAdminRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  maxRows = ADMIN_READ_MAX_ROWS,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < maxRows; from += ADMIN_READ_PAGE_SIZE) {
    const to = Math.min(from + ADMIN_READ_PAGE_SIZE, maxRows) - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) throw new Error(error.message || 'Admin metric query failed');
    const page = data ?? [];
    rows.push(...page);
    if (page.length < to - from + 1) return rows;
  }
  // Distinguish exactly-at-limit from truncated: probe one bounded page past
  // the ceiling, and never include that page in the reported KPI.
  const { data, error } = await fetchPage(maxRows, maxRows + ADMIN_READ_PAGE_SIZE - 1);
  if (error) throw new Error(error.message || 'Admin metric query failed');
  if ((data ?? []).length > 0) {
    throw new Error(`Admin metric query exceeded the ${maxRows.toLocaleString()}-row safety limit; use a database aggregate before expanding this window.`);
  }
  return rows;
}

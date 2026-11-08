import { useMemo, useState, type ReactNode } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TOOL_STATE_LABELS,
  latestBy,
  latestDayRows,
  metricNum,
  metricStr,
  psiTrend,
  type ExtRow,
  type SyncRunRow,
  type ToolState,
  type ToolStatus,
} from '@/lib/growth-seo';
import { INSPECTION_PATHS, KEY_PATHS, PSI_DEVICES } from '../../../supabase/functions/_shared/growth/targets';
import { cwvCategory, type CwvCategory } from '../../../supabase/functions/_shared/growth/psi';

/**
 * /admin/growth phase-2 sections: tool status, Speed & Core Web Vitals,
 * Indexing, IndexNow and Bing. Each section says what its source counts and
 * what it does not. Values the API did not return show as a dash.
 */

const dash = '—';
// Google timestamps can carry up to 9 fractional digits; Date parsing wants at most 3.
const fmtTime = (iso: string | null | undefined) =>
  iso ? new Date(iso.replace(/(\.\d{3})\d+/, '$1')).toLocaleString('en-US', { timeZone: 'America/Denver', dateStyle: 'medium', timeStyle: 'short' }) + ' MT' : dash;
const fmtInt = (v: number | null) => (v === null ? dash : Math.round(v).toLocaleString('en-US'));
const fmtMs = (v: number | null) => (v === null ? dash : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`);
const fmtCls = (v: number | null) => (v === null ? dash : v.toFixed(2));

const STATE_TONE: Record<ToolState, string> = {
  connected: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  running: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  needs_permission: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  not_configured: 'bg-muted text-muted-foreground',
  never_run: 'bg-muted text-muted-foreground',
};

export function ToolStatusStrip({ statuses }: { statuses: ToolStatus[] | null }) {
  return (
    <div className="mb-6" data-testid="tool-status-strip">
      <h2 className="text-sm font-medium text-muted-foreground mb-2">Tool status</h2>
      {statuses === null ? <Skeleton className="h-10 w-full" /> : (
        <ul className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <li
              key={s.source}
              data-testid={`tool-chip-${s.source}`}
              data-state={s.state}
              className="rounded-md border px-3 py-1.5 text-xs"
              title={s.error ?? undefined}
            >
              <span className="font-medium mr-2">{s.label}</span>
              <span className={`inline-block rounded px-1.5 py-0.5 font-medium ${STATE_TONE[s.state]}`}>{TOOL_STATE_LABELS[s.state]}</span>
              <span className="ml-2 text-muted-foreground">
                {s.state === 'never_run' ? 'no run yet' : `last sync ${fmtTime(s.last_run)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const CWV_TONE: Record<CwvCategory, string> = {
  good: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'needs-improvement': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  poor: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

function CwvChip({ value, category }: { value: string; category: CwvCategory | null }) {
  if (value === dash) return <span className="text-muted-foreground">{dash}</span>;
  return (
    <span className="whitespace-nowrap">
      {value}
      {category && <span className={`ml-1 inline-block rounded px-1 py-0.5 text-[10px] font-medium ${CWV_TONE[category]}`}>{category}</span>}
    </span>
  );
}

const asCategory = (v: string | null): CwvCategory | null =>
  v === 'good' || v === 'needs-improvement' || v === 'poor' ? v : null;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      {children}
    </section>
  );
}

function Honesty({ counts, notCounts }: { counts: string; notCounts: string }) {
  return (
    <p className="text-sm text-muted-foreground mb-3">
      <strong>Counts:</strong> {counts} <strong>Does not count:</strong> {notCounts}
    </p>
  );
}

const TREND_COLORS = ['hsl(var(--primary))', '#16a34a', '#d97706', '#dc2626', '#7c3aed'];

export function SpeedSection({ rows }: { rows: ExtRow[] | null }) {
  const [device, setDevice] = useState<string>('mobile');
  const latest = useMemo(() => latestBy(rows ?? [], 'psi_url', (r) => `${r.dims.path}|${r.dims.device}`), [rows]);
  const trend = useMemo(() => psiTrend(rows ?? [], KEY_PATHS, device), [rows, device]);
  const th = 'px-2 py-1 text-right font-medium';
  const td = 'px-2 py-1 text-right tabular-nums';
  return (
    <Section title="Speed & Core Web Vitals">
      <Honesty
        counts="PageSpeed Insights, once a day, for 5 key pages on mobile and desktop (10 calls). Lab = one Lighthouse run from Google's servers at sync time. Field = real Chrome users (CrUX), 75th percentile over the last 28 days."
        notCounts="lab numbers vary run to run and are not what visitors saw. Field data appears only when Chrome has enough traffic for the page; 'origin' means the page had too little and the number is the whole site. 'No field data' means CrUX has nothing yet; nothing is filled in."
      />
      <Card className="mb-4">
        <CardContent className="pt-4">
          {rows === null ? <Skeleton className="h-40 w-full" /> : latest.size === 0 ? (
            <p className="text-sm text-muted-foreground">No PageSpeed rows yet. They appear after the first daily sync.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="psi-table">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-1 text-left font-medium">Page</th>
                    <th className="px-2 py-1 text-left font-medium">Device</th>
                    <th className={th}>Perf.</th>
                    <th className={th}>SEO</th>
                    <th className={th}>A11y</th>
                    <th className={th}>Best pr.</th>
                    <th className={`${th} border-l`}>Lab LCP</th>
                    <th className={th}>Lab CLS</th>
                    <th className={th}>Lab TBT</th>
                    <th className={`${th} border-l`}>Field LCP p75</th>
                    <th className={th}>Field INP p75</th>
                    <th className={th}>Field CLS p75</th>
                    <th className="px-2 py-1 text-left font-medium">Field data</th>
                    <th className="px-2 py-1 text-left font-medium">Day / Lighthouse</th>
                  </tr>
                </thead>
                <tbody>
                  {KEY_PATHS.flatMap((path) => PSI_DEVICES.map((dev) => {
                    const r = latest.get(`${path}|${dev}`);
                    const m = r?.metrics ?? {};
                    const scope = metricStr(m.field_scope);
                    const labLcp = metricNum(m.lab_lcp_ms);
                    const labCls = metricNum(m.lab_cls);
                    return (
                      <tr key={`${path}|${dev}`} className="border-b last:border-0">
                        <td className="px-2 py-1 whitespace-nowrap">{path}</td>
                        <td className="px-2 py-1">{dev}</td>
                        <td className={td}>{fmtInt(metricNum(m.perf_score))}</td>
                        <td className={td}>{fmtInt(metricNum(m.seo_score))}</td>
                        <td className={td}>{fmtInt(metricNum(m.accessibility_score))}</td>
                        <td className={td}>{fmtInt(metricNum(m.best_practices_score))}</td>
                        <td className={`${td} border-l`}><CwvChip value={fmtMs(labLcp)} category={cwvCategory('lcp', labLcp)} /></td>
                        <td className={td}><CwvChip value={fmtCls(labCls)} category={cwvCategory('cls', labCls)} /></td>
                        <td className={td}>{fmtMs(metricNum(m.lab_tbt_ms))}</td>
                        <td className={`${td} border-l`}><CwvChip value={fmtMs(metricNum(m.field_lcp_p75_ms))} category={asCategory(metricStr(m.field_lcp_category))} /></td>
                        <td className={td}><CwvChip value={fmtMs(metricNum(m.field_inp_p75_ms))} category={asCategory(metricStr(m.field_inp_category))} /></td>
                        <td className={td}><CwvChip value={fmtCls(metricNum(m.field_cls_p75))} category={asCategory(metricStr(m.field_cls_category))} /></td>
                        <td className="px-2 py-1 text-xs text-muted-foreground whitespace-nowrap">
                          {!r ? dash : scope === 'url' ? 'this page' : scope === 'origin' ? 'origin (whole site)' : 'no field data'}
                        </td>
                        <td className="px-2 py-1 text-xs text-muted-foreground whitespace-nowrap">
                          {r ? `${r.day} · ${metricStr(m.lighthouse_version) ?? dash}${metricStr(m.runtime_error) ? ` · ${metricStr(m.runtime_error)}` : ''}` : 'no row yet'}
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Lighthouse performance score, last 30 days</CardTitle>
          <div className="flex gap-1" role="group" aria-label="Device">
            {PSI_DEVICES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                aria-pressed={device === d}
                className={`px-3 py-1 text-xs rounded-md border ${device === d ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {rows === null ? <Skeleton className="h-48 w-full" /> : trend.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trend yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                {KEY_PATHS.map((p, i) => (
                  <Line key={p} type="monotone" dataKey={p} name={p} stroke={TREND_COLORS[i % TREND_COLORS.length]} strokeWidth={1.5} dot={false} connectNulls={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}

type Endpoint = { status?: string; google_message?: string; error?: string };

export function IndexingSection({ rows, lastRun }: { rows: ExtRow[] | null; lastRun: SyncRunRow | undefined }) {
  const urls = useMemo(() => latestBy(rows ?? [], 'indexing_url', (r) => r.dims.path), [rows]);
  const sitemaps = useMemo(() => latestDayRows(rows ?? [], 'indexing_sitemap'), [rows]);
  const endpoints = ((lastRun?.details ?? {}) as { endpoints?: Record<string, Endpoint> }).endpoints ?? {};
  const denied = Object.entries(endpoints).filter(([, e]) => e.status === 'permission_denied');
  const td = 'px-2 py-1 whitespace-nowrap';
  return (
    <Section title="Indexing">
      <Honesty
        counts="Search Console URL Inspection for 8 pages (verdict, coverage, last crawl, Google's chosen canonical), and the sitemap list (submitted URLs, errors, warnings, last download). Daily."
        notCounts="URL Inspection is the version in Google's index, not a live test. The sitemap 'indexed' number is deprecated by Google and is not a real index count; use the per-page verdicts."
      />
      {denied.map(([name, e]) => (
        <Card key={name} className="mb-4 border-amber-500" data-testid={`permission-denied-${name}`}>
          <CardContent className="pt-4 text-sm">
            <strong>{name === 'url_inspection' ? 'URL Inspection' : 'Sitemaps'}: needs Full permission in Search Console.</strong>{' '}
            The service account has Restricted access. Google said: <code className="break-words">{e.google_message || e.error || 'HTTP 403'}</code>
          </CardContent>
        </Card>
      ))}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Key pages in Google's index</CardTitle></CardHeader>
          <CardContent>
            {rows === null ? <Skeleton className="h-32 w-full" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="indexing-table">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-1 text-left font-medium">Page</th>
                      <th className="px-2 py-1 text-left font-medium">Verdict</th>
                      <th className="px-2 py-1 text-left font-medium">Coverage</th>
                      <th className="px-2 py-1 text-left font-medium">Indexing</th>
                      <th className="px-2 py-1 text-left font-medium">robots.txt</th>
                      <th className="px-2 py-1 text-left font-medium">Last crawl</th>
                      <th className="px-2 py-1 text-left font-medium">Google canonical</th>
                      <th className="px-2 py-1 text-left font-medium">Checked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {INSPECTION_PATHS.map((path) => {
                      const r = urls.get(path);
                      const m = r?.metrics ?? {};
                      const verdict = metricStr(m.verdict);
                      return (
                        <tr key={path} className="border-b last:border-0">
                          <td className={td}>{path}</td>
                          <td className={td}>
                            <span className={verdict === 'PASS' ? 'text-green-700 dark:text-green-400' : verdict === 'FAIL' ? 'text-red-700 dark:text-red-400' : ''}>{verdict ?? dash}</span>
                          </td>
                          <td className="px-2 py-1">{metricStr(m.coverage_state) ?? dash}</td>
                          <td className={td}>{metricStr(m.indexing_state) ?? dash}</td>
                          <td className={td}>{metricStr(m.robots_txt_state) ?? dash}</td>
                          <td className={td}>{r ? fmtTime(metricStr(m.last_crawl_time)) : dash}</td>
                          <td className="px-2 py-1 max-w-[16rem] truncate" title={metricStr(m.google_canonical) ?? undefined}>{metricStr(m.google_canonical) ?? dash}</td>
                          <td className={`${td} text-xs text-muted-foreground`}>{r?.day ?? 'no row yet'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Sitemap health</CardTitle></CardHeader>
          <CardContent>
            {rows === null ? <Skeleton className="h-16 w-full" /> : sitemaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sitemap rows yet.</p>
            ) : (
              <table className="w-full text-sm" data-testid="sitemap-table">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-1 text-left font-medium">Sitemap</th>
                    <th className="px-2 py-1 text-right font-medium">Submitted</th>
                    <th className="px-2 py-1 text-right font-medium">Indexed (deprecated)</th>
                    <th className="px-2 py-1 text-right font-medium">Errors</th>
                    <th className="px-2 py-1 text-right font-medium">Warnings</th>
                    <th className="px-2 py-1 text-left font-medium">Last downloaded</th>
                    <th className="px-2 py-1 text-left font-medium">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {sitemaps.map((r) => (
                    <tr key={r.dims.path} className="border-b last:border-0">
                      <td className="px-2 py-1 break-all">{r.dims.path}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{fmtInt(metricNum(r.metrics.submitted))}</td>
                      <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{fmtInt(metricNum(r.metrics.indexed))}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{fmtInt(metricNum(r.metrics.errors))}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{fmtInt(metricNum(r.metrics.warnings))}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{fmtTime(metricStr(r.metrics.last_downloaded))}</td>
                      <td className="px-2 py-1">{metricNum(r.metrics.is_pending) === 1 ? 'yes' : metricNum(r.metrics.is_pending) === 0 ? 'no' : dash}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}

export function IndexNowSection({ rows }: { rows: ExtRow[] | null }) {
  const pings = useMemo(() => [...(rows ?? [])].filter((r) => r.report === 'indexnow_ping')
    .sort((a, b) => (a.dims.pinged_at < b.dims.pinged_at ? 1 : -1)).slice(0, 10), [rows]);
  return (
    <Section title="IndexNow">
      <Honesty
        counts="each IndexNow ping sent after a production deploy (Bing, Yandex, Seznam, Naver share it): HTTP status, how many sitemap URLs were sent, when."
        notCounts="200/202 only means IndexNow accepted the list. It does not mean any engine crawled or indexed a page."
      />
      <Card>
        <CardContent className="pt-4">
          {rows === null ? <Skeleton className="h-16 w-full" /> : pings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No ping recorded yet. The next production deploy records one.</p>
          ) : (
            <table className="w-full text-sm" data-testid="indexnow-table">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-1 text-left font-medium">Pinged</th>
                  <th className="px-2 py-1 text-right font-medium">HTTP</th>
                  <th className="px-2 py-1 text-right font-medium">URLs</th>
                  <th className="px-2 py-1 text-left font-medium">Result</th>
                  <th className="px-2 py-1 text-left font-medium">Commit</th>
                </tr>
              </thead>
              <tbody>
                {pings.map((r) => (
                  <tr key={r.dims.pinged_at} className="border-b last:border-0">
                    <td className="px-2 py-1 whitespace-nowrap">{fmtTime(r.dims.pinged_at)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmtInt(metricNum(r.metrics.http_status))}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmtInt(metricNum(r.metrics.url_count))}</td>
                    <td className="px-2 py-1">{metricNum(r.metrics.accepted) === 1 ? 'accepted' : 'rejected'}</td>
                    <td className="px-2 py-1 font-mono text-xs">{metricStr(r.metrics.commit_sha)?.slice(0, 8) ?? dash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}

export function BingSection({ rows, status }: { rows: ExtRow[] | null; status: ToolStatus | undefined }) {
  const traffic = useMemo(() => (rows ?? []).filter((r) => r.report === 'bing_traffic'), [rows]);
  const crawl = useMemo(() => [...(rows ?? [])].filter((r) => r.report === 'bing_crawl').sort((a, b) => (a.day < b.day ? 1 : -1)), [rows]);
  const totals = traffic.reduce((t, r) => ({
    clicks: t.clicks + (metricNum(r.metrics.clicks) ?? 0),
    impressions: t.impressions + (metricNum(r.metrics.impressions) ?? 0),
  }), { clicks: 0, impressions: 0 });
  const last = crawl[0];
  return (
    <Section title="Bing">
      <Honesty
        counts="Bing Webmaster Tools for https://www.aiwmcquantis.com/: daily clicks and impressions (per Bing: Web, Chat, News, Images, Videos and Knowledge Panel since 24 March 2023) and crawl stats (pages crawled, pages in index, crawl errors)."
        notCounts="queries or single pages (these are site totals), or other engines that use IndexNow. Bing does not split chat answers from web results here, and a day appears only after Bing publishes it."
      />
      <Card>
        <CardContent className="pt-4 text-sm">
          {status?.state === 'never_run' ? (
            <p className="text-muted-foreground">No Bing run yet. It runs with the daily sync.</p>
          ) : status?.state === 'not_configured' ? (
            <p className="text-muted-foreground" data-testid="bing-not-configured">
              Not configured. Set the optional edge secret <code>BING_WEBMASTER_API_KEY</code> after the site is verified in Bing
              Webmaster Tools (setup: docs/execution/2026-11-08-growth-sync-setup.md).
            </p>
          ) : rows === null ? <Skeleton className="h-16 w-full" /> : traffic.length === 0 && !last ? (
            <p className="text-muted-foreground">No Bing rows in the last 30 days.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4" data-testid="bing-summary">
              <div><div className="text-xs text-muted-foreground">Clicks, 30 days</div><div className="text-lg font-semibold tabular-nums">{fmtInt(totals.clicks)}</div></div>
              <div><div className="text-xs text-muted-foreground">Impressions, 30 days</div><div className="text-lg font-semibold tabular-nums">{fmtInt(totals.impressions)}</div></div>
              <div><div className="text-xs text-muted-foreground">Pages in index{last ? ` (${last.day})` : ''}</div><div className="text-lg font-semibold tabular-nums">{fmtInt(metricNum(last?.metrics.in_index))}</div></div>
              <div><div className="text-xs text-muted-foreground">Pages crawled that day</div><div className="text-lg font-semibold tabular-nums">{fmtInt(metricNum(last?.metrics.crawled_pages))}</div></div>
              <div><div className="text-xs text-muted-foreground">Crawl errors that day</div><div className="text-lg font-semibold tabular-nums">{fmtInt(metricNum(last?.metrics.crawl_errors))}</div></div>
            </div>
          )}
        </CardContent>
      </Card>
    </Section>
  );
}

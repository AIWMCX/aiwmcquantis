import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { GrowthOsBlock as Block, ProductFilter } from '@/lib/growth-os';
import { hookVerdict, inProduct } from '@/lib/growth-os';

/**
 * The shared Growth OS block (same data aiwmc.store/ops shows): channels by language, lanes, the
 * framework, graded hooks with 48 h / 7 d numbers, the posting queue, every video, tools and rules.
 */
const cell = 'py-1 pr-3 align-top';

function T({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="text-sm w-full">
        <thead><tr className="text-left text-muted-foreground">{head.map((h) => <th key={h} className={cell}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t">{r.map((c, j) => <td key={j} className={cell}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

const lang = (l?: string) => (
  <Badge variant={l === 'ru' ? 'secondary' : 'outline'} className="text-[10px] uppercase">{l ?? '?'}</Badge>
);

export function GrowthOsBlock({ os, filter }: { os: Block; filter: ProductFilter }) {
  const product = filter === 'all' || filter === 'general' ? null : filter;
  const wiring = product ? os.products?.[product] : undefined;
  const channelIds = wiring ? new Set([...(wiring.channels?.en ?? []), ...(wiring.channels?.ru ?? [])]) : null;
  const channels = (os.channels ?? []).filter((c) => !channelIds || channelIds.has(c.id));
  const hooks = (os.hooks ?? []).filter((h) => inProduct(h.product, filter));
  const queue = (os.queue ?? []).filter((q) => inProduct(q.product, filter));
  const videos = (os.videos ?? []).filter((v) => inProduct(v.product, filter));
  const rules = os.rules;

  return (
    <div className="space-y-4">
      {rules && (
        <p className="text-xs text-muted-foreground">
          Hook grades: {rules.ship}+ ship, {rules.fix} to {rules.ship - 1} fix, under {rules.fix} kill. Text gate {rules.textGate}+.
          Forecast: {rules.forecast}. Scores are advice from public niche data, not a promise of views.
        </p>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Channels ({channels.length}): one language per account, never mixed</CardTitle></CardHeader>
        <CardContent>
          <T head={['Lang', 'Platform', 'Account', 'Lanes', 'Mode', 'Note']} rows={channels.map((c) => [
            lang(c.language), c.platform, <span className="font-mono">{c.handle}</span>, (c.lanes ?? []).join(', '), c.mode ?? '', c.note ?? '',
          ])} />
          {os.lanes && (
            <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium">Lanes (what goes where)</summary>
              <ul className="mt-2 space-y-1">{Object.entries(os.lanes).map(([k, v]) => <li key={k}><span className="font-mono">{k}</span>: {v}</li>)}</ul>
            </details>
          )}
        </CardContent>
      </Card>

      {os.products && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Per product: lanes, EN and RU chains</CardTitle></CardHeader>
          <CardContent>
            <T head={['Product', 'Lanes', 'EN channels', 'RU channels', 'Hooks', 'Queue', 'Videos']} rows={Object.entries(os.products)
              .filter(([id]) => !product || id === product)
              .map(([id, p]) => [id, (p.lanes ?? []).join(', '), (p.channels?.en ?? []).join(', '), (p.channels?.ru ?? []).join(', '), p.hooks ?? 0, p.queue ?? 0, p.videos ?? 0])} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Hooks ({hooks.length}): A/B, grades, 48 h and 7 d results</CardTitle></CardHeader>
        <CardContent>
          <T head={['Product', 'Channel', 'Hook', 'Grade', 'Verdict', '48 h', '7 d', 'Note']} rows={hooks.map((h) => [
            h.product ?? '', h.channel ?? '', h.hook, h.score ?? h.grade ?? '', hookVerdict(h.score, rules), h.h48 ?? '', h.d7 ?? '', h.note ?? '',
          ])} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Posting queue ({queue.length}): Publish Desk, approval first</CardTitle></CardHeader>
        <CardContent>
          <T head={['Week', 'Product', 'Lang', 'Idea', 'Publish at', 'Approval', 'Score', 'Forecast', 'Channels']} rows={queue.map((q) => [
            q.week ?? '', q.product ?? '', lang(q.language), q.idea ?? '', q.publishAt ?? '', q.approval ?? '', q.score ?? '', q.forecast ?? '', (q.channels ?? []).join(', '),
          ])} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Videos ({videos.length}): animated websites, noir, lessons, product reels</CardTitle></CardHeader>
        <CardContent>
          <T head={['Lang', 'Niche', 'Product', 'Status', 'Title', 'File']} rows={videos.map((v) => [
            lang(v.lang), v.niche ?? '', v.product ?? '', v.status ?? '', v.title ?? '', <span className="font-mono text-xs">{v.file ?? ''}</span>,
          ])} />
        </CardContent>
      </Card>

      {os.framework && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">The framework (reverse-engineered system, mapped to our $0 stack)</CardTitle></CardHeader>
          <CardContent>
            <T head={['Stage', 'Their system', 'Ours', 'Tools', 'Status']} rows={os.framework.map((f) => [
              f.stage, f.theirs ?? '', f.ours ?? '', (f.tools ?? []).join(', '), f.status ?? '',
            ])} />
          </CardContent>
        </Card>
      )}

      {os.tools && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Engines, plugins and skills</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <T head={['#', 'Stage', 'Engine']} rows={(os.tools.engines ?? []).map((e) => [e.n ?? '', e.stage ?? '', e.engine ?? ''])} />
            <p><span className="font-medium">Plugins:</span> {(os.tools.plugins ?? []).join(', ')}</p>
            <p><span className="font-medium">Skills ({(os.tools.skills ?? []).length}):</span> {(os.tools.skills ?? []).join(', ')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

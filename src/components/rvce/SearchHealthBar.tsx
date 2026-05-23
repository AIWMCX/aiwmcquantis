import { useState } from 'react';
import { Globe, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { SearchHealth, SearchDiagnosticEntry } from '@/engine/rvce/types';
import { cn } from '@/lib/utils';

export function SearchHealthBar({
  health,
  diagnostics,
}: {
  health?: SearchHealth;
  diagnostics?: SearchDiagnosticEntry[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (!health) return null;

  const ratio = health.web_search_fired_ratio;
  const isHealthy = ratio >= 0.7;
  const isPartial = ratio >= 0.3 && ratio < 0.7;
  const isDegraded = ratio < 0.3;

  const totalUrls = diagnostics?.reduce((s, d) => s + d.source_urls.length, 0) ?? 0;

  return (
    <div className="rounded-md border border-border bg-muted/20">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate text-left">
            Web search: <span className="font-mono">{health.web_search_fired_count}/{health.total_metrics_searched}</span> metrics searched live
            {' · '}<span className="font-mono">{health.total_observations_collected}</span> data points
            {' · '}<span className="font-mono">{health.total_source_urls}</span> sources
          </span>
          {isHealthy && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
          {isPartial && <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
          {isDegraded && <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0" />}
      </button>

      {expanded && diagnostics && diagnostics.length > 0 && (
        <div className="border-t border-border p-3 space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left uppercase tracking-wider text-muted-foreground border-b border-border/60">
                  <th className="px-2 py-1.5 font-medium">Metric</th>
                  <th className="px-2 py-1.5 font-medium">Search fired</th>
                  <th className="px-2 py-1.5 font-medium">Observations</th>
                  <th className="px-2 py-1.5 font-medium">Sources</th>
                  <th className="px-2 py-1.5 font-medium">Fallback</th>
                  <th className="px-2 py-1.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {diagnostics.map((d, i) => (
                  <tr key={`${d.metric}-${i}`} className="border-b border-border/30 last:border-b-0">
                    <td className="px-2 py-1.5 capitalize">{d.metric.replace(/_/g, ' ')}</td>
                    <td className="px-2 py-1.5">
                      {d.web_search_tool_fired ? (
                        <span className="text-emerald-500 font-mono">✓ yes</span>
                      ) : (
                        <span className="text-red-500 font-mono">✗ no</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 font-mono">{d.parsed_observations}</td>
                    <td className="px-2 py-1.5 font-mono">{d.source_urls.length}</td>
                    <td className="px-2 py-1.5">
                      {d.fallback_used ? <span className="text-amber-500 font-mono">yes</span> : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-2 py-1.5">
                      {d.error ? (
                        <span className="text-red-500 truncate inline-block max-w-[180px]" title={d.error}>{d.error.slice(0, 60)}</span>
                      ) : d.parsed_observations > 0 ? (
                        <span className="text-emerald-500">OK</span>
                      ) : (
                        <span className="text-muted-foreground">no data</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalUrls > 0 && (
            <details className="text-[11px]">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                View all source URLs ({totalUrls})
              </summary>
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {diagnostics.flatMap((d, di) =>
                  d.source_urls.map((url, j) => (
                    <a
                      key={`${di}-${j}`}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition truncate'
                      )}
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{url}</span>
                    </a>
                  ))
                )}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

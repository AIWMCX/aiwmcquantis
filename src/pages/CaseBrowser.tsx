/**
 * Case Browser — search and explore the 40 reference business cases,
 * each with all 11 analysis blocks (P&L, DCF, DSCR, Monte Carlo, etc.).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, ArrowLeft, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  listAnalysisCases,
  getAnalysisCaseGrid,
  type AnalysisCaseGrid,
} from '@/services/analysis-case-grid';
import { CaseGridDisplay } from '@/components/cases/CaseGridDisplay';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard } from '@/components/ui/glass-card';
import { BENCHMARK_COUNT_DISPLAY } from '@/config/canonical-facts';

interface CaseRow { case_id: string; business_idea: string; industry: string; city: string }

export default function CaseBrowser() {
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [grid, setGrid] = useState<AnalysisCaseGrid | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingGrid, setLoadingGrid] = useState(false);

  useEffect(() => {
    listAnalysisCases().then((r) => { setCases(r); setLoadingList(false); });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoadingGrid(true);
    setGrid(null);
    getAnalysisCaseGrid(selectedId)
      .then(setGrid)
      .finally(() => setLoadingGrid(false));
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cases;
    return cases.filter(
      (c) =>
        c.business_idea?.toLowerCase().includes(q) ||
        c.industry?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.case_id === q
    );
  }, [cases, query]);

  const selected = cases.find((c) => c.case_id === selectedId);

  return (
    <PublicPageShell maxWidth="xl">
      <Helmet>
        <title>Reference Case Library — AIWMC Quantis</title>
        <meta name="description" content="Browse 40 reference business cases with all 11 analysis blocks: unit economics, Monte Carlo, DCF, DSCR, break-even, cash flow, and pre-mortem." />
      </Helmet>

      <div className="pt-8 pb-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Reference Case Library</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            40 representative business cases · 11 analysis blocks each · defaults from {BENCHMARK_COUNT_DISPLAY} modeled benchmark cells
          </p>
        </div>
        {selectedId && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to list
          </Button>
        )}
      </div>

      {!selectedId && (
        <>
          <div className="relative max-w-md mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, industry, or city…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              aria-label="Search reference cases"
            />
          </div>

          {loadingList ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading 40 cases…
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {filtered.map((c, i) => (
                <GlassCard
                  key={c.case_id}
                  glow={i % 3 === 0 ? 'cyan' : i % 3 === 1 ? 'violet' : 'brand'}
                  reveal={false}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(c.case_id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(c.case_id); } }}
                  className="p-4 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(148,163,255,0.10)', color: 'hsl(var(--muted-foreground))' }}>
                      #{c.case_id}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--aiwmc-grad-cyan)' }}>
                      {c.industry || 'Other'}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm leading-tight mb-1" style={{ color: 'hsl(var(--foreground))' }}>{c.business_idea}</h3>
                  <p className="text-xs text-muted-foreground">{c.city}</p>
                </GlassCard>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full">
                  No cases match "{query}".
                </p>
              )}
            </div>
          )}
        </>
      )}

      {selectedId && selected && (
        <article className="space-y-5 pb-8">
          <GlassCard glow="cyan" className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(148,163,255,0.10)', color: 'hsl(var(--muted-foreground))' }}>
                #{selected.case_id}
              </span>
              <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: 'var(--aiwmc-grad-cyan)' }}>
                {selected.industry}
              </span>
            </div>
            <h2 className="text-2xl font-semibold" style={{ color: 'hsl(var(--foreground))' }}>{selected.business_idea}</h2>
            <p className="text-sm text-muted-foreground mt-1">{selected.city}</p>
          </GlassCard>

          {loadingGrid && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading 11 analysis blocks…
            </div>
          )}
          {grid && <CaseGridDisplay grid={grid} />}
        </article>
      )}
    </PublicPageShell>
  );
}

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
import { cn } from '@/lib/utils';

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
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Reference Case Library — AIWMC Quantis</title>
        <meta name="description" content="Browse 40 reference business cases with all 11 analysis blocks: unit economics, Monte Carlo, DCF, DSCR, break-even, cash flow, and pre-mortem." />
      </Helmet>

      <header className="border-b border-[var(--q-border-default)] bg-[var(--q-bg-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Reference Case Library</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              40 representative business cases · 11 analysis blocks each · backed by 97,500 benchmark datapoints
            </p>
          </div>
          {selectedId && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to list
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {!selectedId && (
          <>
            <div className="relative max-w-md mb-5">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.map((c) => (
                  <button
                    key={c.case_id}
                    onClick={() => setSelectedId(c.case_id)}
                    className={cn(
                      'q-card p-4 text-left transition hover:border-[var(--q-accent-primary)]',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--q-accent-primary)]'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--q-bg-elevated)] text-[var(--q-text-tertiary)]">
                        #{c.case_id}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-[var(--q-accent-primary)] font-semibold">
                        {c.industry || 'Other'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm leading-tight mb-1">{c.business_idea}</h3>
                    <p className="text-xs text-muted-foreground">{c.city}</p>
                  </button>
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
          <article className="space-y-5">
            <header className="q-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--q-bg-elevated)] text-[var(--q-text-tertiary)]">
                  #{selected.case_id}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-[var(--q-accent-primary)] font-semibold">
                  {selected.industry}
                </span>
              </div>
              <h2 className="text-2xl font-semibold">{selected.business_idea}</h2>
              <p className="text-sm text-muted-foreground mt-1">{selected.city}</p>
            </header>

            {loadingGrid && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading 11 analysis blocks…
              </div>
            )}
            {grid && <CaseGridDisplay grid={grid} />}
          </article>
        )}
      </main>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * SEOPreviewPanel — floating inspector that reads document.head after Helmet
 * has hydrated and shows the tags Google/social crawlers will actually see.
 *
 * How to open:
 *   - Append `?seo=1` to any URL, or
 *   - Press Cmd/Ctrl + Shift + S
 *
 * Shows: title, meta description, canonical, og:url, robots (noindex flag),
 * plus a Google-style SERP snippet and a length gauge for title/description.
 */
type Snapshot = {
  title: string;
  description: string;
  canonical: string;
  ogUrl: string;
  robots: string;
  noindex: boolean;
};

function readHead(): Snapshot {
  const $ = <T extends Element>(sel: string) => document.head.querySelector<T>(sel);
  const title = document.title || '';
  const description = $<HTMLMetaElement>('meta[name="description"]')?.content ?? '';
  const canonical = $<HTMLLinkElement>('link[rel="canonical"]')?.href ?? '';
  const ogUrl = $<HTMLMetaElement>('meta[property="og:url"]')?.content ?? '';
  const robots = $<HTMLMetaElement>('meta[name="robots"]')?.content ?? 'index, follow';
  const noindex = /noindex/i.test(robots);
  return { title, description, canonical, ogUrl, robots, noindex };
}

function Gauge({ value, min, max, label }: { value: number; min: number; max: number; label: string }) {
  const inRange = value >= min && value <= max;
  const color = inRange ? '#8FFF2A' : value === 0 ? '#94a3b8' : value < min ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2 text-[11px] font-mono">
      <span style={{ color }}>{value}</span>
      <span className="text-slate-400">
        {label} · target {min}–{max}
      </span>
    </div>
  );
}

export function SEOPreviewPanel() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<Snapshot | null>(null);

  // Open via ?seo=1 or Cmd/Ctrl+Shift+S
  useEffect(() => {
    if (new URLSearchParams(location.search).get('seo') === '1') setOpen(true);
  }, [location.search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 's' && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Snapshot head, then observe mutations so Helmet updates are reflected live.
  const refresh = useCallback(() => setSnap(readHead()), []);
  useEffect(() => {
    if (!open) return;
    refresh();
    const obs = new MutationObserver(refresh);
    obs.observe(document.head, { childList: true, subtree: true, attributes: true, characterData: true });
    return () => obs.disconnect();
  }, [open, location.pathname, refresh]);

  if (!open || !snap) return null;

  const canonicalMatchesPath = (() => {
    if (!snap.canonical) return false;
    try {
      return new URL(snap.canonical).pathname === location.pathname;
    } catch {
      return false;
    }
  })();

  return (
    <div
      role="dialog"
      aria-label="SEO preview"
      className="fixed bottom-4 right-4 z-[9999] w-[420px] max-w-[95vw] max-h-[80vh] overflow-auto rounded-lg border border-slate-700 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur"
      style={{ fontFamily: 'ui-sans-serif, system-ui' }}
    >
      <header className="sticky top-0 flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/95 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#8FFF2A' }} />
          <span className="text-xs font-semibold tracking-wide">SEO PREVIEW</span>
          {snap.noindex && (
            <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-mono uppercase text-red-300">
              noindex
            </span>
          )}
        </div>
        <button
          onClick={() => setOpen(false)}
          className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
          aria-label="Close SEO preview"
        >
          ✕
        </button>
      </header>

      <div className="space-y-4 p-3">
        {/* SERP-style snippet */}
        <section className="rounded border border-slate-800 bg-white p-3 text-slate-900">
          <div className="truncate text-[11px] text-slate-600">
            {snap.canonical || snap.ogUrl || `${window.location.origin}${location.pathname}`}
          </div>
          <div className="mt-0.5 truncate text-[16px] leading-tight text-[#1a0dab] hover:underline">
            {snap.title || '(no title)'}
          </div>
          <div className="mt-1 text-[13px] leading-snug text-slate-700 line-clamp-3">
            {snap.description || '(no description)'}
          </div>
        </section>

        <section className="space-y-2">
          <Row label="Title" value={snap.title} mono />
          <Gauge value={snap.title.length} min={30} max={60} label="chars" />

          <Row label="Description" value={snap.description} mono />
          <Gauge value={snap.description.length} min={70} max={160} label="chars" />

          <Row label="Canonical" value={snap.canonical || '(none)'} mono />
          {snap.canonical && (
            <div className="text-[11px] font-mono">
              {canonicalMatchesPath ? (
                <span style={{ color: '#8FFF2A' }}>✓ self-references current path</span>
              ) : (
                <span className="text-amber-400">
                  ⚠ points elsewhere — crawlers will consolidate this page into that URL
                </span>
              )}
            </div>
          )}

          <Row label="og:url" value={snap.ogUrl || '(none)'} mono />
          <Row label="robots" value={snap.robots} mono />
        </section>

        <footer className="border-t border-slate-800 pt-2 text-[10px] text-slate-500">
          Route <span className="font-mono text-slate-300">{location.pathname}</span> · toggle with{' '}
          <span className="font-mono">⌘/Ctrl+Shift+S</span>
        </footer>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`break-all text-xs ${mono ? 'font-mono' : ''} text-slate-100`}>{value}</div>
    </div>
  );
}

export default SEOPreviewPanel;

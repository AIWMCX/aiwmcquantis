import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, TrendingUp, Target, Play, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/layout/Footer';
import { PageSEO } from '@/components/seo/PageSEO';
import { EXAMPLE_LIST, EXAMPLE_ANALYSES } from './exampleData';

export default function ExamplesIndex() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  const industries = useMemo(() => {
    const set = new Set(EXAMPLE_LIST.map(e => e.industry));
    return Array.from(set).sort();
  }, []);

  const filtered = useMemo(() => {
    return EXAMPLE_LIST.filter(ex => {
      const matchesSearch = !search ||
        ex.title.toLowerCase().includes(search.toLowerCase()) ||
        ex.location.toLowerCase().includes(search.toLowerCase()) ||
        ex.industry.toLowerCase().includes(search.toLowerCase());
      const matchesIndustry = !selectedIndustry || ex.industry === selectedIndustry;
      return matchesSearch && matchesIndustry;
    });
  }, [search, selectedIndustry]);

  const handleLoadTemplate = (slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const data = EXAMPLE_ANALYSES[slug];
    if (data) {
      localStorage.setItem('quantis_prefill', JSON.stringify({
        idea: data.description,
        location: data.location,
        industry: data.industry.toLowerCase().replace(/\s+/g, '_'),
      }));
      navigate('/app');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--q-bg-base)] text-[var(--q-text-primary)]">
      <PageSEO
        title="50+ Business Analysis Examples — Real AI Reports by City & Industry"
        description="See complete AI-generated financial reports for coffee shops, gyms, SaaS, restaurants, dental clinics and more across 50+ cities. Revenue projections, risk flags, and action plans."
        canonical="/examples"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://aiwmcquantis.com" },
            { "@type": "ListItem", "position": 2, "name": "Examples", "item": "https://aiwmcquantis.com/examples" },
          ],
        }}
      />

      <header className="border-b border-[var(--q-border-subtle)] bg-[var(--q-bg-surface)]/80 backdrop-blur-lg">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold font-display text-[var(--q-text-primary)]">AIWMC Quantis</Link>
          <Link to="/app">
            <Button size="sm" className="gap-2">
              <Zap className="w-4 h-4" /> Analyze Your Idea
            </Button>
          </Link>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div className="text-center mb-10 md:mb-14">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold mb-3 bg-[var(--q-status-ai-bg)] text-[var(--q-status-ai)] border-[var(--q-status-ai-border)]">
            {EXAMPLE_LIST.length}+ Sample Reports
          </span>
          <h1 className="text-display-sm md:text-display text-[var(--q-text-primary)] mb-4">
            Business Analysis Examples
          </h1>
          <p className="text-body text-[var(--q-text-secondary)] max-w-2xl mx-auto">
            Real financial reports across {industries.length}+ industries and 50+ cities. Each page is a full analysis — see what you'll get before analyzing your own idea.
          </p>
        </div>

        {/* Search & filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--q-text-tertiary)]" />
            <input
              type="text"
              placeholder="Search city, industry, or business type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm bg-[var(--q-bg-surface)] border border-[var(--q-border-subtle)] text-[var(--q-text-primary)] placeholder:text-[var(--q-text-tertiary)] focus:outline-none focus:border-[var(--q-accent-primary)]"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedIndustry(null)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                !selectedIndustry
                  ? "bg-[var(--q-accent-primary)] text-white border-[var(--q-accent-primary)]"
                  : "bg-[var(--q-bg-surface)] text-[var(--q-text-secondary)] border-[var(--q-border-subtle)] hover:border-[var(--q-accent-primary)]"
              )}
            >
              All ({EXAMPLE_LIST.length})
            </button>
            {industries.slice(0, 8).map(ind => (
              <button
                key={ind}
                onClick={() => setSelectedIndustry(selectedIndustry === ind ? null : ind)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                  selectedIndustry === ind
                    ? "bg-[var(--q-accent-primary)] text-white border-[var(--q-accent-primary)]"
                    : "bg-[var(--q-bg-surface)] text-[var(--q-text-secondary)] border-[var(--q-border-subtle)] hover:border-[var(--q-accent-primary)]"
                )}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-[var(--q-text-tertiary)] mb-4">
          Showing {filtered.length} of {EXAMPLE_LIST.length} examples
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 items-stretch">
          {filtered.map((ex, index) => (
            <Link key={ex.slug} to={`/examples/${ex.slug}`}>
              <div
                className={cn(
                  "q-card q-card-hover q-gradient-card q-stagger h-full group border-l-[3px]",
                  ex.score && ex.score >= 8 ? 'q-score-excellent' :
                  ex.score && ex.score >= 6 ? 'q-score-good' : 'q-score-caution'
                )}
                style={{ '--index': index } as React.CSSProperties}
              >
                <div className="p-6 flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium border-[var(--q-border-subtle)] bg-[var(--q-bg-elevated)] text-[var(--q-text-secondary)]">
                      {ex.industry}
                    </span>
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium border-[var(--q-border-subtle)] bg-[var(--q-bg-elevated)] text-[var(--q-text-secondary)]">
                      {ex.location}
                    </span>
                    {ex.score && (
                      <span className="ml-auto text-metric-sm text-[var(--q-accent-primary)]">
                        {ex.score}/10
                      </span>
                    )}
                  </div>
                  <h2 className="text-h3 text-[var(--q-text-primary)] mb-2 group-hover:text-[var(--q-accent-primary)] transition-colors">
                    {ex.title}
                  </h2>
                  <p className="text-body-sm text-[var(--q-text-secondary)] line-clamp-2 mb-4">{ex.description}</p>
                  <div className="flex items-center gap-4 mt-auto pt-3 border-t border-[var(--q-border-subtle)]">
                    <span className="flex items-center gap-1 text-metric-sm text-[var(--q-status-green)]">
                      <TrendingUp className="w-4 h-4" /> {ex.profit}/mo
                    </span>
                    <span className="flex items-center gap-1 text-metric-sm text-[var(--q-accent-primary)]">
                      <Target className="w-4 h-4" /> {ex.roi} ROI
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto gap-1 text-[11px] h-7 px-2 text-[var(--q-accent-primary)] hover:bg-[var(--q-accent-glow)]"
                      onClick={(e) => handleLoadTemplate(ex.slug, e)}
                    >
                      <Play className="w-3 h-3" /> Load in Quantis
                    </Button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <section className="text-center py-12">
          <div className="rounded-2xl p-8 md:p-12" style={{ background: 'var(--q-gradient-accent)' }}>
            <h2 className="text-h1 text-white mb-3">
              Ready to Analyze Your Own Idea?
            </h2>
            <p className="text-body text-white/80 mb-6 max-w-xl mx-auto">
              Get the same CFO-level analysis — free, no credit card, results in under 90 seconds.
            </p>
            <Link to="/app">
              <Button size="lg" variant="secondary" className="gap-2 text-lg px-8 py-6 hover:scale-[1.02] transition-transform">
                Start Free Analysis → <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

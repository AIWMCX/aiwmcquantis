import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, TrendingUp, Target, Play, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageSEO } from '@/components/seo/PageSEO';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';
import { EXAMPLE_LIST, EXAMPLE_ANALYSES } from './exampleData';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

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
    <PublicPageShell active="examples" maxWidth="xl">
      <PageSEO
        title="50+ Business Analysis Examples — Real AI Reports by City & Industry"
        description="See complete deterministic-engine financial reports for coffee shops, gyms, SaaS, restaurants, dental clinics and more across 50+ cities. Revenue projections, risk flags, and action plans."
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

      <section aria-labelledby="examples-hero-heading" className="aiwmc-section-wash py-10 md:py-14">
        <SectionHeader
          eyebrow={`${EXAMPLE_LIST.length}+ Sample Reports`}
          title="Business Analysis Examples"
          subtitle={`Real financial reports across ${industries.length}+ industries and 50+ cities. Each page is a full analysis — see what you'll get before analyzing your own idea.`}
        />
      </section>

      {/* Search & filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search city, industry, or business type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            style={{ background: 'rgba(12,16,32,0.55)', border: '1px solid rgba(148,163,255,0.18)' }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedIndustry(null)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors border')}
            style={
              !selectedIndustry
                ? { background: 'var(--aiwmc-grad-indigo)', color: 'white', borderColor: 'var(--aiwmc-grad-indigo)' }
                : { background: 'rgba(148,163,255,0.06)', color: 'hsl(var(--muted-foreground))', borderColor: 'rgba(148,163,255,0.14)' }
            }
          >
            All ({EXAMPLE_LIST.length})
          </button>
          {industries.slice(0, 8).map(ind => (
            <button
              key={ind}
              onClick={() => setSelectedIndustry(selectedIndustry === ind ? null : ind)}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors border"
              style={
                selectedIndustry === ind
                  ? { background: 'var(--aiwmc-grad-indigo)', color: 'white', borderColor: 'var(--aiwmc-grad-indigo)' }
                  : { background: 'rgba(148,163,255,0.06)', color: 'hsl(var(--muted-foreground))', borderColor: 'rgba(148,163,255,0.14)' }
              }
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs uppercase tracking-[0.14em] mb-4" style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}>
        Showing {filtered.length} of {EXAMPLE_LIST.length} examples
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12 items-stretch">
        {filtered.map((ex, index) => (
          <Link key={ex.slug} to={`/examples/${ex.slug}`} className="block h-full">
            <GlassCard
              glow={index % 3 === 0 ? 'cyan' : index % 3 === 1 ? 'violet' : 'brand'}
              reveal={false}
              className="p-6 flex flex-col h-full"
            >
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ background: 'rgba(148,163,255,0.08)', border: '1px solid rgba(148,163,255,0.16)', color: 'hsl(var(--muted-foreground))' }}
                >
                  {ex.industry}
                </span>
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                  style={{ background: 'rgba(148,163,255,0.08)', border: '1px solid rgba(148,163,255,0.16)', color: 'hsl(var(--muted-foreground))' }}
                >
                  {ex.location}
                </span>
                {ex.score && (
                  <span className="ml-auto text-sm font-bold" style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}>
                    {ex.score}/10
                  </span>
                )}
              </div>
              <h2
                className="text-lg font-bold mb-2 transition-colors"
                style={{ color: 'hsl(var(--foreground))' }}
              >
                {ex.title}
              </h2>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{ex.description}</p>
              <div className="flex items-center gap-4 mt-auto pt-3" style={{ borderTop: '1px solid rgba(148,163,255,0.14)' }}>
                <span className="flex items-center gap-1 text-sm font-semibold" style={{ ...MONO, color: '#4ade80' }}>
                  <TrendingUp className="w-4 h-4" /> {ex.profit}/mo
                </span>
                <span className="flex items-center gap-1 text-sm font-semibold" style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}>
                  <Target className="w-4 h-4" /> {ex.roi} ROI
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto gap-1 text-[11px] h-7 px-2"
                  style={{ color: 'var(--aiwmc-grad-cyan)' }}
                  onClick={(e) => handleLoadTemplate(ex.slug, e)}
                >
                  <Play className="w-3 h-3" /> Load in Quantis
                </Button>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>

      {/* Closing CTA — glass, matches site-wide pattern */}
      <section className="py-8 md:py-12">
        <GlassCard glow="brand" className="p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
            Ready to analyze your own idea?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Get the same CFO-level analysis — free, no credit card, results in under 90 seconds.
          </p>
          <Link to="/app">
            <Button size="lg" className="gap-2 text-lg px-8 py-6 hover:scale-[1.02] transition-transform">
              Start free analysis <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </GlassCard>
      </section>
    </PublicPageShell>
  );
}

import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingUp, DollarSign, Clock, Target, AlertTriangle, CheckCircle2, BarChart3, Zap, MapPin, Calculator, Users, HelpCircle, BookOpen } from 'lucide-react';
import { PageSEO } from '@/components/seo/PageSEO';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard } from '@/components/ui/glass-card';
import { EXAMPLE_ANALYSES, type ExampleData } from './exampleData';
import { BENCHMARK_COUNT_DISPLAY } from '@/config/canonical-facts';

function MetricCard({ label, value, icon: Icon, color, note }: { label: string; value: string; icon: React.ElementType; color: string; note?: string }) {
  return (
    <Card className="text-center">
      <CardContent className="pt-6 pb-4">
        <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
        {note && <p className="text-xs text-muted-foreground/70 mt-1.5 leading-snug">{note}</p>}
      </CardContent>
    </Card>
  );
}

function RiskItem({ text, severity }: { text: string; severity: 'high' | 'medium' | 'low' }) {
  const colors = { high: 'text-destructive', medium: 'text-warning', low: 'text-success' };
  return (
    <li className="flex items-start gap-2">
      <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${colors[severity]}`} />
      <span className="text-sm text-foreground/80">{text}</span>
    </li>
  );
}

export default function ExampleAnalysis() {
  const { slug } = useParams<{ slug: string }>();
  const data: ExampleData | undefined = slug ? EXAMPLE_ANALYSES[slug] : undefined;

  if (!data) {
    return (
      <PublicPageShell active="examples" maxWidth="md">
        <section className="py-24 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Example not found</h1>
          <Link to="/examples"><Button>Browse all examples</Button></Link>
        </section>
      </PublicPageShell>
    );
  }

  const jsonLd: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": data.seo.title,
      "description": data.seo.description,
      "author": { "@type": "Organization", "name": "AIWMC Quantis" },
      "publisher": { "@type": "Organization", "name": "AIWMC Quantis" },
      "datePublished": "2026-02-25",
      "mainEntityOfPage": `https://aiwmcquantis.com/examples/${slug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://aiwmcquantis.com" },
        { "@type": "ListItem", "position": 2, "name": "Examples", "item": "https://aiwmcquantis.com/examples" },
        { "@type": "ListItem", "position": 3, "name": data.title, "item": `https://aiwmcquantis.com/examples/${slug}` },
      ],
    },
  ];
  // FAQPage schema for cornerstone pages that ship the FAQ block — directly
  // unlocks Google People Also Ask placement.
  if (data.deepDive?.faq?.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": data.deepDive.faq.map((item) => ({
        "@type": "Question",
        "name": item.q,
        "acceptedAnswer": { "@type": "Answer", "text": item.a },
      })),
    });
  }

  return (
    <PublicPageShell active="examples" backTo={{ href: '/examples', label: 'All examples' }} maxWidth="lg">
      <PageSEO
        title={data.seo.title}
        description={data.seo.description}
        canonical={`/examples/${slug}`}
        jsonLd={jsonLd}
      />
      <div className="py-4 md:py-8">
        {/* TOP CTA BANNER */}
        <Link to="/app" className="block mb-6">
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 px-5 py-4 flex items-center justify-between gap-4 hover:bg-primary/10 transition-colors group">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-primary shrink-0" />
              <span className="text-sm md:text-base font-semibold text-foreground">
                Thinking about a similar business? Validate YOUR specific idea
              </span>
            </div>
            <ArrowRight className="w-5 h-5 text-primary shrink-0 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/examples" className="hover:text-foreground">Examples</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{data.title}</span>
        </nav>

        {/* Hero */}
        <div className="mb-8 md:mb-12">
          <Badge variant="secondary" className="mb-3">{data.industry} · {data.location}</Badge>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 leading-tight">
            {data.title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            {data.description}
          </p>
        </div>

        {/* Key Metrics Grid */}
        <section className="mb-10" aria-label="Key Financial Metrics">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Financial Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Monthly Revenue" value={data.metrics.monthlyRevenue} icon={DollarSign} color="text-success" />
            <MetricCard label="Monthly Profit" value={data.metrics.monthlyProfit} icon={TrendingUp} color="text-primary" />
            <MetricCard label="Payback Period" value={data.metrics.paybackMonths} icon={Clock} color="text-warning" note={data.metrics.paybackNote} />
            <MetricCard label="ROI (Year 1)" value={data.metrics.roi} icon={Target} color="text-success" />
          </div>
        </section>

        {/* MID-PAGE CTA */}
        <div className="mb-10 text-center">
          <Link to="/app">
            <Button size="lg" className="gap-2 text-base px-8 py-6 hover:scale-[1.02] transition-transform">
              Run your own analysis free <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>

        {/* Two-column layout */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Startup Costs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" /> Startup Investment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground mb-4">{data.metrics.startupCost}</p>
              <ul className="space-y-2">
                {data.costBreakdown.map((item, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" /> Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {data.risks.map((risk, i) => (
                  <RiskItem key={i} text={risk.text} severity={risk.severity} />
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Action Plan */}
        <Card className="mb-10">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" /> Recommended Action Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {data.actionPlan.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground/80">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* DEEP-DIVE SECTIONS — cornerstone content for high-priority SEO pages.
            Renders only when `deepDive` is populated on this example. */}
        {data.deepDive && (
          <>
            {/* Market Overview */}
            <section className="mb-10" aria-labelledby="market-overview-heading">
              <h2 id="market-overview-heading" className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" /> {data.deepDive.marketOverview.heading}
              </h2>
              <div className="prose prose-sm md:prose-base max-w-none text-foreground/85 space-y-4">
                {data.deepDive.marketOverview.paragraphs.map((p, i) => (
                  <p key={i} className="leading-relaxed">{p}</p>
                ))}
              </div>
            </section>

            {/* Location Deep-Dive */}
            <section className="mb-10" aria-labelledby="location-deep-heading">
              <h2 id="location-deep-heading" className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-primary" /> {data.deepDive.locationDeep.heading}
              </h2>
              <div className="prose prose-sm md:prose-base max-w-none text-foreground/85 space-y-4 mb-4">
                {data.deepDive.locationDeep.paragraphs.map((p, i) => (
                  <p key={i} className="leading-relaxed">{p}</p>
                ))}
              </div>
              {data.deepDive.locationDeep.bullets && (
                <ul className="space-y-2 mt-4">
                  {data.deepDive.locationDeep.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/85">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-success" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Monthly Economics Table */}
            <section className="mb-10" aria-labelledby="monthly-econ-heading">
              <h2 id="monthly-econ-heading" className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Calculator className="w-6 h-6 text-primary" /> {data.deepDive.monthlyEconomics.heading}
              </h2>
              {data.deepDive.monthlyEconomics.intro && (
                <p className="text-sm md:text-base text-foreground/85 mb-4 leading-relaxed">
                  {data.deepDive.monthlyEconomics.intro}
                </p>
              )}
              <Card>
                <CardContent className="pt-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs uppercase tracking-wide text-muted-foreground pb-2">Line item</th>
                        <th className="text-right text-xs uppercase tracking-wide text-muted-foreground pb-2">Monthly</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.deepDive.monthlyEconomics.rows.map((row, i) => (
                        <tr key={i} className="border-b border-border/40 last:border-0">
                          <td className="py-2.5 text-sm text-foreground">
                            <div className="font-medium">{row.label}</div>
                            {row.note && <div className="text-xs text-muted-foreground mt-0.5">{row.note}</div>}
                          </td>
                          <td className="py-2.5 text-sm text-right font-semibold text-foreground tabular-nums">{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              {data.deepDive.monthlyEconomics.footnote && (
                <p className="text-xs md:text-sm text-muted-foreground mt-3 italic">
                  {data.deepDive.monthlyEconomics.footnote}
                </p>
              )}
            </section>

            {/* Unit Economics */}
            <section className="mb-10" aria-labelledby="unit-econ-heading">
              <h2 id="unit-econ-heading" className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" /> {data.deepDive.unitEconomics.heading}
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {data.deepDive.unitEconomics.bullets.map((b, i) => (
                  <Card key={i}>
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-baseline justify-between gap-3 mb-1">
                        <span className="text-sm text-muted-foreground">{b.label}</span>
                        <span className="text-lg font-bold text-foreground tabular-nums">{b.value}</span>
                      </div>
                      {b.explainer && <p className="text-xs text-muted-foreground leading-relaxed">{b.explainer}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Competitive Landscape */}
            <section className="mb-10" aria-labelledby="competition-heading">
              <h2 id="competition-heading" className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" /> {data.deepDive.competition.heading}
              </h2>
              <div className="prose prose-sm md:prose-base max-w-none text-foreground/85 space-y-4 mb-4">
                {data.deepDive.competition.paragraphs.map((p, i) => (
                  <p key={i} className="leading-relaxed">{p}</p>
                ))}
              </div>
              {data.deepDive.competition.bullets && (
                <ul className="space-y-2 mt-4">
                  {data.deepDive.competition.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground/85">
                      <Target className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* FAQ — also surfaces as FAQPage JSON-LD for People Also Ask */}
            <section className="mb-10" aria-labelledby="faq-heading">
              <h2 id="faq-heading" className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-primary" /> Frequently Asked Questions
              </h2>
              <div className="space-y-4">
                {data.deepDive.faq.map((item, i) => (
                  <Card key={i}>
                    <CardContent className="pt-5 pb-5">
                      <h3 className="text-base md:text-lg font-semibold text-foreground mb-2">{item.q}</h3>
                      <p className="text-sm md:text-base text-foreground/80 leading-relaxed">{item.a}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Methodology footnote */}
            <section className="mb-10" aria-labelledby="methodology-note-heading">
              <h2 id="methodology-note-heading" className="sr-only">Methodology note</h2>
              <div className="rounded-lg border border-border bg-muted/30 p-4 md:p-5 flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs md:text-sm text-foreground/75 leading-relaxed">
                  <span className="font-semibold text-foreground">Methodology: </span>
                  {data.deepDive.methodologyNote}{' '}
                  <Link to="/methodology" className="text-primary hover:underline font-medium">Read the full methodology →</Link>
                </div>
              </div>
            </section>
          </>
        )}

        {/* BOTTOM CTA — glass-card treatment, matches Landing / examples index */}
        <section className="py-8 md:py-12">
          <GlassCard glow="brand" className="p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
              Get your own custom report
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Takes 90 seconds. Uses {BENCHMARK_COUNT_DISPLAY} benchmark data points. Free.
            </p>
            <Link to="/app">
              <Button size="lg" className="gap-2 text-base px-8 py-6 hover:scale-[1.02] transition-transform">
                Validate my business idea <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </GlassCard>
        </section>

        {/* Related Examples — prioritize same city or industry */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">Related Examples</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(EXAMPLE_ANALYSES)
              .filter(([key]) => key !== slug)
              .sort(([, a], [, b]) => {
                const aMatch = (a.location === data.location ? 2 : 0) + (a.industry === data.industry ? 1 : 0);
                const bMatch = (b.location === data.location ? 2 : 0) + (b.industry === data.industry ? 1 : 0);
                return bMatch - aMatch;
              })
              .slice(0, 3)
              .map(([key, ex]) => (
                <Link key={key} to={`/examples/${key}`}>
                  <Card className="hover:border-primary/50 transition-colors h-full">
                    <CardContent className="pt-5 pb-4">
                      <Badge variant="outline" className="mb-2 text-xs">{ex.industry}</Badge>
                      <h3 className="font-semibold text-foreground mb-1">{ex.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{ex.description}</p>
                      <p className="text-sm font-medium text-primary mt-2">{ex.metrics.monthlyProfit}/mo profit →</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
          </div>
        </section>
      </div>
    </PublicPageShell>
  );
}

import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingUp, DollarSign, Clock, Target, AlertTriangle, CheckCircle2, BarChart3, Zap } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { PageSEO } from '@/components/seo/PageSEO';
import { EXAMPLE_ANALYSES, type ExampleData } from './exampleData';

function MetricCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <Card className="text-center">
      <CardContent className="pt-6 pb-4">
        <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground mt-1">{label}</p>
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Example not found</h1>
          <Link to="/"><Button>Back to Home</Button></Link>
        </div>
      </div>
    );
  }

  const jsonLd = [
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSEO
        title={data.seo.title}
        description={data.seo.description}
        canonical={`/examples/${slug}`}
        jsonLd={jsonLd}
      />

      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold text-foreground">AIWMC Quantis</Link>
          <Link to="/app">
            <Button size="sm" className="gap-2">
              <Zap className="w-4 h-4" /> Analyze Your Idea
            </Button>
          </Link>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
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
            <MetricCard label="Payback Period" value={data.metrics.paybackMonths} icon={Clock} color="text-warning" />
            <MetricCard label="ROI (Year 1)" value={data.metrics.roi} icon={Target} color="text-success" />
          </div>
        </section>

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

        {/* CTA */}
        <section className="text-center py-12 md:py-16">
          <div className="bg-primary rounded-2xl p-8 md:p-12">
            <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-3">
              Want This Analysis for Your Idea?
            </h2>
            <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
              Get the same CFO-level analysis — revenue projections, risk flags, and action plan — free, in under 3 minutes.
            </p>
            <Link to="/app">
              <Button size="lg" variant="secondary" className="gap-2 text-lg px-8 py-6 hover:scale-[1.02] transition-transform">
                Analyze My Idea — Free <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* More Examples */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-foreground mb-4">More Example Analyses</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(EXAMPLE_ANALYSES)
              .filter(([key]) => key !== slug)
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
      </main>

      <Footer />
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingUp, DollarSign, Clock, Target, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { EXAMPLE_ANALYSES } from '@/pages/examples/exampleData';
import { trackSampleEvent } from '@/lib/analytics';

/**
 * Real, scrollable sample report above the fold on the landing page.
 * Uses the same data the /examples/coffee-shop-denver page renders, so
 * the visitor sees the actual format of what they'll get — no leap of faith.
 *
 * Funnel events emitted (see /admin/funnel "Sample Report Funnel"):
 *   sample_view → sample_cta_click → sample_full_open → sample_pdf_download
 */
export function EmbeddedSampleReport() {
  const data = EXAMPLE_ANALYSES['coffee-shop-denver'];
  const sectionRef = useRef<HTMLElement | null>(null);
  const firedView = useRef(false);

  // Fire `sample_view` once when the report enters the viewport.
  useEffect(() => {
    if (!sectionRef.current || firedView.current) return;
    const el = sectionRef.current;
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting && !firedView.current) {
            firedView.current = true;
            trackSampleEvent('view', { example_slug: 'coffee-shop-denver' });
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!data) return null;

  const sev = {
    high: 'text-destructive border-destructive/30 bg-destructive/5',
    medium: 'text-warning border-warning/30 bg-warning/5',
    low: 'text-success border-success/30 bg-success/5',
  } as const;

  const onCtaClick = (cta: 'run_mine' | 'see_full') => {
    trackSampleEvent('cta_click', { cta, example_slug: 'coffee-shop-denver' });
    if (cta === 'see_full') trackSampleEvent('full_open', { example_slug: 'coffee-shop-denver' });
  };

  return (
    <section
      ref={sectionRef}
      aria-label="Sample analysis"
      className="relative w-full py-12 md:py-16 border-b border-border"
    >
      <div className="container max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-6">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-muted text-foreground/70 border border-border mb-3">
            Live sample · exactly what you'll get
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            What an actual Quantis report looks like
          </h2>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            One real report — "Specialty coffee shop in Denver." Scroll through. Yours covers the same things for whatever you type above.
          </p>
        </div>

        <Card className="overflow-hidden border-2 shadow-2xl">
          {/* Browser chrome to signal "this is the real product" */}
          <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-b border-border">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-destructive/60" />
              <span className="w-3 h-3 rounded-full bg-warning/60" />
              <span className="w-3 h-3 rounded-full bg-success/60" />
            </div>
            <span className="ml-3 text-xs text-muted-foreground font-mono truncate">
              aiwmcquantis.com/examples/coffee-shop-denver
            </span>
          </div>

          <CardContent className="p-6 md:p-8">
            <Badge variant="secondary" className="mb-3">{data.industry} · {data.location}</Badge>
            <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
              {data.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {data.description}
            </p>

            {/* Metrics row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Monthly revenue', value: data.metrics.monthlyRevenue, icon: DollarSign, tone: 'text-success' },
                { label: 'Monthly profit', value: data.metrics.monthlyProfit, icon: TrendingUp, tone: 'text-primary' },
                { label: 'Payback', value: data.metrics.paybackMonths, icon: Clock, tone: 'text-warning' },
                { label: 'ROI year 1', value: data.metrics.roi, icon: Target, tone: 'text-success' },
              ].map(m => (
                <div key={m.label} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <m.icon className={`w-4 h-4 mx-auto mb-1 ${m.tone}`} />
                  <p className="text-lg md:text-xl font-bold text-foreground tabular-nums">{m.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-5 mb-6">
              {/* Startup costs */}
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-foreground">Startup investment</h4>
                  <span className="text-base font-bold text-foreground">{data.metrics.startupCost}</span>
                </div>
                <ul className="space-y-1.5">
                  {data.costBreakdown.map((c, i) => (
                    <li key={i} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{c.label}</span>
                      <span className="font-medium text-foreground tabular-nums">{c.value}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risks */}
              <div className="rounded-lg border border-border p-4">
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-warning" /> What's most likely to kill it
                </h4>
                <ul className="space-y-2">
                  {data.risks.slice(0, 3).map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className={`inline-flex shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide border ${sev[r.severity]}`}>
                        {r.severity}
                      </span>
                      <span className="text-foreground/80 leading-snug">{r.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action plan teaser */}
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-success" /> Action plan (first 2 of 5 steps)
              </h4>
              <ol className="space-y-1.5 text-xs text-foreground/80">
                {data.actionPlan.slice(0, 2).map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-semibold text-primary shrink-0">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-5 border-t border-border">
              <p className="text-xs text-muted-foreground text-center sm:text-left">
                Your report covers the same sections — based on your idea, your city, your numbers.
              </p>
              <div className="flex gap-2">
                <Link to="/examples/coffee-shop-denver" onClick={() => onCtaClick('see_full')}>
                  <Button variant="outline" size="sm">See full sample</Button>
                </Link>
                <a href="#single-input-hero" onClick={() => onCtaClick('run_mine')}>
                  <Button size="sm" className="gap-1">
                    Run mine free <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

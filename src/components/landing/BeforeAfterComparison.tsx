import React from 'react';
import { XCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { trackCtaClick } from '@/lib/analytics';
import { BENCHMARK_COUNT_DISPLAY } from '@/config/canonical-facts';

const WITHOUT_ITEMS = [
'Commit $30k+ based on gut feeling',
'Discover fatal flaw 6 months in — after the money is gone',
'No way to stress-test assumptions before launch',
'Optimism bias goes unchecked'];


const WITH_ITEMS = [
'Know your 3 fatal assumptions before spending $1',
`Stress-test against ${BENCHMARK_COUNT_DISPLAY} modeled benchmark cells`,
'Get a profitability verdict and reliability score',
'See exactly which number will break your model'];


export function BeforeAfterComparison() {
  return (
    <section className="py-12 md:py-16 bg-muted/20">
      <div className="container max-w-5xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-8">Before vs. After Your Pre-Mortem

        </h2>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-8">
          {/* Without */}
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 md:p-6">
            <p className="text-sm font-semibold text-destructive uppercase tracking-wider mb-4 flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Without a Pre-Mortem
            </p>
            <ul className="space-y-3">
              {WITHOUT_ITEMS.map((item) =>
              <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <XCircle className="w-4 h-4 text-destructive/60 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              )}
            </ul>
          </div>

          {/* With */}
          <div className="rounded-2xl border border-success/20 bg-success/5 p-5 md:p-6 shadow-md">
            <p className="text-sm font-semibold text-success uppercase tracking-wider mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> With Quantis Pre-Mortem
            </p>
            <ul className="space-y-3">
              {WITH_ITEMS.map((item) =>
              <li key={item} className="flex items-start gap-2.5 text-sm text-foreground font-medium">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="text-center">
          <Link to="/app" onClick={() => trackCtaClick('run_pre_mortem', 'before_after')}>
            <Button size="lg" className="gap-2 min-h-[52px] px-6 text-base font-semibold hover:scale-[1.02] transition-transform">
              Run Your Pre-Mortem — Free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-2">No credit card required</p>
        </div>
      </div>
    </section>);

}
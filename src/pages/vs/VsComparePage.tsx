import React, { useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, ExternalLink, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageSEO } from '@/components/seo/PageSEO';
import { Footer } from '@/components/layout/Footer';
import { recordFunnelEvent } from '@/lib/analytics';
import { getVsPage } from './vsData';
import { TIERS } from '@/config/tiers';

/**
 * Single component renders every `/vs/:slug` route — Quantis-vs-competitor
 * comparison pages. Audit 2026-06-20 D10.3.
 *
 * Structure (lead with the wedge, price is below the fold):
 *   1. Hero with the single-sentence wedge.
 *   2. Competitor's own claim, quoted with source URL (honesty up front).
 *   3. Comparison table (data-driven from vsData.ts).
 *   4. The 3 differentiators, expanded.
 *   5. FAQs.
 *   6. CTA — Free signup, no price-leading copy.
 */
export default function VsComparePage() {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? getVsPage(slug) : undefined;

  useEffect(() => {
    if (page) {
      recordFunnelEvent('vs_page_view', { slug: page.slug, competitor: page.competitor });
    }
  }, [page]);

  if (!page) {
    return <Navigate to="/" replace />;
  }

  const canonical = `/vs/${page.slug}`;
  const title = `Quantis vs ${page.competitor} — Deterministic Validation, Labeled Assumptions`;
  const description = `${page.wedge} See how Quantis differs from ${page.competitor} on engine type, sources, and price.`;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSEO
        title={title}
        description={description}
        canonical={canonical}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: title,
          description,
          url: `https://aiwmcquantis.com${canonical}`,
          mainEntity: {
            '@type': 'FAQPage',
            mainEntity: page.faqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          },
        }}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-lg sm:text-xl font-bold text-foreground">
              AIWMC™ Quantis
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Home
              </Link>
              <Link to="/how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </Link>
              <Link to="/methodology" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Methodology
              </Link>
              <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
            </div>
            <Link to="/app">
              <Button size="sm" className="gap-2 min-h-[48px] px-5 text-sm font-semibold">
                Start Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 pt-6 pb-2">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>

        {/* Hero — lead with the wedge */}
        <section className="text-center py-10 md:py-14 container max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground mb-3">
            Quantis vs {page.competitor}
          </p>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-5 leading-tight">
            The only validator whose every number cites a source you can audit.
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">{page.wedge}</p>
        </section>

        {/* Competitor's own claim — honest framing */}
        <section className="container max-w-4xl mx-auto px-4 sm:px-6 mb-10">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              What {page.competitor} says about itself
            </p>
            <blockquote className="text-base md:text-lg text-foreground italic mb-3 leading-relaxed">
              "{page.competitorClaim.quote}"
            </blockquote>
            <a
              href={page.competitorClaim.source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Source: {page.competitorClaim.source}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </section>

        {/* Comparison table */}
        <section className="container max-w-5xl mx-auto px-4 sm:px-6 mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
            Quantis vs {page.competitor} — side by side
          </h2>
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-12 bg-muted/50 border-b border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="col-span-4 p-4">Feature</div>
              <div className="col-span-4 p-4 border-l border-border">Quantis</div>
              <div className="col-span-4 p-4 border-l border-border">{page.competitor}</div>
            </div>
            {page.rows.map((row, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 border-b border-border last:border-b-0 text-sm"
              >
                <div className="col-span-4 p-4 font-semibold text-foreground">{row.feature}</div>
                <div className="col-span-4 p-4 border-l border-border text-foreground/90">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{row.quantis}</span>
                  </div>
                </div>
                <div className="col-span-4 p-4 border-l border-border text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <X className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" />
                    <span>
                      {row.competitor}
                      {row.competitorSource && (
                        <>
                          {' '}
                          <a
                            href={row.competitorSource}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs underline hover:text-foreground"
                          >
                            source
                          </a>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="container max-w-3xl mx-auto px-4 sm:px-6 mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">FAQ</h2>
          <div className="space-y-4">
            {page.faqs.map((f, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground mb-2">{f.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container max-w-3xl mx-auto px-4 sm:px-6 pb-16 text-center">
          <div className="rounded-2xl border border-border bg-card p-8 md:p-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Run {TIERS.free.limits.analysesPerMonth} free analyses this month
            </h2>
            <p className="text-base text-muted-foreground mb-6 max-w-xl mx-auto">
              No credit card. Viability score, top 3 risks, and labeled assumptions.
            </p>
            <Link to="/app">
              <Button size="lg" className="gap-2 min-h-[52px] px-7 text-base font-semibold">
                Start Free <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

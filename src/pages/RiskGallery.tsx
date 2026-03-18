import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, AlertTriangle, TrendingDown, Shield, Send, ChevronDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PageSEO } from '@/components/seo/PageSEO';
import { StructuredData } from '@/components/seo/StructuredData';
import { Footer } from '@/components/layout/Footer';
import { trackEvent, trackCtaClick } from '@/lib/analytics';

// ── Scenario data ──────────────────────────────────────────────────────────

interface Scenario {
  id: string;
  model_type: string;
  stage: string;
  key_assumptions: string[];
  risk_findings: string[];
  verdict: string;
  tagline: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'saas-crm-prerev',
    model_type: 'B2B SaaS',
    stage: 'Pre-revenue',
    key_assumptions: [
      '$49/mo pricing, 5% monthly growth',
      'CAC of $120 via LinkedIn ads',
      '3-month average sales cycle',
      'Churn at 4% monthly',
    ],
    risk_findings: [
      'Breaks if revenue drops 18% for 2 consecutive quarters.',
      'Barely survives if CAC is 1.7× higher than assumed.',
      'Safest lever: reduce fixed costs by 12%.',
    ],
    verdict: 'Fragile. Needs to cut churn below 3% or raise ARPU to survive a downturn.',
    tagline: 'SaaS startup stress-test example',
  },
  {
    id: 'local-gym-2loc',
    model_type: 'Local service',
    stage: 'Brick-and-mortar, 2 locations',
    key_assumptions: [
      '$75/mo membership, 320 members per location',
      'Rent $6,500/mo per location',
      'Staff of 4 FTEs per gym',
      '8% annual churn',
    ],
    risk_findings: [
      'Fails if occupancy drops below 62% for 3 months.',
      'Second location only viable above 280 members.',
      'Lease renegotiation adds 4 months of runway.',
    ],
    verdict: 'Conditionally viable. Location 2 is the fragile point — delay unless membership pipeline is confirmed.',
    tagline: 'Gym expansion risk analysis',
  },
  {
    id: 'marketplace-pets',
    model_type: 'Marketplace',
    stage: '$8K MRR',
    key_assumptions: [
      '12% take rate on $65 average order',
      'Supplier acquisition cost $40',
      'Demand-side CAC $18',
      '15% month-over-month growth target',
    ],
    risk_findings: [
      'Breaks if take rate drops below 9%.',
      'Growth stalls at 10% MoM make the unit economics negative by month 8.',
      'Safest lever: increase average order value to $85.',
    ],
    verdict: 'Promising but margin-thin. A 3% take-rate cut by a competitor would be fatal.',
    tagline: 'Marketplace business model stress test',
  },
  {
    id: 'ecom-dtc',
    model_type: 'E-commerce DTC',
    stage: '$20K MRR',
    key_assumptions: [
      'AOV $55, 2.1 orders/year per customer',
      'Blended CAC $28 (Meta + Google)',
      'Gross margin 62%',
      'Return rate 14%',
    ],
    risk_findings: [
      'Return rate above 18% wipes out net margin entirely.',
      'CAC rising to $38 (likely in Q4) erodes LTV/CAC below 2×.',
      'Safest lever: retention email flow adds 0.4 orders/year.',
    ],
    verdict: 'Viable at current scale. Q4 ad cost spikes are the biggest threat — pre-invest in retention.',
    tagline: 'DTC e-commerce financial stress test',
  },
  {
    id: 'agency-design',
    model_type: 'Service agency',
    stage: '$35K MRR, 6 clients',
    key_assumptions: [
      '$5,800 average monthly retainer',
      '2 senior + 1 junior staffing model',
      'Client lifetime 11 months',
      'New client acquisition 1 per month',
    ],
    risk_findings: [
      'Losing 2 clients simultaneously drops revenue below operating costs.',
      'Hiring ahead of demand creates a 3-month cash gap.',
      'Safest lever: lock 2 clients into annual contracts.',
    ],
    verdict: 'High concentration risk. Revenue depends on too few clients — diversify or lock contracts.',
    tagline: 'Agency revenue concentration risk',
  },
  {
    id: 'food-truck-austin',
    model_type: 'Food & beverage',
    stage: 'Pre-launch',
    key_assumptions: [
      'Average check $14, 120 transactions/day',
      'COGS 32%, labour 28%',
      'Truck lease $1,800/mo',
      'Seasonal dip Dec–Feb of 35%',
    ],
    risk_findings: [
      'Breaks if daily transactions drop below 85 for more than 6 weeks.',
      'Seasonal dip requires $8K cash reserve to survive.',
      'Safest lever: add catering revenue stream ($3K/mo floor).',
    ],
    verdict: 'Viable in high season. Winter survival requires a second revenue stream or $8K+ reserve.',
    tagline: 'Food truck break-even stress test',
  },
  {
    id: 'saas-hr-smb',
    model_type: 'B2B SaaS',
    stage: '$12K MRR',
    key_assumptions: [
      '$99/mo per seat, avg 3 seats/company',
      'Net revenue retention 105%',
      'CAC $340 (outbound + content)',
      'Gross margin 78%',
    ],
    risk_findings: [
      'Breaks if NRR drops to 90% — payback exceeds 18 months.',
      'Content-driven CAC is 40% lower than outbound — shift budget.',
      'Safest lever: raise price to $119 (5% churn impact modeled).',
    ],
    verdict: 'Healthy fundamentals. Shift acquisition to content and test a price increase.',
    tagline: 'HR SaaS unit economics analysis',
  },
  {
    id: 'coworking-portland',
    model_type: 'Real estate / coworking',
    stage: '1 location, 60% occupancy',
    key_assumptions: [
      '$350/desk/mo, 80 desks',
      'Rent $12K/mo, build-out amortised over 36 months',
      'Occupancy target 75%',
      'Churn 6% monthly',
    ],
    risk_findings: [
      'Breaks if occupancy stays below 55% for 4 months.',
      'Build-out debt payments consume 22% of revenue at current occupancy.',
      'Safest lever: add meeting room revenue ($2,400/mo at 60% utilisation).',
    ],
    verdict: 'Under water until occupancy hits 70%. Meeting rooms are the fastest path to break-even.',
    tagline: 'Coworking space occupancy risk model',
  },
  {
    id: 'mobile-app-fitness',
    model_type: 'Mobile app (freemium)',
    stage: '12K downloads, 3% conversion',
    key_assumptions: [
      '$9.99/mo subscription, 360 paying users',
      'CPI $1.80 (TikTok + ASO organic mix)',
      'Day-30 retention 18%',
      'Gross margin 85%',
    ],
    risk_findings: [
      'Breaks if CPI exceeds $2.50 — LTV/CAC falls below 1.5×.',
      'Day-30 retention of 18% means 82% of acquired users never convert.',
      'Safest lever: push Day-7 activation rate from 40% to 55%.',
    ],
    verdict: 'Unit economics work only if retention improves. Focus on activation before scaling spend.',
    tagline: 'Freemium app retention stress test',
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function RiskGallery() {
  const [formOpen, setFormOpen] = useState(false);

  const handleCardClick = (scenarioId: string) => {
    trackEvent('scenario_card_click', { scenario_id: scenarioId });
  };

  const handleOpenForm = () => {
    setFormOpen(true);
    trackEvent('open_risk_submission');
  };

  const handleSubmitForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    trackEvent('submit_risk_scenario');
    trackCtaClick('submit_risk_scenario', 'risk_gallery_form');
    // Wire to backend later
    alert('Thank you! We will review your submission and run the stress test.');
    setFormOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageSEO
        title="Startup Risk Gallery — Common Business Model Failures"
        description="Browse real risk flags caught by Quantis: revenue shocks, cost spikes, fatal unit economics. Learn from anonymized stress-test scenarios before you launch."
        canonical="/risk-gallery"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Risk Gallery — Startup Stress-Test Scenarios',
          description: 'Anonymous, AI-powered stress tests of real startup models.',
          url: 'https://www.aiwmcquantis.com/risk-gallery',
          isPartOf: {
            '@type': 'WebSite',
            name: 'AIWMC Quantis',
            url: 'https://www.aiwmcquantis.com',
          },
        }}
      />
      <StructuredData
        includeBreadcrumbs
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Risk Gallery', url: '/risk-gallery' },
        ]}
      />

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-lg sm:text-xl font-bold text-foreground">AIWMC Quantis</Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Home</Link>
              <Link to="/how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</Link>
              <Link to="/examples" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Examples</Link>
              <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
              <Link to="/blog" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
            </div>
            <Link to="/app">
              <Button size="sm" className="gap-2 min-h-[48px] px-5 text-sm font-semibold">
                Run Free Validation <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container max-w-6xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <div className="pt-6 pb-2">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>

        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="py-12 md:py-20 text-center">
          <Badge variant="outline" className="mb-4 text-sm gap-1.5 px-3 py-1">
            <Eye className="w-3.5 h-3.5" /> {SCENARIOS.length} scenarios
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            Risk Gallery — Real Startup Stress‑Test Scenarios
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Anonymous, AI-powered stress tests of real startup models. See how revenue shocks, cost spikes, and slowdowns actually impact survival.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="#scenarios">
              <Button size="lg" className="gap-2 py-6 px-8">
                Browse Scenarios <ChevronDown className="w-5 h-5" />
              </Button>
            </a>
            <a href="#submit">
              <Button size="lg" variant="outline" className="gap-2 py-6 px-8">
                Submit Your Model <Send className="w-4 h-4" />
              </Button>
            </a>
          </div>
        </section>

        {/* ── Scenario Grid ─────────────────────────────────── */}
        <section id="scenarios" className="py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-4">
            Explore Stress‑Tested Business Models
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
            Each scenario was generated by AIWMC Quantis from anonymous inputs. All identifying details have been stripped.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SCENARIOS.map((s) => (
              <article
                key={s.id}
                className="group flex flex-col rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300 overflow-hidden"
                onClick={() => handleCardClick(s.id)}
              >
                {/* Header */}
                <div className="p-5 pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-xs">{s.model_type}</Badge>
                    <span className="text-xs text-muted-foreground">{s.stage}</span>
                  </div>
                  <p className="text-xs text-muted-foreground italic">{s.tagline}</p>
                </div>

                {/* Assumptions */}
                <div className="p-5 pb-3 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Assumptions</p>
                  <ul className="space-y-1">
                    {s.key_assumptions.map((a, i) => (
                      <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span> {a}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risk findings */}
                <div className="p-5 pt-3 bg-destructive/5 dark:bg-destructive/10">
                  <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Risk Findings
                  </p>
                  <ul className="space-y-1.5">
                    {s.risk_findings.map((r, i) => (
                      <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                        <TrendingDown className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Verdict */}
                <div className="p-5 border-t border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" /> Verdict
                  </p>
                  <p className="text-sm font-medium text-foreground">{s.verdict}</p>
                </div>

                {/* CTA */}
                <div className="px-5 pb-5">
                  <Link
                    to="/app"
                    onClick={(e) => {
                      e.stopPropagation();
                      trackCtaClick('start_validation_click', 'risk_gallery_card');
                    }}
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Run a similar stress test <ArrowRight className="w-4 h-4" />
                  </Link>
                  <p className="text-[11px] text-muted-foreground mt-1">Generated by AIWMC Quantis from anonymous inputs.</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Submission Section ─────────────────────────────── */}
        <section id="submit" className="py-12 md:py-16">
          <div className="max-w-2xl mx-auto rounded-2xl border border-border bg-card p-6 md:p-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Submit Your Model Anonymously
            </h2>
            <p className="text-muted-foreground mb-6">
              Share a simplified version of your numbers, and we'll run an anonymized stress test in AIWMC Quantis. Select if you want your scenario added to the Gallery, and we'll strip all identifying details.
            </p>

            {!formOpen ? (
              <Button onClick={handleOpenForm} size="lg" className="gap-2">
                <Send className="w-4 h-4" /> Open Submission Form
              </Button>
            ) : (
              <form id="risk-gallery-form" onSubmit={handleSubmitForm} className="space-y-5">
                <div>
                  <label htmlFor="rg-business-type" className="block text-sm font-medium text-foreground mb-1">Business Type</label>
                  <Input id="rg-business-type" name="business_type" placeholder="e.g., B2B SaaS, Local service, Marketplace" required />
                </div>
                <div>
                  <label htmlFor="rg-revenue" className="block text-sm font-medium text-foreground mb-1">Current Revenue (monthly)</label>
                  <Input id="rg-revenue" name="current_revenue" placeholder="e.g., $0 (pre-revenue), $12K MRR" required />
                </div>
                <div>
                  <label htmlFor="rg-location" className="block text-sm font-medium text-foreground mb-1">Location <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <Input id="rg-location" name="location" placeholder="e.g., Austin, TX" />
                </div>
                <div>
                  <label htmlFor="rg-assumptions" className="block text-sm font-medium text-foreground mb-1">Key Assumptions (3–5 bullets)</label>
                  <Textarea id="rg-assumptions" name="key_assumptions" placeholder="• Pricing: $49/mo&#10;• CAC: $120&#10;• Churn: 4%/mo" rows={5} required />
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox id="rg-consent" name="consent_publish" />
                  <label htmlFor="rg-consent" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                    You may publish an anonymized version of this scenario in the Risk Gallery.
                  </label>
                </div>
                <div>
                  <label htmlFor="rg-email" className="block text-sm font-medium text-foreground mb-1">Email <span className="text-muted-foreground font-normal">(optional — for receiving results)</span></label>
                  <Input id="rg-email" name="email" type="email" placeholder="you@example.com" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="submit" className="gap-2">
                    <Send className="w-4 h-4" /> Submit Scenario
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>Cancel</Button>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────── */}
        <section className="py-12 md:py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {[
              {
                q: 'Is my data safe?',
                a: 'Yes. All submissions are processed through AIWMC Quantis with end-to-end encryption. We never share raw inputs or identifying details.',
              },
              {
                q: 'What do you publish publicly?',
                a: 'Only anonymized scenarios — model type, key metrics, and risk findings. Company names, exact revenue figures, and any PII are stripped before publishing.',
              },
              {
                q: 'Do I need perfect numbers?',
                a: 'No. Rough estimates work. The stress test is designed to find which assumptions are fragile — precision matters less than structure.',
              },
              {
                q: 'What does it cost?',
                a: 'Gallery submissions are free. If you want a full AIWMC Quantis report for your own business, your first analysis is also free — no credit card required.',
              },
              {
                q: 'Can I request my scenario be removed?',
                a: 'Absolutely. Email us and we will remove it within 24 hours. All published scenarios are anonymized, but we respect removal requests unconditionally.',
              },
            ].map(({ q, a }) => (
              <details key={q} className="group p-5 rounded-xl border border-border bg-card">
                <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between min-h-[48px]">
                  {q}
                  <span className="ml-2 text-muted-foreground group-open:rotate-45 transition-transform text-xl">+</span>
                </summary>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA ─────────────────────────────────────── */}
        <section className="py-12 md:py-16">
          <div className="rounded-2xl bg-primary p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
            <div className="relative">
              <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-3">
                Ready to Stress‑Test Your Own Model?
              </h2>
              <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
                Validate your business idea with AI-powered financial analysis. Get structured revenue projections, risk signals, and an action plan — free, in under 90 seconds.
              </p>
              <Link to="/app" onClick={() => trackCtaClick('start_validation_click', 'risk_gallery_bottom')}>
                <Button size="lg" variant="secondary" className="gap-2 py-6 px-8">
                  Run Free Validation <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
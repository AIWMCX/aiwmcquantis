import React from 'react';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';
import { PageSEO } from '@/components/seo/PageSEO';
import { ShieldCheck, Database, Bot, Info, AlertTriangle, Wrench, Shield, Search, Lock, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LastAuditedBadge } from '@/components/analysis/LastAuditedBadge';
import { GOLDEN_VECTORS } from '@/lib/golden-test-vectors';
import { Badge } from '@/components/ui/badge';
import { CANONICAL_DATA_SOURCES } from '@/lib/canonical-data-sources';
import {
  BENCHMARK_COUNT_DISPLAY,
  BENCHMARK_SECTORS,
  MONTE_CARLO_ITERATIONS_DISPLAY,
  FINANCIAL_VARIABLES,
} from '@/config/canonical-facts';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;
const PANEL: React.CSSProperties = { background: 'rgba(12,16,32,0.55)', border: '1px solid rgba(148,163,255,0.14)' };

const QSL_LEVELS = [
  { level: 'QSL-4', name: 'Formula Verified', glow: 'cyan' as const, desc: 'The arithmetic is deterministic and reconciles to the stated inputs and formulas. This is certainty about calculation consistency, not certainty about the business outcome.' },
  { level: 'QSL-3', name: 'Within Modeled Range', glow: 'violet' as const, desc: 'The assumption falls inside the modeled benchmark range for the selected segment. The range is a rule-generated calibration aid, not an observed sample of comparable companies.' },
  { level: 'QSL-2', name: 'Extrapolated', glow: 'brand' as const, desc: 'The input sits outside or between available modeled ranges, or a broader fallback was used. Treat the result as a hypothesis requiring manual evidence.' },
  { level: 'QSL-1', name: 'Speculative / Invalid', glow: 'none' as const, desc: 'The input conflicts with an economic constraint, lacks enough support, or could not be matched safely. Hard warnings should govern the decision.' },
];

// Titles mirror /how-it-works ENGINE_LAYERS exactly — same 8 layers, same
// order, kept as short labels here since this page links out for detail
// rather than duplicating the full descriptions on two pages.
const ENGINE_LAYER_LABELS = [
  { layer: 1, title: 'Benchmark Calibration' },
  { layer: 2, title: 'Location Intelligence' },
  { layer: 3, title: 'Sub-Industry Detection' },
  { layer: 4, title: 'Financial Engine' },
  { layer: 5, title: 'Market Prior & Anomaly Detection' },
  { layer: 6, title: 'Quantis Logic Engine' },
  { layer: 7, title: 'AI Narrative & Safety Guardrails' },
  { layer: 8, title: 'RVCE — Reality Validation Engine' },
];

const PIPELINE_STAGES = [
  { icon: ShieldCheck, title: 'Input Guardrails', desc: 'Sanitizes and classifies the request, enforces scope and rate limits, and rejects unsafe input before analysis.' },
  { icon: Database, title: 'Deterministic Core', desc: 'Calculates canonical financial outputs from stated inputs, formulas, and modeled benchmark ranges.' },
  { icon: Bot, title: 'Narrate + Reconcile', desc: 'A language model explains the result. Numeric claims are checked where a canonical engine value exists; unsupported narrative remains a limitation.' },
  { icon: Search, title: 'External Check', desc: 'RVCE can compare selected outputs with current external evidence when the service and relevant sources are available; otherwise it reports a skipped or unavailable state.' },
];

const LIMITATIONS = [
  { id: 'DATA-001', title: 'Modeled, Not Observed', desc: 'The 97,500-entry corpus is a rule-generated coverage grid. Its cells are not 97,500 measured companies or independent source observations.', status: 'Disclosed' },
  { id: 'DATA-002', title: 'No Per-Cell Lineage', desc: 'Reference datasets are documented at dataset level, but an individual grid cell does not currently carry its own source, period, or quality grade.', status: 'Open' },
  { id: 'DATA-003', title: 'Uneven Geographic Coverage', desc: 'Country and region fields are not independently crossed across the full grid. City-tier multipliers are coarse; local rent, wage, regulation, and demand require direct validation.', status: 'Open' },
  { id: 'DATA-004', title: 'Refresh Cadence', desc: 'Reference periods vary by dataset. The modeled grid has a library version label but no independently verifiable per-cell refresh timestamp or automatic public refresh cadence.', status: 'Open' },
  { id: 'MODEL-001', title: 'Financial Scope', desc: 'Core outputs are pre-tax operating estimates. The standard run does not model a full debt schedule, tax position, depreciation, amortization, or professional accounting adjustments.', status: 'Disclosed' },
  { id: 'MODEL-002', title: 'Interactive Lever Approximation', desc: 'The in-report lever preview is a directional approximation, not a complete rerun of the canonical financial engine.', status: 'Disclosed' },
  { id: 'TEST-001', title: 'Regression Coverage', desc: `The golden-vector suite covers ${GOLDEN_VECTORS.length} canonical archetypes and checks engine ranges in CI. Passing these tests guards regressions; it does not prove real-world predictive accuracy.`, status: 'Tested' },
];

export default function Methodology() {
  const licenseColor = (license: string) => {
    const normalized = license.toLowerCase();
    if (normalized.includes('public domain') || normalized === 'cc0') {
      return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
    }
    if (normalized.includes('cc by')) {
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    }
    return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
  };

  return (
    <PublicPageShell active="methodology" backTo={{ href: '/', label: 'Back to home' }} maxWidth="lg">
      <PageSEO
        title="Methodology — How Quantis Calculates Risk"
        description="How Quantis separates deterministic formulas, modeled benchmark cells, reference datasets, scenarios, confidence levels, and known limitations."
        canonical="/methodology"
      />

      <section aria-labelledby="methodology-hero-heading" className="aiwmc-section-wash py-10 md:py-14">
        <div className="flex justify-center mb-4">
          <LastAuditedBadge size="md" />
        </div>
        <SectionHeader
          title="Accuracy & safety methodology"
          subtitle="See what Quantis calculates, what the benchmark library actually contains, where reference data enters, and which limits still require human judgment."
        />
        <div className="flex justify-center mt-4">
          <Badge variant="outline" className="text-xs font-mono">Engine Version: 2.0.0-precision</Badge>
        </div>
      </section>

      {/* The 8-Layer Engine — compact L1-L8 diagram */}
      <section className="py-10 space-y-6">
        <SectionHeader
          eyebrow="Architecture"
          title="The 8-layer analysis engine"
          subtitle="The production workflow separates input controls, modeled ranges, financial calculation, narration, reconciliation, and external checks."
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
          {ENGINE_LAYER_LABELS.map(({ layer, title }) => (
            <div key={layer} className="p-3 rounded-lg text-center" style={PANEL}>
              <p className="text-xs font-bold uppercase mb-1" style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}>
                L{layer}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">{title}</p>
            </div>
          ))}
        </div>
        <p className="text-center">
          <Link to="/how-it-works" className="text-sm font-medium hover:underline inline-flex items-center gap-1" style={{ color: 'var(--aiwmc-grad-cyan)' }}>
            See what each layer actually computes →
          </Link>
        </p>
      </section>

      {/* QSL levels */}
      <section className="py-10 space-y-6">
        <SectionHeader eyebrow="Confidence framework" title="Quantis Safety Levels (QSL)" />
        <div className="grid gap-4 sm:grid-cols-2 mt-8">
          {QSL_LEVELS.map((qsl, i) => (
            <GlassCard key={qsl.level} glow={qsl.glow} revealDelay={i * 60} className="p-5 space-y-2">
              <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
                <span className="px-2 py-1 rounded text-xs font-mono" style={PANEL}>{qsl.level}</span>
                {qsl.name}
              </h3>
              <p className="text-sm text-muted-foreground">{qsl.desc}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Data provenance */}
      <section className="py-10 space-y-6">
        <SectionHeader
          eyebrow="Benchmark coverage"
          title="What the 97,500 figure actually means"
          subtitle="Coverage breadth is useful only when its construction and limits are visible."
        />

        <GlassCard glow="none" className="p-5 flex items-start gap-3" style={{ borderColor: 'rgba(245,158,11,0.3)' }}>
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>
              97,500 does not mean 97,500 observed companies.
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              It is the row count across five rule-generated benchmark tables. Each table contains
              19,500 modeled cells: 52 sub-industry labels × 5 company stages × 5 size buckets ×
              3 city tiers × 5 business models. Region and country fields are distributed across
              that grid; they are not a complete, independently crossed set of local observations.
            </p>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlassCard glow="cyan" className="p-5 text-center">
            <p className="text-2xl font-bold mb-1" style={MONO}>{BENCHMARK_COUNT_DISPLAY}</p>
            <p className="text-xs text-muted-foreground">Modeled grid cells</p>
          </GlassCard>
          <GlassCard glow="violet" revealDelay={60} className="p-5 text-center">
            <p className="text-2xl font-bold mb-1" style={MONO}>5 × 19,500</p>
            <p className="text-xs text-muted-foreground">Metric-family tables</p>
          </GlassCard>
          <GlassCard glow="brand" revealDelay={120} className="p-5 text-center">
            <p className="text-2xl font-bold mb-1" style={MONO}>{BENCHMARK_SECTORS}</p>
            <p className="text-xs text-muted-foreground">User-facing sector taxonomy</p>
          </GlassCard>
        </div>

        <GlassCard glow="cyan" className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <caption className="sr-only">Quantis benchmark coverage dimensions and limitations</caption>
              <thead style={{ background: 'rgba(148,163,255,0.08)' }}>
                <tr>
                  <th className="px-4 py-3 font-semibold">Dimension</th>
                  <th className="px-4 py-3 font-semibold">Current coverage</th>
                  <th className="px-4 py-3 font-semibold">Interpretation / limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <tr>
                  <td className="px-4 py-3 font-medium">Metric families</td>
                  <td className="px-4 py-3 text-muted-foreground">Core ratios, unit economics, geography, risk, invoicing</td>
                  <td className="px-4 py-3 text-muted-foreground">Five separate tables; row count is additive across them.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Business segmentation</td>
                  <td className="px-4 py-3 text-muted-foreground">52 sub-industry labels, 5 models, 5 stages, 5 sizes, 3 city tiers</td>
                  <td className="px-4 py-3 text-muted-foreground">A fully enumerated rule grid, not a statistical sample of 19,500 peers per table.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Geography</td>
                  <td className="px-4 py-3 text-muted-foreground">Region, country, and city-tier fields</td>
                  <td className="px-4 py-3 text-muted-foreground">Uneven and coarse. A city-tier multiplier is not local rent, wage, demand, tax, or regulatory evidence.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Reference periods</td>
                  <td className="px-4 py-3 text-muted-foreground">Dataset-level periods vary from 2006–2025</td>
                  <td className="px-4 py-3 text-muted-foreground">Grid cells have no per-row source date; no automatic public refresh cadence is claimed.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Lineage</td>
                  <td className="px-4 py-3 text-muted-foreground">Dataset-level reference registry</td>
                  <td className="px-4 py-3 text-muted-foreground">No 1:1 mapping from a displayed percentile to a named source record, period, or quality grade.</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Financial scope</td>
                  <td className="px-4 py-3 text-muted-foreground">{FINANCIAL_VARIABLES} core variables, projected by tier</td>
                  <td className="px-4 py-3 text-muted-foreground">Pre-tax operating decision support; not audited accounts, tax advice, or a complete debt model.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>

        <SectionHeader eyebrow="References" title="Dataset-level sources" />
        <GlassCard glow="cyan" className="p-6 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            These datasets and published studies inform financial structure, plausibility ranges,
            and calibration decisions at dataset level. They are not currently linked to individual
            grid cells, so “reference source” must not be read as per-number provenance.
          </p>
          <p className="text-xs text-muted-foreground">
            Product taxonomy currently exposes {BENCHMARK_SECTORS} sectors while the grid contains
            52 sub-industry labels. The mapping is a classification layer, not evidence that every
            sector-location combination has equal source depth.
          </p>
        </GlassCard>

        <div className="space-y-3">
          {CANONICAL_DATA_SOURCES.map((source) => (
            <div key={source.name} className="flex items-start gap-3 p-4 rounded-lg" style={PANEL}>
              <Shield className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>{source.name}</span>
                  <Badge variant="outline" className={`text-xs ${licenseColor(source.license)}`}>
                    {source.license}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{source.usage}</p>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground/70">
                  <span>{source.records.toLocaleString()} {source.name.includes('Benchmark Library') ? 'modeled cells' : 'reference records'}</span>
                  <span>{source.period}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Multi-model checks */}
      <section className="py-10 space-y-6">
        <SectionHeader eyebrow="Architecture" title="Model checks reduce risk; they do not prove truth" />
        <GlassCard glow="violet" className="p-6 space-y-4 mt-8">
          <p className="text-muted-foreground leading-relaxed">
            Quantis separates financial calculation from language-model narration. A reconciliation
            step can catch contradictions between narrative claims and canonical engine values where
            a matching value exists. Agreement between models is still not independent evidence and
            is never presented as predictive accuracy.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg" style={PANEL}>
              <h4 className="font-medium mb-1">What the check can do</h4>
              <p className="text-xs text-muted-foreground">Detect mismatched numbers, impossible signs, broken identities, and narrative claims that disagree with available engine outputs.</p>
            </div>
            <div className="p-4 rounded-lg" style={PANEL}>
              <h4 className="font-medium mb-1">What the check cannot do</h4>
              <p className="text-xs text-muted-foreground">Prove that a user assumption, modeled benchmark cell, market estimate, or future business outcome is correct.</p>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* QIM research disclosure */}
      <section className="py-10 space-y-6">
        <SectionHeader eyebrow="Research concept" title="Quantis Information Metric (QIM)" />
        <GlassCard glow="cyan" className="p-6 space-y-4 mt-8">
          <Badge variant="outline" className="font-mono text-xs">Theoretical framework</Badge>
          <p className="text-muted-foreground leading-relaxed">
            QIM is an AIWMC Research Foundation concept for studying whether a model response is both
            strongly activated and causally influential. It is not an independently validated accuracy
            measure, not a probability that a business will succeed, and not a substitute for source
            quality or real-world evidence.
          </p>
          <p className="text-sm text-muted-foreground">
            Product confidence labels use practical signals such as formula reconciliation, modeled-range
            fit, fallback depth, and warning conditions. They should be read as evidence-quality cues,
            not as certification.
          </p>
          <Link to="/research" className="text-sm font-medium hover:underline" style={{ color: 'var(--aiwmc-grad-cyan)' }}>
            Read the research framework →
          </Link>
        </GlassCard>
      </section>

      {/* Golden Test Vectors */}
      <section className="py-10 space-y-6">
        <SectionHeader eyebrow="Regression testing" title="Golden test vectors" />
        <GlassCard glow="cyan" className="p-6 space-y-4 mt-8">
          <p className="text-muted-foreground leading-relaxed">
            Every engine update is regression-tested against canonical business archetypes with defined tolerance bands. These tests detect implementation drift; they do not validate forecasts against observed future outcomes.
          </p>
          <div className="grid gap-3">
            {GOLDEN_VECTORS.map((vector) => (
              <div key={vector.id} className="p-4 rounded-lg" style={PANEL}>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="font-mono text-xs">{vector.vectorCode}</Badge>
                  <span className="text-xs text-muted-foreground">{vector.location}</span>
                </div>
                <h4 className="font-medium text-sm capitalize" style={{ color: 'hsl(var(--foreground))' }}>{vector.businessType.replace(/_/g, ' ')}</h4>
                <p className="text-xs text-muted-foreground mt-1">{vector.description}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      {/* How numbers are produced */}
      <section className="py-10 space-y-6">
        <SectionHeader eyebrow="Calculation path" title="How a number becomes a decision signal" />
        <GlassCard glow="violet" className="p-6 space-y-6 mt-8">
          <ol className="space-y-4">
            {[
              ['1', 'User inputs', 'Quantis begins with the business, location, and financial assumptions supplied by the user. Missing values may be filled with modeled defaults and should be reviewed.'],
              ['2', 'Segment and fallback', 'The request is mapped to a sector, business model, stage, size, and city tier. If an exact cell is unavailable, the lookup broadens through a documented fallback ladder. Broader matches carry less specificity.'],
              ['3', 'Deterministic formulas', 'Revenue, operating costs, margins, runway, break-even, and payback are calculated from the selected assumptions using explicit formulas. Deterministic means repeatable for the same inputs—not guaranteed correct inputs.'],
              ['4', 'Scenario sampling', `${MONTE_CARLO_ITERATIONS_DISPLAY} iterations vary selected assumptions within configured ranges to show downside, base, and upside sensitivity. The bands depend on those ranges; they are not promises or observed probabilities.`],
              ['5', 'Narration and reconciliation', 'AI explains the calculation. Numeric claims are compared with canonical outputs where a matching metric exists; unsupported qualitative claims still require judgment.'],
              ['6', 'External evidence when available', 'RVCE may add current external observations for selected metrics. If the check cannot run or finds no suitable evidence, the unavailable state must remain visible.'],
            ].map(([step, title, description]) => (
              <li key={step} className="flex gap-3 p-4 rounded-lg" style={PANEL}>
                <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-mono" style={{ background: 'rgba(79,70,229,0.18)', color: 'var(--aiwmc-grad-cyan)' }}>{step}</span>
                <div>
                  <h4 className="font-semibold text-sm">{title}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="p-4 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <h4 className="font-semibold text-sm mb-2">Standard-run exclusions</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Operating profit is pre-tax. The standard model excludes depreciation, amortization, and interest expense;
              it also does not build a complete tax position, debt schedule, legal or regulatory opinion,
              audited financial statement, or locally verified demand forecast. These must be
              supplied or reviewed separately before capital is committed.
            </p>
          </div>
        </GlassCard>
      </section>

      {/* System Architecture */}
      <section className="py-10 space-y-6">
        <SectionHeader eyebrow="Architecture" title="System architecture — how it's wired together" />
        <GlassCard glow="brand" className="p-6 space-y-6 mt-8">
          <p className="text-muted-foreground leading-relaxed">
            A single analysis is not one AI call. Your request passes through input validation, a deterministic engine, a monitored narration step, and — separately — an external reality check. Each stage has one job, and the parts that cost money don't run until the parts before them clear.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
            {PIPELINE_STAGES.map((stage, i) => (
              <div key={stage.title} className="p-4 rounded-lg flex flex-col gap-2" style={PANEL}>
                <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                  <span className="w-5 h-5 rounded-full text-[10px] font-mono flex items-center justify-center shrink-0" style={{ background: 'rgba(79,70,229,0.18)', color: 'var(--aiwmc-grad-cyan)' }}>{i + 1}</span>
                  <stage.icon className="w-4 h-4 shrink-0" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
                  {stage.title}
                </div>
                <p className="text-xs text-muted-foreground flex-1">{stage.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-5 rounded-lg space-y-3" style={PANEL}>
            <h4 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--aiwmc-grad-cyan)' }} /> What happens before the engine ever runs
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every idea and location you submit is sanitized and classified before it reaches any model. Length limits are enforced, known injection patterns and instruction-style phrasing are flagged, and requests are rate-limited per device and per session so a single actor can't hammer the system. If a request trips these checks, it's rejected right there — the deterministic engine never runs and no AI call is made, so the cost of a bad request is effectively zero. An automatic kill switch also watches the system's live error rate: if AI failures spike, AI-dependent narration is temporarily disabled and every user gets the deterministic result instead, rather than the system quietly serving broken output.
            </p>
          </div>

          <div className="p-5 rounded-lg space-y-3" style={PANEL}>
            <h4 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
              <Lock className="w-4 h-4" style={{ color: 'var(--aiwmc-grad-violet)' }} /> Why the engine is protected — the financial firewall
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Canonical financial projections and margins trace back to the deterministic engine described above rather than being generated as free-form language-model guesses. This is checked, not assumed: after the narration model writes your executive summary and recommendation, every dollar figure and percentage in that text is extracted and compared against the engine's own computed metrics, either as an exact match or within a tight tolerance of a real, derived value. Anything that doesn't trace back — an invented number — is flagged and the report's trust score drops accordingly. If the AI narration layer fails or times out entirely, the engine's numbers still ship on their own, clearly marked, rather than being replaced with a fabricated explanation. <strong>One explicit exception:</strong> TAM/SAM/SOM market-size figures have no deterministic-engine equivalent to reconcile against (Quantis has no market-research data source), so they are not covered by this numeric firewall — they're labeled as AI-modeled estimates everywhere they appear, not verified figures.
            </p>
          </div>

          <div className="p-5 rounded-lg space-y-3" style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(148,163,255,0.18)' }}>
            <h4 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
              <Search className="w-4 h-4" style={{ color: 'var(--aiwmc-grad-cyan)' }} /> RVCE (Reality Validation & Calibration Engine) — Layer 8
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Benchmarks tell you what's typical. RVCE checks whether your specific numbers are still plausible against what's happening right now. It's invoked as its own independent step — separate from the engine and separate from narration — and cross-references your report's core metrics against live, current external sources rather than relying solely on the static benchmark library. Each metric comes back tagged <strong>OK</strong> (consistent with current external evidence), <strong>WARN</strong> (outside the typical range found), or <strong>OUTLIER</strong> (materially different from what's currently observable). This is what catches a number that is internally consistent — correct math, plausible benchmark alignment — but has quietly drifted from reality since the benchmark data was last refreshed.
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Two things by design: RVCE runs on infrastructure kept separate from the narration stage, so the model writing your report is never the same one checking it — a system shouldn't grade its own homework. And RVCE is honest about its own limits — if it can't authenticate your session or can't reach its data sources, it reports that plainly (a labeled "skipped" or "unavailable" state with a specific reason) rather than silently omitting the check and letting the report look fully verified when it wasn't.
            </p>
          </div>

          <div className="p-5 rounded-lg space-y-3" style={PANEL}>
            <h4 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'hsl(var(--foreground))' }}>
              <Layers className="w-4 h-4 text-amber-500" /> In development: a unified orchestration layer
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The guardrails, engine, and narration firewall above run as coordinated but separately-implemented steps today. We're building the <strong>Quantis Orchestration Core (QOC)</strong> — a single coordination layer that formalizes this same sequence with a unified, queryable audit trace per request and request-level deduplication. QOC is built and deployed to a non-production environment for testing; it is not yet the path a live analysis runs through. We're listing it here, rather than describing it as already load-bearing, because that's the accurate state of the work — and we'll update this section the day that changes.
            </p>
          </div>

          <p className="text-xs text-muted-foreground/80 leading-relaxed italic">
            What we're intentionally not publishing here: exact abuse-detection patterns, specific model vendors and per-call costs, and internal scoring thresholds. Those stay unpublished because describing them precisely would hand a roadmap to anyone trying to defeat the safeguards — not because the architecture itself is a secret. Everything else above is exactly how a request is handled in production today.
          </p>
        </GlassCard>
      </section>

      {/* Known Limitations */}
      <section className="py-10 space-y-6">
        <SectionHeader eyebrow="Honesty" title="Known limitations & roadmap" />
        <GlassCard glow="none" className="p-6 space-y-4 mt-8" style={{ borderColor: 'rgba(245,158,11,0.25)' }}>
          <p className="text-muted-foreground leading-relaxed">
            We believe in transparent reporting of our system's current limitations. The following gaps are actively being addressed:
          </p>
          <div className="space-y-3">
            {LIMITATIONS.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'rgba(148,163,255,0.05)' }}>
                <Wrench className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>{item.title}</span>
                    <Badge variant={item.status === 'Resolved' ? 'default' : 'secondary'} className="text-xs">{item.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  <span className="text-xs font-mono text-muted-foreground/70">{item.id}</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="flex justify-center py-6">
        <LastAuditedBadge size="lg" />
      </section>

      <GlassCard glow="cyan" className="p-4 flex items-start gap-3 mb-8">
        <Info className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
        <p className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>
          <strong>Disclaimer:</strong> Quantis is a stress-testing tool intended to validate hypotheses. Quantis tests assumptions and calculation consistency; it does not predict outcomes or verify every input. Real decisions require current local evidence and, where appropriate, qualified financial, legal, tax, or industry advice.
        </p>
      </GlassCard>
    </PublicPageShell>
  );
}

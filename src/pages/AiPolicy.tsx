import React from 'react';
import { Link } from 'react-router-dom';
import { PageSEO } from '@/components/seo/PageSEO';
import { StructuredData } from '@/components/seo/StructuredData';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { SectionHeader } from '@/components/ui/glass-card';
import { MONTE_CARLO_ITERATIONS_DISPLAY } from '@/config/canonical-facts';

/** Fixed date of the last material change. */
export const AI_POLICY_LAST_UPDATED = 'November 3, 2026';

/**
 * AI Policy: what is calculated by code, what is written by a language model,
 * which providers may see a user's text, and what Quantis does not do with AI.
 * Every statement here must stay true to the code: the provider list mirrors
 * Privacy §5 (supabase/functions/_shared/llm-call.ts routing), the scenario
 * count comes from canonical-facts, and the engine/narration boundary is the
 * one documented on /state-of-quantis.
 */
export default function AiPolicy() {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'AI Policy', url: '/ai-policy' },
  ];
  const p = 'text-muted-foreground leading-relaxed';
  const h2 = 'text-2xl font-semibold text-foreground';
  const ul = 'list-disc pl-6 text-muted-foreground space-y-2';
  return (
    <PublicPageShell backTo={{ href: '/', label: 'Back to home' }} maxWidth="md">
      <PageSEO
        title="AI Policy | AIWMC Quantis"
        description="How Quantis uses AI: which numbers are calculated by code, which text is AI-written, which providers may process your inputs, and what AI never decides."
        canonical="/ai-policy"
      />
      <StructuredData includeBreadcrumbs breadcrumbs={breadcrumbs} />

      <section aria-labelledby="ai-policy-hero-heading" className="aiwmc-section-wash py-10 md:py-14">
        <SectionHeader title="AI Policy" />
      </section>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 pb-8">
        <p className="text-muted-foreground text-lg">Last updated: {AI_POLICY_LAST_UPDATED}</p>

        <section className="space-y-4">
          <h2 className={h2}>1. Who we are</h2>
          <p className={p}>
            AIWMC Quantis is operated by AIWMC LLC, a Colorado limited liability company. This policy explains how
            the Service uses artificial intelligence. It works together with our{' '}
            <Link to="/terms" className="underline">Terms of Service</Link> and{' '}
            <Link to="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>2. What is calculated, not generated</h2>
          <p className={p}>
            The figures in a Quantis report (revenue, costs, cash, break-even, payback and the base, downside and
            upside scenarios) are computed by a deterministic financial engine: the same inputs give the same
            figures. They are not written by a language model.
          </p>
          <p className={p}>
            Each report also runs {MONTE_CARLO_ITERATIONS_DISPLAY} seeded scenario iterations around your base case
            and shows the resulting range (P10, P50 and P90). That range describes how the modeled result moves when
            the assumptions move. It is not a prediction of what will happen to your business, and it is not a
            probability of success.
          </p>
          <p className={p}>
            Benchmark defaults that fill missing inputs come from a modeled grid, not from observed companies. You can
            see and change every assumption. See the <Link to="/methodology" className="underline">Methodology</Link>.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>3. What AI does</h2>
          <p className={p}>A third-party large language model is used to:</p>
          <ul className={ul}>
            <li>Classify your idea or decision (for example, the industry and business model) so the right defaults apply</li>
            <li>Write the narrative around the calculated figures: summaries, commentary, risks and suggested next steps</li>
            <li>Draft document text and extract data from documents you upload, where you use those features</li>
          </ul>
          <p className={p}>
            AI-written text can be wrong. It is not guaranteed to describe the calculated figures correctly on every
            run. An automated check compares the AI-written executive summary with the engine's figures and replaces it
            when it contradicts them, but it does not cover every sentence. Where AI-written text and a calculated
            figure disagree, the calculated figure is the one to rely on. The{' '}
            <Link to="/state-of-quantis" className="underline">State of Quantis</Link> page lists known issues.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>4. What AI does not do</h2>
          <ul className={ul}>
            <li>It does not give legal, tax, accounting, investment or lending advice. Quantis is decision support.</li>
            <li>It does not make decisions about you that have legal or similarly significant effects. It does not
              decide whether you get an account, a price, credit or any other service.</li>
            <li>It does not guarantee or predict a business outcome.</li>
            <li>It does not decide anything on your behalf. You decide what to do with a report.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>5. Which AI providers may process your inputs</h2>
          <p className={p}>
            The text you enter (for example, your business idea and assumptions) may be sent to one of these providers
            to produce the AI-written parts of a report. Which one handles a request depends on availability and
            controlled rollout, not on your plan:
          </p>
          <ul className={ul}>
            <li><strong>DeepSeek</strong>: primary provider</li>
            <li><strong>Anthropic</strong>: fallback provider</li>
            <li><strong>Dahl gateway</strong>: where enabled, for a subset of requests during a controlled rollout</li>
          </ul>
          <p className={p}>
            This list matches section 5 of our <Link to="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>6. Training and your data</h2>
          <p className={p}>
            We do not train AI models of our own on your inputs or reports. How each provider may use the data it
            receives, including whether it may use that data to train its models, is governed by that provider's own
            terms and privacy policy, which we do not control. Anthropic states that, by default, it does not use
            inputs or outputs from its commercial products to train its models.
          </p>
          <p className={p}>
            Do not enter information you are not permitted to share, such as other people's personal data or a
            client's confidential information.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>7. Human review</h2>
          <p className={p}>
            You can ask a person to review a decision instead of relying on AI-written commentary. The{' '}
            <Link to="/decision-review" className="underline">Founder Decision Review</Link> is a paid engagement in
            which a founder of AIWMC reviews the assumptions, reconciles the figures and writes the decision memo. You
            can also email us about any report at the address below.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className={h2}>8. Changes and contact</h2>
          <p className={p}>
            We will update this page when the way the Service uses AI changes, and change the date above.
            Questions: legal@aiwmcquantis.com, AIWMC LLC, Denver, Colorado, USA.
          </p>
        </section>
      </div>
    </PublicPageShell>
  );
}

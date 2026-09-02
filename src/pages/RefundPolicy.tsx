import { RotateCcw, Mail, Clock, CheckCircle2 } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard, SectionHeader } from '@/components/ui/glass-card';

export default function RefundPolicyPage() {
  return (
    <PublicPageShell backTo={{ href: '/', label: 'Back to home' }} maxWidth="sm">
      <PageMeta
        title="14-Day Refund Policy"
        description="Full refund within 14 days, no questions asked. Email support@aiwmcquantis.com to request. Plain-English refund policy for AIWMC Quantis."
        path="/refund-policy"
      />

      <section aria-labelledby="refund-hero-heading" className="aiwmc-section-wash py-10 md:py-14 text-center">
        <RotateCcw className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
        <SectionHeader
          title="14-day money-back guarantee"
          subtitle="Try Plus or Pro for 14 days. If it doesn't deliver value, we refund the full amount — no questions asked."
        />
      </section>

      <GlassCard glow="brand" className="p-8 mb-8">
        <h3 className="text-xl font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>How to Request a Refund</h3>
        <ol className="space-y-3 text-muted-foreground">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full text-sm font-semibold flex items-center justify-center" style={{ background: 'var(--aiwmc-grad-brand)', color: '#0b0e1a' }}>1</span>
            <div>
              Email{' '}
              <a href="mailto:support@aiwmcquantis.com" className="font-medium hover:underline" style={{ color: 'var(--aiwmc-grad-cyan)' }}>
                support@aiwmcquantis.com
              </a>{' '}
              from the address on your account.
            </div>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full text-sm font-semibold flex items-center justify-center" style={{ background: 'var(--aiwmc-grad-brand)', color: '#0b0e1a' }}>2</span>
            <div>Include the subject line "<strong style={{ color: 'hsl(var(--foreground))' }}>Refund request</strong>" so we route it correctly.</div>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full text-sm font-semibold flex items-center justify-center" style={{ background: 'var(--aiwmc-grad-brand)', color: '#0b0e1a' }}>3</span>
            <div>Optionally tell us why — it helps us improve, but it's not required.</div>
          </li>
        </ol>
      </GlassCard>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <Card icon={Clock} glow="cyan" title="Within 14 days" body="From your first paid charge (not from signup if you used a trial)." />
        <Card icon={CheckCircle2} glow="violet" title="Full amount refunded" body="To your original payment method. No partial refunds, no prorated games." />
        <Card icon={Mail} glow="brand" title="Reply within 24h" body="We process refunds within one business day of your email." />
      </div>

      <section className="space-y-6 text-sm text-muted-foreground leading-relaxed pb-8">
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-5">
          <h3 className="text-base font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>
            Founder Decision Review ($349) &amp; Consultant Founding Pilot ($499)
          </h3>
          <p className="mb-2">
            <strong>These one-time, founder-assisted engagements are not covered by the 14-day
            subscription policy below — they have their own terms.</strong>
          </p>
          <p className="mb-2">
            If AIWMC LLC determines during intake (or pilot setup, for the Consultant Founding Pilot) that
            Quantis cannot responsibly analyze the decision within the agreed scope, you receive a full
            refund. You may cancel for a full refund before the intake call (or pilot setup) or before
            substantive work begins, whichever occurs first.
          </p>
          <p>
            After substantive work begins, the engagement is non-refundable, except when AIWMC LLC cannot
            deliver the agreed scope or where applicable law requires otherwise. To request a review or
            refund under these terms, email{' '}
            <a href="mailto:support@aiwmcquantis.com" className="font-medium hover:underline" style={{ color: 'var(--aiwmc-grad-cyan)' }}>
              support@aiwmcquantis.com
            </a>.
          </p>
        </div>

        <Block title="What's eligible (subscription plans only)">
          <p>
            All paid <em>subscription</em> plans — Plus Monthly, Plus Annual, Pro Monthly, Pro Annual — are
            eligible for a full refund within 14 days of the first successful charge. This includes annual
            plans where you paid the full year upfront. <strong>This 14-day window does not apply to the
            Founder Decision Review or Consultant Founding Pilot above.</strong>
          </p>
        </Block>

        <Block title="Trials and refunds">
          <p>
            If you start with a 14-day trial, you can cancel any time during the trial without being
            charged at all. The 14-day refund window starts on the date you're first <em>charged</em>,
            not the date you signed up.
          </p>
        </Block>

        <Block title="Pro Annual ($492/yr)">
          <p>
            Pro Annual includes the same 14-day free trial as all other paid plans. You can cancel
            during the trial without being charged. If you're charged after the trial, the 14-day
            refund window applies from that charge date.
          </p>
        </Block>

        <Block title="What happens after a refund">
          <p>
            Your subscription is canceled immediately, and your account downgrades to the Free tier at
            the end of the current billing period. Historical analyses you generated during the paid
            period stay accessible (read-only) — we never hard-delete your data on a downgrade.
          </p>
        </Block>

        <Block title="What's not refundable">
          <ul className="space-y-2 list-disc list-inside">
            <li>Renewals after the initial 14-day window. (You can still cancel any time to stop future charges.)</li>
            <li>Add-on team seats that have been actively used by invited members.</li>
            <li>API usage charges (Pro tier) for requests already processed and billed.</li>
          </ul>
        </Block>

        <Block title="Disputes & chargebacks">
          <p>
            Email us first — we resolve nearly every refund request the same day. Initiating a chargeback
            without contacting us first may result in your account being suspended pending review, but
            won't prevent you from getting your money back if the request is within the 14-day window.
          </p>
        </Block>
      </section>

      <p className="text-center text-xs text-muted-foreground mb-8">
        Last updated: April 2026 · Questions?{' '}
        <a href="mailto:support@aiwmcquantis.com" className="hover:underline" style={{ color: 'var(--aiwmc-grad-cyan)' }}>
          support@aiwmcquantis.com
        </a>
      </p>
    </PublicPageShell>
  );
}

function Card({ icon: Icon, glow, title, body }: { icon: typeof Clock; glow: 'cyan' | 'violet' | 'brand'; title: string; body: string }) {
  return (
    <GlassCard glow={glow} className="p-5 text-center">
      <Icon className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
      <div className="font-semibold text-sm mb-1" style={{ color: 'hsl(var(--foreground))' }}>{title}</div>
      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
    </GlassCard>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>{title}</h3>
      {children}
    </div>
  );
}

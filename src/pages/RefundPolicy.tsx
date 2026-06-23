import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Mail, Clock, CheckCircle2 } from 'lucide-react';
import { PageMeta } from '@/components/seo/PageMeta';
import { Footer } from '@/components/layout/Footer';

export default function RefundPolicyPage() {
  return (
    <>
      <PageMeta
        title="14-Day Refund Policy"
        description="Full refund within 14 days, no questions asked. Email support@aiwmcquantis.com to request. Plain-English refund policy for AIWMC Quantis."
        path="/refund-policy"
      />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="container max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-semibold">Refund Policy</h1>
          </div>
        </header>

        <main className="container max-w-3xl mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <RotateCcw className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-3xl md:text-4xl font-bold mb-3">14-Day Money-Back Guarantee</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Try Plus or Pro for 14 days. If it doesn't deliver value,
              we refund the full amount — no questions asked.
            </p>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 mb-8">
            <h3 className="text-xl font-semibold mb-3">How to Request a Refund</h3>
            <ol className="space-y-3 text-muted-foreground">
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">1</span>
                <div>
                  Email{' '}
                  <a href="mailto:support@aiwmcquantis.com" className="text-primary hover:underline font-medium">
                    support@aiwmcquantis.com
                  </a>{' '}
                  from the address on your account.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">2</span>
                <div>Include the subject line "<strong className="text-foreground">Refund request</strong>" so we route it correctly.</div>
              </li>
              <li className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center">3</span>
                <div>Optionally tell us why — it helps us improve, but it's not required.</div>
              </li>
            </ol>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card icon={Clock} title="Within 14 days" body="From your first paid charge (not from signup if you used a trial)." />
            <Card icon={CheckCircle2} title="Full amount refunded" body="To your original payment method. No partial refunds, no prorated games." />
            <Card icon={Mail} title="Reply within 24h" body="We process refunds within one business day of your email." />
          </div>

          <section className="space-y-6 text-sm text-muted-foreground leading-relaxed">
            <Block title="What's eligible">
              <p>
                All paid plans — Plus Monthly, Plus Annual, Pro Monthly, Pro Annual — are eligible for a full
                refund within 14 days of the first successful charge. This includes annual plans where you
                paid the full year upfront.
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

          <p className="text-center text-xs text-muted-foreground mt-12">
            Last updated: April 2026 · Questions?{' '}
            <a href="mailto:support@aiwmcquantis.com" className="text-primary hover:underline">
              support@aiwmcquantis.com
            </a>
          </p>
        </main>
        <Footer />
      </div>
    </>
  );
}

function Card({ icon: Icon, title, body }: { icon: typeof Clock; title: string; body: string }) {
  return (
    <div className="p-5 rounded-xl border border-border bg-card text-center">
      <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
      <div className="font-semibold text-sm mb-1">{title}</div>
      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
      {children}
    </div>
  );
}

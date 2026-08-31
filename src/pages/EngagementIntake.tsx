import React, { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { PageSEO } from '@/components/seo/PageSEO';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard } from '@/components/ui/glass-card';
import { supabase } from '@/integrations/supabase/client';

interface VerifiedOffer {
  offer_code: 'founder_decision_review' | 'consultant_founding_pilot';
  offer_name: string;
  case_capacity: number;
}

export default function EngagementIntake() {
  const [sessionId] = useState(() => new URLSearchParams(window.location.search).get('session_id') || '');
  const [offer, setOffer] = useState<VerifiedOffer | null>(null);
  const [verifying, setVerifying] = useState(Boolean(sessionId));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [form, setForm] = useState({ company_name: '', client_type: '', decision_question: '', deadline: '', context: '' });

  useEffect(() => {
    if (!sessionId) return;
    // The Checkout Session ID is a capability secret. Remove it from the visible
    // URL and browser history after capturing it in memory.
    window.history.replaceState({}, document.title, '/engagement-intake');
    supabase.functions.invoke('engagement-intake', { body: { action: 'verify', session_id: sessionId } })
      .then(({ data, error: invokeError }) => {
        if (invokeError || !data?.verified) throw invokeError ?? new Error('Verification failed');
        setOffer(data as VerifiedOffer);
      })
      .catch(() => setError('We could not confirm this paid session. Use the exact return link from Stripe or contact support@aiwmcquantis.com.'))
      .finally(() => setVerifying(false));
  }, [sessionId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!offer || !termsAccepted) return;
    setSubmitting(true);
    setError(null);
    const { data, error: invokeError } = await supabase.functions.invoke('engagement-intake', {
      body: { action: 'submit', session_id: sessionId, terms_accepted: true, ...form },
    });
    if (invokeError || !data?.submitted) {
      setError('Your intake could not be saved. Nothing was charged again. Please retry or contact support@aiwmcquantis.com.');
      setSubmitting(false);
      return;
    }
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <PublicPageShell backTo={{ href: '/', label: 'Back to home' }} maxWidth="md">
      <PageSEO title="Paid Review Intake — AIWMC Quantis" description="Secure intake for a paid AIWMC Quantis decision review." canonical="/engagement-intake" noindex />
      <section className="py-12 md:py-20">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-primary mb-4"><LockKeyhole className="h-4 w-4" />Payment-bound intake</div>
        <h1 className="text-3xl md:text-4xl font-bold">Complete your review intake</h1>
        <p className="text-muted-foreground mt-3">We verify the Stripe session before accepting decision details. This form never asks for card information.</p>

        <GlassCard className="p-6 md:p-8 mt-8">
          {verifying && <div className="flex items-center gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Confirming payment…</div>}

          {!verifying && submitted && (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
              <h2 className="text-2xl font-bold mt-4">Intake received</h2>
              <p className="text-muted-foreground mt-2">Your engagement is queued. AIWMC LLC will contact you within one business day to schedule the intake/review steps.</p>
            </div>
          )}

          {!verifying && offer && !submitted && (
            <form onSubmit={submit} className="space-y-5">
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Confirmed offer</p>
                <p className="font-semibold mt-1">{offer.offer_name} · {offer.case_capacity} {offer.case_capacity === 1 ? 'case' : 'cases'}</p>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-medium">{offer.offer_code === 'consultant_founding_pilot' ? 'Consulting firm or company name' : 'Business or company name'} *</span>
                <Input required maxLength={160} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              </label>
              {offer.offer_code === 'consultant_founding_pilot' && (
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Primary client type *</span>
                  <Input required maxLength={300} value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value })} />
                </label>
              )}
              <label className="block space-y-2">
                <span className="text-sm font-medium">{offer.offer_code === 'consultant_founding_pilot' ? 'First client decision to evaluate' : 'Decision to evaluate'} *</span>
                <Textarea required maxLength={1500} className="min-h-28" value={form.decision_question} onChange={(e) => setForm({ ...form, decision_question: e.target.value })} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Decision deadline (optional)</span>
                <Input maxLength={160} placeholder="For example: October 15" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Context, known constraints, or current assumptions (optional)</span>
                <Textarea maxLength={4000} className="min-h-28" value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} />
              </label>
              <label className="flex items-start gap-3 text-sm text-muted-foreground">
                <Checkbox checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked === true)} className="mt-0.5" />
                <span>I accept the service scope, <Link className="underline" to="/terms">Terms</Link>, <Link className="underline" to="/privacy">Privacy Policy</Link>, and <Link className="underline" to="/refund-policy">Refund Policy</Link>. I understand this is decision support, not regulated professional advice. *</span>
              </label>
              <Button type="submit" size="lg" className="w-full py-6" disabled={!termsAccepted || submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving intake…</> : 'Submit secure intake'}
              </Button>
            </form>
          )}

          {!verifying && !offer && !submitted && !error && (
            <p className="text-muted-foreground">Open the return link provided immediately after your Stripe payment. If you already paid and no longer have it, contact support@aiwmcquantis.com.</p>
          )}
          {error && <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
        </GlassCard>
      </section>
    </PublicPageShell>
  );
}

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
  contact_email: string | null;
}

const emptyForm = {
  company_name: '',
  client_type: '',
  decision_question: '',
  deadline: '',
  context: '',
  website: '',
  industry: '',
  current_situation: '',
  financial_context: '',
  what_tried: '',
  assumptions: '',
  desired_outcome: '',
  document_links: '',
  contact_email: '',
  additional_notes: '',
  // Founder Decision Review only
  founder_context: '',
  primary_concern: '',
  specific_questions: '',
  followup_permitted: true,
};

export default function EngagementIntake() {
  const [sessionId] = useState(() => new URLSearchParams(window.location.search).get('session_id') || '');
  const [offer, setOffer] = useState<VerifiedOffer | null>(null);
  const [verifying, setVerifying] = useState(Boolean(sessionId));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!sessionId) return;
    // The Checkout Session ID is a capability secret. Remove it from the visible
    // URL and browser history after capturing it in memory.
    window.history.replaceState({}, document.title, '/engagement-intake');
    supabase.functions.invoke('engagement-intake', { body: { action: 'verify', session_id: sessionId } })
      .then(({ data, error: invokeError }) => {
        if (invokeError || !data?.verified) throw invokeError ?? new Error('Verification failed');
        const verified = data as VerifiedOffer;
        setOffer(verified);
        if (verified.contact_email) setForm((f) => ({ ...f, contact_email: verified.contact_email as string }));
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

  const isConsultant = offer?.offer_code === 'consultant_founding_pilot';
  const isFounder = offer?.offer_code === 'founder_decision_review';

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
              <Button className="mt-6" onClick={() => window.location.assign('/engagement-workspace?session_id=' + encodeURIComponent(sessionId))}>Open your private workspace</Button>
            </div>
          )}

          {!verifying && offer && !submitted && (
            <form onSubmit={submit} className="space-y-5">
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Confirmed offer</p>
                <p className="font-semibold mt-1">{offer.offer_name} · {offer.case_capacity} {offer.case_capacity === 1 ? 'case' : 'cases'}</p>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium">{isConsultant ? 'Consulting firm or company name' : 'Business or company name'} *</span>
                <Input required maxLength={160} value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              </label>
              {isConsultant && (
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Primary client type *</span>
                  <Input required maxLength={300} value={form.client_type} onChange={(e) => setForm({ ...form, client_type: e.target.value })} />
                </label>
              )}
              <div className="grid md:grid-cols-2 gap-4">
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Website (optional)</span>
                  <Input maxLength={200} placeholder="https://" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Industry (optional)</span>
                  <Input maxLength={160} value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-medium">{isConsultant ? 'First client decision to evaluate' : 'The decision that must be made'} *</span>
                <Textarea required maxLength={1500} className="min-h-28" value={form.decision_question} onChange={(e) => setForm({ ...form, decision_question: e.target.value })} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Decision deadline (optional)</span>
                <Input maxLength={160} placeholder="For example: October 15" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Current situation (optional)</span>
                <Textarea maxLength={2000} className="min-h-20" placeholder="What's happening right now that makes this decision necessary?" value={form.current_situation} onChange={(e) => setForm({ ...form, current_situation: e.target.value })} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Financial or business context (optional)</span>
                <Textarea maxLength={2000} className="min-h-20" placeholder="Revenue, costs, cash position, or anything financially relevant" value={form.financial_context} onChange={(e) => setForm({ ...form, financial_context: e.target.value })} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Known constraints or current assumptions (optional)</span>
                <Textarea maxLength={2000} className="min-h-20" value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">What has already been tried? (optional)</span>
                <Textarea maxLength={1500} className="min-h-20" value={form.what_tried} onChange={(e) => setForm({ ...form, what_tried: e.target.value })} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Assumptions you're already making (optional)</span>
                <Textarea maxLength={1500} className="min-h-20" value={form.assumptions} onChange={(e) => setForm({ ...form, assumptions: e.target.value })} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Desired outcome (optional)</span>
                <Textarea maxLength={1000} className="min-h-16" value={form.desired_outcome} onChange={(e) => setForm({ ...form, desired_outcome: e.target.value })} />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Links to relevant documents (optional)</span>
                <Input maxLength={1000} placeholder="Google Drive / Dropbox link — direct upload isn't available yet" value={form.document_links} onChange={(e) => setForm({ ...form, document_links: e.target.value })} />
              </label>

              {isFounder && (
                <div className="rounded-lg border border-border/60 p-4 space-y-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Founder Decision Review — additional context</p>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Founder / decision-maker context (optional)</span>
                    <Textarea maxLength={1500} className="min-h-20" placeholder="Your role, how long you've run this, who else is involved in the decision" value={form.founder_context} onChange={(e) => setForm({ ...form, founder_context: e.target.value })} />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Primary strategic concern (optional)</span>
                    <Textarea maxLength={1000} className="min-h-16" value={form.primary_concern} onChange={(e) => setForm({ ...form, primary_concern: e.target.value })} />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium">Specific questions you want reviewed (optional)</span>
                    <Textarea maxLength={1000} className="min-h-16" value={form.specific_questions} onChange={(e) => setForm({ ...form, specific_questions: e.target.value })} />
                  </label>
                  <label className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Checkbox checked={form.followup_permitted} onCheckedChange={(checked) => setForm({ ...form, followup_permitted: checked === true })} />
                    <span>AIWMC LLC may contact me with clarifying questions before delivery.</span>
                  </label>
                </div>
              )}

              <label className="block space-y-2">
                <span className="text-sm font-medium">Preferred contact email {form.contact_email ? '' : '*'}</span>
                <Input required={!form.contact_email} type="email" maxLength={200} value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
                <span className="text-xs text-muted-foreground">Pre-filled from your Stripe receipt — change it if you'd rather we use a different address.</span>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Additional notes (optional)</span>
                <Textarea maxLength={2000} className="min-h-16" value={form.additional_notes} onChange={(e) => setForm({ ...form, additional_notes: e.target.value })} />
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

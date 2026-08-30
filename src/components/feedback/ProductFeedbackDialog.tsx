import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle2, MessageSquarePlus } from 'lucide-react';
import { logger } from '@/lib/logger';

/**
 * Structured feedback baseline (charter 6.7-6.11, Phase 6 Public Trust
 * Foundation, 2026-08-29). Distinct from RealismFeedbackWidget: this asks
 * relationship-level questions unlinked from any single analysis, not
 * "how realistic did this one report feel."
 */
export function ProductFeedbackDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [mainReason, setMainReason] = useState('');
  const [mostTrusted, setMostTrusted] = useState('');
  const [leastTrusted, setLeastTrusted] = useState('');
  const [missingDecision, setMissingDecision] = useState('');
  const [wouldUseAgain, setWouldUseAgain] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = score !== null && wouldUseAgain !== null;

  async function handleSubmit() {
    if (!canSubmit || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('product_feedback').insert({
        user_id: user.id,
        likelihood_to_recommend: score,
        main_reason: mainReason.trim() || null,
        most_trusted_output: mostTrusted.trim() || null,
        least_trusted_output: leastTrusted.trim() || null,
        missing_decision: missingDecision.trim() || null,
        would_use_again: wouldUseAgain,
        product_version: '2.0.0-precision',
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      logger.error('Failed to submit product feedback', err);
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setScore(null);
    setMainReason('');
    setMostTrusted('');
    setLeastTrusted('');
    setMissingDecision('');
    setWouldUseAgain(null);
    setSubmitted(false);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-medium">
          <MessageSquarePlus className="w-4 h-4" />
          Share feedback
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        {submitted ? (
          <div className="flex flex-col items-center text-center gap-3 py-6">
            <CheckCircle2 className="w-10 h-10 text-success" />
            <h4 className="font-semibold text-foreground">Thank you</h4>
            <p className="text-sm text-muted-foreground">This directly shapes what we build next.</p>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Close</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>A few questions about Quantis</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div>
                <div className="text-sm font-medium text-foreground">How likely are you to recommend Quantis to another founder? (0-10)</div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setScore(n)}
                      className={`w-8 h-8 rounded-md text-sm border transition-colors ${
                        score === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <FeedbackField label="Main reason for that score" value={mainReason} onChange={setMainReason} />
              <FeedbackField label="What output do you trust most?" value={mostTrusted} onChange={setMostTrusted} />
              <FeedbackField label="What output do you trust least?" value={leastTrusted} onChange={setLeastTrusted} />
              <FeedbackField label="What decision are you still missing from Quantis?" value={missingDecision} onChange={setMissingDecision} />

              <div>
                <div className="text-sm font-medium text-foreground">Would you use Quantis again for your next decision?</div>
                <div className="flex gap-2 mt-2">
                  <Button type="button" size="sm" variant={wouldUseAgain === true ? 'default' : 'outline'} onClick={() => setWouldUseAgain(true)}>Yes</Button>
                  <Button type="button" size="sm" variant={wouldUseAgain === false ? 'default' : 'outline'} onClick={() => setWouldUseAgain(false)}>No</Button>
                </div>
              </div>

              <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full">
                {submitting ? 'Submitting…' : 'Submit'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FeedbackField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={300}
        className="mt-1.5 resize-none h-16 text-sm"
        placeholder="Optional"
      />
    </div>
  );
}

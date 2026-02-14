import React, { useState } from 'react';
import { CheckCircle2, Loader2, ArrowRight, FileText, Lightbulb, BarChart3, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLeadCapture } from '@/hooks/useLeadCapture';
import { trackEvent } from '@/lib/analytics';

const KIT_FEATURES = [
  { icon: FileText, label: 'Business Model Canvas' },
  { icon: BarChart3, label: 'Financial Projection Template' },
  { icon: Lightbulb, label: '20 AI Prompts' },
  { icon: ShieldCheck, label: 'Risk Checklist' },
];

export function LeadCaptureInline() {
  const [email, setEmail] = useState('');
  const { captureLead, isSubmitting, isSuccess } = useLeadCapture({
    source: 'footer_newsletter',
    offer: 'founder_starter_kit',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent('starter_kit_attempted', { email_domain: email.split('@')[1] });
    const result = await captureLead(email);
    if (result.success) {
      setEmail('');
      trackEvent('starter_kit_downloaded');
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-6 space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mb-2">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>
        <p className="text-base font-semibold text-foreground">Check your inbox</p>
        <p className="text-sm text-muted-foreground">
          Your Founder Validation Starter Kit is on its way.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feature chips */}
      <div className="flex flex-wrap justify-center gap-3">
        {KIT_FEATURES.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-xs text-muted-foreground"
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-lg mx-auto">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="h-12 flex-1 bg-background"
          disabled={isSubmitting}
          required
        />
        <Button
          type="submit"
          size="lg"
          className="h-12 px-6 gap-2 shrink-0"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Download Free Kit
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <p className="text-xs text-center text-muted-foreground">
        No spam. Unsubscribe anytime.
      </p>
    </div>
  );
}

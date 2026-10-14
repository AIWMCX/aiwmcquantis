import React, { useState } from 'react';
import { CheckCircle2, Loader2, ArrowRight, FileText, Lightbulb, BarChart3, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLeadCapture } from '@/hooks/useLeadCapture';
import { trackEvent } from '@/lib/analytics';
import { GlassCard } from '@/components/ui/glass-card';

const MONO = { fontFamily: "'JetBrains Mono', ui-monospace, monospace" } as const;

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
      <GlassCard glow="brand" className="text-center py-8 px-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 mb-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
        </div>
        <p className="text-base font-semibold" style={{ color: 'hsl(var(--foreground))' }}>Check your inbox</p>
        <p className="text-sm text-muted-foreground mt-1">
          Your Founder Validation Starter Kit is on its way.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard glow="cyan" className="p-6 md:p-8 space-y-6">
      {/* Feature chips — mono, hairline, no pill fill */}
      <div className="flex flex-wrap justify-center gap-2">
        {KIT_FEATURES.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]"
            style={{
              ...MONO,
              background: 'rgba(148,163,255,0.06)',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            }}
          >
            <Icon className="w-3 h-3" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
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
          placeholder="you@company.com"
          className="h-12 flex-1"
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            color: 'hsl(var(--foreground))',
          }}
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
              Download free kit
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <p className="text-xs text-center uppercase tracking-[0.14em]" style={{ ...MONO, color: 'var(--aiwmc-grad-cyan)' }}>
        2 emails / month · unsubscribe anytime · no upsell
      </p>
    </GlassCard>
  );
}

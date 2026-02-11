import React, { useState } from 'react';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLeadCapture } from '@/hooks/useLeadCapture';
import { trackEvent } from '@/lib/analytics';

export function LeadCaptureInline() {
  const [email, setEmail] = useState('');
  const { captureLead, isSubmitting, isSuccess } = useLeadCapture({
    source: 'footer_newsletter',
    offer: 'founder_starter_kit' as any,
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
      <div className="flex items-center justify-center gap-2 text-success py-4">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm font-medium">Check your inbox for the Starter Kit!</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
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
        className="h-12 px-6 gap-2"
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
  );
}

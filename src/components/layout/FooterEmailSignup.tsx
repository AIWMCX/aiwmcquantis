/**
 * Footer Email Signup Component
 * 
 * Inline newsletter signup form for footer.
 * Always visible, non-intrusive.
 * Offer: "Weekly Business Insights"
 */

import React, { useState } from 'react';
import { Send, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLeadCapture } from '@/hooks/useLeadCapture';
import { trackEvent } from '@/lib/analytics';

export function FooterEmailSignup() {
  const [email, setEmail] = useState('');
  const { captureLead, isSubmitting, isSuccess } = useLeadCapture({
    source: 'footer_newsletter',
    offer: 'newsletter',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    trackEvent('footer_newsletter_attempted', { 
      email_domain: email.split('@')[1] 
    });
    
    const result = await captureLead(email);
    if (result.success) {
      setEmail('');
      trackEvent('footer_newsletter_subscribed');
    }
  };

  if (isSuccess) {
    return (
      <div className="flex items-center gap-2 text-success">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm font-medium">You're subscribed! Check your inbox.</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email for weekly insights"
          className="h-11 flex-1 bg-muted/50 border-border/50"
          disabled={isSubmitting}
          required
        />
        <Button 
          type="submit" 
          size="sm"
          className="h-11 px-6 gap-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Subscribe
              <Send className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground mt-2">
        Join 500+ entrepreneurs. Unsubscribe anytime.
      </p>
    </div>
  );
}

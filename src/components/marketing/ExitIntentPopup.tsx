import { useState } from 'react';
import { X, Sparkles, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveLeadEmail } from '@/lib/leadMemory';

interface ExitIntentPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

export const ExitIntentPopup = ({ isOpen, onClose, onSubmitSuccess }: ExitIntentPopupProps) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    trackEvent('exit_intent_email_submitted', { email_domain: email.split('@')[1] });

    try {
      // 1. Capture the lead in database
      const { data, error } = await supabase.rpc('capture_lead', {
        p_email: email,
        p_source: 'exit_intent_popup',
        p_offer: 'free_analysis',
        p_metadata: {
          user_agent: navigator.userAgent,
          referrer: document.referrer,
          page_url: window.location.href,
          timestamp: new Date().toISOString(),
        },
      });

      if (error) {
        if (error.message.includes('already captured')) {
          toast.info("You've already requested an analysis. Check your email!");
          setIsSuccess(true);
        } else if (error.message.includes('Invalid email')) {
          toast.error('Please enter a valid email address');
        } else {
          throw error;
        }
        return;
      }

      console.log('✅ Lead captured:', data);
      
      // 2. Save email to localStorage for prefilling auth forms
      saveLeadEmail(email, 'exit_intent_popup');
      
      // 3. Send the same welcome email used for signup
      const emailName = email.split('@')[0].replace(/[._-]/g, ' ') || 'Friend';
      const capitalizedName = emailName.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');

      const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
        body: { 
          email, 
          name: capitalizedName 
        },
      });

      if (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the whole flow, lead is already captured
      } else {
        console.log('✅ Welcome email sent to:', email);
      }

      setIsSuccess(true);
      trackEvent('exit_intent_conversion', { lead_id: data });
      
      // Mark as submitted for smarter cooldown
      onSubmitSuccess?.();

      setTimeout(() => {
        onClose();
      }, 4000);
    } catch (error) {
      console.error('Lead capture error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    trackEvent('exit_intent_dismissed');
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
        onClick={handleBackdropClick}
      />

      {/* Popup */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 pointer-events-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
          
          {/* Close Button */}
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close popup"
          >
            <X className="h-5 w-5" />
          </button>

          {isSuccess ? (
            // Success State
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              
              <h3 className="text-2xl font-bold text-foreground mb-2">
                You're All Set!
              </h3>
              
              <p className="text-muted-foreground mb-4">
                Check your inbox for the Founder Validation Starter Kit.
              </p>
              
              <p className="text-sm text-muted-foreground">
                We'll also send you exclusive tips to grow your business with AI.
              </p>
            </div>
          ) : (
            // Main Content
            <>
              {/* Icon */}
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>

              {/* Headline */}
              <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-2">
                Before you go — validate your idea
              </h2>

              {/* Subheadline */}
              <p className="text-center text-muted-foreground text-sm mb-6">
                Get the AI Validation Checklist used by early-stage founders. Free, instant download.
              </p>

              {/* Benefits */}
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Financial Logic Check</span> — structured validation for your business model
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Risk Red Flags</span> — the exact signals investors look for
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">20 AI Prompts</span> — stress-test your idea before you build
                  </p>
                </div>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your work email"
                  className="h-12"
                  disabled={isSubmitting}
                  required
                />

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Download Free Starter Kit
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Trust Signals */}
              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    No credit card
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    Instant delivery
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    100% Free
                  </span>
                </p>
              </div>

              {/* Social Proof — honest, no fake numbers */}
              <div className="mt-4 pt-4 border-t border-border text-center">
                <p className="text-xs text-muted-foreground">
                  Used by early-stage founders validating their next idea
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

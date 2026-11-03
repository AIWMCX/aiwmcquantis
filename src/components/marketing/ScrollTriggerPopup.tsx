/**
 * Scroll Trigger Popup
 * 
 * Triggered at 50% scroll depth.
 * Offer: "10 Questions to Validate Your Business Idea"
 */

import React, { useState } from 'react';
import { X, CheckCircle2, ArrowRight, Loader2, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLeadCapture } from '@/hooks/useLeadCapture';
import { EmailConsentNote } from '@/components/marketing/EmailConsentNote';
import { LEAD_MAGNET_CONTENT } from '@/lib/leadMagnets';

interface ScrollTriggerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

export function ScrollTriggerPopup({ isOpen, onClose, onSubmitSuccess }: ScrollTriggerPopupProps) {
  const [email, setEmail] = useState('');
  const { captureLead, isSubmitting, isSuccess } = useLeadCapture({
    source: 'scroll_popup',
    offer: 'validation_questions',
  });

  const content = LEAD_MAGNET_CONTENT.validation_questions;

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await captureLead(email);
    if (result.success) {
      onSubmitSuccess?.();
      setTimeout(() => onClose(), 4000);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
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
            onClick={onClose}
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
                Validation Checklist Sent!
              </h3>
              
              <p className="text-muted-foreground mb-4">
                {content.successMessage}
              </p>
              
              <p className="text-sm text-muted-foreground">
                Use these questions to bulletproof your business idea.
              </p>
            </div>
          ) : (
            // Main Content
            <>
              {/* Icon */}
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardCheck className="h-7 w-7 text-primary" />
              </div>

              {/* Headline */}
              <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-2">
                {content.headline}
              </h2>

              {/* Subheadline */}
              <p className="text-center text-primary font-semibold text-lg mb-6">
                {content.subheadline}
              </p>

              {/* Benefits */}
              <div className="space-y-3 mb-6">
                {content.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{benefit}</p>
                  </div>
                ))}
              </div>

              {/* Email Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
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
                      {content.ctaText}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
              <EmailConsentNote className="mt-3 text-center" />

              {/* Trust Signals */}
              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    Free forever
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    No spam
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-success" />
                    Unsubscribe anytime
                  </span>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

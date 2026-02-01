import React, { useState, useEffect } from 'react';
import { X, Flame } from 'lucide-react';

export function UrgencyBanner() {
  const [spotsLeft, setSpotsLeft] = useState(() => {
    // Check if we have a stored value
    const stored = sessionStorage.getItem('urgency_spots');
    if (stored) {
      return parseInt(stored, 10);
    }
    return 37;
  });
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('urgency_banner_dismissed') === 'true';
  });

  useEffect(() => {
    // Slowly decrease spots with probability (creates urgency)
    const interval = setInterval(() => {
      setSpotsLeft((prev) => {
        const shouldDecrease = Math.random() > 0.6;
        const newValue = shouldDecrease ? Math.max(12, prev - 1) : prev;
        sessionStorage.setItem('urgency_spots', newValue.toString());
        return newValue;
      });
    }, 45000); // Every 45 seconds

    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('urgency_banner_dismissed', 'true');
  };

  const handleClaimClick = () => {
    const miniDemo = document.getElementById('mini-demo');
    if (miniDemo) {
      miniDemo.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isDismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground py-2.5 px-4">
      <div className="container max-w-7xl mx-auto flex items-center justify-center gap-2 sm:gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 animate-pulse" />
          <span className="font-medium hidden sm:inline">
            February Special: Free Pro features for first 100 users
          </span>
          <span className="font-medium sm:hidden">
            Free Pro features!
          </span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="px-2 py-0.5 rounded-full bg-primary-foreground/20 text-xs font-bold whitespace-nowrap">
            {spotsLeft} spots left
          </span>
          
          <button
            onClick={handleClaimClick}
            className="px-3 py-1 rounded-full bg-primary-foreground text-primary text-xs font-semibold hover:bg-primary-foreground/90 transition-colors whitespace-nowrap"
          >
            Claim Now →
          </button>
        </div>
        
        <button
          onClick={handleDismiss}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-primary-foreground/20 rounded transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

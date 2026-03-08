import React from 'react';
import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export function UrgencyBanner() {
  return (
    <div className="bg-gradient-to-r from-primary via-primary/90 to-primary py-2.5 text-center text-primary-foreground">
      <div className="container max-w-7xl mx-auto px-4 flex items-center justify-center">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
          <span className="text-sm font-medium flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Financial stress-test for founders — risk map, scenarios, and projections in 3 min</span>
            <span className="sm:hidden">Stress-test your idea free</span>
          </span>
          <Link 
            to="/app" 
            className="px-4 py-1 bg-primary-foreground text-primary rounded-lg text-sm font-semibold hover:bg-primary-foreground/90 transition-colors whitespace-nowrap"
          >
            Start →
          </Link>
        </div>
      </div>
    </div>
  );
}

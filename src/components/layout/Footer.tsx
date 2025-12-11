import React from 'react';
import { Brain, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 mt-auto">
      <div className="container max-w-7xl px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">AI Business Analyzer</span>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Business idea analysis powered by artificial intelligence
          </p>
          
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            © {new Date().getFullYear()} • Made with <Heart className="w-3 h-3 text-destructive" /> 
          </p>
        </div>
      </div>
    </footer>
  );
}

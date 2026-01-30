import React from 'react';
import { Link } from 'react-router-dom';
import { Brain, Heart, Mail } from 'lucide-react';
import { FooterEmailSignup } from './FooterEmailSignup';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 mt-auto">
      <div className="container max-w-7xl px-4 sm:px-6 py-8 md:py-12">
        <div className="flex flex-col gap-8">
          {/* Top Row: Branding + Newsletter */}
          <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6">
            <div className="flex flex-col items-center lg:items-start gap-2">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">AIWMC Quantis™</span>
              </div>
              <p className="text-sm text-muted-foreground text-center lg:text-left max-w-xs">
                AI-powered business idea analysis in under 2 minutes
              </p>
            </div>
            
            {/* Newsletter Signup */}
            <FooterEmailSignup />
          </div>
          
          {/* Middle Row: Links */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pt-4 border-t border-border/50">
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <a 
              href="mailto:support@aiwmcquantis.com" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Mail className="w-4 h-4" />
              support@aiwmcquantis.com
            </a>
          </div>
          
          {/* Bottom Row: Copyright */}
          <div className="flex items-center justify-center">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              © {new Date().getFullYear()} AIWMC Quantis™ • Made with <Heart className="w-3 h-3 text-destructive" /> 
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

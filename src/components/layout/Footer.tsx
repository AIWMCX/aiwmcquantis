import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Linkedin, Github, Instagram } from 'lucide-react';
import { FooterEmailSignup } from './FooterEmailSignup';
import { LastAuditedBadge } from '@/components/analysis/LastAuditedBadge';
import aiwmcLogoText from '@/assets/aiwmc-quantis-logo-text.png';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 mt-auto">
      <div className="container max-w-7xl px-4 sm:px-6 py-8 md:py-12">
        <div className="flex flex-col gap-8">
          {/* Top Row: Branding + Newsletter */}
          <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6">
            <div className="flex flex-col items-center lg:items-start gap-3">
              <Link to="/" className="flex items-center">
                <img
                  src={aiwmcLogoText}
                  alt="AIWMC Quantis"
                  width={109}
                  height={32}
                  className="h-8 w-auto object-contain dark:invert" />

              </Link>
              <p className="text-sm text-muted-foreground text-center lg:text-left max-w-xs">
                AI business validation & financial structuring for founders
              </p>
              <p className="text-xs text-muted-foreground">
                A product of <span className="font-medium">AIWMC™  LLC</span>
              </p>
              
              {/* Social Links */}
              <div className="flex items-center gap-3 mt-2">
                <a
                  href="https://www.linkedin.com/in/bogdan-jeltov-6218b9324"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="LinkedIn">

                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href="https://www.instagram.com/wmc.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Instagram">

                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://github.com/AIWMCX"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="GitHub">

                  <Github className="w-4 h-4" />
                </a>
              </div>
            </div>
            
            {/* Newsletter Signup */}
            <FooterEmailSignup />
          </div>
          
          {/* Middle Row: Links */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pt-4 border-t border-border/50">
            <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Blog
            </Link>
            <Link to="/methodology" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Methodology
            </Link>
            <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <a
              href="mailto:support@aiwmcquantis.com"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">

              <Mail className="w-4 h-4" />
              support@aiwmcquantis.com
            </a>
          </div>
          
          {/* Governance */}
          <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto leading-relaxed">
            Quantis is decision support, not investment advice. Always combine with human judgment.
          </p>

          {/* Bottom Row: Copyright + Compliance + Audit Badge */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} AIWMC™ LLC
            </p>
            <span className="hidden sm:inline text-xs text-muted-foreground">•</span>
            <p className="text-xs text-muted-foreground">GDPR & CCPA Compliant</p>
            <span className="hidden sm:inline text-xs text-muted-foreground">•</span>
            <LastAuditedBadge size="sm" />
          </div>
        </div>
      </div>
    </footer>);

}
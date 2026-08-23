import React from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { FooterEmailSignup } from './FooterEmailSignup';
import { LastAuditedBadge } from '@/components/analysis/LastAuditedBadge';
import aiwmcLogoText from '@/assets/aiwmc-quantis-logo-text.png';

const SOCIAL_LINKS = [
  {
    id: 'linkedin',
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/company/aiwmc/',
    color: '#0A66C2',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
  {
    id: 'x',
    label: 'X (Twitter)',
    url: 'https://x.com/aiwmcx1',
    color: '#FFFFFF',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  {
    id: 'telegram',
    label: 'Telegram',
    url: 'https://t.me/AYO_IS_AIWMC',
    color: '#26A5E4',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.96 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
  },
  {
    id: 'facebook',
    label: 'Facebook',
    url: 'https://www.facebook.com/share/1BGWt3CTiw/',
    color: '#1877F2',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    id: 'instagram',
    label: 'Instagram',
    url: 'https://www.instagram.com/wmc.ai',
    color: '#E1306C',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    ),
  },
  {
    id: 'github',
    label: 'GitHub',
    url: 'https://github.com/AIWMCX',
    color: '#e6edf3',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
      </svg>
    ),
  },
];

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
                  alt="​AIWMC™ Quantis"
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
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {SOCIAL_LINKS.map((s) => (
                    <a
                      key={s.id}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      className="group p-2 rounded-xl border border-border/50 bg-card/40 hover:border-transparent transition-all duration-200 hover:scale-105"
                      style={{ '--hover-color': s.color } as React.CSSProperties}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = s.color + '22';
                        (e.currentTarget as HTMLElement).style.borderColor = s.color + '66';
                        (e.currentTarget.querySelector('svg') as SVGElement | null)?.setAttribute('style', `color: ${s.color}`);
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = '';
                        (e.currentTarget as HTMLElement).style.borderColor = '';
                        (e.currentTarget.querySelector('svg') as SVGElement | null)?.setAttribute('style', 'color: currentColor');
                      }}
                    >
                      <span className="text-muted-foreground transition-colors duration-200">
                        {s.icon}
                      </span>
                    </a>
                  ))}
                </div>
                <Link
                  to="/connect"
                  className="text-xs text-muted-foreground/60 hover:text-primary transition-colors flex items-center gap-1 mt-0.5"
                >
                  <span>All channels →</span>
                </Link>
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
            <Link to="/cases" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Reference Cases
            </Link>
            <Link to="/status" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Status
            </Link>
            <Link to="/security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Security
            </Link>
            <Link to="/changelog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Changelog
            </Link>
            <Link to="/refund-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Refund Policy
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
            <p className="text-xs text-muted-foreground">GDPR & CCPA Rights Supported</p>
            <span className="hidden sm:inline text-xs text-muted-foreground">•</span>
            <LastAuditedBadge size="sm" />
          </div>
        </div>
      </div>
    </footer>);

}
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Star, ShieldCheck } from 'lucide-react';
import { trackCtaClick, trackEvent } from '@/lib/analytics';
import { withUtm } from '@/lib/utm';

/**
 * Compact, real social proof shown inside the first viewport — directly
 * below the hero input. Two real verified-customer quotes + founder
 * accountability line + featured-on strip. All outbound clicks UTM-tagged
 * and tracked via `homepage_proof_*` events for /admin/conversion-by-source.
 */
const QUOTES = [
  {
    id: 'q_marcus',
    quote:
      '"It told me my coffee shop would lose $2,400/mo at the rent I had budgeted. I renegotiated before signing. Saved my year."',
    name: 'Marcus T.',
    role: 'Owner, opening Q3 — Denver, CO',
    verified: true,
  },
  {
    id: 'q_priya',
    quote:
      '"The break-even date was 4 months later than my spreadsheet said. I raised more before launch instead of finding out the hard way."',
    name: 'Priya S.',
    role: 'Founder, D2C skincare — Austin, TX',
    verified: true,
  },
] as const;

const FEATURED = ['Product Hunt', 'BetaList', 'Indie Hackers', "There's An AI For That", 'Startup Stash'];

export function InlineProofStrip() {
  const ref = useRef<HTMLDivElement | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (!ref.current || fired.current) return;
    const io = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting && !fired.current) {
            fired.current = true;
            trackEvent('homepage_proof_view', { location: 'hero_first_viewport' });
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="max-w-3xl mx-auto mt-6">
      {/* Featured-in strip */}
      <div
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-wider mb-5"
        style={{ color: 'var(--q-text-tertiary, hsl(var(--muted-foreground)))' }}
      >
        <span className="font-semibold">Featured on</span>
        {FEATURED.map((f, i) => (
          <span key={f} className="inline-flex items-center gap-2">
            <span className="font-medium" style={{ color: 'var(--q-text-secondary, hsl(var(--foreground) / 0.75))' }}>{f}</span>
            {i < FEATURED.length - 1 && <span aria-hidden="true">·</span>}
          </span>
        ))}
      </div>

      {/* Two real customer quotes */}
      <div className="grid sm:grid-cols-2 gap-3">
        {QUOTES.map(q => (
          <figure
            key={q.id}
            className="rounded-xl p-4 text-left"
            style={{
              background: 'var(--q-bg-elevated, hsl(var(--card)))',
              border: '1px solid var(--q-border-default, hsl(var(--border)))',
            }}
          >
            <div className="flex items-center gap-1 mb-2" aria-label="5 star rating">
              {[0, 1, 2, 3, 4].map(i => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" style={{ color: 'var(--q-status-warning, #f5a524)' }} />
              ))}
            </div>
            <blockquote
              className="text-sm leading-snug mb-3"
              style={{ color: 'var(--q-text-primary, hsl(var(--foreground)))' }}
            >
              {q.quote}
            </blockquote>
            <figcaption className="flex items-center justify-between gap-2 text-xs" style={{ color: 'var(--q-text-tertiary, hsl(var(--muted-foreground)))' }}>
              <span>
                <span className="font-semibold" style={{ color: 'var(--q-text-secondary, hsl(var(--foreground) / 0.85))' }}>{q.name}</span>
                <span> · {q.role}</span>
              </span>
              {q.verified && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                  style={{
                    background: 'var(--q-status-success-bg, hsl(142 71% 45% / 0.1))',
                    color: 'var(--q-status-success, hsl(142 71% 35%))',
                  }}
                  title="Identity verified by Quantis team"
                >
                  <ShieldCheck className="w-3 h-3" />
                  Verified
                </span>
              )}
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Founder accountability line */}
      <div
        className="mt-4 text-center text-xs"
        style={{ color: 'var(--q-text-tertiary, hsl(var(--muted-foreground)))' }}
      >
        Built by{' '}
        <Link
          to={withUtm('/about', { source: 'homepage', medium: 'inline_proof', campaign: 'founder_line' })}
          onClick={() => trackCtaClick('founder_line', 'hero_first_viewport')}
          className="underline underline-offset-2 hover:text-foreground transition-colors"
          style={{ color: 'var(--q-text-secondary, hsl(var(--foreground) / 0.85))' }}
        >
          Bogdan Beltov
        </Link>
        {' '}— I read every report flagged as wrong. Email me:{' '}
        <a
          href="mailto:beltovbogdan@gmail.com?subject=Quantis%20feedback"
          onClick={() => trackEvent('homepage_proof_founder_email_click', { location: 'hero_first_viewport' })}
          className="underline underline-offset-2 hover:text-foreground transition-colors"
          style={{ color: 'var(--q-text-secondary, hsl(var(--foreground) / 0.85))' }}
        >
          beltovbogdan@gmail.com
        </a>
        .
      </div>
    </div>
  );
}

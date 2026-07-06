import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, DollarSign, BarChart3, PenLine } from 'lucide-react';

/**
 * ExploreMoreGrid — surfaces the site's 4 primary destinations one screen
 * before the footer, so they aren't only reachable by scrolling to the
 * absolute bottom. Sits inside PublicPageShell, above <Footer/>, so every
 * public page gets it from a single insertion point.
 */
const DESTINATIONS = [
  { to: '/methodology', icon: BookOpen, title: 'Methodology', desc: 'How the deterministic engine and RVCE actually work.' },
  { to: '/pricing', icon: DollarSign, title: 'Pricing', desc: 'Free, Plus, and Pro — no hidden tiers.' },
  { to: '/examples', icon: BarChart3, title: 'Examples', desc: '51+ real analyses across cities and industries.' },
  { to: '/blog', icon: PenLine, title: 'Blog', desc: 'Validation frameworks and financial-mistake teardowns.' },
];

export function ExploreMoreGrid() {
  return (
    <section aria-labelledby="explore-more-heading" className="py-10 md:py-14">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6">
        <h2 id="explore-more-heading" className="sr-only">Explore more</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {DESTINATIONS.map(({ to, icon: Icon, title, desc }) => (
            <Link
              key={to}
              to={to}
              className="group relative flex flex-col justify-between p-5 rounded-lg transition-colors"
              style={{ background: '#0a0e1f', border: '1px solid rgba(148,163,255,0.12)' }}
            >
              <div>
                <Icon className="w-5 h-5 mb-3" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
                <h3
                  className="text-lg font-bold mb-1"
                  style={{ fontFamily: "'Cabinet Grotesk', var(--font-heading, inherit)", color: 'hsl(var(--foreground))' }}
                >
                  {title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
              <ArrowRight
                className="w-4 h-4 mt-4 self-end transition-transform group-hover:translate-x-1"
                style={{ color: 'var(--aiwmc-grad-cyan)' }}
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

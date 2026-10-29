import { Link } from 'react-router-dom';
import { VS_PAGES } from '@/pages/vs/vsData';

/**
 * Buy-blockers #114: the six comparison pages got 1 view in 30 days because
 * almost nothing linked to them. Buyers comparing tools look on pricing and
 * the blog, so both list every comparison, from the same VS_PAGES data the
 * pages render.
 */
export function CompareLinks({ className }: { className?: string }) {
  return (
    <section aria-labelledby="compare-links" className={className} data-testid="compare-links">
      <h2 id="compare-links" className="text-lg font-bold mb-1" style={{ color: 'hsl(var(--foreground))' }}>
        Comparing tools?
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Side-by-side notes on what each tool does, including where it is the better choice.
      </p>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
        {VS_PAGES.map((p) => (
          <li key={p.slug}>
            <Link to={`/vs/${p.slug}`} className="text-sm text-primary hover:underline">
              Quantis vs {p.competitor}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

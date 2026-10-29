import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import DecisionReview from '@/pages/DecisionReview';
import { ENGAGEMENT_OFFER } from '@/config/engagement-offers';
import { PUBLIC_ROUTES } from '../../scripts/seo.routes.mjs';

// The page records funnel events on mount; a real call logs after the test
// environment closes and Vitest reports it as an unhandled error (CI, #359).
vi.mock('@/lib/analytics', () => ({ recordFunnelEvent: vi.fn(), trackEvent: vi.fn() }));

// Buy-blockers #91: the $499 pilot shared /decision-review with the $349
// founder offer, which came first. Consultants now get /consultant-pilot.
const renderPage = (variant?: 'pilot') =>
  render(
    <HelmetProvider>
      <MemoryRouter>
        <DecisionReview variant={variant} />
      </MemoryRouter>
    </HelmetProvider>,
  );

describe('/consultant-pilot', () => {
  it('shows only the consultant pilot, with its configured price, and links to the founder offer', () => {
    renderPage('pilot');
    expect(screen.getByText(/two real client decisions through Quantis/)).toBeTruthy();
    expect(screen.queryByRole('heading', { name: ENGAGEMENT_OFFER.founderReview.name })).toBeNull();
    expect(document.body.textContent).toContain(`$${ENGAGEMENT_OFFER.consultantPilot.price}`);
    expect(screen.getByRole('link', { name: /covers one decision/ }).getAttribute('href')).toBe('/decision-review');
  });

  it('/decision-review still shows both offers', () => {
    renderPage();
    expect(document.body.textContent).toContain(ENGAGEMENT_OFFER.founderReview.name);
    expect(document.body.textContent).toContain(ENGAGEMENT_OFFER.consultantPilot.name);
  });

  it('is registered everywhere a public route must be', () => {
    expect(readFileSync('src/App.tsx', 'utf8')).toMatch(/path="\/consultant-pilot" element=\{<DecisionReview variant="pilot" \/>\}/);
    expect(PUBLIC_ROUTES.some((r: { path: string }) => r.path === '/consultant-pilot')).toBe(true);
    expect(readFileSync('src/components/seo/RouteSEO.tsx', 'utf8')).toMatch(/'\/consultant-pilot': \{/);
    expect(readFileSync('scripts/generate-static-bodies.mjs', 'utf8')).toMatch(/"\/consultant-pilot": `<p class="q-lede">/);
    expect(readFileSync('src/pages/Consultants.tsx', 'utf8')).toMatch(/to="\/consultant-pilot"/);
    expect(readFileSync('scripts/generate-sitemap.ts', 'utf8')).toMatch(/path: '\/consultant-pilot'/);
    expect(readFileSync('public/prerender-urls.txt', 'utf8')).toMatch(/^\/consultant-pilot$/m);
  });
});

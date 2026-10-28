import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StructuredData } from '@/components/seo/StructuredData';
import { ENGAGEMENT_OFFERS } from '@/config/engagement-offers';

// SEO audit 2026-10-27 (Phase 2, item 6): the two paid offers had no
// Service/Offer markup. Name, price and scope must come from the same config
// the pages display, so the schema can't drift from the visible price.
const services = () => {
  const el = document.getElementById('schema-services');
  return el ? JSON.parse(el.textContent ?? '[]') : null;
};

describe('Service schema for one-time offers', () => {
  it('emits one Service per offer with the configured price', () => {
    render(
      <MemoryRouter initialEntries={['/decision-review']}>
        <StructuredData services={ENGAGEMENT_OFFERS.map((o) => o.code)} />
      </MemoryRouter>,
    );
    const s = services();
    expect(s).toHaveLength(ENGAGEMENT_OFFERS.length);
    ENGAGEMENT_OFFERS.forEach((o, i) => {
      expect(s[i]['@type']).toBe('Service');
      expect(s[i].name).toBe(o.name);
      expect(s[i].offers).toMatchObject({ price: String(o.price), priceCurrency: 'USD', url: 'https://www.aiwmcquantis.com/decision-review' });
      expect(s[i].provider['@id']).toBe('https://www.aiwmcquantis.com/#organization');
    });
  });

  it('emits only the offers the page sells, and nothing when none are passed', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/consultants']}>
        <StructuredData services={['consultant_founding_pilot']} />
      </MemoryRouter>,
    );
    expect(services().map((x: { name: string }) => x.name)).toEqual(['Consultant Founding Pilot']);
    unmount();
    render(
      <MemoryRouter>
        <StructuredData />
      </MemoryRouter>,
    );
    expect(services()).toBeNull();
  });

  it('both offer pages pass their offers', async () => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync('src/pages/DecisionReview.tsx', 'utf8')).toMatch(/services=\{SCHEMA_SERVICES\}/);
    expect(readFileSync('src/pages/Consultants.tsx', 'utf8')).toMatch(/services=\{SCHEMA_SERVICES\}/);
  });
});

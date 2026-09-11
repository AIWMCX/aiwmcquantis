import { describe, expect, it } from 'vitest';
import { buildEngagementPacketHtml } from '../lib/engagement-packet';

describe('buildEngagementPacketHtml (paid-engagement packet/PDF generator)', () => {
  it('renders a Founder Decision Review brief and escapes user-submitted HTML', () => {
    const html = buildEngagementPacketHtml({
      offerName: 'Founder Decision Review',
      contactName: 'Test User',
      contactEmail: 'test@example.com',
      companyName: 'Acme <script>alert(1)</script> Co',
      generatedAt: new Date().toISOString(),
      decisionSummary: 'Should we open a second location?',
      constraints: 'Budget under $50k',
      assumptions: [{ label: 'Rent', value: '$3000/mo', type: 'estimate', source: 'Zillow', confidence: 'medium', notes: 'varies' }],
      scenarios: [{ name: 'Base', revenue: '10000', costs: '7000', cash: '20000', trigger: 'steady demand', notes: '' }],
      questions: ['What if demand drops 20%?'],
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('Acme');
    expect(html).toContain('second location');
    expect(html).toContain('Rent');
    expect(html).toContain('What if demand drops 20%?');
  });

  it('renders each Consultant Founding Pilot case as its own isolated section', () => {
    const html = buildEngagementPacketHtml({
      offerName: 'Consultant Founding Pilot',
      contactName: 'Consultant User',
      generatedAt: new Date().toISOString(),
      cases: [
        { case_name: 'Client A', client_type: 'Retail', decision_question: 'Expand or not?', deadline: 'Oct 1', context: 'ctx', assumptions: [], scenarios: [] },
        { case_name: 'Client B', client_type: 'SaaS', decision_question: 'Raise prices?', deadline: '', context: '', assumptions: [], scenarios: [] },
      ],
    });

    expect(html).toContain('Case 1');
    expect(html).toContain('Case 2');
    expect(html).toContain('Client A');
    expect(html).toContain('Client B');
    expect(html).toContain('Expand or not?');
    expect(html).toContain('Raise prices?');
  });

  it('includes founder-only intake fields when provided, and skips empty ones', () => {
    const html = buildEngagementPacketHtml({
      offerName: 'Founder Decision Review',
      contactName: 'Test User',
      generatedAt: new Date().toISOString(),
      intake: { industry: 'Retail', current_situation: 'Growing fast', empty_field: '' },
    });

    expect(html).toContain('Retail');
    expect(html).toContain('Growing fast');
    expect(html).not.toContain('empty_field');
  });

  it('omits the intake section entirely when no intake data is passed (customer-facing download)', () => {
    const html = buildEngagementPacketHtml({
      offerName: 'Founder Decision Review',
      contactName: 'Test User',
      generatedAt: new Date().toISOString(),
      decisionSummary: 'A decision',
    });

    expect(html).not.toContain('Full intake responses');
  });
});

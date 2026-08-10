/**
 * Quantis Evidence Service — fixture packet generator (PR E2.1, plan step 4).
 *
 * Produces several real `QuantisEvidencePacket` objects by running the
 * actual pipeline code (no shortcuts, no hand-authored JSON) against
 * MOCKED Tavily responses -- run this in an environment with a real
 * TAVILY_API_KEY set to get live-data fixtures instead (see
 * USE_LIVE_TAVILY below). Labeled honestly either way in each fixture's
 * own `_fixtureMeta` block, which is stripped before this would ever be
 * treated as a real evidence packet (it is metadata about the fixture
 * generation, not part of the QuantisEvidencePacket type).
 *
 * Run with: npx tsx scripts/evidence-service/generate-fixtures.ts
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runEvidencePipeline } from '../../supabase/functions/_shared/evidence/pipeline';
import { TavilyEvidenceProvider } from '../../supabase/functions/_shared/evidence/tavily-provider';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '../../docs/evidence-service/fixtures');

const USE_LIVE_TAVILY = process.env.EVIDENCE_PROVIDER_INTEGRATION_TESTS === 'true' && Boolean(process.env.TAVILY_API_KEY);

interface MockTavilyResult {
  title: string;
  content: string;
  url: string;
  published_date?: string;
}

interface Scenario {
  slug: string;
  analysisRunId: string;
  idea: string;
  location: string;
  /** Keyed by a substring of the compiled query, so different mock results answer different compiled questions realistically. */
  mockResultsByQueryContains: Array<{ contains: string; results: MockTavilyResult[] }>;
}

const SCENARIOS: Scenario[] = [
  {
    slug: 'coffee-shop-denver',
    analysisRunId: 'fixture-coffee-shop-denver',
    idea: 'Coffee shop',
    location: 'Denver, Colorado',
    mockResultsByQueryContains: [
      {
        contains: 'commercial rent',
        results: [
          { title: 'Denver Retail Rent Report 2026', content: 'Average Denver retail commercial rent is $28-32/sqft/year as of early 2026, per CoStar market data.', url: 'https://www.costar.com/denver-retail-2026', published_date: '2026-02-01' },
          { title: 'Denver Small Business Space Guide', content: 'Small retail/cafe spaces in Denver typically lease for $27-30/sqft annually, varying by neighborhood.', url: 'https://denver.smallbizguide.example/rent', published_date: '2026-01-15' },
        ],
      },
      {
        contains: 'wage data',
        results: [
          { title: 'BLS Occupational Employment and Wage Statistics — Colorado', content: 'Median hourly wage for food service workers in the Denver-Aurora-Lakewood metro area was $16.85 in May 2025.', url: 'https://www.bls.gov/oes/current/oes_19740.htm', published_date: '2025-05-01' },
        ],
      },
      {
        contains: 'licensing requirements',
        results: [
          { title: 'City and County of Denver — Retail Food Establishment License', content: 'Coffee shops and cafes in Denver require a Retail Food Establishment License from Denver Department of Public Health & Environment, plus a standard business license.', url: 'https://denvergov.org/food-establishment-license', published_date: '2026-01-01' },
        ],
      },
      {
        contains: 'industry benchmarks',
        results: [
          { title: 'Coffee Shop Industry Benchmark Report', content: 'Independent coffee shops typically see gross margins of 65-75% and average customer spend of $6-9 per visit.', url: 'https://industry-example.com/coffee-benchmarks', published_date: '2025-11-01' },
        ],
      },
    ],
  },
  {
    slug: 'saas-startup-austin',
    analysisRunId: 'fixture-saas-startup-austin',
    idea: 'B2B SaaS analytics tool',
    location: 'Austin, Texas',
    mockResultsByQueryContains: [
      {
        contains: 'commercial rent',
        results: [
          { title: 'Austin Office Rent Trends 2026', content: 'Class B office space in Austin averages $34-38/sqft/year in early 2026.', url: 'https://austin-office-example.com/2026', published_date: '2026-01-20' },
        ],
      },
      {
        contains: 'wage data',
        results: [
          { title: 'BLS Wage Data — Austin-Round Rock-Georgetown, TX', content: 'Median annual wage for software developers in Austin was $118,300 in May 2025.', url: 'https://www.bls.gov/oes/current/oes_12420.htm', published_date: '2025-05-01' },
        ],
      },
      { contains: 'licensing requirements', results: [] }, // deliberately empty: a real "no results" case in this fixture set
      {
        contains: 'industry benchmarks',
        results: [
          { title: 'SaaS Benchmarks Report 2026', content: 'Early-stage B2B SaaS companies see median CAC payback of 14-18 months and net revenue retention of 100-110%.', url: 'https://saas-benchmarks-example.com/2026', published_date: '2026-03-01' },
          { title: 'B2B SaaS Metrics, alternate source', content: 'Payback periods for early-stage B2B SaaS commonly range 12-20 months depending on segment.', url: 'https://another-saas-source.example.com/metrics', published_date: '2026-02-10' },
        ],
      },
    ],
  },
];

function buildFetchImpl(scenario: Scenario): typeof fetch {
  return (async (_url: string, init?: RequestInit) => {
    const body = JSON.parse((init?.body as string) ?? '{}');
    const query: string = body.query ?? '';
    const match = scenario.mockResultsByQueryContains.find((m) => query.includes(m.contains));
    const results = match?.results ?? [];
    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  for (const scenario of SCENARIOS) {
    const tavily = USE_LIVE_TAVILY
      ? new TavilyEvidenceProvider({ apiKey: process.env.TAVILY_API_KEY })
      : new TavilyEvidenceProvider({ apiKey: 'fixture-mock-key', fetchImpl: buildFetchImpl(scenario) });

    const { packet, providerResults, privacyFindings } = await runEvidencePipeline({
      analysisRunId: scenario.analysisRunId,
      idea: scenario.idea,
      location: scenario.location,
      providers: [tavily],
    });

    const output = {
      _fixtureMeta: {
        generatedAt: new Date().toISOString(),
        dataSource: USE_LIVE_TAVILY ? 'LIVE_TAVILY_API' : 'MOCKED_TAVILY_RESPONSE',
        scenario: scenario.slug,
        note: USE_LIVE_TAVILY
          ? 'Generated against the real, live Tavily API.'
          : 'Generated with a mocked Tavily response (no TAVILY_API_KEY / EVIDENCE_PROVIDER_INTEGRATION_TESTS=true set in this environment) -- the pipeline logic itself is 100% real, only the provider HTTP call is stubbed. Re-run with those env vars set to regenerate against live data.',
        privacyFindings,
        providerResultSummaries: providerResults.map((r) => ({
          providerId: r.providerId,
          status: r.status,
          resultCount: r.results.length,
          errorCode: r.errorCode,
        })),
      },
      packet,
    };

    const outPath = join(OUT_DIR, `${scenario.slug}.json`);
    writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');
    console.log(`Wrote ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * SEC Form D -> Quantis prospect (2026-11-04). Pure: no I/O, so vitest and
 * Deno load the same file.
 *
 * A Form D is the public notice a US company files when it raises private
 * money. It names the executives, the city and the raise size, which is a
 * recorded money decision: the ICP trigger in
 * quantis-brain/leads/ICP-AND-WARM-LEAD-ENGINE.md. Funds, real estate
 * vehicles and financial firms are dropped. Nothing here guesses an email:
 * prospects land without contact_channel until a verified address is found.
 */

export const FORM_D_SEGMENT = 'Owner of a recently funded company (SEC Form D)';

export interface EftsHit {
  _id: string; // "<accession>:<document>"
  _source: { ciks?: string[]; display_names?: string[]; file_date?: string };
}

export interface FormDFiling {
  accession: string;
  cik: string;
  document: string;
  entityName: string;
  fileDate: string;
  xmlUrl: string;
}

export interface FormDDetails {
  industry: string;
  revenueRange: string;
  totalOffering: number | null;
  city: string;
  state: string;
  executives: Array<{ name: string; relationships: string[] }>;
  isAmendment: boolean;
}

const FUND_WORDS = /\b(fund|funds|capital|partners|holdings|investors|investments?|lp|l\.p\.|reit|properties|realty|apartments|spv|series|trust|ventures|equity|portfolio|acquisition|opportunity|opportunities)\b/i;

const EXCLUDED_INDUSTRIES = new Set([
  'Pooled Investment Fund', 'REITS and Finance', 'Commercial', 'Residential', 'Other Real Estate',
  'Investing', 'Investment Banking', 'Commercial Banking', 'Other Banking and Financial Services',
  'Insurance', 'Construction',
]);

const EXCLUDED_REVENUE = new Set(['$25,000,001 - $100,000,000', 'Over $100,000,000']);

const US_STATES = new Set('AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));

export const MIN_OFFERING = 100_000;
export const MAX_OFFERING = 20_000_000;

/** EFTS search hits -> filings worth fetching. Funds are dropped by name, before any fetch. */
export function filingsFromHits(hits: EftsHit[]): FormDFiling[] {
  const out: FormDFiling[] = [];
  const seen = new Set<string>();
  for (const h of hits) {
    const [accession, document] = h._id.split(':');
    const cik = (h._source.ciks?.[0] ?? '').replace(/^0+/, '');
    const entityName = (h._source.display_names?.[0] ?? '').replace(/\s+\(CIK \d+\)\s*$/, '').trim();
    if (!accession || !document || !cik || !entityName || seen.has(cik)) continue;
    if (FUND_WORDS.test(entityName)) continue;
    seen.add(cik);
    out.push({
      accession, cik, document, entityName,
      fileDate: h._source.file_date ?? '',
      xmlUrl: `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, '')}/${document}`,
    });
  }
  return out;
}

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : '';
}

export function parseFormDXml(xml: string): FormDDetails {
  const issuerAddress = tag(xml, 'issuerAddress');
  const offering = tag(xml, 'totalOfferingAmount');
  const executives: FormDDetails['executives'] = [];
  for (const m of xml.matchAll(/<relatedPersonInfo>([\s\S]*?)<\/relatedPersonInfo>/g)) {
    const block = m[1];
    const name = `${tag(block, 'firstName')} ${tag(block, 'lastName')}`.replace(/\s+/g, ' ').trim();
    const relationships = [...block.matchAll(/<relationship>([\s\S]*?)<\/relationship>/g)].map((r) => decode(r[1]));
    if (name) executives.push({ name, relationships });
  }
  return {
    industry: tag(xml, 'industryGroupType'),
    revenueRange: tag(xml, 'revenueRange'),
    totalOffering: /^\d+(\.\d+)?$/.test(offering) ? Number(offering) : null,
    city: tag(issuerAddress, 'city'),
    state: tag(issuerAddress, 'stateOrCountry'),
    executives,
    isAmendment: tag(xml, 'isAmendment') === 'true',
  };
}

/** Why a filing is not a Quantis prospect, or null when it is one. */
export function rejectReason(d: FormDDetails): string | null {
  if (d.isAmendment) return 'amendment';
  if (!US_STATES.has(d.state)) return 'not_us';
  if (EXCLUDED_INDUSTRIES.has(d.industry)) return 'excluded_industry';
  if (EXCLUDED_REVENUE.has(d.revenueRange)) return 'too_large';
  if (d.totalOffering === null) return 'offering_not_stated';
  if (d.totalOffering < MIN_OFFERING || d.totalOffering > MAX_OFFERING) return 'offering_out_of_range';
  if (!d.executives.some((e) => e.relationships.includes('Executive Officer'))) return 'no_executive_named';
  return null;
}

/** "BELONG IMMIGRATION SERVICES, INC" -> "Belong Immigration Services, Inc". Mixed case is kept. */
export function displayCompanyName(raw: string): string {
  if (raw !== raw.toUpperCase()) return raw;
  return raw.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\b(Llc|Inc|Pbc|Co|Ltd)\b/g, (s) => (s === 'Llc' || s === 'Pbc' ? s.toUpperCase() : s));
}

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** The prospect row. The only signal is the filing itself, stated as public record. */
export function prospectFromFormD(f: FormDFiling, d: FormDDetails) {
  const exec = d.executives.find((e) => e.relationships.includes('Executive Officer'))!;
  return {
    company_name: displayCompanyName(f.entityName),
    contact_name: exec.name,
    contact_role: 'Executive Officer',
    contact_channel: null as string | null,
    website: null as string | null,
    segment: FORM_D_SEGMENT,
    observed_signals: [
      `Filed SEC Form D on ${f.fileDate} for a ${usd(d.totalOffering!)} private offering (${d.industry || 'industry not stated'}, ${displayCompanyName(d.city)}, ${d.state})`,
    ],
    supporting_evidence: [f.xmlUrl],
  };
}

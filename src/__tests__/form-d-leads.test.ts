import { describe, expect, it } from 'vitest';
import {
  displayCompanyName,
  filingsFromHits,
  parseFormDXml,
  prospectFromFormD,
  rejectReason,
} from '../../supabase/functions/_shared/commercial/form-d';

// Synthetic filing in the real EDGAR Form D shape. Made-up company and people.
const xml = (over: Partial<Record<string, string>> = {}) => `<?xml version="1.0"?>
<edgarSubmission>
  <primaryIssuer>
    <entityName>EXAMPLE WIDGETS, INC.</entityName>
    <issuerAddress><street1>1 Main St</street1><city>${over.city ?? 'AUSTIN'}</city><stateOrCountry>${over.state ?? 'TX'}</stateOrCountry></issuerAddress>
  </primaryIssuer>
  <relatedPersonsList>
    <relatedPersonInfo>
      <relatedPersonName><firstName>Jane</firstName><lastName>Doe</lastName></relatedPersonName>
      <relatedPersonAddress><city>DALLAS</city><stateOrCountry>TX</stateOrCountry></relatedPersonAddress>
      <relatedPersonRelationshipList><relationship>${over.relationship ?? 'Executive Officer'}</relationship><relationship>Director</relationship></relatedPersonRelationshipList>
    </relatedPersonInfo>
  </relatedPersonsList>
  <offeringData>
    <industryGroup><industryGroupType>${over.industry ?? 'Other Technology'}</industryGroupType></industryGroup>
    <issuerSize><revenueRange>${over.revenue ?? '$1 - $1,000,000'}</revenueRange></issuerSize>
    <typeOfFiling><newOrAmendment><isAmendment>${over.amendment ?? 'false'}</isAmendment></newOrAmendment></typeOfFiling>
    <offeringSalesAmounts><totalOfferingAmount>${over.offering ?? '750000'}</totalOfferingAmount></offeringSalesAmounts>
  </offeringData>
</edgarSubmission>`;

const hit = (name: string, cik = '0002000001') => ({
  _id: '0002000001-26-000001:primary_doc.xml',
  _source: { ciks: [cik], display_names: [`${name}  (CIK ${cik})`], file_date: '2026-11-03' },
});

describe('Form D lead intake', () => {
  it('drops funds and real-estate vehicles by name before fetching', () => {
    const f = filingsFromHits([hit('Example Widgets, Inc.'), hit('ARCHIV Capital Fund A LP', '0002000002'), hit('Madison Sunrise Properties, LLC', '0002000003')]);
    expect(f.map((x) => x.entityName)).toEqual(['Example Widgets, Inc.']);
    expect(f[0].xmlUrl).toBe('https://www.sec.gov/Archives/edgar/data/2000001/000200000126000001/primary_doc.xml');
  });

  it('parses the issuer, not the related person, address', () => {
    const d = parseFormDXml(xml());
    expect(d).toMatchObject({ city: 'AUSTIN', state: 'TX', industry: 'Other Technology', totalOffering: 750000, isAmendment: false });
    expect(d.executives).toEqual([{ name: 'Jane Doe', relationships: ['Executive Officer', 'Director'] }]);
  });

  it('keeps a small US operating company and rejects the rest', () => {
    expect(rejectReason(parseFormDXml(xml()))).toBeNull();
    expect(rejectReason(parseFormDXml(xml({ amendment: 'true' })))).toBe('amendment');
    expect(rejectReason(parseFormDXml(xml({ state: 'ON' })))).toBe('not_us');
    expect(rejectReason(parseFormDXml(xml({ industry: 'Pooled Investment Fund' })))).toBe('excluded_industry');
    expect(rejectReason(parseFormDXml(xml({ revenue: 'Over $100,000,000' })))).toBe('too_large');
    expect(rejectReason(parseFormDXml(xml({ offering: 'Indefinite' })))).toBe('offering_not_stated');
    expect(rejectReason(parseFormDXml(xml({ offering: '50000000' })))).toBe('offering_out_of_range');
    expect(rejectReason(parseFormDXml(xml({ relationship: 'Promoter' })))).toBe('no_executive_named');
  });

  it('builds a prospect with the filing as its only signal and no guessed email', () => {
    const [f] = filingsFromHits([hit('EXAMPLE WIDGETS, INC.')]);
    const p = prospectFromFormD(f, parseFormDXml(xml()));
    expect(p.company_name).toBe('Example Widgets, Inc.');
    expect(p.contact_name).toBe('Jane Doe');
    expect(p.contact_channel).toBeNull();
    expect(p.observed_signals).toEqual(['Filed SEC Form D on 2026-11-03 for a $750,000 private offering (Other Technology, Austin, TX)']);
    expect(p.supporting_evidence).toEqual([f.xmlUrl]);
  });

  it('title-cases all-caps names and keeps mixed case', () => {
    expect(displayCompanyName('BELONG IMMIGRATION SERVICES, LLC')).toBe('Belong Immigration Services, LLC');
    expect(displayCompanyName('Newcoda, Inc.')).toBe('Newcoda, Inc.');
  });
});

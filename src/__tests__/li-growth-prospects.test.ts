import { describe, expect, it } from 'vitest';
import { normalizeProfileUrl, normalizePostUrl, isSafeLinkedInUrl, parseTargetCsv, firstName } from '@/lib/li-growth/prospects';

describe('li-growth prospect input', () => {
  it('normalizes profile URLs so one person is stored once', () => {
    const want = 'https://www.linkedin.com/in/jane-doe';
    for (const raw of [
      'https://www.linkedin.com/in/jane-doe/',
      'http://linkedin.com/in/Jane-Doe?utm_source=share',
      'linkedin.com/in/jane-doe',
      ' https://ca.linkedin.com/in/jane-doe/details/experience ',
    ]) {
      expect(normalizeProfileUrl(raw), raw).toBe(want);
    }
    expect(normalizeProfileUrl('https://www.linkedin.com/company/acme')).toBeNull();
    expect(normalizeProfileUrl('https://evil.example/in/jane')).toBeNull();
    expect(normalizeProfileUrl('https://linkedin.com.evil.example/in/jane')).toBeNull();
    expect(normalizeProfileUrl('javascript:alert(1)')).toBeNull();
  });

  it('normalizes post URLs and only allows https://www.linkedin.com to be opened', () => {
    expect(normalizePostUrl('https://linkedin.com/posts/jane-doe_cash-activity-123?utm=x')).toBe('https://www.linkedin.com/posts/jane-doe_cash-activity-123');
    expect(normalizePostUrl('https://www.linkedin.com/feed/update/urn:li:activity:123/')).toBe('https://www.linkedin.com/feed/update/urn:li:activity:123/');
    expect(normalizePostUrl('https://example.com/posts/1')).toBeNull();
    expect(isSafeLinkedInUrl('https://www.linkedin.com/in/jane-doe')).toBe(true);
    expect(isSafeLinkedInUrl('http://www.linkedin.com/in/jane-doe')).toBe(false);
    expect(isSafeLinkedInUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeLinkedInUrl(null)).toBe(false);
  });

  it('parses a CSV with aliases, quotes and per-row errors', () => {
    const csv = [
      'Name,LinkedIn URL,Title,Company,Country,Source,Employees,Degree,Post excerpt',
      'Jane Doe,https://www.linkedin.com/in/jane-doe,Fractional CFO,"Doe Advisory, LLC",US,watchlist_engager,8,1,"We are hiring, finally."',
      'No Url,,Owner,Acme,US,,,,',
      'Dup,linkedin.com/in/jane-doe,Owner,Acme,US,,,,',
      'Sam Roe,https://www.linkedin.com/in/sam-roe,Owner,,US,,,,',
      'Ann Lee,https://www.linkedin.com/in/ann-lee,COO,Lee HVAC,Canada,weird_source,abc,7,',
    ].join('\n');
    const { rows, errors } = parseTargetCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      name: 'Jane Doe', company: 'Doe Advisory, LLC', headline: 'Fractional CFO', source: 'watchlist_engager', employees: 8,
      connection_degree: 1, post_excerpt: 'We are hiring, finally.', signal_type: 'their_post',
    });
    expect(rows[1]).toMatchObject({ name: 'Ann Lee', source: 'csv', employees: null, connection_degree: null, country: 'Canada', signal_type: null });
    expect(errors).toEqual(['line 3: not a LinkedIn profile URL', 'line 4: duplicate of an earlier row', 'line 5: missing company']);
  });

  it('requires the name, linkedin_url and company columns', () => {
    expect(parseTargetCsv('name,company\nJane,Acme').errors[0]).toMatch(/linkedin_url/);
    expect(firstName('  Jane  Doe ')).toBe('Jane');
  });
});

describe('li-growth import fills what the queue needs (2026-11-03)', () => {
  it('keeps the case of member-id profile URLs, lowercases vanity slugs', () => {
    expect(normalizeProfileUrl('https://www.linkedin.com/in/ACoAABqvocB3jXyZ12')).toBe('https://www.linkedin.com/in/ACoAABqvocB3jXyZ12');
    expect(normalizeProfileUrl('https://www.linkedin.com/in/Lisa-Gering-CPA')).toBe('https://www.linkedin.com/in/lisa-gering-cpa');
  });

  it('applies the default country, post age and weekly flag', () => {
    const { rows } = parseTargetCsv(
      'name,linkedin_url,company,post_excerpt,post_days_ago,posts_weekly\nJane,https://www.linkedin.com/in/jane,Doe CFO,Cash post,2,yes\nAnn,https://www.linkedin.com/in/ann,Lee CFO,,,',
      { defaultCountry: 'US' },
    );
    expect(rows[0]).toMatchObject({ country: 'US', post_days_ago: 2, posts_weekly: true, signal_type: 'their_post' });
    expect(rows[1]).toMatchObject({ country: 'US', post_days_ago: 0, posts_weekly: false, signal_type: null });
  });

  it('a country in the row wins over the default', () => {
    const { rows } = parseTargetCsv('name,linkedin_url,company,country\nJane,https://www.linkedin.com/in/jane,Doe,Canada', { defaultCountry: 'US' });
    expect(rows[0].country).toBe('Canada');
  });
});

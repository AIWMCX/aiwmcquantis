/**
 * Sending-domain authentication check for the business mailbox.
 *
 * Found 2026-09-28: aiwmcquantis.com receives mail at Zoho (MX mx.zoho.com)
 * and publishes DMARC p=reject, but its SPF record does not include Zoho and
 * no Zoho DKIM key is published. Mail sent from the Zoho mailbox therefore
 * fails both SPF and DKIM alignment and receivers are told to reject it.
 * The paced sender refuses to send until this check passes.
 *
 * `evaluateDns` is pure (tested); `checkDomainDns` does the DNS-over-HTTPS
 * lookups.
 */

export interface DnsRecords {
  mx: string[];
  spf: string | null;
  dmarc: string | null;
  dkim: string | null;
}

export interface DnsHealth {
  ready: boolean;
  checks: Array<{ id: 'mx' | 'spf' | 'dkim' | 'dmarc'; ok: boolean; detail: string; fix?: string }>;
  records: DnsRecords;
}

export function evaluateDns(r: DnsRecords, domain: string, dkimSelector: string): DnsHealth {
  const mxOk = r.mx.some((m) => /(^|\.)zoho\.(com|eu|in|com\.au|jp|com\.cn)\.?$/i.test(m.split(/\s+/).pop() ?? ''));
  const spfOk = !!r.spf && /include:(zoho\.(com|eu|in|com\.au|jp)|zohomail\.\w+|spf\.zoho\.\w+|one\.zoho\.\w+)/i.test(r.spf);
  const dkimOk = !!r.dkim && /(^|;)\s*p=[A-Za-z0-9+/=]{40,}/.test(r.dkim.replace(/"\s*"/g, ''));
  const dmarcOk = !!r.dmarc && /^v=DMARC1/i.test(r.dmarc);
  const lookups = r.spf ? (r.spf.match(/\b(include|a|mx|ptr|exists|redirect)[:=]/gi) ?? []).length : 0;
  const checks: DnsHealth['checks'] = [
    { id: 'mx', ok: mxOk, detail: mxOk ? `MX → ${r.mx.join(', ')}` : `MX is ${r.mx.join(', ') || 'missing'}; business mail is not received by Zoho` },
    {
      id: 'spf',
      ok: spfOk,
      detail: spfOk ? `SPF includes Zoho (${lookups} lookup mechanisms)` : `SPF does not authorize Zoho: ${r.spf ?? 'no SPF record'}`,
      fix: spfOk ? undefined : `Replace the TXT at ${domain} with: v=spf1 include:zohomail.com include:_spf.google.com ~all (keep other includes only for services that really send as @${domain}; stay under 10 DNS lookups)`,
    },
    {
      id: 'dkim',
      ok: dkimOk,
      detail: dkimOk ? `DKIM key published at ${dkimSelector}._domainkey` : `No DKIM key at ${dkimSelector}._domainkey.${domain}`,
      fix: dkimOk ? undefined : `Zoho Mail Admin → Domains → ${domain} → Email Configuration → DKIM → add selector "${dkimSelector}", publish the TXT it shows at ${dkimSelector}._domainkey.${domain}, then click Verify`,
    },
    { id: 'dmarc', ok: dmarcOk, detail: dmarcOk ? r.dmarc! : 'No DMARC record' },
  ];
  if (spfOk && lookups > 10) {
    checks[1] = { ...checks[1], ok: false, detail: `SPF has ${lookups} lookup mechanisms (limit 10) — receivers treat it as a permanent error` };
  }
  return { ready: checks.every((c) => c.ok), checks, records: r };
}

async function doh(name: string, type: 'MX' | 'TXT'): Promise<string[]> {
  const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`, {
    headers: { accept: 'application/dns-json' },
  });
  if (!res.ok) throw new Error(`DNS lookup ${type} ${name} failed: HTTP ${res.status}`);
  const json = await res.json() as { Answer?: Array<{ type: number; data: string }> };
  const want = type === 'MX' ? 15 : 16;
  return (json.Answer ?? []).filter((a) => a.type === want).map((a) => a.data.replace(/^"|"$/g, '').replace(/"\s*"/g, ''));
}

export async function checkDomainDns(domain: string, dkimSelector: string): Promise<DnsHealth> {
  const [mx, rootTxt, dmarcTxt, dkimTxt] = await Promise.all([
    doh(domain, 'MX'),
    doh(domain, 'TXT'),
    doh(`_dmarc.${domain}`, 'TXT'),
    doh(`${dkimSelector}._domainkey.${domain}`, 'TXT'),
  ]);
  return evaluateDns(
    {
      mx,
      spf: rootTxt.find((t) => /^v=spf1/i.test(t)) ?? null,
      dmarc: dmarcTxt.find((t) => /^v=DMARC1/i.test(t)) ?? null,
      dkim: dkimTxt.find((t) => /p=/.test(t)) ?? null,
    },
    domain,
    dkimSelector,
  );
}

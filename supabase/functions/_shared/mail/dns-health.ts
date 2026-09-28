/**
 * Business-mail DNS check for the IONOS-hosted mailboxes.
 *
 * Found 2026-09-28: the mailboxes the founder uses (Outlook → IONOS Mail
 * Basic) are at IONOS, and SPF already authorizes IONOS (so mail sent from
 * them passes DMARC p=reject via aligned SPF). But MX still pointed to Zoho,
 * so replies to hello@ / market@ never reached those mailboxes. The paced
 * sender refuses to send cold email while replies can't come back.
 *
 * Required: MX → IONOS, SPF authorizes IONOS (≤10 lookup mechanisms), DMARC
 * present. DKIM is recommended, not required (DMARC passes on aligned SPF).
 * `evaluateDns` is pure (tested); `checkDomainDns` does the lookups.
 */

export interface DnsRecords {
  mx: string[];
  spf: string | null;
  dmarc: string | null;
  dkim: string | null;
}

export interface DnsCheck {
  id: 'mx' | 'spf' | 'dkim' | 'dmarc';
  ok: boolean;
  required: boolean;
  detail: string;
  fix?: string;
}

export interface DnsHealth {
  ready: boolean;
  checks: DnsCheck[];
  records: DnsRecords;
}

const IONOS_MX = /(^|\.)(ionos\.(com|de|co\.uk|es|fr|it|mx|ca|at)|kundenserver\.de|perfora\.net)\.?$/i;
const IONOS_SPF = /include:(_spf(-us|-eu)?\.ionos\.\w+|_spf\.perfora\.net|_spf\.kundenserver\.de)\b/i;

export function evaluateDns(r: DnsRecords, domain: string, dkimSelector: string): DnsHealth {
  const mxHosts = r.mx.map((m) => m.split(/\s+/).pop() ?? '');
  const mxOk = mxHosts.length > 0 && mxHosts.every((h) => IONOS_MX.test(h));
  const lookups = r.spf ? (r.spf.match(/\b(include|a|mx|ptr|exists|redirect)[:=]/gi) ?? []).length : 0;
  const spfOk = !!r.spf && IONOS_SPF.test(r.spf) && lookups <= 10;
  const dkimOk = !!r.dkim && /(^|;)\s*p=[A-Za-z0-9+/=]{40,}/.test(r.dkim.replace(/"\s*"/g, ''));
  const dmarcOk = !!r.dmarc && /^v=DMARC1/i.test(r.dmarc);
  const checks: DnsCheck[] = [
    {
      id: 'mx',
      ok: mxOk,
      required: true,
      detail: mxOk ? `MX → ${mxHosts.join(', ')}` : `MX is ${mxHosts.join(', ') || 'missing'} — replies to hello@/market@ do not reach the IONOS mailboxes you use in Outlook`,
      fix: mxOk ? undefined : `IONOS → Domains & SSL → ${domain} → DNS: delete the three Zoho MX records (mx.zoho.com, mx2.zoho.com, mx3.zoho.com) and add MX mx00.ionos.com (priority 10) and MX mx01.ionos.com (priority 10) for host @. Or use IONOS "Reset mail records to default".`,
    },
    {
      id: 'spf',
      ok: spfOk,
      required: true,
      detail: spfOk ? `SPF authorizes IONOS (${lookups} lookup mechanisms)` : !r.spf ? 'No SPF record' : lookups > 10 ? `SPF has ${lookups} lookup mechanisms (limit 10)` : `SPF does not authorize IONOS: ${r.spf}`,
      fix: spfOk ? undefined : `TXT @: v=spf1 include:_spf-us.ionos.com include:_spf.perfora.net include:_spf.kundenserver.de ~all (add other senders only if they really send as @${domain})`,
    },
    {
      id: 'dmarc',
      ok: dmarcOk,
      required: true,
      detail: dmarcOk ? r.dmarc! : 'No DMARC record',
    },
    {
      id: 'dkim',
      ok: dkimOk,
      required: false,
      detail: dkimOk ? `DKIM key published at ${dkimSelector}._domainkey` : `Recommended: no DKIM key at ${dkimSelector}._domainkey.${domain} (mail still passes DMARC via SPF)`,
      fix: dkimOk ? undefined : `IONOS → Email → Settings → DKIM: enable DKIM for ${domain} (IONOS publishes s1-ionos/s2-ionos records when its DNS is used).`,
    },
  ];
  return { ready: checks.every((c) => c.ok || !c.required), checks, records: r };
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

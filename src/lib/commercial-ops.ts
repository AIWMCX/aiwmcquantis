/**
 * Commercial Ops -- pure client helpers (CSV lead import + cold-sequence
 * timing). Kept free of React/Supabase so they are unit-testable.
 *
 * SEQUENCE_DAYS must match SEQUENCE_STEPS in
 * supabase/functions/_shared/commercial/stages/follow-up.ts.
 */
import { followupOrderCheck } from '../../supabase/functions/_shared/mail/followup-order';

export const SEQUENCE_DAYS: Record<number, number> = { 2: 3, 3: 7, 4: 14 };

export interface ImportRow {
  company_name: string;
  contact_name?: string;
  contact_role?: string;
  email?: string;
  website?: string;
  segment?: string;
  signals?: string;
}

const HEADER_ALIASES: Record<string, keyof ImportRow> = {
  company: 'company_name',
  company_name: 'company_name',
  firm: 'company_name',
  name: 'contact_name',
  contact: 'contact_name',
  contact_name: 'contact_name',
  first_name: 'contact_name',
  role: 'contact_role',
  title: 'contact_role',
  contact_role: 'contact_role',
  email: 'email',
  contact_channel: 'email',
  website: 'website',
  domain: 'website',
  segment: 'segment',
  signals: 'signals',
  signal: 'signals',
  observed_signals: 'signals',
  notes: 'signals',
};

/** Splits one CSV/TSV line, honoring double-quoted fields with "" escapes. */
function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseProspectCsv(text: string): { rows: ImportRow[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { rows: [], errors: [] };
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const header = splitLine(lines[0], sep).map((h) => HEADER_ALIASES[h.toLowerCase().replace(/[\s-]+/g, '_')]);
  const errors: string[] = [];
  if (!header.includes('company_name')) {
    return { rows: [], errors: ['header row must include company_name (or company)'] };
  }
  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i], sep);
    const row: Partial<ImportRow> = {};
    header.forEach((key, idx) => {
      if (!key) return;
      const v = cells[idx]?.trim();
      if (!v) return;
      row[key] = row[key] ? `${row[key]} | ${v}` : v;
    });
    if (!row.company_name) { errors.push(`line ${i + 1}: missing company`); continue; }
    rows.push(row as ImportRow);
  }
  return { rows, errors };
}

interface SeqProspect { id: string; stage: string; suppression_status: string }
interface SeqFollowup { prospect_id: string; status: string; sequence_step: number | null; sent_at: string | null; kind: string }

/**
 * Which contacted, unanswered prospects have their next cold-sequence step
 * due. Anchored on the first-touch send time; a step already drafted
 * (draft/approved/sent) is never proposed twice, and step n is proposed only
 * after step n-1 was actually sent and the last email is at least
 * MIN_DAYS_BETWEEN_TOUCHES old (same rule the sender enforces).
 */
export function sequenceDue<P extends SeqProspect>(
  prospects: P[],
  followups: SeqFollowup[],
  now: Date = new Date(),
): Array<{ prospect: P; step: number; day: number }> {
  const out: Array<{ prospect: P; step: number; day: number }> = [];
  for (const p of prospects) {
    if (p.stage !== 'contacted' || p.suppression_status !== 'active') continue;
    const mine = followups.filter((f) => f.prospect_id === p.id);
    const first = mine.find((f) => f.kind === 'first_touch' && f.status === 'sent' && f.sent_at);
    if (!first) continue;
    const taken = new Set(mine.filter((f) => f.status !== 'rejected' && f.sequence_step).map((f) => f.sequence_step as number));
    const next = [2, 3, 4].find((s) => !taken.has(s));
    if (!next) continue;
    const days = (now.getTime() - new Date(first.sent_at as string).getTime()) / 86_400_000;
    if (!followupOrderCheck(next, mine, now).ok) continue;
    if (days >= SEQUENCE_DAYS[next]) out.push({ prospect: p, step: next, day: SEQUENCE_DAYS[next] });
  }
  return out;
}

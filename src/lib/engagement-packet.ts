/**
 * Renders a paid engagement's submitted brief (intake + workspace data) into
 * a clean, printable HTML document. Shared by the customer-facing "download
 * your brief" button (PaidWorkspace.tsx, no intake data — customers don't
 * see their own raw intake fields twice) and the founder-facing admin packet
 * (PaidEngagements.tsx, full intake + workspace so the founder has the real
 * input needed to actually do the analysis, not just a stub).
 *
 * This is deliberately NOT an "engine-backed decision packet" — it renders
 * exactly what was submitted, with no calculation or recommendation. The
 * actual analysis/memo is produced separately via usePdfExport once the
 * founder links a real analysis_id (see PaidEngagements.tsx).
 */

export interface PacketAssumption {
  label: string;
  value: string;
  type: string;
  source: string;
  confidence: string;
  notes: string;
}

export interface PacketScenario {
  name: string;
  revenue: string;
  costs: string;
  cash: string;
  trigger: string;
  notes: string;
}

export interface PacketCase {
  case_name: string;
  client_type: string;
  decision_question: string;
  deadline: string;
  context: string;
  assumptions: PacketAssumption[];
  scenarios: PacketScenario[];
}

export interface BuildEngagementPacketInput {
  offerName: string;
  contactName: string;
  contactEmail?: string | null;
  companyName?: string | null;
  generatedAt: string;
  decisionSummary?: string;
  constraints?: string;
  assumptions?: PacketAssumption[];
  scenarios?: PacketScenario[];
  questions?: string[];
  cases?: PacketCase[];
  /** Founder-only: the raw intake_data fields (never shown to the customer). */
  intake?: Record<string, unknown> | null;
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function section(title: string, bodyHtml: string): string {
  if (!bodyHtml.trim()) return '';
  return `<section style="margin-top:24px;"><h2 style="font-size:15px;text-transform:uppercase;letter-spacing:0.06em;color:#555;border-bottom:1px solid #ddd;padding-bottom:6px;">${esc(title)}</h2>${bodyHtml}</section>`;
}

function assumptionsTable(rows: PacketAssumption[]): string {
  if (!rows.length) return '<p style="color:#888;">None recorded.</p>';
  const body = rows.map((r) => `
    <tr>
      <td style="padding:6px 10px;border:1px solid #e2e2e2;">${esc(r.label)}</td>
      <td style="padding:6px 10px;border:1px solid #e2e2e2;">${esc(r.value)}</td>
      <td style="padding:6px 10px;border:1px solid #e2e2e2;">${esc(r.type)}</td>
      <td style="padding:6px 10px;border:1px solid #e2e2e2;">${esc(r.confidence)}</td>
      <td style="padding:6px 10px;border:1px solid #e2e2e2;">${esc(r.source)}</td>
      <td style="padding:6px 10px;border:1px solid #e2e2e2;">${esc(r.notes)}</td>
    </tr>`).join('');
  return `<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12.5px;">
    <thead><tr>${['Assumption', 'Value', 'Type', 'Confidence', 'Source', 'Notes'].map((h) => `<th style="text-align:left;padding:6px 10px;border:1px solid #e2e2e2;background:#f6f6f6;">${h}</th>`).join('')}</tr></thead>
    <tbody>${body}</tbody></table>`;
}

function scenariosGrid(rows: PacketScenario[]): string {
  if (!rows.length) return '<p style="color:#888;">None recorded.</p>';
  return `<div style="display:flex;gap:12px;margin-top:8px;flex-wrap:wrap;">${rows.map((r) => `
    <div style="flex:1;min-width:150px;border:1px solid #e2e2e2;border-radius:8px;padding:12px;">
      <p style="font-weight:600;margin:0 0 8px;">${esc(r.name || 'Scenario')}</p>
      <p style="margin:4px 0;font-size:12.5px;"><strong>Revenue/mo:</strong> ${esc(r.revenue) || '—'}</p>
      <p style="margin:4px 0;font-size:12.5px;"><strong>Costs/mo:</strong> ${esc(r.costs) || '—'}</p>
      <p style="margin:4px 0;font-size:12.5px;"><strong>Cash/runway:</strong> ${esc(r.cash) || '—'}</p>
      <p style="margin:8px 0 0;font-size:12.5px;color:#555;">${esc(r.trigger) || ''}</p>
    </div>`).join('')}</div>`;
}

function caseBlock(c: PacketCase, index: number): string {
  return `<div style="margin-top:20px;padding:16px;border:1px solid #d8d8d8;border-radius:10px;">
    <h3 style="margin:0 0 6px;font-size:16px;">Case ${index + 1}${c.case_name ? ' — ' + esc(c.case_name) : ''}</h3>
    ${c.client_type ? `<p style="margin:2px 0;font-size:13px;color:#555;">Client type: ${esc(c.client_type)}</p>` : ''}
    ${c.deadline ? `<p style="margin:2px 0;font-size:13px;color:#555;">Deadline: ${esc(c.deadline)}</p>` : ''}
    <p style="margin:10px 0 0;white-space:pre-wrap;">${esc(c.decision_question) || 'No decision question recorded.'}</p>
    ${c.context ? `<p style="margin:10px 0 0;white-space:pre-wrap;color:#444;">${esc(c.context)}</p>` : ''}
    ${section('Assumptions', assumptionsTable(c.assumptions))}
    ${section('Scenarios', scenariosGrid(c.scenarios))}
  </div>`;
}

function intakeFieldsTable(intake: Record<string, unknown>): string {
  const labels: Record<string, string> = {
    deadline: 'Deadline', client_type: 'Client type', website: 'Website', industry: 'Industry',
    current_situation: 'Current situation', financial_context: 'Financial context', what_tried: 'What was already tried',
    assumptions: 'Stated assumptions', desired_outcome: 'Desired outcome', document_links: 'Document links',
    additional_notes: 'Additional notes', founder_context: 'Founder context', primary_concern: 'Primary concern',
    specific_questions: 'Specific questions', preferred_contact_email: 'Preferred contact email',
  };
  const rows = Object.entries(labels)
    .map(([key, label]) => [label, intake[key]] as const)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '');
  if (!rows.length) return '';
  return `<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:12.5px;">
    <tbody>${rows.map(([label, value]) => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #e2e2e2;background:#f6f6f6;width:220px;vertical-align:top;">${esc(label)}</td>
        <td style="padding:6px 10px;border:1px solid #e2e2e2;white-space:pre-wrap;">${esc(String(value))}</td>
      </tr>`).join('')}</tbody></table>`;
}

export function buildEngagementPacketHtml(input: BuildEngagementPacketInput): string {
  const generated = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(input.generatedAt));
  const header = `
    <div style="border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:8px;">
      <p style="text-transform:uppercase;letter-spacing:0.08em;font-size:11px;color:#777;margin:0;">${esc(input.offerName)} · Submitted brief</p>
      <h1 style="font-size:24px;margin:6px 0 0;">${esc(input.companyName) || esc(input.contactName)}</h1>
      <p style="font-size:12.5px;color:#666;margin:6px 0 0;">
        ${esc(input.contactName)}${input.contactEmail ? ' · ' + esc(input.contactEmail) : ''} · generated ${esc(generated)}
      </p>
    </div>`;

  const founderBody = input.decisionSummary || input.constraints
    ? `${section('Decision', `<p style="white-space:pre-wrap;">${esc(input.decisionSummary) || '<span style="color:#888;">Not yet recorded.</span>'}</p>`)}
       ${section('Constraints & non-negotiables', input.constraints ? `<p style="white-space:pre-wrap;">${esc(input.constraints)}</p>` : '')}
       ${section('Assumption register', assumptionsTable(input.assumptions || []))}
       ${section('Scenario board', scenariosGrid(input.scenarios || []))}`
    : '';

  const casesBody = (input.cases || []).map((c, i) => caseBlock(c, i)).join('');

  const questionsBody = (input.questions || []).filter(Boolean).length
    ? `<ul style="margin:8px 0 0;padding-left:20px;">${(input.questions || []).filter(Boolean).map((q) => `<li style="margin:4px 0;">${esc(q)}</li>`).join('')}</ul>`
    : '';

  const intakeBody = input.intake ? intakeFieldsTable(input.intake) : '';

  return `${header}
    ${founderBody}
    ${casesBody}
    ${section('Review agenda', questionsBody)}
    ${section('Full intake responses', intakeBody)}
    <p style="margin-top:32px;font-size:11px;color:#999;">This document reflects exactly what was submitted — it contains no calculation, benchmark, or recommendation.</p>`;
}

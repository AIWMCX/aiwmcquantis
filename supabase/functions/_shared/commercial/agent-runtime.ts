import { MARKETING_SYSTEM_PROMPT } from '../marketing-principles.ts';
/**
 * Commercial Ops workflow Phase D: the ONE shared agent runtime.
 *
 * Spec section 11 explicitly forbids "six arbitrary AI implementations" and
 * requires one shared commercial-agent runtime/service with specialized
 * stage contracts instead. This is that runtime.
 *
 * Reuses, rather than duplicates:
 *   - llm-call.ts's aiCall() for the actual provider call (Dahl -> DeepSeek
 *     -> Anthropic fallback chain, timeout handling, provider-error typing,
 *     ai_calls telemetry -- all inherited for free).
 *   - r3-validator.ts's r3Validate() for schema validation + one repair
 *     attempt + typed rejection (schema/reconcile/empty) -- the same
 *     mechanism every other structured-LLM-output caller in this codebase
 *     already uses.
 *
 * What this file adds on top: a commercial-workflow-specific audit trail
 * (public.commercial_agent_runs) distinct from the generic ai_calls table --
 * one row per stage invocation, written whether the call succeeded or was
 * rejected, so every agent-generated artifact is traceable to the exact
 * foundation version and input context that produced it (spec section 11:
 * "source/evidence tracking, logging").
 */
import { z } from 'npm:zod@3.23.8';
import { aiCall, type GatewayMessage } from '../llm-call.ts';
import { r3Validate, type R3Reconciler } from '../r3-validator.ts';

// Only the AI-generative stages get a runtime invocation. Funnel/outcome are
// plain state transitions (their own tables/logic land in Phase E) -- never
// routed through here, so they are deliberately excluded from this union.
export const COMMERCIAL_AGENT_STAGES = [
  'offer',
  'prospecting',
  'call_preparation',
  'objection_handling',
  'follow_up',
  'first_touch',
] as const;
export type CommercialAgentStage = (typeof COMMERCIAL_AGENT_STAGES)[number];

export interface CommercialAgentRunArgs<T> {
  stage: CommercialAgentStage;
  /** commercial_foundations.version this run was generated against -- always the CURRENT version at call time (fetch via get_commercial_foundation() first). */
  foundationVersion: number;
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T>;
  reconcile?: R3Reconciler<T>;
  adminUserId?: string | null;
  requestId?: string | null;
  /**
   * Caller-supplied context persisted to the audit row for traceability
   * (evidence refs, prospect id, prior stage outputs, etc). Never put
   * secrets or raw credentials here -- commercial_agent_runs is admin-
   * readable, not encrypted at the application layer.
   */
  inputContext?: Record<string, unknown>;
  timeoutMs?: number;
  /**
   * Hard cap on total LLM attempts for this stage invocation (1 initial call
   * + up to maxAttempts-1 corrective retries). Never unbounded -- a stage
   * that keeps failing validation fails cleanly as a typed rejection once
   * this cap is reached, it never loops forever. Defaults to 3 (1 initial +
   * 2 retries): a small fixed retry budget rather than either "no retry" or
   * "retry forever".
   */
  maxAttempts?: number;
}

export type CommercialAgentRunResult<T> =
  | { ok: true; data: T; repaired: boolean; runId: string | null }
  | {
      ok: false;
      reason: 'schema' | 'reconcile' | 'empty' | 'provider_error';
      detail: string;
      raw_preview: string;
      runId: string | null;
    };

const DEFAULT_TIMEOUT_MS = 30_000;
const RAW_PREVIEW_LEN = 240;
const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * Runs one commercial-workflow stage through the shared LLM + validation
 * pipeline, and writes exactly one audit row to commercial_agent_runs
 * regardless of outcome. Never throws -- a provider failure or a validation
 * rejection both come back as a typed `{ ok: false, ... }` result, matching
 * r3Validate's own never-throws contract.
 *
 * Guardrail + bounded retry (added on top of r3Validate's own single
 * JSON-repair pass): r3Validate only fixes malformed JSON syntax -- it never
 * re-asks the model for content that parses but fails schema or reconcile
 * (domain-invariant) checks. That used to mean any such failure was a
 * same-attempt, permanent rejection. Now, when validation fails for a reason
 * a corrective re-prompt can plausibly fix (schema or reconcile -- never
 * 'empty', which means the model returned nothing and a near-identical retry
 * is unlikely to help), the exact validation error is fed back to the model
 * as an additional turn and the call is retried, up to `maxAttempts`
 * (default 3: 1 initial + 2 corrective retries) total attempts. This is a
 * HARD cap, not a while-loop: the loop bound is fixed before the first call
 * and cannot grow at runtime, so a stage that keeps failing validation
 * always terminates in a clean typed rejection rather than looping
 * indefinitely or silently accepting invalid output. A provider_error
 * (timeout/rate-limit/config/network) is never retried either -- a
 * corrective re-prompt can't fix a down or rate-limited provider, and
 * retrying identical input against it would only burn cost and latency for
 * the same outcome.
 */
export async function runCommercialAgent<T>(
  args: CommercialAgentRunArgs<T>,
): Promise<CommercialAgentRunResult<T>> {
  const maxAttempts = Math.max(1, args.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const messages: GatewayMessage[] = [
    { role: 'system', content: `${args.systemPrompt}\n\n${MARKETING_SYSTEM_PROMPT}` },
    { role: 'user', content: args.userPrompt },
  ];

  let attempt = 0;

  while (true) {
    attempt += 1;
    const result = await aiCall(
      {
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.2,
      },
      {
        task: `commercial:${args.stage}`,
        userId: args.adminUserId ?? null,
        requestId: args.requestId ?? null,
        timeoutMs: args.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        metadata: { stage: args.stage, foundation_version: args.foundationVersion, attempt, max_attempts: maxAttempts },
      },
    );

    if (!result.ok) {
      const runId = await recordAgentRun({
        stage: args.stage,
        foundationVersion: args.foundationVersion,
        inputContext: { ...(args.inputContext ?? {}), attempt, max_attempts: maxAttempts },
        ok: false,
        rejectionReason: 'provider_error',
        rawPreview: result.message.slice(0, RAW_PREVIEW_LEN),
        output: null,
        model: null,
        latencyMs: result.latencyMs,
        repaired: false,
        adminUserId: args.adminUserId ?? null,
      });
      return { ok: false, reason: 'provider_error', detail: result.message, raw_preview: '', runId };
    }

    const choices = result.data.choices as Array<{ message?: { content?: string } }> | undefined;
    const rawContent = choices?.[0]?.message?.content ?? '';
    const model = (result.data.model as string | undefined) ?? null;

    const validated = r3Validate(rawContent, args.schema, args.reconcile);

    const isLastAttempt = attempt >= maxAttempts;
    // 'empty' means the model returned nothing at all -- a corrective
    // re-prompt has no new information to add, so don't burn a retry on it.
    const canRetry = !validated.ok && validated.reason !== 'empty' && !isLastAttempt;

    if (!validated.ok && canRetry) {
      // Feed the exact validation failure back to the model as corrective
      // feedback and retry, rather than silently accepting invalid output
      // or giving up on the first miss.
      messages.push({ role: 'assistant', content: rawContent.slice(0, RAW_PREVIEW_LEN) || '(empty response)' });
      messages.push({
        role: 'user',
        content: `Your previous response was rejected: [${validated.reason}] ${validated.detail}. Correct this and respond again with ONLY a single valid JSON object matching the required schema.`,
      });
      continue;
    }

    const runId = await recordAgentRun({
      stage: args.stage,
      foundationVersion: args.foundationVersion,
      inputContext: { ...(args.inputContext ?? {}), attempts_used: attempt, max_attempts: maxAttempts },
      ok: validated.ok,
      rejectionReason: validated.ok ? null : validated.reason,
      rawPreview: validated.ok ? null : validated.raw_preview,
      output: validated.ok ? (validated.data as Record<string, unknown>) : null,
      model,
      latencyMs: result.latencyMs,
      repaired: validated.ok ? validated.repaired : validated.repair_attempted,
      adminUserId: args.adminUserId ?? null,
    });

    if (!validated.ok) {
      return { ok: false, reason: validated.reason, detail: validated.detail, raw_preview: validated.raw_preview, runId };
    }
    return { ok: true, data: validated.data, repaired: validated.repaired, runId };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit log write — best-effort, never blocks or throws (same telemetry
// contract as llm-call.ts's recordAiCall), but distinct table: this is the
// commercial-workflow stage trail, not generic provider telemetry.
// ─────────────────────────────────────────────────────────────────────────────

interface RecordArgs {
  stage: CommercialAgentStage;
  foundationVersion: number;
  inputContext: Record<string, unknown>;
  ok: boolean;
  rejectionReason: string | null;
  rawPreview: string | null;
  output: Record<string, unknown> | null;
  model: string | null;
  latencyMs: number;
  repaired: boolean;
  adminUserId: string | null;
}

export interface AgentRunRowShape {
  ok: boolean;
  rejectionReason: string | null;
  output: Record<string, unknown> | null;
}

/**
 * Mirrors commercial_agent_runs_ok_consistency_chk exactly: a run is either
 * a validated success (output present, no rejection) or a typed rejection
 * (reason present, output absent) -- never both, never neither. Kept as an
 * exported, independently-unit-testable guard so a future refactor that
 * drifts from the DB constraint fails loudly in a fast local test instead of
 * as an opaque Postgres 23514 violation discovered only in production.
 */
export function isConsistentAgentRunRow(row: AgentRunRowShape): boolean {
  if (row.ok) return row.rejectionReason === null && row.output !== null;
  return row.rejectionReason !== null && row.output === null;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

async function recordAgentRun(args: RecordArgs): Promise<string | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  if (!isConsistentAgentRunRow({ ok: args.ok, rejectionReason: args.rejectionReason, output: args.output })) {
    // A bug upstream, not a runtime condition -- refuse to send a row
    // Postgres would reject anyway, and say exactly why in the logs.
    console.warn(`[commercial_agent_runs] refused to insert inconsistent row for stage=${args.stage}`);
    return null;
  }
  try {
    const row = {
      stage: args.stage,
      foundation_version: args.foundationVersion,
      input_context: args.inputContext,
      ok: args.ok,
      rejection_reason: args.rejectionReason,
      raw_preview: args.rawPreview,
      output: args.output,
      model: args.model,
      latency_ms: Number.isFinite(args.latencyMs) ? Math.round(args.latencyMs) : null,
      repaired: args.repaired,
      admin_user_id: args.adminUserId,
    };
    const resp = await fetch(`${SUPABASE_URL}/rest/v1/commercial_agent_runs`, {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(row),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.warn(`[commercial_agent_runs] insert failed (${resp.status}): ${detail.slice(0, 300)}`);
      return null;
    }
    const inserted = (await resp.json().catch(() => null)) as Array<{ id?: unknown }> | null;
    const id = inserted?.[0]?.id;
    return typeof id === 'string' ? id : null;
  } catch {
    // Audit-log write must never block the caller from getting its result.
    return null;
  }
}


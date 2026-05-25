/**
 * Service Job Quoting — client-side data-access layer ("API").
 *
 * In this SPA architecture, the "API" is supabase-js over RLS-protected
 * tables. Authentication and ownership checks are enforced by Postgres RLS
 * policies on `service_jobs` and `service_job_outcomes`. The calculation
 * engine (`src/lib/service-job/calculator.ts`) is pure browser TypeScript,
 * so quote generation runs client-side; the persisted `quote_result` is
 * the audit record.
 *
 * Endpoints (mapped from the Prompt-4 spec):
 *   listJobs              ≈ GET    /api/service-job
 *   createJob             ≈ POST   /api/service-job
 *   getJob                ≈ GET    /api/service-job/[id]
 *   updateJob             ≈ PATCH  /api/service-job/[id]
 *   deleteJob             ≈ DELETE /api/service-job/[id]
 *   computeAndSaveQuote   ≈ POST   /api/service-job/[id]/quote
 *   recordOutcome         ≈ POST   /api/service-job/[id]/outcome
 *   listAssemblies        ≈ GET    /api/service-job/assemblies
 *   (PDF: client-side via @react-pdf/renderer — see ServiceQuoteReport.tsx)
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { isEnabled } from '@/lib/flags';
import { calculateQuote, MC_ITERATIONS_DEFAULT } from '@/lib/service-job/calculator';
import type {
  JobModifiers,
  PricingProfile,
  QuoteResult,
  ScopeItem,
  ServiceJob,
  ServiceJobAssembly,
  ServiceJobOutcome,
  ServiceJobTrade,
} from '@/lib/service-job/types';
import {
  DEFAULT_PRICING_PROFILE,
  ServiceJobCreateSchema,
  ServiceJobOutcomeSchema,
  ServiceJobPatchSchema,
  type ServiceJobCreateInput,
  type ServiceJobOutcomeInput,
  type ServiceJobPatchInput,
} from '@/lib/service-job/schemas';

/** Structured event names. Centralized to avoid typos at call sites. */
const EVT = {
  CREATED: 'service_job.created',
  QUOTE_COMPUTED: 'service_job.quote_computed',
  PDF_GENERATED: 'service_job.pdf_generated',
  OUTCOME_RECORDED: 'service_job.outcome_recorded',
  ERROR: 'service_job.error',
} as const;

/** Log a structured failure for any service-job route. Never throws. */
function logFailure(route: string, err: unknown) {
  const errorClass = err instanceof Error ? err.constructor.name : typeof err;
  const message = err instanceof Error ? err.message : String(err);
  try {
    logger.error(EVT.ERROR, err instanceof Error ? err : new Error(message), {
      component: 'service-job',
      action: route,
      metadata: { route, error_class: errorClass },
    });
  } catch {
    /* logger must never break the request path */
  }
}

export class ServiceJobApiError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ServiceJobApiError';
  }
}

function ensureEnabled() {
  if (!isEnabled('service_job')) {
    throw new ServiceJobApiError('Service Job Quoting is not enabled.');
  }
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new ServiceJobApiError('Auth check failed', error);
  if (!data.user) throw new ServiceJobApiError('Not authenticated');
  return data.user.id;
}

// ── Trades & assemblies (public read; RLS allows authenticated select) ──

export async function listTrades(): Promise<ServiceJobTrade[]> {
  ensureEnabled();
  const { data, error } = await supabase
    .from('service_job_trades')
    .select('*')
    .order('display_name', { ascending: true });
  if (error) throw new ServiceJobApiError('Failed to load trades', error);
  return (data ?? []) as unknown as ServiceJobTrade[];
}

export async function listAssemblies(tradeId?: string): Promise<ServiceJobAssembly[]> {
  ensureEnabled();
  let q = supabase.from('service_job_assemblies').select('*').eq('active', true);
  if (tradeId) q = q.eq('trade_id', tradeId);
  const { data, error } = await q.order('name', { ascending: true });
  if (error) throw new ServiceJobApiError('Failed to load assemblies', error);
  return (data ?? []) as unknown as ServiceJobAssembly[];
}

// ── Jobs ──

export async function listJobs(limit = 50): Promise<ServiceJob[]> {
  ensureEnabled();
  await requireUserId();
  const { data, error } = await supabase
    .from('service_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new ServiceJobApiError('Failed to load jobs', error);
  return (data ?? []) as unknown as ServiceJob[];
}

export async function getJob(id: string): Promise<ServiceJob> {
  ensureEnabled();
  await requireUserId();
  const { data, error } = await supabase
    .from('service_jobs')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new ServiceJobApiError('Failed to load job', error);
  if (!data) throw new ServiceJobApiError('Job not found');
  return data as unknown as ServiceJob;
}

export async function createJob(input: Partial<ServiceJobCreateInput>): Promise<ServiceJob> {
  ensureEnabled();
  const user_id = await requireUserId();
  const merged: ServiceJobCreateInput = ServiceJobCreateSchema.parse({
    trade_id: input.trade_id ?? 'electrical',
    client_name: input.client_name ?? null,
    site_address: input.site_address ?? null,
    site_zip: input.site_zip ?? null,
    building_type: input.building_type ?? null,
    year_built: input.year_built ?? null,
    scope_items: input.scope_items ?? [],
    modifiers: input.modifiers ?? {},
    pricing_profile: input.pricing_profile ?? DEFAULT_PRICING_PROFILE,
  });
  try {
    const { data, error } = await supabase
      .from('service_jobs')
      .insert({ ...(merged as unknown as Record<string, unknown>), user_id, status: 'draft' } as never)
      .select('*')
      .single();
    if (error) throw new ServiceJobApiError('Failed to create job', error);
    logger.info(EVT.CREATED, {
      component: 'service-job',
      action: 'createJob',
      userId: user_id,
      metadata: { job_id: (data as { id: string }).id, trade_id: merged.trade_id },
    });
    return data as unknown as ServiceJob;
  } catch (err) {
    logFailure('createJob', err);
    throw err;
  }
}

export async function updateJob(
  id: string,
  patch: ServiceJobPatchInput,
): Promise<ServiceJob> {
  ensureEnabled();
  await requireUserId();
  const safe = ServiceJobPatchSchema.parse(patch);
  const { data, error } = await supabase
    .from('service_jobs')
    .update(safe as never)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new ServiceJobApiError('Failed to update job', error);
  return data as unknown as ServiceJob;
}

export async function deleteJob(id: string): Promise<void> {
  ensureEnabled();
  await requireUserId();
  const { error } = await supabase.from('service_jobs').delete().eq('id', id);
  if (error) throw new ServiceJobApiError('Failed to delete job', error);
}

// ── Quote computation ──

export async function computeAndSaveQuote(id: string): Promise<ServiceJob> {
  ensureEnabled();
  await requireUserId();
  try {
    const job = await getJob(id);
    const assemblies = await listAssemblies(job.trade_id);
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const result: QuoteResult = await calculateQuote(
      {
        trade_id: job.trade_id,
        scope_items: job.scope_items as ScopeItem[],
        modifiers: (job.modifiers ?? {}) as JobModifiers,
        pricing_profile: job.pricing_profile as PricingProfile,
        year_built: job.year_built,
        building_type: job.building_type,
        site_zip: job.site_zip,
      },
      assemblies,
    );
    const duration_ms = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0,
    );
    logger.info(EVT.QUOTE_COMPUTED, {
      component: 'service-job',
      action: 'computeAndSaveQuote',
      metadata: {
        job_id: id,
        trade_id: job.trade_id,
        duration_ms,
        iteration_count: MC_ITERATIONS_DEFAULT,
        scope_items: (job.scope_items ?? []).length,
        risk_count: result.risks.length,
      },
    });
    const { data, error } = await supabase
      .from('service_jobs')
      .update({ quote_result: result as unknown, status: 'quoted' } as never)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new ServiceJobApiError('Failed to save quote', error);
    return data as unknown as ServiceJob;
  } catch (err) {
    logFailure('computeAndSaveQuote', err);
    throw err;
  }
}

// ── Outcomes ──

export async function getOutcome(jobId: string): Promise<ServiceJobOutcome | null> {
  ensureEnabled();
  await requireUserId();
  const { data, error } = await supabase
    .from('service_job_outcomes')
    .select('*')
    .eq('job_id', jobId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ServiceJobApiError('Failed to load outcome', error);
  return (data ?? null) as unknown as ServiceJobOutcome | null;
}

export async function recordOutcome(
  jobId: string,
  outcome: ServiceJobOutcomeInput,
): Promise<ServiceJobOutcome> {
  ensureEnabled();
  await requireUserId();
  try {
    const safe = ServiceJobOutcomeSchema.parse(outcome);
    const { data, error } = await supabase
      .from('service_job_outcomes')
      .insert({ job_id: jobId, ...safe } as never)
      .select('*')
      .single();
    if (error) throw new ServiceJobApiError('Failed to record outcome', error);
    logger.info(EVT.OUTCOME_RECORDED, {
      component: 'service-job',
      action: 'recordOutcome',
      metadata: {
        job_id: jobId,
        has_actual_cost: safe.actual_total_cost != null,
        has_revenue: safe.actual_revenue != null,
      },
    });
    return data as unknown as ServiceJobOutcome;
  } catch (err) {
    logFailure('recordOutcome', err);
    throw err;
  }
}

/** Fire-and-forget structured event for client-side PDF generation. */
export function logPdfGenerated(jobId: string, durationMs?: number) {
  try {
    logger.info(EVT.PDF_GENERATED, {
      component: 'service-job',
      action: 'generatePdf',
      metadata: { job_id: jobId, duration_ms: durationMs },
    });
  } catch {
    /* never break the UI */
  }
}

/**
 * Server-side funnel event write, for events whose truth can only be known
 * server-side -- specifically, Stripe-webhook-confirmed subscription state
 * (activated/failed/cancelled). The client-side `recordFunnelEvent()`
 * (src/lib/analytics.ts) goes through the `record_funnel_event` RPC, which
 * hardcodes `auth.uid()` for attribution -- unusable from a service-role
 * edge function with no user JWT. This writes the table directly instead.
 *
 * Never blocks or throws -- matches this codebase's established telemetry
 * contract (ai_calls, commercial_agent_runs): a failed write here must
 * never affect the real billing/entitlement logic around it.
 *
 * Activation-to-revenue Wave 7 (PR D, 2026-09-27): confirmed via repo audit
 * that NO edge function previously wrote any funnel event -- subscription
 * state changes updated the `subscriptions` table with zero corresponding
 * telemetry, which is exactly the "checkout_completed must not be trusted
 * unless reconciled against server-side Stripe truth" gap the founder's
 * spec calls out. This is the reconciliation: subscription_activated/
 * failed/cancelled are ONLY ever written from here (stripe-webhook), never
 * from the client, so they are the trustworthy, Stripe-verified signal.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export async function recordServerFunnelEvent(
  eventName: 'subscription_activated' | 'subscription_failed' | 'subscription_cancelled',
  opts: { userId?: string | null; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  try {
    const svc = createClient(SUPABASE_URL, SERVICE_KEY);
    const { error } = await svc.from('funnel_events').insert({
      event_name: eventName,
      session_id: 'server:stripe-webhook',
      user_id: opts.userId ?? null,
      metadata: opts.metadata ?? {},
    });
    if (error) {
      console.warn(`[funnel_events] server insert failed for ${eventName}: ${error.message}`);
    }
  } catch (err) {
    console.warn(`[funnel_events] server insert threw for ${eventName}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

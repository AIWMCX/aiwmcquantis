/**
 * Feature flags (client-side).
 *
 * Read from Vite env. To enable in any environment, set:
 *   VITE_FLAG_SERVICE_JOB=true
 *
 * Default: disabled. Route components must call `isEnabled('service_job')`
 * before rendering and redirect / show 404 if the flag is off.
 */

type FlagKey = 'service_job' | 'commercial_workflow' | 'new_decision_v1';

const FLAG_ENV_KEYS: Record<FlagKey, string> = {
  service_job: 'VITE_FLAG_SERVICE_JOB',
  // Commercial Ops workflow (Phase F UI). Fails closed -- no default-ON
  // branch below, unlike service_job -- this is internal admin tooling,
  // not something that should light up unannounced (spec section 17).
  commercial_workflow: 'VITE_FLAG_COMMERCIAL_WORKFLOW',
  // Activation-to-revenue Wave 4: /app/new-decision intent-capture step.
  // Fails closed -- this changes where every first-time real user lands
  // after sign-in (via firstExperienceResolver's START_DECISION case), so
  // an absent env var must mean "unchanged existing behavior", not "on".
  new_decision_v1: 'VITE_FLAG_NEW_DECISION_V1',
};

function readEnv(key: string): string | undefined {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.[key];
}

export function isEnabled(flag: FlagKey): boolean {
  // Dev override: localStorage["flag:service_job"] = "1"
  try {
    if (typeof window !== 'undefined') {
      const ls = window.localStorage?.getItem(`flag:${flag}`);
      if (ls === '1' || ls === 'true') return true;
      if (ls === '0' || ls === 'false') return false;
    }
  } catch {
    /* SSR / private mode */
  }
  const raw = readEnv(FLAG_ENV_KEYS[flag]);
  if (raw) {
    if (raw === '1' || raw.toLowerCase() === 'true') return true;
    if (raw === '0' || raw.toLowerCase() === 'false') return false;
  }
  // Default-ON for service_job (Beta) so the feature is reachable from the sidebar
  // and at /quote without extra setup. Override with VITE_FLAG_SERVICE_JOB=false
  // or localStorage["flag:service_job"]="0" to disable.
  if (flag === 'service_job') return true;
  return false;
}

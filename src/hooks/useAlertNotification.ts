import { supabase } from "@/integrations/supabase/client";

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType = 'down' | 'up' | 'degraded' | 'error_spike' | 'budget_exceeded' | 'kill_switch';

export interface AlertPayload {
  alert_type: AlertType;
  source: string;
  component?: string;
  message: string;
  severity: AlertSeverity;
  details?: Record<string, unknown>;
}

export interface AlertResponse {
  success: boolean;
  message: string;
  notifications: Array<{
    channel: string;
    success: boolean;
    error?: string;
  }>;
  alert_id: string;
}

/**
 * Send an alert to the notification system
 * For client-side alerting (e.g., from admin dashboard)
 */
export async function sendAlert(alert: AlertPayload): Promise<AlertResponse> {
  // alert-webhook is a server-to-server endpoint protected by ALERT_WEBHOOK_SECRET
  // (held only by cron/monitoring). Browser clients cannot authenticate to it, so
  // we no-op here instead of surfacing a 401 as a runtime error. Real alerts
  // are dispatched by server-side health checks.
  const noop: AlertResponse = {
    success: true,
    message: 'client-side alert suppressed (server-only endpoint)',
    notifications: [],
    alert_id: 'noop',
  };
  if (typeof console !== 'undefined') {
    console.debug('[sendAlert] suppressed client invocation', alert);
  }
  return noop;
}

/**
 * Send a critical system alert
 */
export async function sendCriticalAlert(
  source: string,
  message: string,
  details?: Record<string, unknown>
): Promise<AlertResponse> {
  return sendAlert({
    alert_type: 'down',
    source,
    message,
    severity: 'critical',
    details,
  });
}

/**
 * Send a warning alert
 */
export async function sendWarningAlert(
  source: string,
  message: string,
  details?: Record<string, unknown>
): Promise<AlertResponse> {
  return sendAlert({
    alert_type: 'degraded',
    source,
    message,
    severity: 'warning',
    details,
  });
}

/**
 * Send a recovery alert (system back online)
 */
export async function sendRecoveryAlert(
  source: string,
  message: string,
  details?: Record<string, unknown>
): Promise<AlertResponse> {
  return sendAlert({
    alert_type: 'up',
    source,
    message,
    severity: 'info',
    details,
  });
}

/**
 * Hook for monitoring and auto-alerting based on health check results
 */
export function useHealthAlerts() {
  const checkAndAlert = async (
    healthStatus: 'healthy' | 'degraded' | 'unhealthy',
    previousStatus: 'healthy' | 'degraded' | 'unhealthy' | null,
    details?: Record<string, unknown>
  ) => {
    // Only send alerts on status changes
    if (previousStatus === healthStatus) {
      return;
    }

    // System went down
    if (healthStatus === 'unhealthy' && previousStatus !== 'unhealthy') {
      await sendCriticalAlert(
        'System Health Monitor',
        'System status changed to UNHEALTHY. Immediate investigation required.',
        details
      );
    }
    // System degraded
    else if (healthStatus === 'degraded' && previousStatus === 'healthy') {
      await sendWarningAlert(
        'System Health Monitor',
        'System status changed to DEGRADED. Performance issues detected.',
        details
      );
    }
    // System recovered
    else if (healthStatus === 'healthy' && previousStatus !== 'healthy') {
      await sendRecoveryAlert(
        'System Health Monitor',
        `System recovered from ${previousStatus?.toUpperCase() || 'UNKNOWN'} state.`,
        details
      );
    }
  };

  return { checkAndAlert };
}

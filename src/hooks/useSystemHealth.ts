import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ComponentHealth {
  status: 'up' | 'down' | 'degraded';
  message: string;
  latency_ms?: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: ComponentHealth;
    vault: ComponentHealth;
    storage: ComponentHealth;
    ai: ComponentHealth;
  };
  latency: {
    total_ms: number;
    database_ms: number;
    vault_ms: number;
    storage_ms: number;
  };
  uptime_info: {
    function_invoked_at: string;
    region: string;
  };
  error?: string;
}

async function fetchSystemHealth(): Promise<HealthCheckResult> {
  const { data, error } = await supabase.functions.invoke<HealthCheckResult>('health-check');
  
  if (error) {
    throw new Error(error.message);
  }
  
  if (!data) {
    throw new Error('No data returned from health check');
  }
  
  return data;
}

export function useSystemHealth(enabled: boolean = true) {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: fetchSystemHealth,
    enabled,
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider stale after 30 seconds
    retry: 1,
    meta: {
      errorMessage: "Failed to fetch system health"
    }
  });
}

export function getStatusColor(status: 'up' | 'down' | 'degraded' | 'healthy' | 'unhealthy'): string {
  switch (status) {
    case 'up':
    case 'healthy':
      return 'text-green-500';
    case 'degraded':
      return 'text-yellow-500';
    case 'down':
    case 'unhealthy':
      return 'text-red-500';
    default:
      return 'text-muted-foreground';
  }
}

export function getStatusBadgeVariant(status: 'up' | 'down' | 'degraded' | 'healthy' | 'unhealthy'): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'up':
    case 'healthy':
      return 'default';
    case 'degraded':
      return 'secondary';
    case 'down':
    case 'unhealthy':
      return 'destructive';
    default:
      return 'outline';
  }
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminMetrics {
  total_users: number;
  total_analyses: number;
  plus_subscribers: number;
  free_users: number;
  monthly_analyses: number;
  weekly_signups: number;
  monthly_signups: number;
}

interface DailySignup {
  signup_date: string;
  signup_count: number;
}

interface MonthlyAnalysis {
  month_year: string;
  analyses_count: number;
}

export function useAdminMetrics() {
  const metricsQuery = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async (): Promise<AdminMetrics> => {
      // Use secure RPC function that validates admin role server-side
      const { data, error } = await supabase.rpc('get_admin_metrics');
      
      if (error) {
        console.error('Failed to fetch admin metrics:', error.message);
        throw new Error(error.message.includes('admin role required') 
          ? 'Access denied: You must be an admin to view these metrics.'
          : error.message
        );
      }
      
      // RPC returns an array, get the first row
      const metrics = Array.isArray(data) ? data[0] : data;
      
      if (!metrics) {
        throw new Error('No metrics data returned');
      }

      return {
        total_users: metrics.total_users || 0,
        total_analyses: metrics.total_analyses || 0,
        plus_subscribers: metrics.plus_subscribers || 0,
        free_users: metrics.free_users || 0,
        monthly_analyses: metrics.monthly_analyses || 0,
        weekly_signups: metrics.weekly_signups || 0,
        monthly_signups: metrics.monthly_signups || 0
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });

  const dailySignupsQuery = useQuery({
    queryKey: ['admin-daily-signups'],
    queryFn: async (): Promise<DailySignup[]> => {
      const { data, error } = await supabase.rpc('get_daily_signups', { days_back: 30 });
      if (error) throw error;
      return (data || []).map((row: { signup_date: string; signup_count: number }) => ({
        signup_date: row.signup_date,
        signup_count: Number(row.signup_count)
      }));
    },
    staleTime: 60 * 1000,
  });

  const monthlyAnalysesQuery = useQuery({
    queryKey: ['admin-monthly-analyses'],
    queryFn: async (): Promise<MonthlyAnalysis[]> => {
      const { data, error } = await supabase.rpc('get_monthly_analyses', { months_back: 6 });
      if (error) throw error;
      return (data || []).map((row: { month_year: string; analysis_count: number }) => ({
        month_year: row.month_year,
        analyses_count: Number(row.analysis_count)
      }));
    },
    staleTime: 60 * 1000,
  });

  const refetchAll = async () => {
    await Promise.all([
      metricsQuery.refetch(),
      dailySignupsQuery.refetch(),
      monthlyAnalysesQuery.refetch(),
    ]);
  };

  return {
    metrics: metricsQuery.data,
    isLoading: metricsQuery.isLoading,
    isRefetching: metricsQuery.isFetching || dailySignupsQuery.isFetching || monthlyAnalysesQuery.isFetching,
    error: metricsQuery.error,
    refetch: refetchAll,
    dailySignups: dailySignupsQuery.data || [],
    monthlyAnalyses: monthlyAnalysesQuery.data || [],
  };
}

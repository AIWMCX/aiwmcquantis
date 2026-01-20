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
      // Query metrics using RPC or direct counts
      const [
        { count: totalUsers },
        { count: totalAnalyses },
        { count: plusSubscribers },
        { count: freeUsers },
        { data: usageData },
        { count: weeklySignups },
        { count: monthlySignups }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('analyses').select('*', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true })
          .in('status', ['active', 'trialing']).eq('plan_id', 'plus'),
        supabase.from('subscriptions').select('*', { count: 'exact', head: true })
          .eq('status', 'active').eq('plan_id', 'free'),
        supabase.from('usage_tracking').select('analyses_count')
          .eq('month_year', new Date().toISOString().slice(0, 7)),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      ]);

      const monthlyAnalyses = usageData?.reduce((sum, row) => sum + (row.analyses_count || 0), 0) || 0;

      return {
        total_users: totalUsers || 0,
        total_analyses: totalAnalyses || 0,
        plus_subscribers: plusSubscribers || 0,
        free_users: freeUsers || 0,
        monthly_analyses: monthlyAnalyses,
        weekly_signups: weeklySignups || 0,
        monthly_signups: monthlySignups || 0
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
      return (data || []).map((row: { month_year: string; analyses_count: number }) => ({
        month_year: row.month_year,
        analyses_count: Number(row.analyses_count)
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

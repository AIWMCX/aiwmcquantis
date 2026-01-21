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

interface RecentUser {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  plan_id: string;
}

interface TodaysActivity {
  user_id: string;
  email: string;
  full_name: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  is_new_today: boolean;
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

  const recentUsersQuery = useQuery({
    queryKey: ['admin-recent-users'],
    queryFn: async (): Promise<RecentUser[]> => {
      const { data, error } = await supabase.rpc('get_recent_users', { days_back: 30 });
      if (error) {
        console.error('Failed to fetch recent users:', error.message);
        throw error;
      }
      return (data || []).map((row: RecentUser) => ({
        user_id: row.user_id,
        email: row.email,
        full_name: row.full_name,
        created_at: row.created_at,
        last_sign_in_at: row.last_sign_in_at,
        plan_id: row.plan_id
      }));
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const todaysActivityQuery = useQuery({
    queryKey: ['admin-todays-activity'],
    queryFn: async (): Promise<TodaysActivity[]> => {
      const { data, error } = await supabase.rpc('get_todays_activity');
      if (error) {
        console.error('Failed to fetch today\'s activity:', error.message);
        throw error;
      }
      return (data || []).map((row: TodaysActivity) => ({
        user_id: row.user_id,
        email: row.email,
        full_name: row.full_name,
        last_sign_in_at: row.last_sign_in_at,
        created_at: row.created_at,
        is_new_today: row.is_new_today
      }));
    },
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const refetchAll = async () => {
    await Promise.all([
      metricsQuery.refetch(),
      dailySignupsQuery.refetch(),
      monthlyAnalysesQuery.refetch(),
      recentUsersQuery.refetch(),
      todaysActivityQuery.refetch(),
    ]);
  };

  return {
    metrics: metricsQuery.data,
    isLoading: metricsQuery.isLoading,
    isRefetching: metricsQuery.isFetching || dailySignupsQuery.isFetching || monthlyAnalysesQuery.isFetching || recentUsersQuery.isFetching || todaysActivityQuery.isFetching,
    error: metricsQuery.error,
    refetch: refetchAll,
    dailySignups: dailySignupsQuery.data || [],
    monthlyAnalyses: monthlyAnalysesQuery.data || [],
    recentUsers: recentUsersQuery.data || [],
    todaysActivity: todaysActivityQuery.data || [],
  };
}

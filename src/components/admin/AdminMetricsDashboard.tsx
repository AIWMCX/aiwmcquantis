import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  RefreshCw,
  UserPlus,
  Target,
  Activity
} from 'lucide-react';
import { useAdminMetrics } from '@/hooks/useAdminMetrics';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

const PLUS_PRICE = 17; // Monthly Plus subscription price

export function AdminMetricsDashboard() {
  const { 
    metrics, 
    isLoading, 
    refetch, 
    dailySignups, 
    monthlyAnalyses 
  } = useAdminMetrics();

  const conversionRate = metrics 
    ? ((metrics.plus_subscribers / Math.max(metrics.total_users, 1)) * 100).toFixed(1)
    : '0';
  
  const mrr = metrics ? metrics.plus_subscribers * PLUS_PRICE : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Business Metrics</h2>
          <p className="text-muted-foreground">Real-time dashboard • Auto-refreshes every 30s</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Users"
          value={metrics?.total_users || 0}
          icon={Users}
          description={`+${metrics?.weekly_signups || 0} this week`}
          trend="up"
        />
        <MetricCard
          title="Total Analyses"
          value={metrics?.total_analyses || 0}
          icon={BarChart3}
          description={`${metrics?.monthly_analyses || 0} this month`}
        />
        <MetricCard
          title="Plus Subscribers"
          value={metrics?.plus_subscribers || 0}
          icon={TrendingUp}
          description={`${conversionRate}% conversion`}
          highlight
        />
        <MetricCard
          title="Monthly Revenue"
          value={`$${mrr}`}
          icon={DollarSign}
          description="MRR from Plus"
          highlight
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Weekly Signups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.weekly_signups || 0}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Free → Plus</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Analyses/User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.total_users 
                ? (metrics.total_analyses / metrics.total_users).toFixed(1) 
                : '0'}
            </div>
            <p className="text-xs text-muted-foreground">Average per user</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Signups Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Signups</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {dailySignups.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySignups}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="signup_date" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value) => [value, 'Signups']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="signup_count" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No signup data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Analyses Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Analyses</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {monthlyAnalyses.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyAnalyses}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="month_year" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => {
                        const [year, month] = value.split('-');
                        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' });
                      }}
                    />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip 
                      labelFormatter={(value) => {
                        const [year, month] = value.split('-');
                        return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                      }}
                      formatter={(value) => [value, 'Analyses']}
                    />
                    <Bar 
                      dataKey="analyses_count" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No analysis data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conversion Funnel</CardTitle>
          <CardDescription>User journey from signup to paid subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <FunnelStep 
              label="Total Users" 
              value={metrics?.total_users || 0} 
              percentage={100} 
            />
            <div className="text-muted-foreground">→</div>
            <FunnelStep 
              label="Performed Analysis" 
              value={Math.min(metrics?.total_analyses || 0, metrics?.total_users || 0)} 
              percentage={metrics?.total_users ? Math.min(100, ((metrics.total_analyses / metrics.total_users) * 100)) : 0} 
            />
            <div className="text-muted-foreground">→</div>
            <FunnelStep 
              label="Plus Subscribers" 
              value={metrics?.plus_subscribers || 0} 
              percentage={parseFloat(conversionRate)} 
              highlight
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  trend?: 'up' | 'down';
  highlight?: boolean;
}

function MetricCard({ title, value, icon: Icon, description, highlight }: MetricCardProps) {
  return (
    <Card className={highlight ? 'border-primary/50 bg-primary/5' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`w-4 h-4 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${highlight ? 'text-primary' : ''}`}>{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

interface FunnelStepProps {
  label: string;
  value: number;
  percentage: number;
  highlight?: boolean;
}

function FunnelStep({ label, value, percentage, highlight }: FunnelStepProps) {
  return (
    <div className={`flex-1 text-center p-4 rounded-lg ${highlight ? 'bg-primary/10' : 'bg-muted/50'}`}>
      <div className={`text-2xl font-bold ${highlight ? 'text-primary' : ''}`}>{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`text-xs mt-1 ${highlight ? 'text-primary' : 'text-muted-foreground'}`}>
        {percentage.toFixed(1)}%
      </div>
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Activity, 
  Database, 
  Shield, 
  HardDrive, 
  Brain, 
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock
} from "lucide-react";
import { useSystemHealth, getStatusColor, type ComponentHealth } from "@/hooks/useSystemHealth";

export function SystemHealthDashboard() {
  const { data: health, isLoading, error, refetch, isFetching } = useSystemHealth();

  const getStatusIcon = (status: 'up' | 'down' | 'degraded') => {
    switch (status) {
      case 'up':
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-accent" />;
      case 'down':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getOverallStatusBadge = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    switch (status) {
      case 'healthy':
        return <Badge className="bg-primary/10 text-primary hover:bg-primary/20">Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-accent/10 text-accent hover:bg-accent/20">Degraded</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
    }
  };

  const ComponentCard = ({ 
    icon: Icon, 
    name, 
    health 
  }: { 
    icon: typeof Database; 
    name: string; 
    health?: ComponentHealth;
  }) => (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-background">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm">{name}</p>
          <p className="text-xs text-muted-foreground">{health?.message || 'Checking...'}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {health?.latency_ms !== undefined && (
          <span className="text-xs text-muted-foreground">{health.latency_ms}ms</span>
        )}
        {health ? getStatusIcon(health.status) : <Skeleton className="h-4 w-4 rounded-full" />}
      </div>
    </div>
  );

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            System Health Check Failed
          </CardTitle>
          <CardDescription>Unable to fetch system status</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
          <CardDescription>
            Real-time status of all platform components
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          {health && getOverallStatusBadge(health.status)}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Component Status Grid */}
        <div className="space-y-2">
          <ComponentCard icon={Database} name="Database" health={health?.checks.database} />
          <ComponentCard icon={Shield} name="Vault (Encryption)" health={health?.checks.vault} />
          <ComponentCard icon={HardDrive} name="File Storage" health={health?.checks.storage} />
          <ComponentCard icon={Brain} name="AI Gateway" health={health?.checks.ai} />
        </div>

        {/* Latency Summary */}
        {health && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Total Response Time</span>
              </div>
              <span className={`font-medium ${
                health.latency.total_ms > 2000 ? 'text-destructive' : 
                health.latency.total_ms > 1000 ? 'text-accent' : 'text-primary'
              }`}>
                {health.latency.total_ms}ms
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
              <span>Last checked</span>
              <span>{new Date(health.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
              <span>Version</span>
              <span>v{health.version}</span>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

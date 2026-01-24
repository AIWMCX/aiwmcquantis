import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { useSystemHealth } from "@/hooks/useSystemHealth";

interface UptimeDay {
  date: string;
  status: 'up' | 'degraded' | 'down';
}

export function UptimeStatusCard() {
  const { data: health } = useSystemHealth();
  
  // Generate mock uptime data for last 30 days
  // In production, this would come from a monitoring service
  const uptimeDays: UptimeDay[] = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return {
      date: date.toISOString().split('T')[0],
      // Mock: 98% uptime simulation
      status: Math.random() > 0.02 ? 'up' : Math.random() > 0.5 ? 'degraded' : 'down',
    };
  });

  // Override today with actual status
  if (health) {
    uptimeDays[29] = {
      date: new Date().toISOString().split('T')[0],
      status: health.status === 'healthy' ? 'up' : health.status === 'degraded' ? 'degraded' : 'down',
    };
  }

  const upDays = uptimeDays.filter(d => d.status === 'up').length;
  const uptimePercentage = ((upDays / 30) * 100).toFixed(2);

  const getStatusColor = (status: 'up' | 'degraded' | 'down') => {
    switch (status) {
      case 'up': return 'bg-primary';
      case 'degraded': return 'bg-accent';
      case 'down': return 'bg-destructive';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Uptime Status
            </CardTitle>
            <CardDescription>Last 30 days performance</CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold text-primary">{uptimePercentage}%</span>
            </div>
            <p className="text-xs text-muted-foreground">uptime</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Uptime bars */}
        <div className="flex gap-0.5">
          {uptimeDays.map((day, index) => (
            <div
              key={day.date}
              className={`h-8 flex-1 rounded-sm ${getStatusColor(day.status)} transition-opacity hover:opacity-80`}
              title={`${day.date}: ${day.status.toUpperCase()}`}
            />
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
          <span>30 days ago</span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-primary" />
              <span>Operational</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-accent" />
              <span>Degraded</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-destructive" />
              <span>Outage</span>
            </div>
          </div>
          <span>Today</span>
        </div>

        {/* Recent incidents */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Recent Status
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current Status</span>
              <Badge 
                variant={health?.status === 'healthy' ? 'default' : 
                         health?.status === 'degraded' ? 'secondary' : 'destructive'}
              >
                {health?.status?.toUpperCase() || 'CHECKING...'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Response Time</span>
              <span className={`font-medium ${
                (health?.latency?.total_ms || 0) > 2000 ? 'text-destructive' :
                (health?.latency?.total_ms || 0) > 1000 ? 'text-accent' : 'text-primary'
              }`}>
                {health?.latency?.total_ms || '--'}ms
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

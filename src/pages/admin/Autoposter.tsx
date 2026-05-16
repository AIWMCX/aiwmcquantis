import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdmin } from '@/hooks/useAdmin';
import { PostQueue } from '@/components/autoposter/PostQueue';
import { PostCalendar } from '@/components/autoposter/PostCalendar';
import { KPITracker } from '@/components/autoposter/KPITracker';

export default function Autoposter() {
  const { isAdmin, isLoading } = useAdmin();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate('/app', { replace: true });
  }, [isAdmin, isLoading, navigate]);

  if (isLoading || !isAdmin) {
    return (
      <AppLayout title="Autoposter">
        <div className="min-h-[400px] flex items-center justify-center text-[var(--q-text-secondary)]">
          {isLoading ? 'Checking access…' : 'Redirecting…'}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Autoposter">
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-sora">Autoposter</h1>
          <p className="text-sm text-[var(--q-text-secondary)] mt-1">
            90-day content calendar · Claude content generation · KPI tracking. Publishing handled separately (v2).
          </p>
        </div>

        <Tabs defaultValue="queue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="queue">Content Queue</TabsTrigger>
            <TabsTrigger value="calendar">90-Day Calendar</TabsTrigger>
            <TabsTrigger value="kpi">KPI Tracker</TabsTrigger>
          </TabsList>

          <TabsContent value="queue">
            <PostQueue />
          </TabsContent>
          <TabsContent value="calendar">
            <PostCalendar />
          </TabsContent>
          <TabsContent value="kpi">
            <KPITracker />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdmin } from '@/hooks/useAdmin';
import { PostQueue } from '@/components/autoposter/PostQueue';
import { PostCalendar } from '@/components/autoposter/PostCalendar';
import { PostArchive } from '@/components/autoposter/PostArchive';
import { KPITracker } from '@/components/autoposter/KPITracker';
import { ConnectionsPanel } from '@/components/autoposter/ConnectionsPanel';

export default function Autoposter() {
  const { isAdmin, isLoading } = useAdmin();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialTab = params.has('linkedin') ? 'connections' : 'queue';

  useEffect(() => {
    if (!isLoading && !isAdmin) navigate('/app', { replace: true });
  }, [isAdmin, isLoading, navigate]);

  if (isLoading || !isAdmin) {
    return (
      <>
        <div className="min-h-[400px] flex items-center justify-center text-[var(--q-text-secondary)]">
          {isLoading ? 'Checking access…' : 'Redirecting…'}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-sora">Autoposter</h1>
          <p className="text-sm text-[var(--q-text-secondary)] mt-1">
            Plan posts, attach images, preview, then publish — manually with copy &amp; download, or automatically once LinkedIn is connected.
          </p>
        </div>

        <Tabs defaultValue={initialTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="queue">Queue</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="archive">Archive</TabsTrigger>
            <TabsTrigger value="kpi">KPI Tracker</TabsTrigger>
            <TabsTrigger value="connections">Connections</TabsTrigger>
          </TabsList>

          <TabsContent value="queue">
            <PostQueue />
          </TabsContent>
          <TabsContent value="calendar">
            <PostCalendar />
          </TabsContent>
          <TabsContent value="archive">
            <PostArchive />
          </TabsContent>
          <TabsContent value="kpi">
            <KPITracker />
          </TabsContent>
          <TabsContent value="connections">
            <ConnectionsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppTopBar } from './AppTopBar';
import { ProTrialBanner } from '@/components/billing/ProTrialBanner';
import { UpgradeNudgeBanner } from '@/components/billing/UpgradeNudgeBanner';
import { UsageMeterCard } from '@/components/billing/UsageMeterCard';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[var(--q-bg-base)]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppTopBar title={title} />
          <ProTrialBanner />
          <UpgradeNudgeBanner />
          <main className="flex-1 overflow-auto">
            <div className="px-4 pt-4">
              <UsageMeterCard />
            </div>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

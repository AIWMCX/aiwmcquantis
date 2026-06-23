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
      {/* Finance-grade surface — deep navy base with blueprint grid at top */}
      <div
        className="min-h-screen flex w-full relative"
        style={{ backgroundColor: 'var(--q-bg-base)' }}
      >
        {/* Blueprint grid — fades out after 280px, never intrudes on content */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '280px',
            pointerEvents: 'none',
            zIndex: 0,
            backgroundImage: `
              linear-gradient(var(--q-border-subtle) 1px, transparent 1px),
              linear-gradient(90deg, var(--q-border-subtle) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
            opacity: 0.28,
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
          }}
        />

        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0 relative z-10">
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

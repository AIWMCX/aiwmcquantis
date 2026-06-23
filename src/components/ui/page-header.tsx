/**
 * PageHeader — institutional page title block used across every authenticated page.
 * Produces the consistent: [eyebrow label] / Bold Title / Muted description pattern
 * from the landing, generalized to all app pages.
 *
 * Usage:
 *   <PageHeader
 *     eyebrow="Document Studio"
 *     title="Branded Reports"
 *     description="Generate investor-grade documents from your analysis."
 *     badge={<SectionLabel dot="green">Plus</SectionLabel>}
 *     actions={<Button>New Document</Button>}
 *   />
 */
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
  tight?: boolean;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
  actions,
  className,
  tight,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4',
        tight ? 'mb-4' : 'mb-6 md:mb-8',
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        {(eyebrow || badge) && (
          <div className="flex items-center gap-3">
            {eyebrow && (
              <span className="font-mono text-[10px] font-medium tracking-[0.18em] uppercase text-[var(--q-accent-primary)]">
                {eyebrow}
              </span>
            )}
            {badge}
          </div>
        )}
        <h1
          className={cn(
            'font-cabinet text-[var(--q-text-primary)] leading-tight',
            tight ? 'text-xl font-bold' : 'text-2xl md:text-3xl font-extrabold tracking-tight',
          )}
          style={{ fontFamily: 'var(--q-font-heading)', letterSpacing: '-0.02em' }}
        >
          {title}
        </h1>
        {description && (
          <p
            className="text-sm text-[var(--q-text-tertiary)] max-w-xl leading-relaxed"
            style={{ fontFamily: 'var(--q-font-body)' }}
          >
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}

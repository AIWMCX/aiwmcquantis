import * as React from 'react';
import { cn } from '@/lib/utils';
import { useReveal } from '@/hooks/useReveal';

/**
 * GlassCard — Framer-inspired glass surface used across the redesigned
 * landing sections. Deep indigo base, backdrop blur, hairline inner ring,
 * and an on-hover gradient edge glow (indigo → violet → cyan).
 *
 * Motion is opt-in via `reveal`; respects prefers-reduced-motion.
 * All tokens live in index.css (`--aiwmc-glass-*`); no hardcoded colors here.
 */
export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  reveal?: boolean;
  revealDelay?: number;
  as?: keyof JSX.IntrinsicElements;
  glow?: 'indigo' | 'violet' | 'cyan' | 'brand' | 'none';
  interactive?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, reveal = true, revealDelay = 0, glow = 'indigo', interactive = true, children, style, ...rest }, forwardedRef) => {
    const { ref, visible } = useReveal<HTMLDivElement>();

    // Merge refs
    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      },
      [ref, forwardedRef],
    );

    return (
      <div
        ref={setRefs}
        data-glow={glow}
        data-interactive={interactive ? 'true' : 'false'}
        className={cn('aiwmc-glass-card', reveal && 'aiwmc-reveal', reveal && visible && 'aiwmc-reveal-in', className)}
        style={{
          transitionDelay: reveal && revealDelay ? `${revealDelay}ms` : undefined,
          ...style,
        }}
        {...rest}
      >
        <div className="aiwmc-glass-card__edge" aria-hidden="true" />
        <div className="aiwmc-glass-card__grain" aria-hidden="true" />
        <div className="aiwmc-glass-card__content">{children}</div>
      </div>
    );
  },
);
GlassCard.displayName = 'GlassCard';

/**
 * Reveal — thin wrapper for any element that should fade+rise into view.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    // @ts-expect-error - dynamic tag
    <Tag
      ref={ref}
      className={cn('aiwmc-reveal', visible && 'aiwmc-reveal-in', className)}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  );
}

/**
 * SectionHeader — standard eyebrow / title / subtitle grouping used
 * across all redesigned landing sections. Consistent tracking + rhythm.
 */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div className={cn('aiwmc-section-header', align === 'center' && 'text-center', className)}>
      {eyebrow && (
        <Reveal>
          <span className="aiwmc-eyebrow">{eyebrow}</span>
        </Reveal>
      )}
      <Reveal delay={60}>
        <h2 className="aiwmc-section-title">{title}</h2>
      </Reveal>
      {subtitle && (
        <Reveal delay={120}>
          <p className="aiwmc-section-subtitle">{subtitle}</p>
        </Reveal>
      )}
    </div>
  );
}

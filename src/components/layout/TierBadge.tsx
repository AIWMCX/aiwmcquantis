/**
 * TierBadge — global pill in AppTopBar showing the user's current tier and
 * remaining monthly quota.
 *
 * Behaviour:
 *  - FREE:      "Free · N analysis(es) left this month" or "0 left — upgrade"
 *  - PLUS/PRO:  Tier name + "Unlimited" hint
 *  - Always clickable → /pricing (FREE/PLUS) or /plus-settings (PRO).
 *  - All copy is i18n-driven (`errors:tier_badge.*`).
 *  - Hidden while subscription is loading to avoid badge flicker.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Crown, Sparkles, Zap } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

export function TierBadge() {
  const { tier, isFree, isPlus, isPro, remainingAnalyses, loading } = useSubscription();
  const { t } = useTranslation('errors');

  // Skip render while subscription resolves — keeps top bar from flickering.
  if (loading) return null;

  const tierLabel =
    tier === 'PRO'
      ? t('tier_badge.pro')
      : tier === 'PLUS'
        ? t('tier_badge.plus')
        : t('tier_badge.free');

  // Quota subtitle — i18next pluralization for FREE; "Unlimited" for paid.
  const quotaText = isFree
    ? remainingAnalyses <= 0
      ? t('tier_badge.out_of_quota')
      : t('tier_badge.remaining', { count: remainingAnalyses })
    : t('tier_badge.unlimited');

  // Tier-driven visual treatment, all via design tokens (no raw colors).
  const Icon = isPro ? Crown : isPlus ? Sparkles : Zap;
  const variantClasses = isPro
    ? 'border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15'
    : isPlus
      ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
      : remainingAnalyses <= 0
        ? 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15'
        : 'border-border bg-background/60 text-muted-foreground hover:text-foreground hover:border-primary/40';

  // FREE/PLUS → /pricing for upsell. PRO → settings (already top-tier).
  const href = isPro ? '/plus-settings' : '/pricing';
  const ariaLabel = `${tierLabel} — ${quotaText}. ${isPro ? '' : t('tier_badge.click_to_upgrade')}`;

  return (
    <Link
      to={href}
      aria-label={ariaLabel}
      className={`hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-full border text-xs font-semibold transition-colors ${variantClasses}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span className="leading-none">{tierLabel}</span>
      <span className="h-3 w-px bg-current opacity-30" aria-hidden="true" />
      <span className="leading-none font-normal opacity-90">{quotaText}</span>
    </Link>
  );
}

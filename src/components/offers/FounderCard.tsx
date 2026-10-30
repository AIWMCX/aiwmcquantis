import { CalendarDays, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { FOUNDER, founderInitials } from '@/config/founder';
import { trackEvent } from '@/lib/analytics';

/** Who the buyer works with on a paid review, and a way to talk first. */
export function FounderCard({ surface }: { surface: string }) {
  return (
    <GlassCard className="p-5 md:p-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
      <div
        role="img"
        aria-label={`${FOUNDER.name}, ${FOUNDER.role}`}
        className="w-16 h-16 rounded-full shrink-0 border border-border bg-muted flex items-center justify-center text-lg font-semibold text-foreground"
      >
        {founderInitials()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-1">Who you work with</p>
        <p className="text-lg font-semibold text-foreground">{FOUNDER.name}</p>
        <p className="text-sm text-muted-foreground">
          {FOUNDER.role}. You work directly with the founder, from intake to the final memo.
        </p>
        <a
          href={FOUNDER.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('founder_linkedin_click', { surface })}
          className="mt-2 inline-flex items-center gap-1.5 text-sm underline underline-offset-4 hover:text-foreground text-muted-foreground"
        >
          <Linkedin className="h-4 w-4" aria-hidden="true" />
          LinkedIn profile
        </a>
      </div>
      {FOUNDER.bookingUrl && (
        <a
          href={FOUNDER.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('booking_link_click', { surface })}
          className="shrink-0 w-full sm:w-auto"
        >
          <Button variant="outline" className="gap-2 w-full sm:w-auto">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            Book a {FOUNDER.bookingMinutes}-minute call
          </Button>
        </a>
      )}
    </GlassCard>
  );
}

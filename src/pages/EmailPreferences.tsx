import { useSearchParams, Link } from 'react-router-dom';
import { MailX, MailCheck, AlertCircle } from 'lucide-react';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard } from '@/components/ui/glass-card';

export default function EmailPreferences() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');

  const states = {
    unsubscribed: {
      icon: <MailX className="h-16 w-16" style={{ color: '#facc15' }} />,
      glow: 'violet' as const,
      title: 'Unsubscribed',
      message: "You've been unsubscribed from AIWMC Quantis marketing emails. You may still receive transactional emails related to your account.",
    },
    resubscribed: {
      icon: <MailCheck className="h-16 w-16" style={{ color: '#4ade80' }} />,
      glow: 'cyan' as const,
      title: 'Re-subscribed!',
      message: "You've been re-subscribed to AIWMC Quantis emails. Welcome back!",
    },
    invalid: {
      icon: <AlertCircle className="h-16 w-16" style={{ color: '#f87171' }} />,
      glow: 'none' as const,
      title: 'Invalid Link',
      message: 'This link is invalid. If you need to update your email preferences, please contact us.',
    },
  };

  const state = states[status as keyof typeof states] || states.invalid;

  return (
    <PublicPageShell maxWidth="sm">
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <GlassCard glow={state.glow} className="max-w-md w-full text-center p-8 space-y-6">
          <div className="flex justify-center">{state.icon}</div>
          <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>{state.title}</h1>
          <p className="text-muted-foreground">{state.message}</p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-block px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
              style={{ background: 'var(--aiwmc-grad-brand)', color: '#ffffff' }}
            >
              Go to Homepage
            </Link>
          </div>
        </GlassCard>
      </div>
    </PublicPageShell>
  );
}

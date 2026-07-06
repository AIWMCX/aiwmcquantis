import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard } from '@/components/ui/glass-card';

export default function EmailConfirmed() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');

  const states = {
    success: {
      icon: <CheckCircle className="h-16 w-16" style={{ color: '#4ade80' }} />,
      glow: 'cyan' as const,
      title: 'Email Confirmed!',
      message: "Your email has been confirmed. You'll now receive insights, analysis tips, and product updates from AIWMC Quantis.",
    },
    already: {
      icon: <Info className="h-16 w-16" style={{ color: 'var(--aiwmc-grad-cyan)' }} />,
      glow: 'violet' as const,
      title: 'Already Confirmed',
      message: 'This email has already been confirmed. No further action needed.',
    },
    invalid: {
      icon: <AlertCircle className="h-16 w-16" style={{ color: '#f87171' }} />,
      glow: 'none' as const,
      title: 'Invalid Link',
      message: 'This confirmation link is invalid or has expired. Please sign up again to receive a new confirmation email.',
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

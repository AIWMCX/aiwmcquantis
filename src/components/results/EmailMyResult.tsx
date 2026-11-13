import React, { useState } from 'react';
import { Mail, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { recordFunnelEvent, trackEvent } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';

export type EmailResultSurface = 'hire_afford' | 'hiring_demo' | 'analysis';
export interface EmailResultRow { label: string; value: string }

interface Props {
  surface: EmailResultSurface;
  title?: string;
  rows: EmailResultRow[];
  /** Same-site path that reopens this result. */
  path: string;
  className?: string;
}

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * "Email me this result" [F3, M5]. The visitor gets the numbers they just
 * saw, plus an invitation to reply to the founder. Not a newsletter: the
 * email says so, and nothing else is sent.
 */
export function EmailMyResult({ surface, title, rows, path, className }: Props) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const to = email.trim();
    if (!EMAIL_RE.test(to)) {
      setError('Enter a valid email address.');
      setState('error');
      return;
    }
    setState('sending');
    setError('');
    const { data, error: err } = await supabase.functions.invoke('email-my-result', {
      body: { email: to, surface, title, rows: rows.slice(0, 8), path },
    });
    if (err || !(data as { success?: boolean } | null)?.success) {
      const status = (err as { context?: { status?: number } } | null)?.context?.status;
      setError(status === 429
        ? 'Too many emails from here in the last hour. Try again later.'
        : 'Could not send the email. Try again in a minute.');
      setState('error');
      return;
    }
    setState('sent');
    trackEvent('result_emailed', { surface });
    recordFunnelEvent('result_emailed', { surface });
  }

  if (state === 'sent') {
    return (
      <div className={`rounded-xl border border-primary/30 bg-primary/5 p-5 ${className ?? ''}`} role="status">
        <p className="flex items-center gap-2 font-semibold text-foreground">
          <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" /> Sent. Check your inbox.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          If you want a person to look at this decision with you, reply to that email. The founder reads every reply.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={`rounded-xl border border-border bg-card/40 p-5 ${className ?? ''}`} aria-label="Email me this result">
      <p className="font-semibold text-foreground">Email me this result</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Get these numbers in your inbox to keep or forward to a partner. One email, no mailing list.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-label="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending...' : 'Email it to me'}
        </Button>
      </div>
      {state === 'error' && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
    </form>
  );
}

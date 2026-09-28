/**
 * /invite/:token — a personal "one month of Pro, free" invitation.
 *
 * Signed out: explains the offer and sends the visitor to sign up / sign in
 * (the token is remembered, so Google sign-in or email confirmation bring
 * them straight back here). Signed in: redeems once, server-side, and shows
 * the result — Pro is active immediately, no card, nothing renews.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { PageSEO } from '@/components/seo/PageSEO';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import {
  forgetInvite,
  isValidInviteToken,
  redeemMessage,
  rememberInvite,
  type InvitePreviewStatus,
  type InviteRedeemResult,
} from '@/lib/invites';

const INCLUDED = [
  'Unlimited decision analyses, including the full Pro depth',
  'Failure pre-mortem: what has to go wrong for the plan to fail',
  'Scenarios: change an assumption and see cash, break-even and payback move',
  'Invoice & capacity check, document studio and white-label PDF exports',
];

export default function Invite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { refetch } = useSubscription();
  const [preview, setPreview] = useState<{ status: InvitePreviewStatus; duration_days: number | null } | null>(null);
  const [redeem, setRedeem] = useState<{ result: InviteRedeemResult; endsAt: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const redeemed = useRef(false);
  const valid = isValidInviteToken(token);

  // Remember the invite so any sign-in path returns here.
  useEffect(() => {
    if (valid) rememberInvite(token);
  }, [valid, token]);

  // Preview (works signed out).
  useEffect(() => {
    if (!valid) {
      setPreview({ status: 'not_found', duration_days: null });
      return;
    }
    (supabase as any)
      .rpc('preview_plan_invite', { _token: token })
      .then(({ data, error: e }: { data: Array<{ status: InvitePreviewStatus; duration_days: number | null }> | null; error: unknown }) => {
        if (e || !data?.[0]) setPreview({ status: 'not_found', duration_days: null });
        else setPreview(data[0]);
      });
  }, [valid, token]);

  // Redeem once when signed in.
  useEffect(() => {
    if (!valid || authLoading || !isAuthenticated || redeemed.current) return;
    redeemed.current = true;
    (supabase as any)
      .rpc('redeem_plan_invite', { _token: token })
      .then(async ({ data, error: e }: { data: Array<{ result: InviteRedeemResult; current_period_end: string | null }> | null; error: { message?: string } | null }) => {
        if (e || !data?.[0]) {
          redeemed.current = false;
          setError(e?.message ?? 'Something went wrong activating the invite. Please refresh the page.');
          return;
        }
        const row = data[0];
        setRedeem({ result: row.result, endsAt: row.current_period_end });
        if (row.result !== 'not_signed_in') forgetInvite();
        if (row.result === 'granted') await refetch();
      });
  }, [valid, token, authLoading, isAuthenticated, refetch]);

  const returnUrl = encodeURIComponent(`/invite/${token}`);
  const days = preview?.duration_days ?? 30;

  let body: JSX.Element;
  if (!preview || authLoading || (isAuthenticated && !redeem && !error && preview.status === 'valid')) {
    body = (
      <div className="flex flex-col items-center gap-3 py-6">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{isAuthenticated ? 'Activating your Pro month…' : 'Checking your invite…'}</p>
      </div>
    );
  } else if (error) {
    body = (
      <>
        <XCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
        <h1 className="text-xl font-bold mb-2">We couldn't activate the invite</h1>
        <p className="text-sm text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </>
    );
  } else if (redeem || (isAuthenticated && preview.status !== 'valid')) {
    const msg = redeemMessage(redeem?.result ?? (preview.status as InviteRedeemResult), redeem?.endsAt ?? null);
    body = (
      <>
        {msg.ok ? <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" /> : <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />}
        <h1 className="text-xl font-bold mb-2">{msg.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{msg.body}</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          {msg.ok ? (
            <>
              <Button onClick={() => navigate('/app/new-decision')} className="gap-2">
                Run your first decision <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate('/app')}>Go to dashboard</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => navigate('/app')}>Continue with a free account</Button>
          )}
        </div>
      </>
    );
  } else if (preview.status !== 'valid') {
    const msg = redeemMessage(preview.status, null);
    body = (
      <>
        <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h1 className="text-xl font-bold mb-2">{msg.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{msg.body}</p>
        <Button variant="outline" onClick={() => navigate('/')}>Go to AIWMC Quantis</Button>
      </>
    );
  } else {
    body = (
      <>
        <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-3" />
        <h1 className="text-2xl font-bold mb-2">You're invited: {days} days of Quantis Pro, free</h1>
        <p className="text-sm text-muted-foreground mb-5">
          Quantis pressure-tests a real business decision: the assumptions it rests on, the cash it needs,
          break-even and payback, and which driver breaks it first. No card. Nothing renews automatically.
        </p>
        <ul className="text-sm text-left space-y-2 mb-6 max-w-sm mx-auto">
          {INCLUDED.map((f) => (
            <li key={f} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" /> <span>{f}</span></li>
          ))}
        </ul>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button onClick={() => navigate(`/auth?mode=signup&returnUrl=${returnUrl}`)} className="gap-2">
            Create my account <ArrowRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate(`/auth?mode=login&returnUrl=${returnUrl}`)}>I already have an account</Button>
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Pro turns on the moment you sign in. After {days} days your account stays, with your analyses, on the free plan unless you choose to upgrade.
        </p>
      </>
    );
  }

  return (
    <PublicPageShell maxWidth="sm">
      <PageSEO
        title="Your invitation | AIWMC Quantis"
        description="A personal invitation to try AIWMC Quantis Pro."
        canonical="/invite"
        noindex
      />
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <GlassCard glow="none" className="max-w-lg w-full p-8 text-center">{body}</GlassCard>
      </div>
    </PublicPageShell>
  );
}

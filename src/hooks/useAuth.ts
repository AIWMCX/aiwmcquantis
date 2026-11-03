import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { setUser as setSentryUser, clearUser as clearSentryUser } from '@/lib/sentry';
import { needsConsentSync, takePendingConsent, type SignupConsentMetadata } from '@/lib/signupConsent';

// returnUrl rides along in the confirmation-link redirect (not just
// localStorage) because the invitee may click that link on a different
// device/browser than the one they signed up on — localStorage alone
// would silently lose the pending invite in that case.
const getEmailConfirmationRedirect = (returnUrl?: string) => {
  const base = `${window.location.origin}/auth?verified=1`;
  return returnUrl ? `${base}&returnUrl=${encodeURIComponent(returnUrl)}` : base;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        // Update Sentry user context
        if (session?.user) {
          setSentryUser({
            id: session.user.id,
            email: session.user.email,
          });

          // Wave 2 — claim any anonymous analysis the visitor ran before signing up.
          // Also claim any pre-granted plan (e.g. manual Plus grant) — runs on
          // BOTH signup and every login, so the tier is guaranteed to apply
          // no matter how the user got in.
          // Defer (setTimeout 0) so we don't block other auth subscribers.
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setTimeout(() => {
              try {
                const claimId = localStorage.getItem('quantis_claim_analysis_id');
                const sessionDeviceId = localStorage.getItem('quantis_device_id');
                if (claimId && sessionDeviceId) {
                  void supabase.rpc('claim_anonymous_analysis', {
                    p_analysis_id: claimId,
                    p_anonymous_session_id: sessionDeviceId,
                  } as any).then(() => {
                    localStorage.removeItem('quantis_claim_analysis_id');
                  });
                }
                // Idempotent: no-op if there's no pending grant for this user.
                void supabase.rpc('claim_pending_plan_grant' as any);
                // OAuth sign-ups can't carry metadata through the provider redirect:
                // record the Terms/18+ and marketing choice saved before the redirect.
                if (event === 'SIGNED_IN' && needsConsentSync(session.user.user_metadata)) {
                  const pending = takePendingConsent();
                  if (pending) void supabase.auth.updateUser({ data: { ...pending } });
                }
              } catch { /* non-fatal */ }
            }, 0);
          }
        } else {
          clearSentryUser();
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // Set initial Sentry user context
      if (session?.user) {
        setSentryUser({
          id: session.user.id,
          email: session.user.email,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    fullName?: string,
    phone?: string,
    returnUrl?: string,
    consent?: SignupConsentMetadata,
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getEmailConfirmationRedirect(returnUrl),
        data: {
          full_name: fullName,
          phone: phone,
          // Terms/18+ acceptance and the (opt-in only) marketing choice, recorded on the account.
          ...(consent ?? {}),
        },
      },
    });
    return { data, error };
  }, []);

  // Passwordless entry: one action works whether this email has an account
  // or not (shouldCreateUser defaults to true) -- no "sign up vs log in"
  // choice for the invitee to get wrong, and no password to forget on a
  // repeat visit. Same email-delivery path Supabase already uses for
  // signup confirmation, so it needs no separate infrastructure.
  const signInWithMagicLink = useCallback(async (email: string, returnUrl?: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: getEmailConfirmationRedirect(returnUrl),
      },
    });
    return { data, error };
  }, []);

  const resendSignupConfirmation = useCallback(async (email: string, returnUrl?: string) => {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: getEmailConfirmationRedirect(returnUrl),
      },
    });
    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    clearSentryUser();
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  return {
    user,
    session,
    isLoading,
    isAuthenticated: !!session,
    signIn,
    signUp,
    signInWithMagicLink,
    resendSignupConfirmation,
    signOut,
  };
}

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { trackSignup, trackEvent, trackMobileSignupStarted, trackMobileSignupCompleted, trackSimplifiedFormConversion, trackPasswordValidationPassed, recordFunnelEvent } from '@/lib/analytics';
import { GoogleLoginButton } from './GoogleLoginButton';
import { cn } from '@/lib/utils';
import { getSavedLead, clearLeadData, isLeadConversion, initLeadFromUrl } from '@/lib/leadMemory';
import { useIsMobile } from '@/hooks/use-mobile';

const signupFormSchema = z.object({
  email: z.string()
    .trim()
    .email('Please enter a valid email address')
    .max(255, 'Email is too long')
    .toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password is too long'),
});

type SignupFormData = z.infer<typeof signupFormSchema>;

interface SignupFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function SignupForm({ onSuccess, className }: SignupFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signUp, resendSignupConfirmation } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [formStartTime, setFormStartTime] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const savedLead = getSavedLead();
  const emailFromUrl = searchParams.get('email');
  const prefillEmail = emailFromUrl ? decodeURIComponent(emailFromUrl) : savedLead?.email || '';
  const returnUrl = searchParams.get('returnUrl') || undefined;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, touchedFields },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    mode: 'onChange',
    defaultValues: {
      email: prefillEmail,
      password: '',
    },
  });

  useEffect(() => {
    initLeadFromUrl();

    if (savedLead?.source === 'exit_intent_popup') {
      trackEvent('lead_returning', {
        source: savedLead.source,
        days_since_capture: Math.floor((Date.now() - new Date(savedLead.timestamp).getTime()) / (1000 * 60 * 60 * 24)),
      });
    }
  }, [savedLead]);

  const handleFieldFocus = (fieldName: string) => {
    if (!touchedFields.email && !touchedFields.password) {
      trackEvent('signup_started', { source: 'form', form_version: 'verified_email_v1' });
      recordFunnelEvent('free_signup_start', { form_version: 'verified_email_v1' });
      setFormStartTime(Date.now());

      if (isMobile) {
        trackMobileSignupStarted(window.innerWidth);
      }
    }
    trackEvent('signup_field_focus', { field: fieldName });
  };

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    const submitTime = Date.now();
    const timeToSubmit = formStartTime ? submitTime - formStartTime : undefined;
    const leadConversion = isLeadConversion(data.email);

    trackPasswordValidationPassed(data.password.length);

    try {
      trackEvent('signup_attempt', {
        email_domain: data.email.split('@')[1],
        is_lead_conversion: leadConversion,
        lead_source: savedLead?.source,
        form_version: 'verified_email_v1',
        time_to_submit_ms: timeToSubmit,
      });

      const { data: authData, error } = await signUp(data.email, data.password, undefined, undefined, returnUrl);

      if (error) {
        toast.error('Unable to create account. Please check your information and try again.');

        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          trackEvent('signup_error', { reason: 'email_exists' });
        } else if (error.message.includes('password')) {
          trackEvent('signup_error', { reason: 'weak_password' });
        } else {
          trackEvent('signup_error', { reason: 'unknown', message: error.message });
        }
        setIsLoading(false);
        return;
      }

      // With email confirmation enabled Supabase returns a user but no session.
      // Treat a returned session as an explicit configuration error rather than
      // silently sending the customer into the app unverified.
      if (authData.session) {
        trackEvent('signup_warning', { reason: 'unexpected_immediate_session' });
      }

      if (leadConversion) {
        trackEvent('lead_converted_to_signup', {
          source: savedLead?.source,
          days_to_convert: savedLead ? Math.floor((Date.now() - new Date(savedLead.timestamp).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        });
      }

      // Domain 9 audit: signUp() can return a non-error response for a retry
      // against an already-pending, unconfirmed email — it just resends the
      // confirmation email rather than creating a new account. Confirmed
      // directly: one real session fired free_signup_complete 3 times over
      // 15 minutes with no account ever created (three resubmits while
      // waiting for the confirmation email). This guard fires the event at
      // most once per email per browser session, regardless of how many
      // times the form is resubmitted for the same address.
      const signupTrackedKey = `aiwmc_signup_tracked_${data.email.toLowerCase()}`;
      if (!sessionStorage.getItem(signupTrackedKey)) {
        sessionStorage.setItem(signupTrackedKey, '1');
        trackSignup('email');
      }
      trackSimplifiedFormConversion('verified_email_v1', timeToSubmit);

      if (isMobile && timeToSubmit) {
        trackMobileSignupCompleted(timeToSubmit);
      }

      clearLeadData();
      setSubmittedEmail(data.email);
      setSignupComplete(true);
      toast.success('Account created. Check your email to verify it.');

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('An unexpected error occurred. Please try again.');
      trackEvent('signup_error', { reason: 'exception', message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!submittedEmail || isResending) return;
    setIsResending(true);

    try {
      const { error } = await resendSignupConfirmation(submittedEmail, returnUrl);
      if (error) {
        toast.error('Unable to resend the verification email. Please wait and try again.');
        trackEvent('verification_resend_failed', { reason: error.message });
        return;
      }

      toast.success('Verification email sent again.');
      trackEvent('verification_resend_sent');
    } finally {
      setIsResending(false);
    }
  };

  if (signupComplete) {
    return (
      <div className={cn('text-center space-y-6 py-8', className)}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20">
          <Mail className="w-8 h-8 text-green-600" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">Check Your Email</h3>
          <p className="text-muted-foreground">We sent a verification link to</p>
        </div>

        <p className="text-sm font-medium text-foreground bg-muted px-4 py-2 rounded-lg inline-block">
          {submittedEmail}
        </p>

        <p className="text-sm text-muted-foreground">
          Click the verification link before signing in. Your account and any pre-granted plan will remain ready for you.
        </p>

        <div className="pt-2 space-y-3">
          <Button
            onClick={() => navigate(
              `/auth?email=${encodeURIComponent(submittedEmail)}&verified=1${returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''}`
            )}
            className="w-full"
          >
            Go to Sign In
          </Button>
          <Button variant="outline" onClick={resendVerification} disabled={isResending} className="w-full">
            {isResending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Resend Verification Email'
            )}
          </Button>
          <p className="text-xs text-muted-foreground">Check Spam or Promotions if it is not in your inbox.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <GoogleLoginButton mode="signup" className="w-full" />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="signup-email"
              type="email"
              placeholder="your@email.com"
              className={cn('pl-10', errors.email && 'border-destructive')}
              {...register('email')}
              onFocus={() => handleFieldFocus('email')}
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              className={cn('pl-10 pr-10', errors.password && 'border-destructive')}
              {...register('password')}
              onFocus={() => handleFieldFocus('password')}
              disabled={isLoading}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>
    </div>
  );
}

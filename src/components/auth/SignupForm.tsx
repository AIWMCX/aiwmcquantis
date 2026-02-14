import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, Mail, Lock, User, Shield, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { trackSignup, trackEvent, trackMobileSignupStarted, trackMobileSignupCompleted, trackSimplifiedFormConversion, trackPasswordValidationPassed } from '@/lib/analytics';
import { GoogleLoginButton } from './GoogleLoginButton';
import { cn } from '@/lib/utils';
import { sendWelcomeEmail, markWelcomeEmailSent } from '@/lib/welcomeEmail';
import { supabase } from '@/integrations/supabase/client';
import { getSavedLead, clearLeadData, isLeadConversion, initLeadFromUrl } from '@/lib/leadMemory';
import { useIsMobile } from '@/hooks/use-mobile';

// Simplified signup form validation schema - optimized for conversion
// Removed complex password requirements to reduce friction
const signupFormSchema = z.object({
  fullName: z.string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long')
    .regex(/^[a-zA-Zа-яА-ЯёЁ\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
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
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isFromLead, setIsFromLead] = useState(false);
  const [formStartTime, setFormStartTime] = useState<number | null>(null);
  const isMobile = useIsMobile();

  // Get saved lead data or email from URL for prefilling
  const savedLead = getSavedLead();
  const emailFromUrl = searchParams.get('email');
  const prefillEmail = emailFromUrl ? decodeURIComponent(emailFromUrl) : savedLead?.email || '';
  const prefillName = savedLead?.name || '';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, touchedFields },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: prefillName,
      email: prefillEmail,
      password: '',
    },
  });

  // Initialize lead from URL on mount
  useEffect(() => {
    initLeadFromUrl();
    
    // Track if user is from exit intent popup
    if (savedLead?.source === 'exit_intent_popup') {
      setIsFromLead(true);
      trackEvent('lead_returning', { 
        source: savedLead.source,
        days_since_capture: Math.floor((Date.now() - new Date(savedLead.timestamp).getTime()) / (1000 * 60 * 60 * 24))
      });
    }
  }, [savedLead]);

  const password = watch('password');

  const handleFieldFocus = (fieldName: string) => {
    if (!touchedFields.fullName && !touchedFields.email && !touchedFields.password) {
      trackEvent('signup_started', { source: 'form', form_version: 'simplified_v2' });
      setFormStartTime(Date.now());
      
      // Track mobile-specific start
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
    
    // Check if this is a lead conversion
    const leadConversion = isLeadConversion(data.email);
    
    // Track password validation passed
    trackPasswordValidationPassed(data.password.length);
    
    try {
      trackEvent('signup_attempt', { 
        email_domain: data.email.split('@')[1],
        is_lead_conversion: leadConversion,
        lead_source: savedLead?.source,
        form_version: 'simplified_v2',
        time_to_submit_ms: timeToSubmit,
      });

      const { error } = await signUp(
        data.email,
        data.password,
        data.fullName,
        undefined
      );

      if (error) {
        // SECURITY: Use generic error message to prevent email enumeration attacks
        // Log specific reason internally for debugging, but don't expose to user
        toast.error('Unable to create account. Please check your information and try again.');
        
        // Track specific error reason internally only
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

      // Success! Track lead conversion if applicable
      if (leadConversion) {
        trackEvent('lead_converted_to_signup', { 
          source: savedLead?.source,
          days_to_convert: savedLead ? Math.floor((Date.now() - new Date(savedLead.timestamp).getTime()) / (1000 * 60 * 60 * 24)) : 0
        });
      }
      
      trackSignup('email');
      
      // Track form conversion metrics
      trackSimplifiedFormConversion('simplified_v2', timeToSubmit);
      
      // Track mobile completion
      if (isMobile && timeToSubmit) {
        trackMobileSignupCompleted(timeToSubmit);
      }
      
      setSubmittedEmail(data.email);
      setSignupComplete(true);
      
      // Clear lead data after successful signup
      clearLeadData();
      setSubmittedEmail(data.email);
      setSignupComplete(true);
      
      // Send welcome email via centralized service
      try {
        // Get the user ID for tracking
        const { data: { user } } = await supabase.auth.getUser();
        
        trackEvent('email_welcome_email_attempt', { source: 'signup_form' });
        
        const result = await sendWelcomeEmail({
          email: data.email,
          name: data.fullName,
        });
        
        if (result.success) {
          if (user) {
            markWelcomeEmailSent(user.id);
          }
          console.log('[SignupForm] Welcome email sent successfully');
          trackEvent('email_welcome_email_sent', { source: 'signup_form' });
        } else {
          console.error('[SignupForm] Welcome email failed:', result.error);
          trackEvent('email_welcome_email_failed', { 
            source: 'signup_form',
            error: result.error 
          });
        }
      } catch (emailError) {
        console.error('[SignupForm] Failed to send welcome email:', emailError);
        trackEvent('email_welcome_email_failed', { 
          source: 'signup_form',
          error: emailError instanceof Error ? emailError.message : 'Unknown error'
        });
        // Don't block signup if email fails
      }
      
      toast.success('Account created successfully!');
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Navigate directly to app — keep user engaged
        toast.info('Check your email to verify your account.', { duration: 8000 });
        navigate('/app');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('An unexpected error occurred. Please try again.');
      trackEvent('signup_error', { reason: 'exception', message: errorMessage });
      setIsLoading(false);
    }
  };

  // Success state after signup
  if (signupComplete) {
    return (
      <div className={cn('text-center space-y-6 py-8', className)}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20">
          <Mail className="w-8 h-8 text-green-600" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">Check Your Email</h3>
          <p className="text-muted-foreground">
            We sent a verification link to
          </p>
        </div>
        
        <p className="text-sm font-medium text-foreground bg-muted px-4 py-2 rounded-lg inline-block">
          {submittedEmail}
        </p>

        <p className="text-sm text-muted-foreground">
          Click the link in your email to activate your account, then you can sign in and start analyzing.
        </p>

        <div className="pt-2 space-y-3">
          <Button variant="outline" onClick={() => navigate('/auth')} className="w-full">
            Go to Sign In
          </Button>
          <p className="text-xs text-muted-foreground">
            Didn't receive the email? Check your spam folder or{' '}
            <Link to="/auth" className="text-primary hover:underline">try again</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-5', className)}>
      {/* Trust Signals */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="w-3.5 h-3.5" />
        <span>Secure • Join 1,000+ companies • Cancel anytime</span>
      </div>

      {/* Mobile Progress Indicator */}
      <div className="text-xs text-center text-muted-foreground md:hidden">
        Step 1 of 1 — Create Your Account
      </div>

      {/* Social Login - Made Primary */}
      <div className="space-y-2">
        <GoogleLoginButton 
          mode="signup" 
          className="w-full h-14 text-base font-semibold shadow-md hover:shadow-lg transition-shadow" 
          variant="default"
        />
        <p className="text-xs text-center text-muted-foreground">
          Fastest way to get started
        </p>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or use email
          </span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name Field */}
        <div className="space-y-2">
          <Label htmlFor="signup-name">Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="signup-name"
              type="text"
              placeholder="Your full name"
              className={cn('pl-10', errors.fullName && 'border-destructive')}
              {...register('fullName')}
              onFocus={() => handleFieldFocus('fullName')}
              disabled={isLoading}
            />
          </div>
          {errors.fullName && (
            <p className="text-sm text-destructive">{errors.fullName.message}</p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email Address</Label>
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
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Minimum 8 characters"
              className={cn('pl-10 pr-10', errors.password && 'border-destructive')}
              {...register('password')}
              onFocus={() => handleFieldFocus('password')}
              disabled={isLoading}
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
          
          {/* Simplified Password Hint */}
          {password && password.length > 0 && password.length < 8 && (
            <p className="text-xs text-muted-foreground">
              {8 - password.length} more character{8 - password.length !== 1 ? 's' : ''} needed
            </p>
          )}
          
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        {/* Submit Button - Always enabled, shows errors on submit */}
        <Button 
          type="submit" 
          className="w-full h-12 text-base font-semibold" 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Account...
            </>
          ) : (
            'Create Free Account'
          )}
        </Button>
      </form>

      {/* Implicit Terms Consent */}
      <p className="text-xs text-center text-muted-foreground">
        By signing up, you agree to our{' '}
        <Link to="/terms" className="text-primary hover:underline">
          Terms
        </Link>{' '}
        and{' '}
        <Link to="/privacy" className="text-primary hover:underline">
          Privacy Policy
        </Link>
      </p>

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lock className="w-3 h-3" />
        <span>Protected with 256-bit encryption</span>
      </div>
    </div>
  );
}

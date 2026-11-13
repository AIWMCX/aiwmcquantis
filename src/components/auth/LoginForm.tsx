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
import { trackLogin, trackEvent } from '@/lib/analytics';
import { GoogleLoginButton, GOOGLE_OAUTH_ENABLED } from './GoogleLoginButton';
import { cn } from '@/lib/utils';
import { getSavedLead, clearLeadData, isLeadConversion, initLeadFromUrl } from '@/lib/leadMemory';

// Login form validation schema
const loginFormSchema = z.object({
  email: z.string()
    .trim()
    .email('Please enter a valid email address')
    .max(255, 'Email is too long')
    .toLowerCase(),
  password: z.string()
    .min(1, 'Password is required')
    .max(72, 'Password is too long'),
});

type LoginFormData = z.infer<typeof loginFormSchema>;

interface LoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  returnUrl?: string;
  className?: string;
}

export function LoginForm({ onSuccess, onForgotPassword, returnUrl, className }: LoginFormProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Get saved lead data or email from URL for prefilling
  const savedLead = getSavedLead();
  const emailFromUrl = searchParams.get('email');
  const prefillEmail = emailFromUrl ? decodeURIComponent(emailFromUrl) : savedLead?.email || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    mode: 'onBlur',
    defaultValues: {
      email: prefillEmail,
      password: '',
    },
  });

  // Initialize lead from URL on mount
  useEffect(() => {
    initLeadFromUrl();
    
    // Track returning lead
    if (savedLead?.source === 'exit_intent_popup') {
      trackEvent('lead_returning_login', { 
        source: savedLead.source,
        days_since_capture: Math.floor((Date.now() - new Date(savedLead.timestamp).getTime()) / (1000 * 60 * 60 * 24))
      });
    }
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    
    // Check if this is a lead conversion
    const leadConversion = isLeadConversion(data.email);
    
    try {
      trackEvent('login_attempt', { 
        email_domain: data.email.split('@')[1],
        is_lead_conversion: leadConversion,
      });

      const { error } = await signIn(data.email, data.password);

      if (error) {
        // SECURITY: Generic message prevents user enumeration attacks
        // Attackers cannot determine if an email is registered
        toast.error('Unable to sign in. Please check your credentials.');
        trackEvent('login_error', { reason: 'auth_failed' });
        setIsLoading(false);
        return;
      }

      // Success! Track lead conversion if applicable
      if (leadConversion) {
        trackEvent('lead_converted_to_login', { 
          source: savedLead?.source,
          days_to_convert: savedLead ? Math.floor((Date.now() - new Date(savedLead.timestamp).getTime()) / (1000 * 60 * 60 * 24)) : 0
        });
      }
      
      // Clear lead data after successful login
      clearLeadData();
      
      trackLogin('email');
      toast.success('Welcome back!');
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Navigate to return URL or app
        const destination = returnUrl ? decodeURIComponent(returnUrl) : '/app';
        navigate(destination);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('An unexpected error occurred. Please try again.');
      trackEvent('login_error', { reason: 'exception', message: errorMessage });
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Social Login */}
      <GoogleLoginButton mode="login" className="w-full" />

      {/* Divider: only when there is a social button above it */}
      {GOOGLE_OAUTH_ENABLED && (
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with email
            </span>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="login-email"
              type="email"
              placeholder="your@email.com"
              className={cn('pl-10', errors.email && 'border-destructive')}
              {...register('email')}
              disabled={isLoading}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            {onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs text-primary hover:underline"
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              className={cn('pl-10 pr-10', errors.password && 'border-destructive')}
              {...register('password')}
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
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>
    </div>
  );
}

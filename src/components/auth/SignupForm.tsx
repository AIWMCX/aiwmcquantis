import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Loader2, Mail, Lock, User, Phone, Shield, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { trackSignup, trackEvent } from '@/lib/analytics';
import { PasswordStrengthMeter, checkPasswordStrength } from './PasswordStrengthMeter';
import { GoogleLoginButton } from './GoogleLoginButton';
import { cn } from '@/lib/utils';

// Signup form validation schema
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
  phone: z.string()
    .optional()
    .refine(
      (val) => !val || /^[+]?[\d\s()-]{7,}$/.test(val),
      'Please enter a valid phone number'
    ),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .max(72, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the Terms of Service and Privacy Policy',
  }),
});

type SignupFormData = z.infer<typeof signupFormSchema>;

interface SignupFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function SignupForm({ onSuccess, className }: SignupFormProps) {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

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
      fullName: '',
      email: '',
      phone: '',
      password: '',
      acceptTerms: false,
    },
  });

  const password = watch('password');
  const passwordStrength = password ? checkPasswordStrength(password) : null;

  const handleFieldFocus = (fieldName: string) => {
    if (!touchedFields.fullName && !touchedFields.email && !touchedFields.password) {
      trackEvent('signup_started', { source: 'form' });
    }
    trackEvent('signup_field_focus', { field: fieldName });
  };

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    
    try {
      trackEvent('signup_attempt', { 
        email_domain: data.email.split('@')[1],
        has_phone: !!data.phone,
      });

      const { error } = await signUp(
        data.email,
        data.password,
        data.fullName,
        data.phone || undefined
      );

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          toast.error('This email is already registered. Please sign in instead.');
          trackEvent('signup_error', { reason: 'email_exists' });
        } else if (error.message.includes('password')) {
          toast.error('Password must be at least 12 characters');
          trackEvent('signup_error', { reason: 'weak_password' });
        } else {
          toast.error(error.message || 'Failed to create account');
          trackEvent('signup_error', { reason: 'unknown', message: error.message });
        }
        setIsLoading(false);
        return;
      }

      // Success!
      trackSignup('email');
      setSubmittedEmail(data.email);
      setSignupComplete(true);
      
      // Send welcome email via Resend
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-welcome-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              email: data.email,
              name: data.fullName,
            }),
          }
        );
        
        if (!response.ok) {
          console.warn('Welcome email could not be sent:', await response.text());
        } else {
          console.log('Welcome email sent successfully');
        }
      } catch (emailError) {
        console.warn('Failed to send welcome email:', emailError);
        // Don't block signup if email fails
      }
      
      toast.success('Account created successfully!');
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Navigate to thank you page
        navigate('/thank-you');
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
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">Account Created!</h3>
          <p className="text-muted-foreground">
            Welcome to AIWMC Quantis™
          </p>
        </div>
        
        <p className="text-sm text-muted-foreground">
          Check your email at <span className="font-medium text-foreground">{submittedEmail}</span> to verify your account.
        </p>

        <Button onClick={() => navigate('/app')} className="w-full">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Trust Signals */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Shield className="w-3.5 h-3.5" />
        <span>Secure • Join 1,000+ companies • Cancel anytime</span>
      </div>

      {/* Social Login */}
      <GoogleLoginButton mode="signup" className="w-full" />

      {/* Divider */}
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

        {/* Phone Field (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="signup-phone">
            Phone Number <span className="text-muted-foreground">(optional)</span>
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="signup-phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              className={cn('pl-10', errors.phone && 'border-destructive')}
              {...register('phone')}
              onFocus={() => handleFieldFocus('phone')}
              disabled={isLoading}
            />
          </div>
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
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
              placeholder="Minimum 12 characters"
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
          
          {/* Password Strength Meter */}
          <PasswordStrengthMeter password={password || ''} />
          
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        {/* Terms Checkbox */}
        <div className="space-y-2">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="accept-terms"
              checked={watch('acceptTerms')}
              onCheckedChange={(checked) => setValue('acceptTerms', checked as boolean)}
              disabled={isLoading}
            />
            <label
              htmlFor="accept-terms"
              className="text-sm leading-tight cursor-pointer"
            >
              I agree to the{' '}
              <Link to="/terms" className="text-primary hover:underline font-medium">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-primary hover:underline font-medium">
                Privacy Policy
              </Link>
            </label>
          </div>
          {errors.acceptTerms && (
            <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading || (passwordStrength && passwordStrength.score < 4)}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
        <Lock className="w-3 h-3" />
        <span>Protected with 256-bit encryption</span>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

import { logger } from '@/lib/logger';
const forgotPasswordSchema = z.object({
  email: z.string()
    .trim()
    .email('Please enter a valid email address')
    .max(255, 'Email is too long')
    .toLowerCase(),
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordFormProps {
  onBack: () => void;
  className?: string;
}

export function ForgotPasswordForm({ onBack, className }: ForgotPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: ForgotPasswordData) => {
    setIsLoading(true);
    
    try {
      trackEvent('password_reset_request', { 
        email_domain: data.email.split('@')[1] 
      });

      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      // SECURITY: Always show success message to prevent account enumeration
      // Even if email doesn't exist, we show the same message
      if (error) {
        logger.error('Password reset error:', error);
        // Log error but don't reveal to user
        trackEvent('password_reset_error', { 
          error_type: error.message.includes('rate') ? 'rate_limit' : 'other' 
        });
      }

      // Always show success to prevent enumeration
      setSubmittedEmail(data.email);
      setIsSuccess(true);
      toast.success('Check your email for reset instructions');
      
    } catch (err) {
      logger.error('Unexpected password reset error:', err);
      toast.error('An error occurred. Please try again.');
      trackEvent('password_reset_error', { error_type: 'exception' });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className={cn('text-center space-y-6 py-8', className)}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">Check Your Email</h3>
          <p className="text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{submittedEmail}</span>, 
            you'll receive password reset instructions shortly.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Didn't receive the email? Check your spam folder or try again.
          </p>
          <Button 
            variant="outline" 
            onClick={() => {
              setIsSuccess(false);
              setSubmittedEmail('');
            }}
            className="w-full"
          >
            Try Again
          </Button>
          <Button variant="ghost" onClick={onBack} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-2 text-center">
        <h3 className="text-xl font-semibold text-foreground">Forgot Password?</h3>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we'll send you instructions to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="reset-email"
              type="email"
              placeholder="your@email.com"
              className={cn('pl-10', errors.email && 'border-destructive')}
              {...register('email')}
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            'Send Reset Instructions'
          )}
        </Button>
      </form>

      <Button variant="ghost" onClick={onBack} className="w-full">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Sign In
      </Button>
    </div>
  );
}

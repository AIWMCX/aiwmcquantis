import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Brain, Mail, Lock, User, Loader2, ArrowLeft, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { redirectToPaymentLink } from '@/hooks/useStripeCheckout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().trim().email('Please enter a valid email');
const passwordSchema = z.string().min(6, 'Minimum 6 characters');
const phoneSchema = z.string().optional().refine(
  (val) => !val || /^[+]?[\d\s()-]{10,}$/.test(val),
  'Please enter a valid phone number'
);

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, isAuthenticated, isLoading: authLoading } = useAuth();
  const checkoutTriggered = useRef(false);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ 
    email: '', 
    password: '', 
    fullName: '',
    phone: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle redirect after auth - check both URL params and localStorage
  useEffect(() => {
    if (isAuthenticated && !checkoutTriggered.current) {
      // First check URL params (from old flow)
      const redirect = searchParams.get('redirect');
      const urlPlan = searchParams.get('plan') as 'plus' | 'pro' | null;
      
      // Then check localStorage (from new flow)
      const storedPlan = localStorage.getItem('pending_checkout_plan') as 'plus' | 'pro' | null;
      
      const plan = urlPlan || storedPlan;
      const shouldCheckout = (redirect === 'checkout' && urlPlan) || storedPlan;
      
      if (shouldCheckout && plan) {
        checkoutTriggered.current = true;
        setIsProcessingCheckout(true);
        // Clear stored plan
        localStorage.removeItem('pending_checkout_plan');
        
        // Get user info and redirect to Payment Link
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            redirectToPaymentLink(plan, user.id, user.email || undefined);
          } else {
            setIsProcessingCheckout(false);
            toast.error('Failed to get user info. Please try again.');
            navigate('/app');
          }
        });
      } else {
        navigate('/app');
      }
    }
  }, [isAuthenticated, searchParams, navigate]);

  const validateLogin = () => {
    const newErrors: Record<string, string> = {};
    
    try {
      emailSchema.parse(loginData.email);
    } catch (e) {
      if (e instanceof z.ZodError) newErrors.loginEmail = e.errors[0].message;
    }
    
    try {
      passwordSchema.parse(loginData.password);
    } catch (e) {
      if (e instanceof z.ZodError) newErrors.loginPassword = e.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignup = () => {
    const newErrors: Record<string, string> = {};
    
    if (!signupData.fullName.trim()) {
      newErrors.signupName = 'Name is required';
    }
    
    try {
      emailSchema.parse(signupData.email);
    } catch (e) {
      if (e instanceof z.ZodError) newErrors.signupEmail = e.errors[0].message;
    }
    
    try {
      passwordSchema.parse(signupData.password);
    } catch (e) {
      if (e instanceof z.ZodError) newErrors.signupPassword = e.errors[0].message;
    }

    try {
      phoneSchema.parse(signupData.phone);
    } catch (e) {
      if (e instanceof z.ZodError) newErrors.signupPhone = e.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;
    
    setIsLoading(true);
    try {
      const { error } = await signIn(loginData.email.trim(), loginData.password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Please verify your email first');
        } else {
          toast.error(error.message || 'Failed to sign in');
        }
      } else {
        toast.success('Welcome back!');
        navigate('/');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignup()) return;
    
    setIsLoading(true);
    try {
      const { error } = await signUp(
        signupData.email.trim(), 
        signupData.password, 
        signupData.fullName.trim(),
        signupData.phone.trim()
      );
      
      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          toast.error('This email is already registered. Please sign in instead.');
        } else if (error.message.includes('password')) {
          toast.error('Password must be at least 6 characters');
        } else {
          toast.error(error.message || 'Failed to create account');
        }
      } else {
        toast.success('Account created successfully!');
        navigate('/');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Full-screen loading when processing checkout redirect
  if (isProcessingCheckout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium text-foreground">Redirecting to payment...</p>
          <p className="text-sm text-muted-foreground">Please wait</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container max-w-lg mx-auto flex-1 flex flex-col items-center justify-center px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="self-start mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">AIWMC Quantis<sup className="text-xs align-super">™</sup></h1>
        </div>

        <Card className="w-full">
          <Tabs defaultValue="login">
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent>
              <TabsContent value="login">
                <CardTitle className="mb-2">Sign in to your account</CardTitle>
                <CardDescription className="mb-6">
                  Sign in to save analyses and sync across devices
                </CardDescription>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                    {errors.loginEmail && (
                      <p className="text-sm text-destructive">{errors.loginEmail}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        className="pl-10"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                    {errors.loginPassword && (
                      <p className="text-sm text-destructive">{errors.loginPassword}</p>
                    )}
                  </div>

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
              </TabsContent>

              <TabsContent value="signup">
                <CardTitle className="mb-2">Create an account</CardTitle>
                <CardDescription className="mb-6">
                  Sign up to permanently store your analyses
                </CardDescription>

                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Your full name"
                        className="pl-10"
                        value={signupData.fullName}
                        onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                    {errors.signupName && (
                      <p className="text-sm text-destructive">{errors.signupName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        className="pl-10"
                        value={signupData.email}
                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                    {errors.signupEmail && (
                      <p className="text-sm text-destructive">{errors.signupEmail}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number (optional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className="pl-10"
                        value={signupData.phone}
                        onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                    {errors.signupPhone && (
                      <p className="text-sm text-destructive">{errors.signupPhone}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="Minimum 6 characters"
                        className="pl-10"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        disabled={isLoading}
                      />
                    </div>
                    {errors.signupPassword && (
                      <p className="text-sm text-destructive">{errors.signupPassword}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Sign Up'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

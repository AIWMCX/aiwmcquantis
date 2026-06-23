import { useSearchParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function EmailConfirmed() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');

  const states = {
    success: {
      icon: <CheckCircle className="h-16 w-16 text-green-500" />,
      title: 'Email Confirmed!',
      message: "Your email has been confirmed. You'll now receive insights, analysis tips, and product updates from AIWMC Quantis.",
    },
    already: {
      icon: <Info className="h-16 w-16 text-blue-500" />,
      title: 'Already Confirmed',
      message: 'This email has already been confirmed. No further action needed.',
    },
    invalid: {
      icon: <AlertCircle className="h-16 w-16 text-red-500" />,
      title: 'Invalid Link',
      message: 'This confirmation link is invalid or has expired. Please sign up again to receive a new confirmation email.',
    },
  };

  const state = states[status as keyof typeof states] || states.invalid;

  return (
    <AppLayout>
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="flex justify-center">{state.icon}</div>
          <h1 className="text-2xl font-bold text-foreground">{state.title}</h1>
          <p className="text-muted-foreground">{state.message}</p>
          <div className="pt-4">
            <Link
              to="/"
              className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

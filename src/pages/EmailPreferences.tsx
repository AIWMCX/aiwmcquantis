import { useSearchParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { MailX, MailCheck, AlertCircle } from 'lucide-react';

export default function EmailPreferences() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');

  const states = {
    unsubscribed: {
      icon: <MailX className="h-16 w-16 text-amber-500" />,
      title: 'Unsubscribed',
      message: "You've been unsubscribed from AIWMC Quantis marketing emails. You may still receive transactional emails related to your account.",
    },
    resubscribed: {
      icon: <MailCheck className="h-16 w-16 text-green-500" />,
      title: 'Re-subscribed!',
      message: "You've been re-subscribed to AIWMC Quantis emails. Welcome back!",
    },
    invalid: {
      icon: <AlertCircle className="h-16 w-16 text-red-500" />,
      title: 'Invalid Link',
      message: 'This link is invalid. If you need to update your email preferences, please contact us.',
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

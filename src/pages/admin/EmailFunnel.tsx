import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';
import { Mail, MousePointerClick, UserPlus, CreditCard, MailX, CheckCircle } from 'lucide-react';

type FunnelData = {
  total_leads: number;
  pending_confirmation: number;
  confirmed: number;
  unsubscribed: number;
  converted_to_user: number;
  converted_to_paid: number;
  total_emails_sent: number;
  unique_recipients: number;
  total_opens: number;
  unique_opens: number;
  total_clicks: number;
  unique_clicks: number;
  open_rate_pct: number;
  click_to_open_rate_pct: number;
  by_template: { template_key: string; send_count: number; unique_recipients: number }[] | null;
};

const METRICS = [
  { key: 'total_leads', label: 'Total Leads', icon: UserPlus, color: 'text-blue-500' },
  { key: 'confirmed', label: 'Confirmed', icon: CheckCircle, color: 'text-green-500' },
  { key: 'total_emails_sent', label: 'Emails Sent', icon: Mail, color: 'text-purple-500' },
  { key: 'unique_opens', label: 'Unique Opens', icon: Mail, color: 'text-amber-500' },
  { key: 'unique_clicks', label: 'Unique Clicks', icon: MousePointerClick, color: 'text-orange-500' },
  { key: 'converted_to_user', label: 'Signed Up', icon: UserPlus, color: 'text-teal-500' },
  { key: 'converted_to_paid', label: 'Paid', icon: CreditCard, color: 'text-emerald-500' },
  { key: 'unsubscribed', label: 'Unsubscribed', icon: MailX, color: 'text-red-500' },
] as const;

export default function EmailFunnel() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: rows, error } = await supabase
        .from('email_funnel_30d' as never)
        .select('*');
      if (error) {
        logger.error('email_funnel_30d read failed', error);
        setError(error.message);
        return;
      }
      if (rows && (rows as unknown[]).length > 0) {
        setData((rows as unknown as FunnelData[])[0]);
      }
    })();
  }, []);

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <Helmet>
        <title>Email Funnel — Admin · AIWMC Quantis</title>
      </Helmet>

      <header className="mb-6">
        <h1 className="text-2xl font-bold">Email Funnel — last 30 days</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lead capture → email open/click → signup → paid conversion
        </p>
      </header>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">
            Could not load email funnel: {error}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map(({ key, label, icon: Icon, color }) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data === null ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-3xl font-bold">
                  {(data[key as keyof FunnelData] as number ?? 0).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Confirmation rate</span>
                <span className="font-mono font-semibold">
                  {data.total_leads > 0
                    ? `${((data.confirmed / data.total_leads) * 100).toFixed(1)}%`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Open rate</span>
                <span className="font-mono font-semibold">{data.open_rate_pct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Click-to-open rate</span>
                <span className="font-mono font-semibold">{data.click_to_open_rate_pct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Lead → Signup</span>
                <span className="font-mono font-semibold">
                  {data.total_leads > 0
                    ? `${((data.converted_to_user / data.total_leads) * 100).toFixed(1)}%`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Lead → Paid</span>
                <span className="font-mono font-semibold">
                  {data.total_leads > 0
                    ? `${((data.converted_to_paid / data.total_leads) * 100).toFixed(1)}%`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Unsubscribe rate</span>
                <span className="font-mono font-semibold">
                  {data.total_leads > 0
                    ? `${((data.unsubscribed / data.total_leads) * 100).toFixed(1)}%`
                    : '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Emails by Template</CardTitle>
            </CardHeader>
            <CardContent>
              {data.by_template && data.by_template.length > 0 ? (
                <div className="space-y-2">
                  {data.by_template.map((t) => (
                    <div key={t.template_key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate max-w-[200px]">
                        {t.template_key.replace(/\|ip:.*$/, '')}
                      </span>
                      <span className="font-mono">
                        {t.send_count} sent · {t.unique_recipients} recipients
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No emails sent in the last 30 days.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Opens are tracked via a 1x1 pixel in each email. Clicks are tracked
            via redirect through <code>confirm-email-subscription?action=click</code>.
            Both write to <code>email_engagement</code>.
          </p>
          <p>
            Lead→user conversion is tracked when a lead's email matches a new
            signup. Paid conversion is tracked via the Stripe webhook.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

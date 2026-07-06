import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, BarChart3, FileText, Linkedin, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { trackSignupConversion } from '@/lib/analytics';
import { PageSEO } from '@/components/seo/PageSEO';
import { PublicPageShell } from '@/components/layout/PublicPageShell';
import { GlassCard } from '@/components/ui/glass-card';
import { FREE_ANALYSES_PER_MONTH } from '@/config/canonical-facts';

export default function ThankYou() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    trackSignupConversion();
  }, []);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  return (
    <PublicPageShell maxWidth="sm">
      <PageSEO
        title="Welcome! | AIWMC Quantis"
        description="Your account is ready. Start validating your business ideas."
        canonical="/thank-you"
        noindex={true}
      />
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full text-center">
          <div className="flex justify-center mb-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.25)' }}
            >
              <CheckCircle className="w-12 h-12" style={{ color: '#4ade80' }} />
            </div>
          </div>

          <h1 className="text-3xl font-bold mb-3" style={{ color: 'hsl(var(--foreground))' }}>
            Welcome, {firstName}!
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Your account is ready. Start validating your business ideas with structured AI analysis.
          </p>

          <GlassCard glow="cyan" className="mb-6 p-6 text-left">
            <p className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
              Your next steps
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(148,163,255,0.10)' }}>
                  <Brain className="w-5 h-5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>Run Your First Validation</p>
                  <p className="text-sm text-muted-foreground">Financial logic, risk signals, projections</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(148,163,255,0.10)' }}>
                  <BarChart3 className="w-5 h-5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>See a Sample Report</p>
                  <p className="text-sm text-muted-foreground">Explore what a full analysis looks like</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(148,163,255,0.10)' }}>
                  <FileText className="w-5 h-5" style={{ color: 'var(--aiwmc-grad-cyan)' }} />
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'hsl(var(--foreground))' }}>Export PDF Reports</p>
                  <p className="text-sm text-muted-foreground">Professional documents in one click</p>
                </div>
              </div>
            </div>
          </GlassCard>

          <Button
            size="lg"
            className="w-full text-lg py-6 mb-4"
            onClick={() => navigate('/app')}
          >
            Start My First Validation
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <div className="flex items-center justify-center gap-4 mt-4">
            <a
              href="https://www.linkedin.com/in/bogdan-jeltov-6218b9324"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Linkedin className="w-4 h-4" />
              Follow on LinkedIn
            </a>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            Free account — {FREE_ANALYSES_PER_MONTH} analyses per month
          </p>
        </div>
      </div>
    </PublicPageShell>
  );
}

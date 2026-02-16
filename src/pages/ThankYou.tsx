import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Sparkles, BarChart3, FileText, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { trackSignupConversion } from '@/lib/analytics';
import { PageSEO } from '@/components/seo/PageSEO';

export default function ThankYou() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    trackSignupConversion();
  }, []);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <PageSEO
        title="Welcome! | AIWMC Quantis™"
        description="Your account is ready. Start validating your business ideas."
        canonical="/thank-you"
        noindex={true}
      />
      <div className="max-w-md w-full text-center">
        {/* Success Animation */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-primary/20 animate-ping" />
          </div>
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-primary" />
            </div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-3">
          Welcome, {firstName}!
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Your account is ready. Start validating your business ideas with structured AI analysis.
        </p>

        {/* What you can do now */}
        <Card className="mb-6 bg-card/50 border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
              Your next steps
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Run Your First Validation</p>
                  <p className="text-sm text-muted-foreground">Financial logic, risk signals, projections</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">See a Sample Report</p>
                  <p className="text-sm text-muted-foreground">Explore what a full analysis looks like</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Export PDF Reports</p>
                  <p className="text-sm text-muted-foreground">Professional documents in one click</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Primary CTA */}
        <Button 
          size="lg" 
          className="w-full text-lg py-6 mb-4"
          onClick={() => navigate('/app')}
        >
          Start My First Validation
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        {/* Social follow */}
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
          Free account — 1 analysis per day
        </p>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Sparkles, BarChart3, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { trackSignupConversion } from '@/lib/analytics';
import { PageSEO } from '@/components/seo/PageSEO';

export default function ThankYou() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fire conversion tracking on page load
  useEffect(() => {
    trackSignupConversion();
  }, []);

  // Get user's first name for personalization
  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <PageSEO
        title="Welcome! | AIWMC Quantis™"
        description="Your account is ready. Start analyzing your business ideas."
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

        {/* Welcome Message */}
        <h1 className="text-3xl font-bold text-foreground mb-3">
          Welcome, {firstName}! 🎉
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Your account is ready. Start analyzing your business ideas with AI-powered insights.
        </p>

        {/* Benefits Card */}
        <Card className="mb-8 bg-card/50 border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
              What you can do now
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">AI Business Analysis</p>
                  <p className="text-sm text-muted-foreground">Get instant financial projections</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Market Analysis</p>
                  <p className="text-sm text-muted-foreground">Understand your competition</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">PDF Reports</p>
                  <p className="text-sm text-muted-foreground">Export professional documents</p>
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
          Start My First Analysis
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

        {/* Account Info */}
        <p className="text-sm text-muted-foreground">
          Free account • 1 analysis per day
        </p>
      </div>
    </div>
  );
}

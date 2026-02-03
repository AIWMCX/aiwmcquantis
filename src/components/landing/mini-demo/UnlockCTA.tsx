import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, DollarSign, Users, FileText, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackCtaClick } from '@/lib/analytics';

interface UnlockCTAProps {
  idea?: string;
  location?: string;
}

export function UnlockCTA({ idea, location }: UnlockCTAProps) {
  const navigate = useNavigate();

  const handleGetFullReport = () => {
    // Store preview data for pre-fill
    if (idea && location) {
      localStorage.setItem('quantis_prefill', JSON.stringify({ idea, location }));
    }
    trackCtaClick('mini_demo_full_report', 'mini_demo');
    navigate('/app');
  };

  return (
    <div className="space-y-4">
      {/* Value Prop Card */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground mb-2">Unlock Your Complete Analysis</p>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-success shrink-0" />
                <span className="truncate">3 scenario projections</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">Marketing strategy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">PDF export</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">Shareable links</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={handleGetFullReport}
          className="flex-1 h-12 text-base font-semibold gap-2"
        >
          Sign Up Free & Get Full Analysis
          <ArrowRight className="w-4 h-4" />
        </Button>
        <Link to="/auth" className="sm:w-auto">
          <Button variant="outline" className="w-full h-12 text-base gap-2">
            Sign In
          </Button>
        </Link>
      </div>

      {/* Reassurance */}
      <p className="text-center text-xs text-muted-foreground">
        Your data is saved • Continue exactly where you left off
      </p>
    </div>
  );
}

import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star, Send, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import { logger } from '@/lib/logger';
interface RealismFeedbackWidgetProps {
  analysisId?: string;
  businessType?: string;
  location?: string;
}

interface DimensionScores {
  revenue: number | null;
  costs: number | null;
  timeline: number | null;
}

export function RealismFeedbackWidget({ analysisId, businessType, location }: RealismFeedbackWidgetProps) {
  const { user } = useAuth();
  const [score, setScore] = useState<number>(0);
  const [hoveredScore, setHoveredScore] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showDimensions, setShowDimensions] = useState(false);
  const [dimensionScores, setDimensionScores] = useState<DimensionScores>({
    revenue: null,
    costs: null,
    timeline: null
  });

  const handleDimensionChange = (dimension: keyof DimensionScores, value: number[]) => {
    setDimensionScores(prev => ({ ...prev, [dimension]: value[0] }));
  };

  const handleSubmit = async () => {
    if (score === 0) return;
    
    setIsSubmitting(true);
    try {
      // Filter out null dimension scores
      const filteredDimensions = Object.fromEntries(
        Object.entries(dimensionScores).filter(([_, v]) => v !== null)
      );

      await supabase.from('user_realism_feedback').insert({
        analysis_id: analysisId || null,
        user_id: user?.id || null,
        realism_score: score,
        feedback_text: feedback.trim() || null,
        dimension_scores: Object.keys(filteredDimensions).length > 0 ? filteredDimensions : null,
        business_type: businessType || null,
        location: location || null,
        engine_version: '2.0.0-precision'
      });
      setSubmitted(true);
    } catch (err) {
      logger.error('Failed to submit realism feedback', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in zoom-in duration-300">
        <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-success" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">Thank you for your feedback!</h4>
          <p className="text-sm text-muted-foreground mt-1">Your input helps calibrate our AI models for {businessType || 'your industry'}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="space-y-1">
        <h4 className="font-semibold text-foreground">How realistic do these projections feel?</h4>
        <p className="text-sm text-muted-foreground">Help us improve the accuracy of our baseline assumptions.</p>
      </div>

      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setScore(idx)}
            onMouseEnter={() => setHoveredScore(idx)}
            onMouseLeave={() => setHoveredScore(0)}
            className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              className={`w-8 h-8 ${
                idx <= (hoveredScore || score)
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-muted text-muted-foreground/30'
              } transition-colors`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {score === 1 && 'Too optimistic'}
          {score === 2 && 'Somewhat optimistic'}
          {score === 3 && 'About right'}
          {score === 4 && 'Somewhat conservative'}
          {score === 5 && 'Too conservative'}
        </span>
      </div>

      {score > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Dimension Scoring (Collapsible) */}
          <Collapsible open={showDimensions} onOpenChange={setShowDimensions}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground hover:text-foreground">
                Rate specific dimensions (optional)
                {showDimensions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Revenue projections</span>
                  <span className="text-muted-foreground font-mono">
                    {dimensionScores.revenue !== null ? `${dimensionScores.revenue}/5` : '—'}
                  </span>
                </div>
                <Slider
                  value={dimensionScores.revenue !== null ? [dimensionScores.revenue] : [3]}
                  onValueChange={(v) => handleDimensionChange('revenue', v)}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Too high</span>
                  <span>Too low</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Cost estimates</span>
                  <span className="text-muted-foreground font-mono">
                    {dimensionScores.costs !== null ? `${dimensionScores.costs}/5` : '—'}
                  </span>
                </div>
                <Slider
                  value={dimensionScores.costs !== null ? [dimensionScores.costs] : [3]}
                  onValueChange={(v) => handleDimensionChange('costs', v)}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Too low</span>
                  <span>Too high</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Timeline to profitability</span>
                  <span className="text-muted-foreground font-mono">
                    {dimensionScores.timeline !== null ? `${dimensionScores.timeline}/5` : '—'}
                  </span>
                </div>
                <Slider
                  value={dimensionScores.timeline !== null ? [dimensionScores.timeline] : [3]}
                  onValueChange={(v) => handleDimensionChange('timeline', v)}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Too fast</span>
                  <span>Too slow</span>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Textarea
            placeholder="Tell us what seems off or surprisingly accurate... (optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="text-sm resize-none h-20"
            maxLength={500}
          />
          
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting} 
            className="w-full gap-2"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit Calibration Feedback
          </Button>
        </div>
      )}
    </div>
  );
}

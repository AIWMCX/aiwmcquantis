import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star, Send, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface RealismFeedbackWidgetProps {
  analysisId?: string;
}

export function RealismFeedbackWidget({ analysisId }: RealismFeedbackWidgetProps) {
  const { user } = useAuth();
  const [score, setScore] = useState<number>(0);
  const [hoveredScore, setHoveredScore] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (score === 0) return;
    
    setIsSubmitting(true);
    try {
      await supabase.from('user_realism_feedback').insert({
        analysis_id: analysisId || null,
        user_id: user?.id || null,
        realism_score: score,
        feedback_text: feedback.trim() || null
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit realism feedback', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in zoom-in duration-300">
        <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h4 className="font-semibold text-foreground">Thank you for your feedback!</h4>
          <p className="text-sm text-muted-foreground mt-1">Your input helps calibrate our AI models.</p>
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
      </div>

      {score > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <Textarea
            placeholder="Tell us what seems off or surprisingly accurate... (optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="text-sm resize-none h-20"
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

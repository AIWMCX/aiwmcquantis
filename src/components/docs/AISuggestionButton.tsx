import React, { useState } from 'react';
import { Zap, Loader2, RefreshCw, Check, X, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { logger } from '@/lib/logger';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AISuggestionButtonProps {
  sectionType: 'executive_summary' | 'market_analysis' | 'risk_assessment' | 'value_proposition' | 'testimonial' | 'market_description' | 'competitive_advantage' | 'market_trends' | 'partnership_objective';
  context: {
    business_name?: string;
    industry?: string;
    target_market?: string;
    revenue?: number;
    roi?: number;
    payback_months?: number;
    [key: string]: unknown;
  };
  onApply: (suggestion: string) => void;
  currentContent?: string;
  disabled?: boolean;
  className?: string;
}

interface Suggestion {
  id: string;
  content: string;
}

export function AISuggestionButton({
  sectionType,
  context,
  onApply,
  currentContent,
  disabled,
  className,
}: AISuggestionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const sectionLabels: Record<string, string> = {
    executive_summary: 'Executive Summary',
    market_analysis: 'Market Analysis',
    risk_assessment: 'Risk Assessment',
    value_proposition: 'Value Proposition',
    testimonial: 'Customer Testimonial',
    market_description: 'Market Description',
    competitive_advantage: 'Competitive Advantage',
    market_trends: 'Market Trends',
    partnership_objective: 'Partnership Objective',
  };

  const generateSuggestions = async () => {
    setIsLoading(true);
    setSuggestions([]);

    const readString = (value: unknown): string | undefined =>
      typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
    const readNumber = (value: unknown): number | undefined =>
      typeof value === 'number' && Number.isFinite(value) ? value : undefined;

    const normalizedContext = {
      ...context,
      business_name:
        readString(context.business_name) ||
        readString(context.company_name) ||
        readString(context.market_name) ||
        readString(context.your_company_name) ||
        'The Business',
      industry: readString(context.industry) || 'technology',
      target_market:
        readString(context.target_market) ||
        readString(context.target_customer_description) ||
        readString(context.geographic_focus) ||
        'small and medium businesses',
      location: readString(context.location) || readString(context.geographic_focus),
      revenue: readNumber(context.revenue) ?? readNumber(context.monthly_revenue) ?? readNumber(context.mrr) ?? 0,
      roi: readNumber(context.roi) ?? 0,
      payback_months: readNumber(context.payback_months) ?? readNumber(context.break_even_months) ?? 0,
    };

    try {
      const { data, error } = await supabase.functions.invoke('generate-document-content', {
        body: {
          section_type: sectionType,
          context: normalizedContext,
          current_content: currentContent,
          count: 3,
        },
      });

      if (error) throw error;

      if (!data?.success || !Array.isArray(data?.suggestions)) {
        throw new Error('No suggestions returned from AI service');
      }

      const nextSuggestions = data.suggestions
        .filter((content: unknown): content is string => typeof content === 'string' && content.trim().length > 0)
        .map((content: string, index: number) => ({
          id: `suggestion-${index}`,
          content,
        }));

      if (nextSuggestions.length === 0) {
        throw new Error('No usable suggestions generated');
      }

      setSuggestions(nextSuggestions);
    } catch (error: any) {
      logger.error('AI generation error:', error);

      const status = error?.context?.status;
      let backendMessage = '';
      const body = error?.context?.body;

      if (typeof body === 'string') {
        try {
          backendMessage = JSON.parse(body)?.error || '';
        } catch {
          backendMessage = '';
        }
      } else if (body && typeof body === 'object') {
        backendMessage = (body as { error?: string }).error || '';
      }

      const message =
        status === 429
          ? 'AI suggestions are temporarily rate-limited. Please retry in a minute.'
          : status === 402
          ? 'AI credits are currently unavailable. Please try again shortly.'
          : status === 403
          ? backendMessage || 'Your current plan does not allow AI document suggestions.'
          : status === 400
          ? backendMessage || 'Invalid AI suggestion request. Please refresh and retry.'
          : backendMessage || 'Failed to generate suggestions. Please try again.';

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (suggestion: Suggestion) => {
    onApply(suggestion.content);
    setIsOpen(false);
    toast.success('AI suggestion applied');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => {
            setIsOpen(true);
            if (suggestions.length === 0) {
              generateSuggestions();
            }
          }}
          className={cn(
            'gap-1.5 text-xs h-7 px-2',
            'bg-gradient-to-r from-primary/10 to-success/10',
            'hover:from-primary/20 hover:to-success/20',
            'text-primary border border-primary/20',
            className
          )}
        >
          <Zap className="w-3 h-3" />
          Generate with AI
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[400px] p-0" 
        align="end"
        side="bottom"
      >
        <div className="p-3 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Wand2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">AI Suggestions</p>
                <p className="text-xs text-muted-foreground">
                  {sectionLabels[sectionType]}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={generateSuggestions}
              disabled={isLoading}
              className="h-7 w-7"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>

        <div className="p-2 max-h-[350px] overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <p className="text-sm">Generating suggestions...</p>
              <p className="text-xs">This may take a few seconds</p>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      Option {index + 1}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground line-clamp-4 mb-3">
                    {suggestion.content}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleApply(suggestion)}
                      className="h-7 gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Use This
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Copy to clipboard
                        navigator.clipboard.writeText(suggestion.content);
                        toast.success('Copied to clipboard');
                      }}
                      className="h-7 text-xs"
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Zap className="w-6 h-6 mb-2 opacity-50" />
              <p className="text-sm">Click refresh to generate suggestions</p>
            </div>
          )}
        </div>

        <div className="p-2 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            AI suggestions are starting points. Review and customize as needed.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

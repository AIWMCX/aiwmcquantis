import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Scale, Settings, Code, Crown, Lock, Loader2, Download, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDocSignals } from '@/hooks/useDocSignals';
import type { TemplateCategory } from '@/types/document';
import type { DocTemplate } from '@/services/docs-engine';

interface DocTemplateCardProps {
  template: DocTemplate;
  isGenerating: boolean;
  isComplete: boolean;
  fileUrl?: string;
  onGenerate: () => void;
  isLocked: boolean;
  documentId?: string;
}

const CATEGORY_ICONS: Record<TemplateCategory, React.ReactNode> = {
  finance: <FileText className="w-5 h-5" />,
  legal: <Scale className="w-5 h-5" />,
  operations: <Settings className="w-5 h-5" />,
  tech: <Code className="w-5 h-5" />,
};

const CATEGORY_COLORS: Record<TemplateCategory, string> = {
  finance: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  legal: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  operations: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  tech: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
};

export function DocTemplateCard({
  template,
  isGenerating,
  isComplete,
  fileUrl,
  onGenerate,
  isLocked,
  documentId,
}: DocTemplateCardProps) {
  const category = (template.category as TemplateCategory) || 'finance';
  const estimatedTime = template.tier === 'plus' ? '~12s' : '~3s';
  const { recordSignal } = useDocSignals();

  const handleDownload = () => {
    if (fileUrl) {
      recordSignal(documentId ?? null, 'downloaded', undefined, {
        template_id: template.template_id,
        template_name: template.name,
      });
      window.open(fileUrl, '_blank');
    }
  };

  const handleRegenerate = () => {
    recordSignal(documentId ?? null, 'regenerated', undefined, {
      template_id: template.template_id,
      template_name: template.name,
    });
    onGenerate();
  };

  return (
    <Card
      className={cn(
        'relative transition-all hover:shadow-md',
        isLocked && 'opacity-60',
        isComplete && 'border-green-500/50'
      )}
    >
      {isLocked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/30 backdrop-blur-[1px]">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className={cn('p-2 rounded-lg', CATEGORY_COLORS[category])}>
            {CATEGORY_ICONS[category]}
          </div>
          <div className="flex items-center gap-2">
            {template.tier === 'plus' ? (
              <Badge variant="secondary" className="gap-1">
                <Crown className="w-3 h-3" />
                Plus
              </Badge>
            ) : (
              <Badge variant="outline">Free</Badge>
            )}
          </div>
        </div>
        <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {(template as any).description ?? 'Generate this document from your analysis.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="capitalize">{template.category}</span>
          <span>Est. {estimatedTime}</span>
        </div>

        {/* Button states */}
        {isLocked ? (
          <Button
            variant="default"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            onClick={onGenerate}
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade to Plus
          </Button>
        ) : isGenerating ? (
          <Button variant="outline" className="w-full" disabled>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </Button>
        ) : isComplete ? (
          <div className="flex gap-2">
            <Button
              variant="default"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="ghost" size="icon" onClick={handleRegenerate} title="Regenerate">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button variant="default" className="w-full" onClick={onGenerate}>
            Generate →
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

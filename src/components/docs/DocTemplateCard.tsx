import React from 'react';
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
  const estimatedTime = template.tier === 'plus' ? '~12 seconds' : '~3 seconds';
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
    <div
      className={cn(
        'q-card relative rounded-[var(--q-radius-lg)] border border-[var(--q-border-default)] bg-[var(--q-bg-elevated)] p-5',
        'transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-[var(--q-border-strong)]',
        isComplete && 'border-[var(--q-status-green)]/50',
      )}
    >
      {/* Locked overlay */}
      {isLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-[var(--q-radius-lg)] bg-[var(--q-bg-surface)]/40 backdrop-blur-[2px]">
          <Lock className="w-5 h-5 text-[var(--q-text-tertiary)] mb-1" />
          <span className="text-xs font-medium text-[var(--q-text-secondary)]">🔒 Plus Plan</span>
        </div>
      )}

      {/* Top row: icon + tier badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-[var(--q-radius-md)] bg-[var(--q-accent-glow)] text-[var(--q-accent-primary)]">
          {CATEGORY_ICONS[category] ?? <FileText className="w-5 h-5" />}
        </div>
        {template.tier === 'plus' ? (
          <Badge className="bg-gradient-to-r from-[var(--q-accent-primary)] to-[var(--q-accent-secondary)] text-white border-0 gap-1 text-[10px]">
            <Crown className="w-3 h-3" /> Plus
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] text-[var(--q-text-tertiary)]">Free</Badge>
        )}
      </div>

      {/* Title + description */}
      <h4 className="text-sm font-semibold text-[var(--q-text-primary)] mb-1" style={{ fontFamily: 'var(--q-font-heading)' }}>
        {template.name}
      </h4>
      <p className="text-xs text-[var(--q-text-secondary)] line-clamp-2 mb-3">
        {(template as any).description ?? 'Generate this document from your analysis.'}
      </p>

      {/* Generation time */}
      <p className="text-[11px] text-[var(--q-text-tertiary)] mb-3">{estimatedTime}</p>

      {/* Button states */}
      {isLocked ? (
        <Button
          className="w-full bg-gradient-to-r from-[var(--q-accent-primary)] to-[var(--q-accent-secondary)] text-white border-0 text-xs h-9"
          onClick={onGenerate}
        >
          <Crown className="w-3.5 h-3.5 mr-1.5" />
          Upgrade to unlock →
        </Button>
      ) : isGenerating ? (
        <div className="w-full h-9 rounded-[var(--q-radius-md)] bg-[var(--q-bg-overlay)] overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--q-accent-primary)]/20 to-transparent animate-[shimmer_1.5s_infinite]" />
          <div className="flex items-center justify-center h-full text-xs font-medium text-[var(--q-text-secondary)]">
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Generating...
          </div>
        </div>
      ) : isComplete ? (
        <div className="flex gap-2">
          <Button
            className="flex-1 bg-[var(--q-status-green)] hover:bg-[var(--q-status-green)]/90 text-white text-xs h-9"
            onClick={handleDownload}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-[var(--q-text-tertiary)]" onClick={handleRegenerate} title="Regenerate">
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <Button className="w-full text-xs h-9" onClick={onGenerate}>
          Generate →
        </Button>
      )}

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

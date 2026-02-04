import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Scale, Settings, Code, Crown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocTemplate, TemplateCategory } from '@/types/document';

interface TemplateCardProps {
  template: DocTemplate;
  isSelected?: boolean;
  onSelect: () => void;
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

export function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  const category = template.category as TemplateCategory;
  
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md hover:border-primary/50',
        isSelected && 'ring-2 ring-primary border-primary'
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className={cn('p-2 rounded-lg', CATEGORY_COLORS[category])}>
            {CATEGORY_ICONS[category]}
          </div>
          <div className="flex items-center gap-2">
            {template.tier === 'plus' && (
              <Badge variant="secondary" className="gap-1">
                <Crown className="w-3 h-3" />
                Plus
              </Badge>
            )}
            {isSelected && (
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
          </div>
        </div>
        <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {template.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="capitalize">{template.category}</span>
          <span>{template.usage_count.toLocaleString()} uses</span>
        </div>
      </CardContent>
    </Card>
  );
}

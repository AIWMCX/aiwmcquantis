import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTemplates } from '@/hooks/useTemplates';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { DocTemplateCard } from './DocTemplateCard';
import { DocGenerationProgress } from './DocGenerationProgress';
import { requestDocGeneration, type DocTemplate } from '@/services/docs-engine';
import type { TemplateCategory } from '@/types/document';
import type { QuantisReport } from '@/types/report-schema';
import { FileText } from 'lucide-react';

interface DocGeneratorPanelProps {
  analysisId: string;
  report: QuantisReport;
  userId: string;
}

type TabValue = 'all' | TemplateCategory;

const TABS: { value: TabValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'finance', label: 'Finance' },
  { value: 'legal', label: 'Legal' },
  { value: 'operations', label: 'Operations' },
  { value: 'tech', label: 'Tech' },
];

interface CompletedDoc {
  templateId: string;
  fileUrl: string;
}

interface ActiveJob {
  jobId: string;
  templateId: string;
  templateName: string;
  estimatedMs: number;
}

export function DocGeneratorPanel({ analysisId, report, userId }: DocGeneratorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [generatingDocId, setGeneratingDocId] = useState<string | null>(null);
  const [completedDocs, setCompletedDocs] = useState<CompletedDoc[]>([]);
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const { data: templates, isLoading } = useTemplates(
    activeTab === 'all' ? undefined : (activeTab as TemplateCategory)
  );
  const { isPlus, remainingAnalyses } = useSubscription();
  const { toast } = useToast();

  const handleGenerate = async (template: DocTemplate) => {
    const isLocked = template.tier === 'plus' && !isPlus;
    if (isLocked) {
      setUpgradeOpen(true);
      return;
    }

    setGeneratingDocId(template.template_id);

    try {
      const result = await requestDocGeneration({
        analysisId,
        templateId: template.template_id,
        userId,
      });

      if (result.status === 'complete' && result.fileUrl) {
        setCompletedDocs((prev) => [
          ...prev.filter((d) => d.templateId !== template.template_id),
          { templateId: template.template_id, fileUrl: result.fileUrl! },
        ]);
        toast({
          title: 'Document ready',
          description: result.cacheHit
            ? 'Retrieved from cache'
            : `Generated in ${result.generationMs}ms`,
        });
      } else if (result.status === 'queued') {
        setActiveJob({
          jobId: result.jobId,
          templateId: template.template_id,
          templateName: template.name,
          estimatedMs: result.estimatedMs ?? 5000,
        });
      }
    } catch (err) {
      toast({
        title: 'Generation failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setGeneratingDocId(null);
    }
  };

  const handleJobComplete = (fileUrl: string) => {
    if (!activeJob) return;
    setCompletedDocs((prev) => [
      ...prev.filter((d) => d.templateId !== activeJob.templateId),
      { templateId: activeJob.templateId, fileUrl },
    ]);
    setActiveJob(null);
    toast({ title: 'Document ready', description: 'Your document has been generated.' });
  };

  const handleJobError = (message: string) => {
    setActiveJob(null);
    toast({ title: 'Generation failed', description: message, variant: 'destructive' });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Generate Documents
          </CardTitle>
          <CardDescription>
            Turn your analysis into professional documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeJob && (
            <DocGenerationProgress
              jobId={activeJob.jobId}
              templateName={activeJob.templateName}
              estimatedMs={activeJob.estimatedMs}
              onComplete={handleJobComplete}
              onError={handleJobError}
            />
          )}

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabValue)}
          >
            <TabsList>
              {TABS.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-48 rounded-lg bg-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : templates && templates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((t) => {
                    const completed = completedDocs.find(
                      (d) => d.templateId === t.template_id
                    );
                    return (
                      <DocTemplateCard
                        key={t.id}
                        template={t as unknown as import('@/services/docs-engine').DocTemplate}
                        isGenerating={generatingDocId === t.template_id}
                        isComplete={!!completed}
                        fileUrl={completed?.fileUrl}
                        onGenerate={() =>
                          handleGenerate(
                            t as unknown as import('@/services/docs-engine').DocTemplate
                          )
                        }
                        isLocked={t.tier === 'plus' && !isPlus}
                      />
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No templates available in this category.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <UpgradePrompt
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        remainingAnalyses={remainingAnalyses}
      />
    </>
  );
}

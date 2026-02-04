import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TemplatePicker } from '@/components/docs/TemplatePicker';
import { IntakeForm } from '@/components/docs/IntakeForm';
import { DocumentEditor } from '@/components/docs/DocumentEditor';
import { DocumentsList } from '@/components/docs/DocumentsList';
import { useDocument, useCreateDocument } from '@/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, FileText, FolderOpen } from 'lucide-react';
import type { DocTemplate, Document } from '@/types/document';

type Step = 'list' | 'pick-template' | 'intake' | 'edit';

export default function DocsStudio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const analysisId = searchParams.get('analysis') || undefined;
  
  const [step, setStep] = useState<Step>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<DocTemplate | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  
  const { data: editingDoc } = useDocument(editingDocId || '');
  const { mutate: createDocument, isPending: isCreating } = useCreateDocument();

  const handleTemplateSelect = (template: DocTemplate) => {
    setSelectedTemplate(template);
    setStep('intake');
  };

  const handleIntakeSubmit = (variables: Record<string, unknown>) => {
    if (!selectedTemplate) return;

    // Generate initial document JSON from template
    const documentJson = {
      type: 'doc',
      content: selectedTemplate.template_json.blocks.map(block => ({
        type: block.type === 'heading' ? 'heading' : 'paragraph',
        attrs: block.level ? { level: block.level } : undefined,
        content: block.content ? [{
          type: 'text',
          text: block.content.replace(/\{\{(\w+)\}\}/g, (_, key) => 
            String(variables[key] || `{{${key}}}`)
          ),
        }] : undefined,
      })),
    };

    createDocument({
      templateId: selectedTemplate.template_id,
      analysisId,
      title: `${selectedTemplate.name} - ${new Date().toLocaleDateString()}`,
      variables,
      documentJson,
    }, {
      onSuccess: (doc) => {
        setEditingDocId(doc.id);
        setStep('edit');
      },
    });
  };

  const handleEditDocument = (doc: Document) => {
    setEditingDocId(doc.id);
    setStep('edit');
  };

  const handleBack = () => {
    if (step === 'edit') {
      setEditingDocId(null);
      setStep('list');
    } else if (step === 'intake') {
      setStep('pick-template');
    } else if (step === 'pick-template') {
      setStep('list');
    }
  };

  // Edit mode
  if (step === 'edit' && editingDoc) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border p-4">
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Documents
          </Button>
        </header>
        <div className="flex-1">
          <DocumentEditor document={editingDoc} onBack={handleBack} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Docs Studio</h1>
            <p className="text-muted-foreground">
              Create professional documents from templates
            </p>
          </div>
          {step === 'list' && (
            <Button onClick={() => setStep('pick-template')} className="gap-2">
              <Plus className="w-4 h-4" />
              New Document
            </Button>
          )}
          {step !== 'list' && (
            <Button variant="outline" onClick={handleBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          )}
        </div>

        {/* Content */}
        {step === 'list' && (
          <Tabs defaultValue="documents" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="documents" className="gap-2">
                <FolderOpen className="w-4 h-4" />
                My Documents
              </TabsTrigger>
              <TabsTrigger value="templates" className="gap-2">
                <FileText className="w-4 h-4" />
                Templates
              </TabsTrigger>
            </TabsList>
            <TabsContent value="documents">
              <DocumentsList 
                onEdit={handleEditDocument}
                onNew={() => setStep('pick-template')}
              />
            </TabsContent>
            <TabsContent value="templates">
              <TemplatePicker onSelect={handleTemplateSelect} />
            </TabsContent>
          </Tabs>
        )}

        {step === 'pick-template' && (
          <TemplatePicker 
            onSelect={handleTemplateSelect}
            selectedId={selectedTemplate?.template_id}
          />
        )}

        {step === 'intake' && selectedTemplate && (
          <IntakeForm
            template={selectedTemplate.template_json}
            onSubmit={handleIntakeSubmit}
            onBack={() => setStep('pick-template')}
            isLoading={isCreating}
          />
        )}
      </div>
    </div>
  );
}

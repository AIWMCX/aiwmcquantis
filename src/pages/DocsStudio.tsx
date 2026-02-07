import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTemplates, useTemplate } from '@/hooks/useTemplates';
import { useCreateDocument, useDocument } from '@/hooks/useDocuments';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentDownload } from '@/hooks/useDocumentDownload';
import { DocumentEditor } from '@/components/docs/DocumentEditor';
import { PreviewDownloadBar } from '@/components/docs/PreviewDownloadBar';
import { InvoiceForm, QuarterlySummaryForm, NDAForm, BusinessPlanForm, PitchDeckForm, OnePagePlanForm, FinancialForecastForm, PartnershipForm, FounderAgreementForm, MarketAnalysisForm } from '@/components/docs/forms';
import { UpgradePrompt } from '@/components/UpgradePrompt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Plus, 
  FileText, 
  FolderOpen, 
  Eye, 
  EyeOff,
  Sparkles,
  FileSpreadsheet,
  BarChart3,
  Scale,
  Lock,
  Loader2,
  Zap,
  Users,
} from 'lucide-react';
import { DocumentsList } from '@/components/docs/DocumentsList';
import type { DocTemplate, Document } from '@/types/document';
import { sanitizePreviewHTML } from '@/lib/htmlSanitizer';
import '@/styles/docs-studio.css';

type Step = 'list' | 'pick-template' | 'generate' | 'edit';

// Template configuration with categories and badges
const TEMPLATE_CARDS = [
  {
    id: 'professional-invoice',
    name: 'Professional Invoice',
    description: 'Generate invoices instantly with automatic calculations, line items, and tax support.',
    icon: FileSpreadsheet,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    category: 'financial',
    popular: true,
    hasQuantisIntegration: true,
  },
  {
    id: 'quarterly-summary',
    name: 'Quarterly Summary',
    description: 'Comprehensive business performance reports with financials, metrics, and outlook.',
    icon: BarChart3,
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    category: 'financial',
    popular: true,
    hasQuantisIntegration: true,
    hasAI: true,
  },
  {
    id: 'nda-agreement',
    name: 'NDA Agreement',
    description: 'Professional mutual non-disclosure agreement with full legal clauses.',
    icon: Scale,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    category: 'legal',
    popular: true,
    hasQuantisIntegration: true,
  },
  {
    id: 'business-plan',
    name: 'Business Plan',
    description: 'Comprehensive 5-section business plan with executive summary and financial projections.',
    icon: FileText,
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    category: 'planning',
    popular: true,
    hasQuantisIntegration: true,
    hasAI: true,
  },
  {
    id: 'pitch-deck',
    name: 'Pitch Deck',
    description: '10-slide investor pitch deck with TAM/SAM/SOM, financials, and team sections.',
    icon: Zap,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    category: 'fundraising',
    popular: true,
    hasQuantisIntegration: true,
    hasAI: true,
  },
  {
    id: 'one-page-plan',
    name: 'One-Page Plan',
    description: 'Concise single-page business summary with vision, metrics, and key highlights.',
    icon: FileText,
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    category: 'planning',
    hasQuantisIntegration: true,
  },
  {
    id: 'financial-forecast',
    name: 'Financial Forecast',
    description: '3-scenario financial projections with pessimistic, base, and optimistic views.',
    icon: BarChart3,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    category: 'financial',
    hasQuantisIntegration: true,
  },
  {
    id: 'partnership-proposal',
    name: 'Partnership Proposal',
    description: 'Professional partnership proposal with terms, responsibilities, and value proposition.',
    icon: Users,
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    category: 'legal',
    hasQuantisIntegration: true,
    hasAI: true,
  },
  {
    id: 'founder-agreement',
    name: 'Founder Agreement',
    description: 'Co-founder equity, vesting, IP assignment, and governance agreement.',
    icon: Users,
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    category: 'legal',
  },
  {
    id: 'market-analysis',
    name: 'Market Analysis',
    description: 'Comprehensive market research with TAM/SAM/SOM, competition, and trends.',
    icon: BarChart3,
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    category: 'planning',
    hasQuantisIntegration: true,
    hasAI: true,
  },
];

export default function DocsStudio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const analysisId = searchParams.get('analysis') || undefined;
  
  // ALL HOOKS MUST BE AT THE TOP - before any conditional returns
  const [step, setStep] = useState<Step>('list');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [previewHTML, setPreviewHTML] = useState<string>('');
  const [showPreview, setShowPreview] = useState(true);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  const { data: templates, isLoading: templatesLoading } = useTemplates();
  const { data: selectedTemplate } = useTemplate(selectedTemplateId || '');
  const { data: editingDoc } = useDocument(editingDocId || '');
  const { mutate: createDocument, isPending: isCreating } = useCreateDocument();
  
  // CRITICAL: Check subscription status
  const { isPlus, loading: subscriptionLoading, remainingAnalyses } = useSubscription();
  
  // Get current user for email check
  const { user } = useAuth();
  
  // Client-side document download
  const { downloadPDF, downloadHTML, isDownloading } = useDocumentDownload();
  
  // Beta whitelist removed - all Plus subscribers can now access Docs Studio

  // All useCallback hooks MUST be defined before any conditional returns
  const handlePreviewUpdate = useCallback((html: string) => {
    setPreviewHTML(html);
  }, []);

  const handleGenerate = useCallback((documentData: Record<string, unknown>) => {
    if (!selectedTemplate) return;

    // Generate initial document JSON from template + user data
    const documentJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Document generated from template' }],
        },
      ],
    };

    createDocument({
      templateId: selectedTemplate.template_id,
      analysisId,
      title: `${selectedTemplate.name} - ${new Date().toLocaleDateString()}`,
      variables: documentData,
      documentJson,
    }, {
      onSuccess: (doc) => {
        setEditingDocId(doc.id);
        setStep('edit');
      },
    });
  }, [selectedTemplate, analysisId, createDocument]);

  const handleTemplateSelect = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
    setStep('generate');
  }, []);

  const handleEditDocument = useCallback((doc: Document) => {
    setEditingDocId(doc.id);
    setStep('edit');
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'edit') {
      setEditingDocId(null);
      setStep('list');
    } else if (step === 'generate') {
      setSelectedTemplateId(null);
      setPreviewHTML('');
      setStep('pick-template');
    } else if (step === 'pick-template') {
      setStep('list');
    }
  }, [step]);

  // NOW we can have conditional returns - after all hooks are defined

  // Show loading while checking subscription
  if (subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading Docs Studio...</p>
        </div>
      </div>
    );
  }

  // CRITICAL: Gate feature behind Plus subscription
  if (!isPlus) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6">
          {/* Back button */}
          <Button variant="ghost" onClick={() => navigate('/app')} className="mb-8 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          {/* Locked Feature Card */}
          <Card className="border-2 border-dashed border-primary/30">
            <CardContent className="py-16">
              <div className="text-center max-w-md mx-auto">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Lock className="w-10 h-10 text-primary" />
                </div>
                
                <Badge variant="secondary" className="mb-4">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Plus Feature
                </Badge>
                
                <h1 className="text-3xl font-bold text-foreground mb-4">
                  Docs Studio
                </h1>
                
                <p className="text-muted-foreground mb-8">
                  Generate professional business documents instantly with AI-powered templates, 
                  automatic calculations, and one-click export. Included free with your Plus subscription.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <FileSpreadsheet className="w-6 h-6 text-primary mb-2" />
                    <h3 className="font-medium text-sm">Invoices</h3>
                    <p className="text-xs text-muted-foreground">Auto-calculate totals</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <BarChart3 className="w-6 h-6 text-primary mb-2" />
                    <h3 className="font-medium text-sm">Reports</h3>
                    <p className="text-xs text-muted-foreground">Financial summaries</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <Scale className="w-6 h-6 text-primary mb-2" />
                    <h3 className="font-medium text-sm">Legal Docs</h3>
                    <p className="text-xs text-muted-foreground">NDAs & contracts</p>
                  </div>
                </div>

                <Button 
                  size="lg" 
                  onClick={() => setShowUpgradePrompt(true)}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Upgrade to Plus - $17/mo
                </Button>
                
                <p className="text-xs text-muted-foreground mt-4">
                  14-day free trial • Cancel anytime
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Feature Highlights */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Professional Templates</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Pre-built templates for invoices, quarterly reports, NDAs, and more. 
                All professionally formatted.
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Instant Generation</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Fill in the details once, get a perfect document. Auto-calculate 
                totals, taxes, and financial metrics.
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Analysis Integration</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Connect your business analyses to automatically populate 
                financial projections in your documents.
              </p>
            </div>
            <div className="p-6 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Export Anywhere</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Download as PDF, DOCX, or Markdown. Share with investors, 
                partners, or your team.
              </p>
            </div>
          </div>
        </div>

        <UpgradePrompt 
          open={showUpgradePrompt} 
          onOpenChange={setShowUpgradePrompt}
          remainingAnalyses={remainingAnalyses}
        />
      </div>
    );
  }

  // Edit mode - full screen editor
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

  // Generate mode - form with live preview
  if (step === 'generate' && selectedTemplateId) {
    const templateCard = TEMPLATE_CARDS.find(t => t.id === selectedTemplateId);
    const Icon = templateCard?.icon || FileText;

    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1800px] mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Button variant="ghost" onClick={handleBack} className="mb-4 -ml-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${templateCard?.color || 'bg-primary/10'}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {templateCard?.name || selectedTemplate?.name || 'Create Document'}
                  </h1>
                  <p className="text-muted-foreground">
                    Fill in the details below. Content is pre-filled and fully customizable.
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              className="gap-2"
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </div>

          {/* Content Grid */}
          <div className={`grid gap-8 ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-3xl'}`}>
            {/* Left Column: Form */}
            <div className="space-y-6">
              {selectedTemplateId === 'professional-invoice' && (
                <InvoiceForm
                  template={selectedTemplate}
                  onGenerate={handleGenerate}
                  onPreviewUpdate={handlePreviewUpdate}
                  isGenerating={isCreating}
                />
              )}

              {selectedTemplateId === 'quarterly-summary' && (
                <QuarterlySummaryForm
                  template={selectedTemplate}
                  onGenerate={handleGenerate}
                  onPreviewUpdate={handlePreviewUpdate}
                  isGenerating={isCreating}
                />
              )}

              {selectedTemplateId === 'nda-agreement' && (
                <NDAForm
                  template={selectedTemplate}
                  onGenerate={handleGenerate}
                  onPreviewUpdate={handlePreviewUpdate}
                  isGenerating={isCreating}
                />
              )}

              {selectedTemplateId === 'business-plan' && (
                <BusinessPlanForm
                  template={selectedTemplate}
                  onGenerate={handleGenerate}
                  onPreviewUpdate={handlePreviewUpdate}
                  isGenerating={isCreating}
                />
              )}

              {selectedTemplateId === 'pitch-deck' && (
                <PitchDeckForm
                  template={selectedTemplate}
                  onGenerate={handleGenerate}
                  onPreviewUpdate={handlePreviewUpdate}
                  isGenerating={isCreating}
                />
              )}

              {selectedTemplateId === 'one-page-plan' && (
                <OnePagePlanForm
                  template={selectedTemplate}
                  onGenerate={handleGenerate}
                  onPreviewUpdate={handlePreviewUpdate}
                  isGenerating={isCreating}
                />
              )}

              {selectedTemplateId === 'financial-forecast' && (
                <FinancialForecastForm
                  template={selectedTemplate}
                  onGenerate={handleGenerate}
                  onPreviewUpdate={handlePreviewUpdate}
                  isGenerating={isCreating}
                />
              )}

              {selectedTemplateId === 'partnership-proposal' && (
                <PartnershipForm
                  template={selectedTemplate}
                  onGenerate={handleGenerate}
                  onPreviewUpdate={handlePreviewUpdate}
                  isGenerating={isCreating}
                />
              )}

              {selectedTemplateId === 'founder-agreement' && (
                <FounderAgreementForm
                  template={selectedTemplate}
                  onGenerate={handleGenerate}
                  onPreviewUpdate={handlePreviewUpdate}
                  isGenerating={isCreating}
                />
              )}

              {selectedTemplateId === 'market-analysis' && (
                <MarketAnalysisForm
                  template={selectedTemplate}
                  onGenerate={handleGenerate}
                  onPreviewUpdate={handlePreviewUpdate}
                  isGenerating={isCreating}
                />
              )}
            </div>

            {/* Right Column: Live Preview */}
            {showPreview && (
              <div className="lg:sticky lg:top-8 lg:self-start">
                <Card className="overflow-hidden">
                  <CardHeader className="py-3 bg-muted/50 border-b">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Live Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {previewHTML ? (
                      <div 
                        className="bg-white overflow-auto max-h-[calc(100vh-280px)]"
                        style={{ minHeight: '500px' }}
                        dangerouslySetInnerHTML={{ __html: sanitizePreviewHTML(previewHTML) }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-96 text-muted-foreground">
                        <div className="text-center">
                          <Eye className="w-12 h-12 mx-auto mb-4 opacity-30" />
                          <p>Preview will appear as you fill the form</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  {/* Download actions */}
                  <PreviewDownloadBar
                    onDownloadPDF={() => downloadPDF(previewHTML, templateCard?.name)}
                    onDownloadHTML={() => downloadHTML(previewHTML, templateCard?.name)}
                    isDownloading={isDownloading}
                    hasContent={!!previewHTML}
                  />
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Template picker view
  if (step === 'pick-template') {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Button variant="ghost" onClick={handleBack} className="mb-4 -ml-2">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold text-foreground">Choose a Template</h1>
              <p className="text-muted-foreground">
                Select a template to generate a professional document instantly
              </p>
            </div>
          </div>

          {/* Template Gallery */}
          <div className="doc-template-gallery">
            {TEMPLATE_CARDS.map((template) => {
              const Icon = template.icon;
              return (
                <Card
                  key={template.id}
                  className="doc-template-card cursor-pointer group"
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`w-14 h-14 rounded-xl ${template.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {template.popular && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                        {template.hasAI && (
                          <span className="doc-ai-badge">
                            <Zap className="w-3 h-3" />
                            AI
                          </span>
                        )}
                      </div>
                    </div>
                    <CardTitle className="mt-4 text-xl">{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                    
                    {/* Feature badges */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {template.hasQuantisIntegration && (
                        <span className="doc-quantis-badge">
                          <Sparkles className="w-3 h-3" />
                          Auto-fill
                        </span>
                      )}
                    </div>
                    
                    <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground" variant="outline">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create {template.name.split(' ')[0]}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Additional Templates from DB */}
          {templatesLoading ? (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          ) : templates && templates.length > 3 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">More Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.slice(3).map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleTemplateSelect(template.template_id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-xs text-muted-foreground">{template.category}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default: List view with tabs
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Docs Studio</h1>
            <p className="text-muted-foreground">
              Create professional documents from templates instantly
            </p>
          </div>
          <Button onClick={() => setStep('pick-template')} className="gap-2">
            <Plus className="w-4 h-4" />
            New Document
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="documents" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              My Documents
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="w-4 h-4" />
              Quick Create
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="documents">
            <DocumentsList 
              onEdit={handleEditDocument}
              onNew={() => setStep('pick-template')}
            />
          </TabsContent>
          
          <TabsContent value="templates">
            {/* Quick Template Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TEMPLATE_CARDS.map((template) => {
                const Icon = template.icon;
                return (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group"
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className={`w-14 h-14 rounded-xl ${template.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <Icon className="w-7 h-7" />
                        </div>
                        {template.popular && (
                          <Badge variant="secondary" className="text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Pre-filled
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="mt-4 text-xl">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{template.description}</p>
                      <Button className="w-full" variant="outline">
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create Instantly
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

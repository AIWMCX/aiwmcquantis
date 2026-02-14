import React, { useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentDownload } from '@/hooks/useDocumentDownload';
import { useDocDownloadLimit } from '@/hooks/useDocDownloadLimit';
import { useCreateDocument } from '@/hooks/useDocuments';
import { PreviewDownloadBar } from '@/components/docs/PreviewDownloadBar';
import { DocumentsList } from '@/components/docs/DocumentsList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  FileText, 
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
  Download,
  Crown,
  AlertTriangle,
  FolderOpen,
  Plus,
} from 'lucide-react';
import type { DocTemplate } from '@/types/document';
import type { Document } from '@/types/document';
import { sanitizePreviewHTML } from '@/lib/htmlSanitizer';
import { toast } from 'sonner';
import '@/styles/docs-studio.css';

// Lazy-load form components - only the selected template loads
const InvoiceForm = lazy(() => import('@/components/docs/forms/InvoiceForm').then(m => ({ default: m.InvoiceForm })));
const QuarterlySummaryForm = lazy(() => import('@/components/docs/forms/QuarterlySummaryForm').then(m => ({ default: m.QuarterlySummaryForm })));
const NDAForm = lazy(() => import('@/components/docs/forms/NDAForm').then(m => ({ default: m.NDAForm })));
const BusinessPlanForm = lazy(() => import('@/components/docs/forms/BusinessPlanForm').then(m => ({ default: m.BusinessPlanForm })));
const PitchDeckForm = lazy(() => import('@/components/docs/forms/PitchDeckForm').then(m => ({ default: m.PitchDeckForm })));
const OnePagePlanForm = lazy(() => import('@/components/docs/forms/OnePagePlanForm').then(m => ({ default: m.OnePagePlanForm })));
const FinancialForecastForm = lazy(() => import('@/components/docs/forms/FinancialForecastForm').then(m => ({ default: m.FinancialForecastForm })));
const PartnershipForm = lazy(() => import('@/components/docs/forms/PartnershipForm').then(m => ({ default: m.PartnershipForm })));
const FounderAgreementForm = lazy(() => import('@/components/docs/forms/FounderAgreementForm').then(m => ({ default: m.FounderAgreementForm })));
const MarketAnalysisForm = lazy(() => import('@/components/docs/forms/MarketAnalysisForm').then(m => ({ default: m.MarketAnalysisForm })));

// Lazy-load the rich editor (heavy TipTap dependency)
const DocumentEditor = lazy(() => import('@/components/docs/DocumentEditor').then(m => ({ default: m.DocumentEditor })));

// Loading fallback for lazy forms
function FormLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

type Step = 'home' | 'pick-template' | 'generate' | 'edit';

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
    freeTier: true,
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
    freeTier: true,
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
    freeTier: true,
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
    freeTier: false,
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
    freeTier: false,
  },
  {
    id: 'one-page-plan',
    name: 'One-Page Plan',
    description: 'Concise single-page business summary with vision, metrics, and key highlights.',
    icon: FileText,
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    category: 'planning',
    hasQuantisIntegration: true,
    freeTier: false,
  },
  {
    id: 'financial-forecast',
    name: 'Financial Forecast',
    description: '3-scenario financial projections with pessimistic, base, and optimistic views.',
    icon: BarChart3,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    category: 'financial',
    hasQuantisIntegration: true,
    freeTier: false,
  },
  {
    id: 'partnership-proposal',
    name: 'Partnership Proposal',
    description: 'Professional partnership proposal with terms, responsibilities, and value proposition.',
    icon: Users,
    color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
    category: 'legal',
    hasQuantisIntegration: true,
    freeTier: false,
  },
  {
    id: 'founder-agreement',
    name: 'Founder Agreement',
    description: 'Co-founder equity, vesting, IP assignment, and governance agreement.',
    icon: Users,
    color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    category: 'legal',
    freeTier: false,
  },
  {
    id: 'market-analysis',
    name: 'Market Analysis',
    description: 'Comprehensive market research with TAM/SAM/SOM, competition, and trends.',
    icon: BarChart3,
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    category: 'planning',
    hasQuantisIntegration: true,
    freeTier: false,
  },
];

export default function DocsStudio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const analysisId = searchParams.get('analysis') || undefined;
  
  // ALL HOOKS MUST BE AT THE TOP - before any conditional returns
  const [step, setStep] = useState<Step>('home');
  const [activeTab, setActiveTab] = useState<'templates' | 'documents'>('templates');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [previewHTML, setPreviewHTML] = useState<string>('');
  const [showPreview, setShowPreview] = useState(true);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  
  // CRITICAL: Check subscription status
  const { isPlus, loading: subscriptionLoading, createCheckout } = useSubscription();
  
  // Get current user
  const { user, isLoading: authLoading } = useAuth();
  
  // Client-side document download
  const { downloadPDF, downloadHTML, isDownloading } = useDocumentDownload();
  
  // Document creation (save to DB)
  const { mutate: createDocument, isPending: isCreating } = useCreateDocument();
  
  // Download rate limiting
  const { 
    canDownload, 
    downloadsToday, 
    dailyLimit, 
    isUnlimited, 
    isFreeTier, 
    isTemplateAvailable, 
    recordDownload,
    nextResetAt,
    isLoading: limitLoading,
  } = useDocDownloadLimit();

  // All useCallback hooks MUST be defined before any conditional returns
  const handlePreviewUpdate = useCallback((html: string) => {
    setPreviewHTML(html);
  }, []);

  // Save document to DB + trigger download
  const saveAndDownload = useCallback(async (
    templateId: string,
    html: string,
    format: 'pdf' | 'html',
    downloadFn: (html: string, title?: string) => void,
  ) => {
    const templateCard = TEMPLATE_CARDS.find(t => t.id === templateId);
    const title = templateCard?.name || 'Untitled Document';

    // Rate limit check for free tier
    if (!isUnlimited) {
      const allowed = await recordDownload(templateId, format);
      if (!allowed) {
        toast.error('Daily download limit reached. Upgrade to Plus for unlimited downloads.', { duration: 5000 });
        return;
      }
    } else {
      await recordDownload(templateId, format);
    }

    // Save to DB (Plus users only — free tier keeps form-to-download)
    if (isPlus) {
      // Convert the live preview HTML into a TipTap-compatible doc with raw HTML content
      // This stores the actual rendered document so the editor can display it
      const documentJson = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: title }],
          },
          // Store the HTML snapshot as a custom node attribute for retrieval
        ],
        // Preserve the full HTML snapshot for the editor to parse
        attrs: {
          htmlSnapshot: html,
        },
      };

      createDocument({
        templateId,
        analysisId,
        title,
        variables: {},
        documentJson,
      });
    }

    // Trigger download
    downloadFn(html, title);
  }, [isUnlimited, isPlus, recordDownload, createDocument, analysisId]);

  const handleGenerate = useCallback((_documentData: Record<string, unknown>) => {
    toast.info('Use the Download button on the preview to export your document.');
  }, []);

  const handleTemplateSelect = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
    setStep('generate');
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'generate') {
      setSelectedTemplateId(null);
      setPreviewHTML('');
      setStep('home');
    } else if (step === 'edit') {
      setEditingDocument(null);
      setStep('home');
      setActiveTab('documents');
    }
  }, [step]);

  // Rate-limited download handlers with DB save
  const handleDownloadPDF = useCallback(async () => {
    if (!selectedTemplateId || !previewHTML) return;
    await saveAndDownload(selectedTemplateId, previewHTML, 'pdf', downloadPDF);
  }, [selectedTemplateId, previewHTML, saveAndDownload, downloadPDF]);

  const handleDownloadHTML = useCallback(async () => {
    if (!selectedTemplateId || !previewHTML) return;
    await saveAndDownload(selectedTemplateId, previewHTML, 'html', downloadHTML);
  }, [selectedTemplateId, previewHTML, saveAndDownload, downloadHTML]);

  // Open a saved document in the editor
  const handleEditDocument = useCallback((doc: Document) => {
    setEditingDocument(doc);
    setStep('edit');
  }, []);

  // Navigate to template picker from documents list
  const handleNewDocument = useCallback(() => {
    setActiveTab('templates');
  }, []);

  // NOW we can have conditional returns - after all hooks are defined

  // Show loading while checking auth/subscription
  if (authLoading || subscriptionLoading || limitLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading Docs Studio...</p>
        </div>
      </div>
    );
  }

  // Require authentication
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Sign in Required</h2>
            <p className="text-muted-foreground mb-6">
              Sign in to access Docs Studio and create professional documents.
            </p>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Editor mode — open a saved document in TipTap
  if (step === 'edit' && editingDocument) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[1800px] mx-auto">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <Button variant="ghost" onClick={handleBack} className="-ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Documents
            </Button>
          </div>
          <Suspense fallback={
            <div className="flex items-center justify-center h-[60vh]">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          }>
            <DocumentEditor document={editingDocument} onBack={handleBack} />
          </Suspense>
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
                    {templateCard?.name || 'Create Document'}
                  </h1>
                  <p className="text-muted-foreground">
                    Fill in the details below. Preview updates live.
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

          {/* Free tier download limit banner */}
          {isFreeTier && (
            <div className="mb-6 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Free Tier: {downloadsToday}/{dailyLimit} download used today
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {canDownload
                      ? 'You have 1 free download per day. Choose wisely!'
                      : `Limit reached. Resets at ${nextResetAt.toLocaleTimeString()}`
                    }
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30 shrink-0"
                onClick={() => createCheckout('plus')}
              >
                <Crown className="w-3 h-3" />
                Upgrade
              </Button>
            </div>
          )}

          {/* Content Grid */}
          <div className={`grid gap-8 ${showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-3xl'}`}>
            {/* Left Column: Form */}
            <div className="space-y-6">
              <Suspense fallback={<FormLoadingSkeleton />}>
                {selectedTemplateId === 'professional-invoice' && (
                  <InvoiceForm template={undefined} onGenerate={handleGenerate} onPreviewUpdate={handlePreviewUpdate} isGenerating={false} />
                )}
                {selectedTemplateId === 'quarterly-summary' && (
                  <QuarterlySummaryForm template={undefined} onGenerate={handleGenerate} onPreviewUpdate={handlePreviewUpdate} isGenerating={false} />
                )}
                {selectedTemplateId === 'nda-agreement' && (
                  <NDAForm template={undefined} onGenerate={handleGenerate} onPreviewUpdate={handlePreviewUpdate} isGenerating={false} />
                )}
                {selectedTemplateId === 'business-plan' && (
                  <BusinessPlanForm template={undefined} onGenerate={handleGenerate} onPreviewUpdate={handlePreviewUpdate} isGenerating={false} />
                )}
                {selectedTemplateId === 'pitch-deck' && (
                  <PitchDeckForm template={undefined} onGenerate={handleGenerate} onPreviewUpdate={handlePreviewUpdate} isGenerating={false} />
                )}
                {selectedTemplateId === 'one-page-plan' && (
                  <OnePagePlanForm template={undefined} onGenerate={handleGenerate} onPreviewUpdate={handlePreviewUpdate} isGenerating={false} />
                )}
                {selectedTemplateId === 'financial-forecast' && (
                  <FinancialForecastForm template={undefined} onGenerate={handleGenerate} onPreviewUpdate={handlePreviewUpdate} isGenerating={false} />
                )}
                {selectedTemplateId === 'partnership-proposal' && (
                  <PartnershipForm template={null} onGenerate={handleGenerate} onPreviewUpdate={handlePreviewUpdate} isGenerating={false} />
                )}
                {selectedTemplateId === 'founder-agreement' && (
                  <FounderAgreementForm template={null} onGenerate={handleGenerate} onPreviewUpdate={handlePreviewUpdate} isGenerating={false} />
                )}
                {selectedTemplateId === 'market-analysis' && (
                  <MarketAnalysisForm template={null} onGenerate={handleGenerate} onPreviewUpdate={handlePreviewUpdate} isGenerating={false} />
                )}
              </Suspense>
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
                    onDownloadPDF={handleDownloadPDF}
                    onDownloadHTML={handleDownloadHTML}
                    isDownloading={isDownloading || isCreating}
                    hasContent={!!previewHTML}
                    canDownload={canDownload || isUnlimited}
                    isFreeTier={isFreeTier}
                    downloadsToday={downloadsToday}
                    dailyLimit={dailyLimit}
                  />
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default: Home view with tabs
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Button variant="ghost" onClick={() => navigate('/app')} className="mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Docs Studio</h1>
            <p className="text-muted-foreground">
              {isPlus 
                ? 'Create, edit, and manage professional documents — unlimited access' 
                : 'Create documents from 3 free templates — 1 download per day'
              }
            </p>
          </div>
          {isFreeTier && (
            <Button 
              onClick={() => createCheckout('plus')} 
              className="gap-2"
              variant="default"
            >
              <Crown className="w-4 h-4" />
              Unlock All Templates
            </Button>
          )}
        </div>

        {/* Tier info banner for free users */}
        {isFreeTier && (
          <div className="mb-8 p-4 rounded-lg border bg-muted/30">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Free Tier Access</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You have access to <strong>3 templates</strong> (Invoice, Quarterly Summary, NDA) with <strong>1 download per day</strong>. 
                  Upgrade to <strong>Plus ($17/mo)</strong> to unlock all 10 templates with unlimited downloads.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tabs: Templates / My Documents */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'templates' | 'documents')} className="mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="templates" className="gap-2">
              <Plus className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FolderOpen className="w-4 h-4" />
              My Documents
              {isPlus && <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">Plus</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            <div className="doc-template-gallery">
              {TEMPLATE_CARDS.map((template) => {
                const Icon = template.icon;
                const available = isTemplateAvailable(template.id);
                const isLocked = !available;
                
                return (
                  <Card
                    key={template.id}
                    className={`doc-template-card group ${
                      isLocked 
                        ? 'opacity-60 cursor-not-allowed' 
                        : 'cursor-pointer'
                    }`}
                    onClick={() => {
                      if (isLocked) {
                        toast.error('Upgrade to Plus to access this template', {
                          action: {
                            label: 'Upgrade',
                            onClick: () => createCheckout('plus'),
                          },
                        });
                        return;
                      }
                      handleTemplateSelect(template.id);
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className={`w-14 h-14 rounded-xl ${template.color} flex items-center justify-center ${!isLocked ? 'group-hover:scale-110' : ''} transition-transform`}>
                          <Icon className="w-7 h-7" />
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          {template.freeTier ? (
                            <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Free
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              <Crown className="w-3 h-3 mr-1" />
                              Plus
                            </Badge>
                          )}
                          {isLocked && (
                            <Lock className="w-4 h-4 text-muted-foreground" />
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
                      
                      <Button 
                        className="w-full" 
                        variant={isLocked ? 'secondary' : 'outline'}
                        disabled={isLocked}
                      >
                        {isLocked ? (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Plus Only
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4 mr-2" />
                            Create {template.name.split(' ')[0]}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* My Documents Tab */}
          <TabsContent value="documents" className="mt-6">
            {isPlus ? (
              <DocumentsList 
                onEdit={handleEditDocument} 
                onNew={handleNewDocument} 
              />
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Lock className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Plus Feature</h3>
                  <p className="text-muted-foreground text-center mb-4 max-w-md">
                    Document management with editing, versioning, and re-exporting is available on the Plus plan. 
                    Free tier users can still create and download documents from templates.
                  </p>
                  <Button onClick={() => createCheckout('plus')} className="gap-2">
                    <Crown className="w-4 h-4" />
                    Upgrade to Plus
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

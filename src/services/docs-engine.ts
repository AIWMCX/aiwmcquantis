/**
 * DOCUMENT GENERATION SERVICE — docs-engine.ts
 *
 * Core service layer powering all document generation in Quantis.
 * Uses QMath (decimal.js) for monetary precision, SHA-256 caching,
 * sync/async generation paths, and performance signal tracking.
 *
 * @module DocsEngine
 * @version 1.0.0
 */

import { supabase } from '@/integrations/supabase/client';
import { QuantisMath as QMath } from '@/lib/quantis-math';
import { BENCHMARK_DATABASE, type IndustryBenchmark } from '@/lib/benchmark-calibrator';
import type { QuantisReport } from '@/types/report-schema';

import { logger } from '@/lib/logger';
// ─── Types ──────────────────────────────────────────────────

export interface ClientInfo {
  name: string;
  email?: string;
  company?: string;
  address?: string;
}

export interface DocGenerationRequest {
  analysisId: string;
  templateId: string;
  userId: string;
  customizations?: {
    docName?: string;
    clientInfo?: ClientInfo;
    additionalNotes?: string;
    sections?: string[];
  };
}

export interface DocGenerationResponse {
  jobId: string;
  status: 'complete' | 'queued';
  fileUrl?: string;
  estimatedMs?: number;
  cacheHit: boolean;
  generationMs?: number;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface RateIntelligenceInfo {
  userRate: number;
  marketRangeMin: number;
  marketRangeMax: number;
  recommendation: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  clientName: string;
  clientEmail?: string;
  clientCompany?: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  notes?: string;
  rateIntelligence?: RateIntelligenceInfo;
}

export interface DocTemplate {
  id: string;
  template_id: string;
  name: string;
  category: string;
  tier: string | null;
  template_json: Record<string, unknown>;
  is_active: boolean;
  usage_count: number | null;
}

export interface UserBrandProfile {
  company_name: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_preference: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  tax_id: string | null;
  invoice_prefix: string;
  invoice_counter: number;
}

export interface GeneratedDocument {
  id: string;
  title: string;
  template_id: string | null;
  analysis_id: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  document_json: Record<string, unknown>;
}

export type DocSignalType =
  | 'generated'
  | 'downloaded'
  | 'shared'
  | 'viewed'
  | 'printed'
  | 'cache_hit'
  | 'cache_miss'
  | 'invoice_sent'
  | 'invoice_paid'
  | 'export_failed';

// ─── Cache Key Generation ───────────────────────────────────

async function generateCacheKey(
  analysisId: string,
  templateId: string,
  userId: string,
  templateVersion: number
): Promise<string> {
  const raw = `${analysisId}:${templateId}:${userId}:${templateVersion}`;
  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── Benchmark Lookup ───────────────────────────────────────

function getTicketBenchmark(industryType: string): IndustryBenchmark | undefined {
  return BENCHMARK_DATABASE.find(
    (b) => b.industryType === industryType && b.parameter === 'avg_ticket_size'
  );
}

// ─── 1. requestDocGeneration ────────────────────────────────

export async function requestDocGeneration(
  req: DocGenerationRequest
): Promise<DocGenerationResponse> {
  // Parallel fetch: report, brand profile, template
  const [reportResult, brandResult, templateResult] = await Promise.all([
    supabase
      .from('analyses')
      .select('id, result')
      .eq('id', req.analysisId)
      .eq('user_id', req.userId)
      .single(),
    supabase
      .from('user_brand_profiles' as any)
      .select('*')
      .eq('user_id', req.userId)
      .maybeSingle(),
    supabase
      .from('doc_templates')
      .select('*')
      .eq('template_id', req.templateId)
      .eq('is_active', true)
      .single(),
  ]);

  if (reportResult.error || !reportResult.data) {
    throw new Error(`Analysis not found: ${reportResult.error?.message ?? 'No data'}`);
  }
  if (templateResult.error || !templateResult.data) {
    throw new Error(`Template not found: ${templateResult.error?.message ?? 'No data'}`);
  }

  const report = reportResult.data.result as unknown as QuantisReport;
  const brandProfile = (brandResult?.data as unknown as UserBrandProfile) ?? null;
  const template = templateResult.data as unknown as DocTemplate;
  const templateVersion = (template as any).version ? Number((template as any).version) : 1;

  // Generate cache key
  const cacheKey = await generateCacheKey(
    req.analysisId,
    req.templateId,
    req.userId,
    templateVersion
  );
  const storagePath = `docs/${req.userId}/${cacheKey}.pdf`;

  // Check cache in storage
  const { data: cachedFile } = await supabase.storage
    .from('document-exports')
    .createSignedUrl(storagePath, 86400); // 24h

  if (cachedFile?.signedUrl) {
    // Cache HIT
    recordDocSignal(req.analysisId, req.userId, 'cache_hit').catch(() => {});
    return {
      jobId: cacheKey,
      status: 'complete',
      fileUrl: cachedFile.signedUrl,
      cacheHit: true,
    };
  }

  // Cache MISS
  recordDocSignal(req.analysisId, req.userId, 'cache_miss').catch(() => {});

  // Determine fast-path vs async based on template
  const isFastPath = (template as any).is_fast_path !== false;

  if (isFastPath) {
    const result = await generateDocumentSync(
      report,
      template,
      brandProfile,
      req.userId,
      cacheKey,
      storagePath,
      req.customizations
    );
    return {
      jobId: cacheKey,
      status: 'complete',
      fileUrl: result.fileUrl,
      cacheHit: false,
      generationMs: result.generationMs,
    };
  }

  // Async path
  const asyncResult = await enqueueDocumentJob(req, template, templateVersion);
  return {
    jobId: asyncResult.jobId,
    status: 'queued',
    estimatedMs: asyncResult.estimatedMs,
    cacheHit: false,
  };
}

// ─── 2. generateDocumentSync ────────────────────────────────

async function generateDocumentSync(
  report: QuantisReport,
  template: DocTemplate,
  brandProfile: UserBrandProfile | null,
  userId: string,
  cacheKey: string,
  storagePath: string,
  customizations?: DocGenerationRequest['customizations']
): Promise<{ fileUrl: string; generationMs: number }> {
  const startMs = performance.now();

  // Build template data
  const templateData = {
    report,
    brand: brandProfile ?? {
      company_name: 'Quantis Report',
      primary_color: '#0F172A',
      secondary_color: '#6366F1',
      accent_color: '#10B981',
      font_preference: 'inter',
    },
    customizations: customizations ?? {},
    generatedAt: new Date().toISOString(),
  };

  // Invoke edge function for document content generation
  const { data: genResult, error: genError } = await supabase.functions.invoke(
    'generate-document-content',
    { body: { templateId: template.template_id, templateData } }
  );

  if (genError) {
    throw new Error(`Document generation failed: ${genError.message}`);
  }

  const generationMs = Math.round(performance.now() - startMs);

  // Upload to storage (non-critical — warn on failure)
  const pdfContent = genResult?.pdf ?? genResult?.content;
  if (pdfContent) {
    try {
      const blob =
        pdfContent instanceof Blob
          ? pdfContent
          : new Blob([pdfContent], { type: 'application/pdf' });

      await supabase.storage.from('document-exports').upload(storagePath, blob, {
        contentType: 'application/pdf',
        upsert: true,
      });
    } catch (uploadErr) {
      logger.warn('Cache upload failed (non-critical):', uploadErr);
    }
  }

  // Insert record into documents table
  const docTitle =
    customizations?.docName ?? `${template.name} — ${new Date().toLocaleDateString()}`;

  await supabase.from('documents').insert({
    user_id: userId,
    title: docTitle,
    template_id: template.id,
    document_json: templateData as any,
    status: 'complete',
  });

  // Get signed URL
  const { data: signedUrl } = await supabase.storage
    .from('document-exports')
    .createSignedUrl(storagePath, 86400);

  const fileUrl = signedUrl?.signedUrl ?? genResult?.url ?? '';

  // Record signal
  recordDocSignal(null, userId, 'generated', generationMs).catch(() => {});

  return { fileUrl, generationMs };
}

// ─── 3. enqueueDocumentJob ──────────────────────────────────

async function enqueueDocumentJob(
  req: DocGenerationRequest,
  template: DocTemplate,
  templateVersion: number
): Promise<{ jobId: string; estimatedMs: number }> {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const avgGenMs = (template as any).avg_gen_ms ?? 5000;

  const { error } = await supabase.from('doc_generation_jobs').insert({
    job_id: jobId,
    user_id: req.userId,
    analysis_id: req.analysisId,
    template_id: req.templateId,
    input_data: (req.customizations ?? {}) as any,
    status: 'queued',
    priority: 5,
  });

  if (error) {
    throw new Error(`Failed to enqueue job: ${error.message}`);
  }

  // Fire-and-forget worker trigger
  supabase.functions
    .invoke('process-doc-job', { body: { job_id: jobId } })
    .catch((err) => logger.warn('Worker trigger failed, cron will pick up:', err));

  return { jobId, estimatedMs: avgGenMs };
}

// ─── 4. generateInvoice ─────────────────────────────────────

export interface GenerateInvoiceOptions {
  taxRate?: number;
  discountAmount?: number;
  paymentTerms?: string;
  notes?: string;
  industryType?: string;
  renderPdf?: boolean;
}

export async function generateInvoice(
  userId: string,
  analysisId: string | null,
  clientInfo: ClientInfo,
  lineItems: Array<Partial<InvoiceLineItem>>,
  options: GenerateInvoiceOptions = {}
): Promise<{ invoice: InvoiceData; fileUrl: string | null }> {
  const {
    taxRate = 0,
    discountAmount = 0,
    paymentTerms = 'Net 30',
    notes,
    industryType,
    renderPdf = false,
  } = options;

  // Atomic invoice number
  const { data: invoiceNumber, error: rpcError } = await supabase.rpc(
    'get_next_invoice_number',
    { p_user_id: userId }
  );

  if (rpcError || !invoiceNumber) {
    throw new Error(`Invoice number generation failed: ${rpcError?.message ?? 'No result'}`);
  }

  // Calculate line items with QMath precision
  const computedItems: InvoiceLineItem[] = lineItems.map((item) => {
    const qty = item.quantity ?? 1;
    const price = item.unitPrice ?? 0;
    const total = QMath.multiply(qty, price).toNumber();
    return {
      description: item.description ?? '',
      quantity: qty,
      unitPrice: price,
      total,
    };
  });

  // Subtotal = sum of all line item totals via QMath
  const subtotal = computedItems
    .reduce((acc, item) => QMath.add(acc, item.total), QMath.multiply(0, 1))
    .toNumber();

  // Tax = subtotal * taxRate
  const taxAmount = QMath.multiply(subtotal, taxRate).toNumber();

  // Total = subtotal + tax - discount
  const total = QMath.subtract(QMath.add(subtotal, taxAmount), discountAmount).toNumber();

  // Issue & due dates
  const issueDate = new Date().toISOString().split('T')[0];
  const dueDays = paymentTerms === 'Net 15' ? 15 : paymentTerms === 'Net 60' ? 60 : 30;
  const dueDate = new Date(Date.now() + dueDays * 86400000).toISOString().split('T')[0];

  // Rate intelligence lookup
  let rateIntelligence: RateIntelligenceInfo | undefined;
  if (industryType && computedItems.length > 0) {
    const benchmark = getTicketBenchmark(industryType);
    if (benchmark) {
      const avgRate =
        computedItems.reduce((sum, item) => sum + item.unitPrice, 0) / computedItems.length;
      const { p25, p75 } = benchmark;
      let recommendation = 'Your pricing is within market range.';
      if (avgRate < p25) {
        recommendation = `Your avg rate ($${avgRate.toFixed(0)}) is below the market range ($${p25}–$${p75}). Consider raising prices.`;
      } else if (avgRate > p75) {
        recommendation = 'Premium pricing detected ✓';
      }
      rateIntelligence = {
        userRate: avgRate,
        marketRangeMin: p25,
        marketRangeMax: p75,
        recommendation,
      };
    }
  }

  const invoiceData: InvoiceData = {
    invoiceNumber: invoiceNumber as string,
    clientName: clientInfo.name,
    clientEmail: clientInfo.email,
    clientCompany: clientInfo.company,
    lineItems: computedItems,
    subtotal,
    taxRate,
    taxAmount,
    discountAmount,
    total,
    issueDate,
    dueDate,
    paymentTerms,
    notes,
    rateIntelligence,
  };

  // Persist to invoices table
  const { error: insertError } = await supabase.from('invoices').insert({
    user_id: userId,
    invoice_number: invoiceData.invoiceNumber,
    client_name: invoiceData.clientName,
    client_email: invoiceData.clientEmail ?? null,
    client_company: invoiceData.clientCompany ?? null,
    client_address: clientInfo.address ?? null,
    line_items: computedItems as any,
    subtotal,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    discount_amount: discountAmount,
    total_amount: total,
    issue_date: issueDate,
    due_date: dueDate,
    payment_terms: paymentTerms,
    notes: notes ?? null,
    status: 'draft',
    analysis_ref_id: analysisId,
  });

  if (insertError) {
    throw new Error(`Invoice save failed: ${insertError.message}`);
  }

  // Optional PDF render
  let fileUrl: string | null = null;
  if (renderPdf) {
    try {
      const { data: pdfResult } = await supabase.functions.invoke('generate-document-content', {
        body: { templateId: 'invoice_standard_v1', templateData: { invoice: invoiceData } },
      });
      fileUrl = pdfResult?.url ?? null;
    } catch (pdfErr) {
      logger.warn('Invoice PDF render failed (non-critical):', pdfErr);
    }
  }

  // Record signal
  recordDocSignal(null, userId, 'generated').catch(() => {});

  return { invoice: invoiceData, fileUrl };
}

// ─── 5. recordDocSignal ─────────────────────────────────────

export async function recordDocSignal(
  documentId: string | null,
  userId: string,
  signalType: DocSignalType,
  signalValue?: number,
  context?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('doc_performance_signals').insert({
      document_id: documentId,
      user_id: userId,
      signal_type: signalType,
      signal_value: signalValue ?? null,
      context: (context ?? null) as any,
    });
  } catch (err) {
    logger.warn('Signal recording failed (non-critical):', err);
  }
}

// ─── 6. getUserDocumentLibrary ──────────────────────────────

export async function getUserDocumentLibrary(
  userId: string,
  filters?: { category?: string; starred?: boolean; limit?: number }
): Promise<GeneratedDocument[]> {
  let query = supabase
    .from('documents')
    .select('id, title, template_id, analysis_id, status, created_at, updated_at, document_json')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    logger.warn('Document library fetch failed:', error.message);
    return [];
  }

  return (data ?? []) as unknown as GeneratedDocument[];
}

// Docs Studio Types

export type DocumentStatus = 'draft' | 'review' | 'final';
export type ExportFormat = 'pdf' | 'docx' | 'md' | 'html';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type TemplateTier = 'free' | 'plus';
export type TemplateCategory = 'finance' | 'legal' | 'operations' | 'tech';

// Variable types for template intake forms
export interface TemplateVariable {
  key: string;
  type: 'string' | 'number' | 'date' | 'table' | 'enum' | 'boolean' | 'currency';
  label: string;
  required: boolean;
  default?: string | number | boolean;
  placeholder?: string;
  description?: string;
  autofill?: string; // e.g., "user.company_name", "analysis.mrr"
  options?: string[]; // For enum type
  columns?: string[]; // For table type
}

// Block types for document structure
export interface DocumentBlock {
  id: string;
  type: 'heading' | 'paragraph' | 'table' | 'list' | 'image' | 'signature' | 'divider' | 'quote';
  level?: number; // For headings
  content?: string;
  bind?: string; // For tables binding to variables
  items?: string[]; // For lists
}

// Condition for conditional block inclusion
export interface TemplateCondition {
  if: string; // Expression like "tax_rate > 0"
  include_blocks: string[]; // Block IDs to include
}

// Calculation formula
export interface TemplateCalculation {
  key: string;
  formula: string;
}

// Validation rule
export interface TemplateValidation {
  rule: string;
  message: string;
}

// Template metadata
export interface TemplateMeta {
  id: string;
  version: string;
  category: TemplateCategory;
  tier: TemplateTier;
  name: string;
  description: string;
  icon?: string;
}

// Full template structure
export interface DocumentTemplate {
  meta: TemplateMeta;
  variables: TemplateVariable[];
  blocks: DocumentBlock[];
  conditions?: TemplateCondition[];
  calculations?: TemplateCalculation[];
  validation?: TemplateValidation[];
}

// Database models
export interface DocTemplate {
  id: string;
  template_id: string;
  name: string;
  description: string | null;
  category: TemplateCategory;
  tier: TemplateTier;
  icon: string | null;
  template_json: DocumentTemplate;
  usage_count: number;
  version: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  template_id: string | null;
  analysis_id: string | null;
  title: string;
  document_json: Record<string, unknown>; // ProseMirror/Tiptap JSON
  variables_data: Record<string, unknown>;
  status: DocumentStatus;
  version: number;
  is_shared: boolean;
  share_token: string | null;
  share_expires_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  snapshot_json: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  change_description: string | null;
}

export interface DocumentExport {
  id: string;
  document_id: string;
  user_id: string;
  format: ExportFormat;
  file_url: string | null;
  file_size_bytes: number | null;
  status: ExportStatus;
  error_message: string | null;
  idempotency_key: string | null;
  created_at: string;
  completed_at: string | null;
}

// API request/response types
export interface CreateDocumentRequest {
  template_id: string;
  analysis_id?: string;
  variables: Record<string, unknown>;
  title: string;
}

export interface CreateDocumentResponse {
  success: boolean;
  document_id: string;
  document_json: Record<string, unknown>;
}

export interface ExportDocumentRequest {
  document_id: string;
  format: ExportFormat;
  idempotency_key?: string;
}

export interface ExportDocumentResponse {
  success: boolean;
  export_id: string;
  status: ExportStatus;
  download_url?: string;
}

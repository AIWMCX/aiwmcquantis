import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ExtractedFinancials, aggregateDocumentFinancials, DocumentAnalysisSummary } from '@/types/documentAnalysis';
import type { OptionalFinancialInputs } from '@/types/analysis';

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  parsedContent?: string;
  extractedFinancials?: ExtractedFinancials;
  uploadProgress: number;
  status: 'uploading' | 'parsing' | 'ready' | 'error';
  error?: string;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'text/plain',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.xls', '.csv', '.txt'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

export function useFileUpload(userId: string | undefined) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const validateFile = useCallback((file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `File type not supported. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return `File too large. Maximum size is 10MB`;
    }
    
    return null;
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<UploadedFile | null> => {
    if (!userId) {
      toast.error('Please sign in to upload files');
      return null;
    }

    const validation = validateFile(file);
    if (validation) {
      toast.error(validation);
      return null;
    }

    const fileId = crypto.randomUUID();
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const filePath = `${userId}/${fileId}.${extension}`;

    const newFile: UploadedFile = {
      id: fileId,
      name: file.name,
      url: '',
      type: extension,
      size: file.size,
      uploadProgress: 0,
      status: 'uploading',
    };

    setFiles(prev => [...prev, newFile]);

    try {
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('analysis-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get signed URL for the file
      const { data: urlData } = await supabase.storage
        .from('analysis-documents')
        .createSignedUrl(filePath, 60 * 60 * 24); // 24 hour expiry

      if (!urlData?.signedUrl) {
        throw new Error('Failed to get file URL');
      }

      // Update file status to parsing
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, url: urlData.signedUrl, uploadProgress: 100, status: 'parsing' as const }
          : f
      ));

      // Parse the document
      const { data: parseData, error: parseError } = await supabase.functions.invoke('parse-document', {
        body: { fileUrl: urlData.signedUrl, fileName: file.name, fileType: extension },
      });

      if (parseError) {
        console.error('Parse error:', parseError);
        // Still mark as ready even if parsing fails
        setFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, status: 'ready' as const, parsedContent: '' }
            : f
        ));
      } else {
        const extractedFinancials = parseData?.extractedFinancials as ExtractedFinancials | undefined;
        
        setFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { 
                ...f, 
                status: 'ready' as const, 
                parsedContent: parseData?.content || '',
                extractedFinancials
              }
            : f
        ));

        // Log extracted financials for debugging
        if (extractedFinancials) {
          console.log(`Extracted financials from ${file.name}:`, extractedFinancials);
        }
      }

      return {
        ...newFile,
        url: urlData.signedUrl,
        uploadProgress: 100,
        status: 'ready',
        parsedContent: parseData?.content || '',
        extractedFinancials: parseData?.extractedFinancials,
      };

    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'error' as const, error: errorMessage }
          : f
      ));
      
      toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
      return null;
    }
  }, [userId, validateFile]);

  const uploadFiles = useCallback(async (fileList: FileList | File[]): Promise<void> => {
    const filesArray = Array.from(fileList);
    
    if (files.length + filesArray.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed`);
      return;
    }

    setIsUploading(true);
    
    try {
      await Promise.all(filesArray.map(file => uploadFile(file)));
    } finally {
      setIsUploading(false);
    }
  }, [files.length, uploadFile]);

  const removeFile = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file || !userId) return;

    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const filePath = `${userId}/${fileId}.${extension}`;
      
      await supabase.storage
        .from('analysis-documents')
        .remove([filePath]);

      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (error) {
      console.error('Failed to remove file:', error);
      toast.error('Failed to remove file');
    }
  }, [files, userId]);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const getReadyFiles = useCallback(() => {
    return files.filter(f => f.status === 'ready');
  }, [files]);

  const getParsedContent = useCallback(() => {
    return files
      .filter(f => f.status === 'ready' && f.parsedContent)
      .map(f => `\n--- Document: ${f.name} ---\n${f.parsedContent}`)
      .join('\n');
  }, [files]);

  const getExtractedFinancials = useCallback((): ExtractedFinancials[] => {
    return files
      .filter(f => f.status === 'ready' && f.extractedFinancials)
      .map(f => f.extractedFinancials!);
  }, [files]);

  const getDocumentSummary = useCallback((): DocumentAnalysisSummary | null => {
    const financials = getExtractedFinancials();
    if (financials.length === 0) return null;
    return aggregateDocumentFinancials(financials);
  }, [getExtractedFinancials]);

  // Get suggested form inputs from extracted document data
  const getSuggestedInputs = useCallback((): Partial<OptionalFinancialInputs> => {
    const summary = getDocumentSummary();
    if (!summary) return {};
    
    const suggestions: Partial<OptionalFinancialInputs> = {};
    const extracted = summary.extracted_values;
    
    // Map extracted revenue to form field
    if (extracted.revenue?.value && extracted.revenue.value > 0) {
      suggestions.monthly_revenue = Math.round(extracted.revenue.value);
    } else if (extracted.mrr?.value && extracted.mrr.value > 0) {
      suggestions.monthly_revenue = Math.round(extracted.mrr.value);
    }
    
    // Map investment data
    if (extracted.investment?.value && extracted.investment.value > 0) {
      suggestions.startup_investment = Math.round(extracted.investment.value);
    }
    
    // Map metrics
    if (extracted.customer_count?.value && extracted.customer_count.value > 0) {
      suggestions.expected_customers = Math.round(extracted.customer_count.value);
    }
    
    if (extracted.cac?.value && extracted.cac.value > 0) {
      suggestions.cac = Math.round(extracted.cac.value);
    }
    
    // Map costs
    if (extracted.costs?.value && extracted.costs.value > 0) {
      suggestions.monthly_costs = Math.round(extracted.costs.value);
    }
    
    return suggestions;
  }, [getDocumentSummary]);

  return {
    files,
    isUploading,
    uploadFiles,
    removeFile,
    clearFiles,
    getReadyFiles,
    getParsedContent,
    getExtractedFinancials,
    getDocumentSummary,
    getSuggestedInputs,
    maxFiles: MAX_FILES,
    allowedExtensions: ALLOWED_EXTENSIONS,
  };
}

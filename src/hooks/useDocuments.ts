import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { Document, DocumentStatus } from '@/types/document';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export function useDocuments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['documents', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to load documents: ${error.message}`);
      }

      return (data || []).map(row => ({
        ...row,
        document_json: row.document_json as Record<string, unknown>,
        variables_data: row.variables_data as Record<string, unknown>,
        status: row.status as DocumentStatus,
      })) as Document[];
    },
    enabled: !!user,
  });
}

export function useDocument(documentId: string) {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .is('deleted_at', null)
        .single();

      if (error) {
        throw new Error(`Failed to load document: ${error.message}`);
      }

      return {
        ...data,
        document_json: data.document_json as Record<string, unknown>,
        variables_data: data.variables_data as Record<string, unknown>,
        status: data.status as DocumentStatus,
      } as Document;
    },
    enabled: !!documentId,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      templateId: string;
      analysisId?: string;
      title: string;
      variables: Record<string, unknown>;
      documentJson: Record<string, unknown>;
    }) => {
      if (!user) throw new Error('Must be logged in');

      // Get template UUID from template_id
      const { data: template, error: templateError } = await supabase
        .from('doc_templates')
        .select('id')
        .eq('template_id', params.templateId)
        .single();

      if (templateError) {
        throw new Error(`Template not found: ${templateError.message}`);
      }

      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          template_id: template.id,
          analysis_id: params.analysisId || null,
          title: params.title,
          document_json: params.documentJson as Json,
          variables_data: params.variables as Json,
          status: 'draft',
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create document: ${error.message}`);
      }

      // Increment template usage
      await supabase.rpc('increment_template_usage', { p_template_id: template.id });

      return {
        ...data,
        document_json: data.document_json as Record<string, unknown>,
        variables_data: data.variables_data as Record<string, unknown>,
        status: data.status as DocumentStatus,
      } as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document created!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      documentId: string;
      documentJson?: Record<string, unknown>;
      title?: string;
      status?: DocumentStatus;
    }) => {
      const updates: Record<string, unknown> = {};
      if (params.documentJson) updates.document_json = params.documentJson as Json;
      if (params.title) updates.title = params.title;
      if (params.status) updates.status = params.status;

      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', params.documentId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update document: ${error.message}`);
      }

      return {
        ...data,
        document_json: data.document_json as Record<string, unknown>,
        variables_data: data.variables_data as Record<string, unknown>,
        status: data.status as DocumentStatus,
      } as Document;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document', data.id] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      // Soft delete
      const { error } = await supabase
        .from('documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', documentId);

      if (error) {
        throw new Error(`Failed to delete document: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

export function useDuplicateDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (documentId: string) => {
      if (!user) throw new Error('Must be logged in');

      // Fetch the original document
      const { data: original, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError || !original) {
        throw new Error('Document not found');
      }

      // Create a copy
      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          template_id: original.template_id,
          analysis_id: original.analysis_id,
          title: `Copy of ${original.title}`,
          document_json: original.document_json,
          variables_data: original.variables_data,
          status: 'draft' as const,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to duplicate document: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document duplicated');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

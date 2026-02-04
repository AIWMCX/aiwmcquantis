import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DocTemplate, TemplateCategory } from '@/types/document';

export function useTemplates(category?: TemplateCategory) {
  return useQuery({
    queryKey: ['doc-templates', category],
    queryFn: async () => {
      let query = supabase
        .from('doc_templates')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to load templates: ${error.message}`);
      }

      // Map database results to our type, casting template_json
      return (data || []).map(row => ({
        ...row,
        category: row.category as TemplateCategory,
        tier: row.tier as 'free' | 'plus',
        template_json: row.template_json as unknown as DocTemplate['template_json'],
      })) as DocTemplate[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTemplate(templateId: string) {
  return useQuery({
    queryKey: ['doc-template', templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('doc_templates')
        .select('*')
        .eq('template_id', templateId)
        .eq('is_active', true)
        .single();

      if (error) {
        throw new Error(`Failed to load template: ${error.message}`);
      }

      return {
        ...data,
        category: data.category as TemplateCategory,
        tier: data.tier as 'free' | 'plus',
        template_json: data.template_json as unknown as DocTemplate['template_json'],
      } as DocTemplate;
    },
    enabled: !!templateId,
  });
}

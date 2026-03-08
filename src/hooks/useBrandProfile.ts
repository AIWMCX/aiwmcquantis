import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface BrandProfile {
  id: string;
  user_id: string;
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

export function useBrandProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['brand-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_brand_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as BrandProfile | null;
    },
    enabled: !!user,
  });

  const upsertProfile = useMutation({
    mutationFn: async (updates: Partial<Omit<BrandProfile, 'id' | 'user_id'>>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('user_brand_profiles')
        .upsert({
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-profile', user?.id] });
      toast.success('Brand profile saved');
    },
    onError: (err: Error) => {
      toast.error(`Failed to save profile: ${err.message}`);
    },
  });

  return {
    profile,
    isLoading,
    upsertProfile: upsertProfile.mutate,
    isSaving: upsertProfile.isPending,
  };
}

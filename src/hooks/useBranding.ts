import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface BrandingSettings {
  id: string;
  user_id: string;
  company_name: string | null;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  header_text: string | null;
  footer_text: string | null;
  hide_quantis_branding: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandingConfig {
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  headerText?: string;
  footerText?: string;
  hideQuantisBranding: boolean;
}

interface UseBrandingReturn {
  branding: BrandingSettings | null;
  brandingConfig: BrandingConfig;
  loading: boolean;
  saving: boolean;
  error: string | null;
  updateBranding: (updates: Partial<BrandingConfig>) => Promise<void>;
  uploadLogo: (file: File) => Promise<string | null>;
  removeLogo: () => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

const DEFAULT_BRANDING: BrandingConfig = {
  companyName: 'AIWMC QUANTIS',
  primaryColor: '#3b82f6',
  accentColor: '#22c55e',
  hideQuantisBranding: false,
};

export function useBranding(): UseBrandingReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBranding = useCallback(async () => {
    if (!user) {
      setBranding(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('branding_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setBranding(data);
    } catch (err) {
      console.error('Error fetching branding:', err);
      setError(err instanceof Error ? err.message : 'Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const brandingConfig: BrandingConfig = branding
    ? {
        companyName: branding.company_name || DEFAULT_BRANDING.companyName,
        logoUrl: branding.logo_url || undefined,
        primaryColor: branding.primary_color,
        accentColor: branding.accent_color,
        headerText: branding.header_text || undefined,
        footerText: branding.footer_text || undefined,
        hideQuantisBranding: branding.hide_quantis_branding,
      }
    : DEFAULT_BRANDING;

  const updateBranding = async (updates: Partial<BrandingConfig>) => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to update branding settings',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const dbUpdates = {
        user_id: user.id,
        company_name: updates.companyName,
        logo_url: updates.logoUrl,
        primary_color: updates.primaryColor,
        accent_color: updates.accentColor,
        header_text: updates.headerText,
        footer_text: updates.footerText,
        hide_quantis_branding: updates.hideQuantisBranding,
      };

      // Remove undefined values
      Object.keys(dbUpdates).forEach((key) => {
        if (dbUpdates[key as keyof typeof dbUpdates] === undefined) {
          delete dbUpdates[key as keyof typeof dbUpdates];
        }
      });

      if (branding) {
        // Update existing
        const { error: updateError } = await supabase
          .from('branding_settings')
          .update(dbUpdates)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('branding_settings')
          .insert(dbUpdates);

        if (insertError) throw insertError;
      }

      await fetchBranding();

      toast({
        title: 'Branding Updated',
        description: 'Your custom branding settings have been saved',
      });
    } catch (err) {
      console.error('Error updating branding:', err);
      const message = err instanceof Error ? err.message : 'Failed to update branding';
      setError(message);
      toast({
        title: 'Update Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to upload a logo',
        variant: 'destructive',
      });
      return null;
    }

    // Validate file
    const maxSize = 500 * 1024; // 500KB
    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml'];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PNG, JPEG, or SVG file',
        variant: 'destructive',
      });
      return null;
    }

    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Logo must be under 500KB',
        variant: 'destructive',
      });
      return null;
    }

    try {
      setSaving(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      // Remove existing logo if present
      if (branding?.logo_url) {
        const existingPath = branding.logo_url.split('/').pop();
        if (existingPath) {
          await supabase.storage
            .from('analysis-documents')
            .remove([`${user.id}/${existingPath}`]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('analysis-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('analysis-documents')
        .getPublicUrl(fileName);

      // Update branding with new logo URL
      await updateBranding({ logoUrl: publicUrl });

      return publicUrl;
    } catch (err) {
      console.error('Error uploading logo:', err);
      toast({
        title: 'Upload Failed',
        description: err instanceof Error ? err.message : 'Failed to upload logo',
        variant: 'destructive',
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const removeLogo = async () => {
    if (!user || !branding?.logo_url) return;

    try {
      setSaving(true);

      // Remove from storage
      const fileName = branding.logo_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('analysis-documents')
          .remove([`${user.id}/${fileName}`]);
      }

      // Update branding
      const { error: updateError } = await supabase
        .from('branding_settings')
        .update({ logo_url: null })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      await fetchBranding();

      toast({
        title: 'Logo Removed',
        description: 'Your logo has been removed',
      });
    } catch (err) {
      console.error('Error removing logo:', err);
      toast({
        title: 'Remove Failed',
        description: err instanceof Error ? err.message : 'Failed to remove logo',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!user) return;

    try {
      setSaving(true);

      if (branding) {
        const { error: deleteError } = await supabase
          .from('branding_settings')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
      }

      setBranding(null);

      toast({
        title: 'Branding Reset',
        description: 'Your branding has been reset to defaults',
      });
    } catch (err) {
      console.error('Error resetting branding:', err);
      toast({
        title: 'Reset Failed',
        description: err instanceof Error ? err.message : 'Failed to reset branding',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return {
    branding,
    brandingConfig,
    loading,
    saving,
    error,
    updateBranding,
    uploadLogo,
    removeLogo,
    resetToDefaults,
  };
}

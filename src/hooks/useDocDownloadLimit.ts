import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';

/**
 * Free tier: 3 templates (invoice, quarterly-summary, nda-agreement), 1 download/day
 * Plus tier: all 10 templates, unlimited downloads
 */

const FREE_TEMPLATES = [
  'professional-invoice',
  'quarterly-summary',
  'nda-agreement',
] as const;

const FREE_DOWNLOAD_LIMIT = 1; // 1 download per day

interface DownloadLimitInfo {
  canDownload: boolean;
  downloadsToday: number;
  dailyLimit: number;
  isUnlimited: boolean;
  isFreeTier: boolean;
  nextResetAt: Date;
}

export function useDocDownloadLimit() {
  const { user } = useAuth();
  const { isPlus, loading: subLoading } = useSubscription();
  const [info, setInfo] = useState<DownloadLimitInfo>({
    canDownload: false,
    downloadsToday: 0,
    dailyLimit: FREE_DOWNLOAD_LIMIT,
    isUnlimited: false,
    isFreeTier: true,
    nextResetAt: getNextMidnight(),
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check if a template is available for the user's tier
  const isTemplateAvailable = useCallback((templateId: string): boolean => {
    if (isPlus) return true;
    return (FREE_TEMPLATES as readonly string[]).includes(templateId);
  }, [isPlus]);

  // Fetch today's download count
  const fetchDownloadCount = useCallback(async () => {
    if (!user) {
      setInfo({
        canDownload: false,
        downloadsToday: 0,
        dailyLimit: FREE_DOWNLOAD_LIMIT,
        isUnlimited: false,
        isFreeTier: true,
        nextResetAt: getNextMidnight(),
      });
      setIsLoading(false);
      return;
    }

    if (isPlus) {
      setInfo({
        canDownload: true,
        downloadsToday: 0,
        dailyLimit: Infinity,
        isUnlimited: true,
        isFreeTier: false,
        nextResetAt: getNextMidnight(),
      });
      setIsLoading(false);
      return;
    }

    try {
      // Get today's start (UTC)
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('document_downloads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('downloaded_at', todayStart.toISOString());

      if (error) {
        console.error('Failed to fetch download count:', error);
      }

      const downloadsToday = count || 0;

      setInfo({
        canDownload: downloadsToday < FREE_DOWNLOAD_LIMIT,
        downloadsToday,
        dailyLimit: FREE_DOWNLOAD_LIMIT,
        isUnlimited: false,
        isFreeTier: true,
        nextResetAt: getNextMidnight(),
      });
    } catch (err) {
      console.error('Download limit check failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, isPlus]);

  // Record a download
  const recordDownload = useCallback(async (
    templateId: string,
    format: string
  ): Promise<boolean> => {
    if (!user) return false;

    // Plus users can always download - just record it
    if (isPlus) {
      await supabase.from('document_downloads').insert({
        user_id: user.id,
        template_id: templateId,
        download_format: format,
      });
      return true;
    }

    // Free tier: check limit first
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const { count, error: countError } = await supabase
      .from('document_downloads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('downloaded_at', todayStart.toISOString());

    if (countError) {
      console.error('Download count check failed:', countError);
      return false;
    }

    if ((count || 0) >= FREE_DOWNLOAD_LIMIT) {
      return false; // Limit reached
    }

    // Record the download
    const { error: insertError } = await supabase
      .from('document_downloads')
      .insert({
        user_id: user.id,
        template_id: templateId,
        download_format: format,
      });

    if (insertError) {
      console.error('Failed to record download:', insertError);
      return false;
    }

    // Refresh the count
    await fetchDownloadCount();
    return true;
  }, [user, isPlus, fetchDownloadCount]);

  useEffect(() => {
    if (!subLoading) {
      fetchDownloadCount();
    }
  }, [subLoading, fetchDownloadCount]);

  return {
    ...info,
    isLoading: isLoading || subLoading,
    isTemplateAvailable,
    recordDownload,
    refresh: fetchDownloadCount,
    freeTemplateIds: FREE_TEMPLATES,
  };
}

function getNextMidnight(): Date {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}

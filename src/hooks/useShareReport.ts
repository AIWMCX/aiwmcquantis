import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { logger } from '@/lib/logger';
interface ShareResult {
  share_url: string;
  token: string;
  expires_at: string;
  expires_in_days: number;
  is_existing?: boolean;
}

interface UseShareReportReturn {
  shareReport: (analysisId: string) => Promise<ShareResult | null>;
  revokeShare: (token: string) => Promise<boolean>;
  isSharing: boolean;
  isRevoking: boolean;
  shareUrl: string | null;
  shareToken: string | null;
}

export function useShareReport(): UseShareReportReturn {
  const [isSharing, setIsSharing] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);

  const shareReport = useCallback(async (analysisId: string): Promise<ShareResult | null> => {
    setIsSharing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('share-report', {
        method: 'POST',
        body: { analysis_id: analysisId },
      });

      if (error) {
        logger.error('[useShareReport] Error:', error);
        toast.error('Failed to create share link');
        return null;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Failed to create share link');
        return null;
      }

      setShareUrl(data.share_url);
      setShareToken(data.token);

      // Copy to clipboard
      await navigator.clipboard.writeText(data.share_url);
      
      if (data.is_existing) {
        toast.success('Share link copied!', {
          description: 'Using existing link (expires in 30 days)',
        });
      } else {
        toast.success('Share link created & copied!', {
          description: 'Link expires in 30 days',
        });
      }

      return data as ShareResult;
    } catch (error) {
      logger.error('[useShareReport] Exception:', error);
      toast.error('Failed to create share link');
      return null;
    } finally {
      setIsSharing(false);
    }
  }, []);

  const revokeShare = useCallback(async (token: string): Promise<boolean> => {
    setIsRevoking(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('share-report', {
        method: 'DELETE',
        body: { token },
      });

      if (error) {
        logger.error('[useShareReport] Revoke error:', error);
        toast.error('Failed to revoke share link');
        return false;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Failed to revoke share link');
        return false;
      }

      setShareUrl(null);
      setShareToken(null);
      toast.success('Share link revoked');
      
      return true;
    } catch (error) {
      logger.error('[useShareReport] Revoke exception:', error);
      toast.error('Failed to revoke share link');
      return false;
    } finally {
      setIsRevoking(false);
    }
  }, []);

  return {
    shareReport,
    revokeShare,
    isSharing,
    isRevoking,
    shareUrl,
    shareToken,
  };
}

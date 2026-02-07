import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2, Crown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface PreviewDownloadBarProps {
  onDownloadPDF: () => void;
  onDownloadHTML: () => void;
  isDownloading: boolean;
  hasContent: boolean;
  canDownload?: boolean;
  isFreeTier?: boolean;
  downloadsToday?: number;
  dailyLimit?: number;
}

export function PreviewDownloadBar({
  onDownloadPDF,
  onDownloadHTML,
  isDownloading,
  hasContent,
  canDownload = true,
  isFreeTier = false,
  downloadsToday = 0,
  dailyLimit = 1,
}: PreviewDownloadBarProps) {
  const limitReached = isFreeTier && !canDownload;

  return (
    <div className="flex items-center gap-2 py-2 px-4 border-t border-border bg-muted/30">
      {/* Download limit indicator for free tier */}
      {isFreeTier && (
        <div className="flex-1 text-xs text-muted-foreground">
          {limitReached ? (
            <span className="text-destructive font-medium flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Limit reached — upgrade for unlimited
            </span>
          ) : (
            <span>{downloadsToday}/{dailyLimit} used today</span>
          )}
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className={`gap-2 ${isFreeTier ? '' : 'flex-1'}`}
            disabled={!hasContent || isDownloading || limitReached}
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isDownloading ? 'Preparing...' : limitReached ? 'Limit Reached' : 'Download'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={onDownloadPDF} className="gap-2 cursor-pointer">
            <FileText className="w-4 h-4 text-red-500" />
            <div>
              <p className="font-medium">Save as PDF</p>
              <p className="text-xs text-muted-foreground">Print to PDF dialog</p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDownloadHTML} className="gap-2 cursor-pointer">
            <FileText className="w-4 h-4 text-blue-500" />
            <div>
              <p className="font-medium">Download HTML</p>
              <p className="text-xs text-muted-foreground">Standalone file</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

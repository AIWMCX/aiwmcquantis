import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2 } from 'lucide-react';
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
}

export function PreviewDownloadBar({
  onDownloadPDF,
  onDownloadHTML,
  isDownloading,
  hasContent,
}: PreviewDownloadBarProps) {
  return (
    <div className="flex items-center gap-2 py-2 px-4 border-t border-border bg-muted/30">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            className="gap-2 flex-1"
            disabled={!hasContent || isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isDownloading ? 'Preparing...' : 'Download'}
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

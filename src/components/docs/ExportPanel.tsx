import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { FileDown, FileText, FileType, Code, Loader2, ChevronDown, CheckCircle } from 'lucide-react';
import type { DocumentStatus, ExportFormat } from '@/types/document';

interface ExportPanelProps {
  onExport: (format: ExportFormat) => void;
  isExporting?: boolean;
  status: DocumentStatus;
  onStatusChange: (status: DocumentStatus) => void;
}

const STATUS_OPTIONS: { value: DocumentStatus; label: string; description: string }[] = [
  { value: 'draft', label: 'Draft', description: 'Work in progress' },
  { value: 'review', label: 'Review', description: 'Ready for review' },
  { value: 'final', label: 'Final', description: 'Approved and complete' },
];

export function ExportPanel({ onExport, isExporting, status, onStatusChange }: ExportPanelProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 border-t border-border bg-muted/30">
      {/* Status selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Status:</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {status === 'final' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
              <span className="capitalize">{status}</span>
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {STATUS_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => onStatusChange(option.value)}
                className="flex flex-col items-start"
              >
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Export buttons */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isExporting} className="gap-2">
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              {isExporting ? 'Exporting...' : 'Export'}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onExport('pdf')} className="gap-2">
              <FileText className="w-4 h-4 text-red-500" />
              <span>Export as PDF</span>
              <Badge variant="secondary" className="ml-auto text-xs">Recommended</Badge>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('docx')} className="gap-2">
              <FileType className="w-4 h-4 text-blue-500" />
              <span>Export as Word (.docx)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('md')} className="gap-2">
              <Code className="w-4 h-4 text-muted-foreground" />
              <span>Export as Markdown</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

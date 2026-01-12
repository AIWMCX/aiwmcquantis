import React, { useCallback, useRef } from 'react';
import { Upload, FileText, X, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { UploadedFile } from '@/hooks/useFileUpload';

interface FileUploaderProps {
  files: UploadedFile[];
  isUploading: boolean;
  disabled?: boolean;
  maxFiles: number;
  allowedExtensions: string[];
  onUpload: (files: FileList | File[]) => void;
  onRemove: (fileId: string) => void;
}

function getFileIcon(type: string) {
  switch (type) {
    case 'pdf':
      return <FileText className="w-5 h-5 text-red-500" />;
    case 'docx':
      return <FileText className="w-5 h-5 text-blue-500" />;
    case 'xlsx':
    case 'xls':
    case 'csv':
      return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
    default:
      return <File className="w-5 h-5 text-muted-foreground" />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploader({
  files,
  isUploading,
  disabled,
  maxFiles,
  allowedExtensions,
  onUpload,
  onRemove,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) {
      dropRef.current.classList.add('border-primary', 'bg-primary/5');
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) {
      dropRef.current.classList.remove('border-primary', 'bg-primary/5');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current) {
      dropRef.current.classList.remove('border-primary', 'bg-primary/5');
    }
    
    if (disabled || isUploading) return;
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      onUpload(droppedFiles);
    }
  }, [disabled, isUploading, onUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      onUpload(selectedFiles);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [onUpload]);

  const canUploadMore = files.length < maxFiles && !disabled && !isUploading;

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        ref={dropRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => canUploadMore && inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-all duration-200",
          "flex flex-col items-center justify-center gap-2 text-center",
          canUploadMore 
            ? "cursor-pointer hover:border-primary hover:bg-primary/5 border-muted-foreground/30" 
            : "opacity-50 cursor-not-allowed border-muted-foreground/20"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={allowedExtensions.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={!canUploadMore}
        />
        
        <div className="p-3 rounded-full bg-muted">
          <Upload className={cn(
            "w-6 h-6",
            canUploadMore ? "text-primary" : "text-muted-foreground"
          )} />
        </div>
        
        <div>
          <p className="text-sm font-medium text-foreground">
            {isUploading ? 'Uploading...' : 'Drop files here or click to upload'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOCX, XLSX, CSV, TXT (max 10MB each, up to {maxFiles} files)
          </p>
        </div>
      </div>

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Uploaded Documents ({files.length}/{maxFiles})
          </p>
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  file.status === 'error' 
                    ? "border-destructive/50 bg-destructive/5" 
                    : "border-border bg-muted/30"
                )}
              >
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {getFileIcon(file.type)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">
                    {file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                    
                    {file.status === 'uploading' && (
                      <span className="text-xs text-blue-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Uploading...
                      </span>
                    )}
                    
                    {file.status === 'parsing' && (
                      <span className="text-xs text-amber-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Processing...
                      </span>
                    )}
                    
                    {file.status === 'ready' && (
                      <span className="text-xs text-green-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Ready
                      </span>
                    )}
                    
                    {file.status === 'error' && (
                      <span className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {file.error || 'Error'}
                      </span>
                    )}
                  </div>
                  
                  {/* Upload Progress */}
                  {file.status === 'uploading' && file.uploadProgress < 100 && (
                    <Progress value={file.uploadProgress} className="h-1 mt-2" />
                  )}
                </div>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(file.id);
                  }}
                  disabled={disabled || file.status === 'uploading'}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

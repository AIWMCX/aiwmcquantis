import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Upload, 
  Trash2, 
  FileJson, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Database,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
  Shield,
  CloudOff,
  Cloud
} from "lucide-react";
import { transformKerryDataset, TransformationSummary, BenchmarkRecord } from "@/utils/kerryDataTransformer";
import { uploadBenchmarks, clearBenchmarks, getBenchmarkStats, UploadProgress, BenchmarkStats } from "@/services/benchmarkUploadService";

const DRAFT_STORAGE_KEY = 'quantis_benchmark_draft';

type DataSource = 'none' | 'draft' | 'database';

interface DraftData {
  transformedData: TransformationSummary;
  records: BenchmarkRecord[];
  savedAt: string;
}

export default function AdminBenchmarkUpload() {
  // Admin key state
  const [adminKey, setAdminKey] = useState("");
  const [showAdminKey, setShowAdminKey] = useState(false);
  
  // File and data state
  const [file, setFile] = useState<File | null>(null);
  const [transformedData, setTransformedData] = useState<TransformationSummary | null>(null);
  const [previewRecords, setPreviewRecords] = useState<BenchmarkRecord[]>([]);
  const [dataSource, setDataSource] = useState<DataSource>('none');
  
  // Upload state
  const [batchSize, setBatchSize] = useState("100");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [uploadResult, setUploadResult] = useState<{ inserted: number; updated: number; failed: number; errors: string[] } | null>(null);
  
  // Stats state
  const [stats, setStats] = useState<BenchmarkStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(true);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load draft from localStorage on mount
  useEffect(() => {
    const loadDraft = () => {
      try {
        const draftJson = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (draftJson) {
          const draft: DraftData = JSON.parse(draftJson);
          if (draft.transformedData && draft.records && draft.records.length > 0) {
            setTransformedData(draft.transformedData);
            setPreviewRecords(draft.records);
            setDataSource('draft');
            toast.info(`Restored ${draft.records.length} benchmarks from draft (saved ${new Date(draft.savedAt).toLocaleString()})`);
          }
        }
      } catch (err) {
        console.error('Failed to load draft:', err);
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } finally {
        setIsLoadingDraft(false);
      }
    };
    
    loadDraft();
  }, []);
  
  // Save draft to localStorage whenever transformedData changes
  const saveDraft = useCallback((data: TransformationSummary, records: BenchmarkRecord[]) => {
    try {
      const draft: DraftData = {
        transformedData: data,
        records: records,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  }, []);
  
  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  }, []);
  
  // Load current stats
  const loadStats = useCallback(async () => {
    if (!adminKey) {
      toast.error("Please enter admin key first");
      return;
    }
    
    setIsLoadingStats(true);
    const result = await getBenchmarkStats(adminKey);
    setIsLoadingStats(false);
    
    if (result.error) {
      toast.error(`Failed to load stats: ${result.error}`);
    } else if (result.stats) {
      setStats(result.stats);
      toast.success(`Database has ${result.stats.totalRecords} benchmark records`);
    }
  }, [adminKey]);
  
  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.json')) {
      toast.error("Please select a JSON file");
      return;
    }
    
    if (selectedFile.size > 50 * 1024 * 1024) {
      toast.error("File too large (max 50MB)");
      return;
    }
    
    setFile(selectedFile);
    setTransformedData(null);
    setUploadResult(null);
    
    // Parse and transform the file
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const result = transformKerryDataset(json);
        setTransformedData(result);
        setPreviewRecords(result.records); // Show all aggregated benchmarks
        setDataSource('draft');
        // Save to localStorage
        saveDraft(result, result.records);
        
        if (result.successful > 0) {
          toast.success(`Aggregated ${result.total} scenarios into ${result.successful} business type benchmarks (saved as draft)`);
        } else {
          toast.error("No valid records found in file");
        }
      } catch (err) {
        toast.error(`Failed to parse JSON: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsText(selectedFile);
  }, [saveDraft]);
  
  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const fakeEvent = {
        target: { files: [droppedFile] }
      } as unknown as React.ChangeEvent<HTMLInputElement>;
      handleFileSelect(fakeEvent);
    }
  }, [handleFileSelect]);
  
  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!adminKey) {
      toast.error("Please enter admin key");
      return;
    }
    
    if (!transformedData || transformedData.records.length === 0) {
      toast.error("No valid records to upload");
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(null);
    setUploadResult(null);
    
    try {
      const result = await uploadBenchmarks(
        transformedData.records,
        adminKey,
        parseInt(batchSize),
        setUploadProgress
      );
      
      setUploadResult(result);
      
      if (result.success) {
        toast.success(`Successfully uploaded ${result.inserted + result.updated} records`);
        // Clear draft after successful upload
        clearDraft();
        setDataSource('database');
        loadStats();
      } else {
        toast.error(`Upload completed with ${result.errors.length} errors`);
      }
    } catch (err) {
      toast.error(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  }, [adminKey, transformedData, batchSize, loadStats]);
  
  // Handle clear
  const handleClear = useCallback(async () => {
    if (!adminKey) {
      toast.error("Please enter admin key");
      return;
    }
    
    const result = await clearBenchmarks(adminKey);
    
    if (result.success) {
      toast.success("All benchmark data cleared");
      setStats({ totalRecords: 0, industries: [] });
    } else {
      toast.error(`Failed to clear: ${result.error}`);
    }
  }, [adminKey]);
  
  // Reset form
  const resetForm = () => {
    setFile(null);
    setTransformedData(null);
    setPreviewRecords([]);
    setUploadProgress(null);
    setUploadResult(null);
    setDataSource('none');
    clearDraft();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Export transformed data
  const exportTransformedData = () => {
    if (!transformedData) return;
    
    const blob = new Blob([JSON.stringify(transformedData.records, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transformed_benchmarks.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const progressPercent = uploadProgress 
    ? Math.round((uploadProgress.current / uploadProgress.total) * 100) 
    : 0;
  
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Admin: Benchmark Data Upload</h1>
            <p className="text-muted-foreground">
              Upload Kerry dataset to industry_benchmarks table
            </p>
          </div>
        </div>
        
        {/* Admin Key Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Authentication
            </CardTitle>
            <CardDescription>
              Enter the admin upload key to enable operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showAdminKey ? "text" : "password"}
                  placeholder="Enter admin key..."
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminKey(!showAdminKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showAdminKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button 
                variant="outline" 
                onClick={loadStats}
                disabled={!adminKey || isLoadingStats}
              >
                {isLoadingStats ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                <span className="ml-2">Check DB</span>
              </Button>
            </div>
            
            {stats && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Database className="h-4 w-4" />
                  <span className="font-medium">Current Records:</span>
                  <Badge variant="secondary">{stats.totalRecords}</Badge>
                </div>
                {stats.industries.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Sample: {stats.industries.slice(0, 5).map(i => i.industry_name).join(', ')}
                    {stats.industries.length > 5 && '...'}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Dataset
            </CardTitle>
            <CardDescription>
              Load the built-in Kerry dataset or upload a custom JSON file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Data Source Status */}
            {!isLoadingDraft && (
              <div className="flex items-center gap-2">
                {dataSource === 'database' && (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    <Cloud className="h-3 w-3 mr-1" />
                    Synced with Database
                  </Badge>
                )}
                {dataSource === 'draft' && (
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                    <CloudOff className="h-3 w-3 mr-1" />
                    Draft - Pending Upload
                  </Badge>
                )}
                {dataSource === 'none' && (
                  <Badge variant="outline" className="text-muted-foreground">
                    No data loaded
                  </Badge>
                )}
              </div>
            )}
            
            {/* Quick Actions */}
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="default"
                onClick={async () => {
                  try {
                    toast.info("Loading Kerry dataset...");
                    const response = await fetch('/data/kerry_full_dataset_1000.json');
                    if (!response.ok) throw new Error('Failed to fetch dataset');
                    const json = await response.json();
                    const result = transformKerryDataset(json);
                    setTransformedData(result);
                    setPreviewRecords(result.records);
                    setFile(null);
                    setDataSource('draft');
                    // Save to localStorage
                    saveDraft(result, result.records);
                    if (result.successful > 0) {
                      toast.success(`Loaded ${result.total} scenarios → ${result.successful} business type benchmarks (saved as draft)`);
                    } else {
                      toast.error("No valid records found");
                    }
                  } catch (err) {
                    toast.error(`Failed to load: ${err instanceof Error ? err.message : 'Unknown error'}`);
                  }
                }}
                className="flex-1"
                disabled={isUploading || isLoadingDraft}
              >
                <Database className="h-4 w-4 mr-2" />
                Load Kerry Dataset
              </Button>
              
              {/* One-Click Upload Button */}
              <Button
                variant="secondary"
                onClick={async () => {
                  if (!adminKey) {
                    toast.error("Please enter admin key first");
                    return;
                  }
                  
                  try {
                    // Step 1: Load dataset
                    toast.info("Loading Kerry dataset...");
                    const response = await fetch('/data/kerry_full_dataset_1000.json');
                    if (!response.ok) throw new Error('Failed to fetch dataset');
                    const json = await response.json();
                    const result = transformKerryDataset(json);
                    
                    if (result.successful === 0) {
                      toast.error("No valid records found in dataset");
                      return;
                    }
                    
                    setTransformedData(result);
                    setPreviewRecords(result.records);
                    setFile(null);
                    
                    // Step 2: Upload to database
                    toast.info(`Uploading ${result.successful} benchmarks to database...`);
                    setIsUploading(true);
                    setUploadProgress(null);
                    setUploadResult(null);
                    
                    const uploadResult = await uploadBenchmarks(
                      result.records,
                      adminKey,
                      parseInt(batchSize),
                      setUploadProgress
                    );
                    
                    setUploadResult(uploadResult);
                    
                    if (uploadResult.success) {
                      toast.success(`Successfully uploaded ${uploadResult.inserted + uploadResult.updated} benchmarks to database!`);
                      clearDraft();
                      setDataSource('database');
                      loadStats();
                    } else {
                      toast.error(`Upload completed with ${uploadResult.errors.length} errors`);
                      setDataSource('draft');
                      saveDraft(result, result.records);
                    }
                  } catch (err) {
                    toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
                  } finally {
                    setIsUploading(false);
                  }
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={isUploading || isLoadingDraft || !adminKey}
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Quick Upload Kerry Dataset
                  </>
                )}
              </Button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or upload custom file</span>
              </div>
            </div>
            
            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <FileJson className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              {file ? (
                <div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Drop JSON file or click to browse</p>
                </div>
              )}
            </div>
            
            {/* Transformation Results */}
            {transformedData && (
              <div className="space-y-4">
                <Separator />
                
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium">{transformedData.successful}</span>
                    <span className="text-muted-foreground">business types</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileJson className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">{transformedData.total}</span>
                    <span className="text-muted-foreground">scenarios processed</span>
                  </div>
                  {transformedData.failed > 0 && (
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-destructive" />
                      <span className="font-medium">{transformedData.failed}</span>
                      <span className="text-muted-foreground">failed</span>
                    </div>
                  )}
                  {transformedData.warnings > 0 && (
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">{transformedData.warnings}</span>
                      <span className="text-muted-foreground">skipped (no benchmarks)</span>
                    </div>
                  )}
                </div>
                
                {/* Business Types Found */}
                {'businessTypes' in transformedData && transformedData.businessTypes && (
                  <div className="flex flex-wrap gap-2">
                    {(transformedData.businessTypes as string[]).map((type) => (
                      <Badge key={type} variant="secondary">{type}</Badge>
                    ))}
                  </div>
                )}
                
                {/* Errors */}
                {transformedData.errors.length > 0 && (
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Transformation Errors</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside mt-2 text-sm max-h-32 overflow-y-auto">
                        {transformedData.errors.slice(0, 10).map((e, i) => (
                          <li key={i}>Record {e.index + 1}: {e.errors.join(', ')}</li>
                        ))}
                        {transformedData.errors.length > 10 && (
                          <li>...and {transformedData.errors.length - 10} more</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Preview Table */}
                {previewRecords.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Preview ({previewRecords.length} aggregated benchmarks)</h4>
                    <div className="border rounded-lg overflow-auto max-h-80">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[180px]">Business Type</TableHead>
                            <TableHead>Gross Margin</TableHead>
                            <TableHead>Net Margin</TableHead>
                            <TableHead>LTV/CAC Ratio</TableHead>
                            <TableHead>Growth Rate</TableHead>
                            <TableHead>Sample Size</TableHead>
                            <TableHead>Keywords</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {previewRecords.map((record, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{record.industry_name}</TableCell>
                              <TableCell>
                                {record.gross_margin_min && record.gross_margin_max 
                                  ? `${record.gross_margin_min}-${record.gross_margin_max}%` 
                                  : record.gross_margin_avg 
                                    ? `${record.gross_margin_avg}%` 
                                    : '-'}
                              </TableCell>
                              <TableCell>
                                {record.net_margin_avg !== undefined 
                                  ? `${record.net_margin_avg.toFixed(1)}%` 
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                {record.ltv_cac_ratio_min 
                                  ? `${record.ltv_cac_ratio_min}:1+` 
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                {record.growth_rate_percent 
                                  ? `${record.growth_rate_percent}%` 
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{record.sample_size || 0}</Badge>
                              </TableCell>
                              <TableCell className="text-xs max-w-[200px] truncate">
                                {record.keywords.slice(0, 3).join(', ')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={exportTransformedData}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Transformed
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Upload Controls */}
        {transformedData && transformedData.successful > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload to Database</CardTitle>
              <CardDescription>
                Upload {transformedData.successful} records to industry_benchmarks table
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 items-end">
                <div className="space-y-2">
                  <Label>Batch Size</Label>
                  <Select value={batchSize} onValueChange={setBatchSize}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="200">200</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={handleUpload} 
                  disabled={!adminKey || isUploading}
                  className="min-w-[150px]"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload All
                    </>
                  )}
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={!adminKey}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Database
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear All Benchmark Data?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all records from the industry_benchmarks table.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground">
                        Yes, Clear All Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              {/* Upload Progress */}
              {uploadProgress && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      Chunk {uploadProgress.currentChunk} of {uploadProgress.totalChunks}
                    </span>
                    <span>
                      {uploadProgress.current} / {uploadProgress.total} records
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-600">
                      ✓ {uploadProgress.successful} successful
                    </span>
                    {uploadProgress.failed > 0 && (
                      <span className="text-destructive">
                        ✗ {uploadProgress.failed} failed
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              {/* Upload Result */}
              {uploadResult && (
                <Alert variant={uploadResult.errors.length > 0 ? "destructive" : "default"}>
                  {uploadResult.errors.length > 0 ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {uploadResult.errors.length > 0 ? 'Upload Completed with Errors' : 'Upload Complete'}
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-2">
                      <p>Inserted: {uploadResult.inserted} | Updated: {uploadResult.updated} | Failed: {uploadResult.failed}</p>
                      {uploadResult.errors.length > 0 && (
                        <ul className="list-disc list-inside mt-2 text-sm max-h-32 overflow-y-auto">
                          {uploadResult.errors.slice(0, 10).map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                          {uploadResult.errors.length > 10 && (
                            <li>...and {uploadResult.errors.length - 10} more errors</li>
                          )}
                        </ul>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Admin access only • Data is uploaded via manage-benchmarks edge function
        </p>
      </div>
    </div>
  );
}

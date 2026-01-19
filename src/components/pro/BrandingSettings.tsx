import React, { useState, useRef } from 'react';
import { useBranding, BrandingConfig } from '@/hooks/useBranding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Palette, 
  Upload, 
  Trash2, 
  RotateCcw, 
  Save,
  Image as ImageIcon,
  Eye
} from 'lucide-react';

export function BrandingSettings() {
  const {
    branding,
    brandingConfig,
    loading,
    saving,
    updateBranding,
    uploadLogo,
    removeLogo,
    resetToDefaults,
  } = useBranding();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localConfig, setLocalConfig] = useState<Partial<BrandingConfig>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Merge local changes with stored config
  const currentConfig = { ...brandingConfig, ...localConfig };

  const handleChange = <K extends keyof BrandingConfig>(
    key: K,
    value: BrandingConfig[K]
  ) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    await updateBranding(currentConfig);
    setLocalConfig({});
    setHasChanges(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadLogo(file);
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = async () => {
    await resetToDefaults();
    setLocalConfig({});
    setHasChanges(false);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Custom Branding
        </CardTitle>
        <CardDescription>
          Customize your PDF exports with your company branding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div className="space-y-3">
          <Label>Company Logo</Label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/50 overflow-hidden">
              {currentConfig.logoUrl ? (
                <img
                  src={currentConfig.logoUrl}
                  alt="Company logo"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Logo
              </Button>
              {currentConfig.logoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeLogo}
                  disabled={saving}
                  className="gap-2 text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                PNG, JPG, or SVG (max 500KB)
              </p>
            </div>
          </div>
        </div>

        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            value={currentConfig.companyName || ''}
            onChange={(e) => handleChange('companyName', e.target.value)}
            placeholder="Your Company Name"
          />
          <p className="text-xs text-muted-foreground">
            Displayed on PDF cover and headers
          </p>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="primaryColor"
                value={currentConfig.primaryColor}
                onChange={(e) => handleChange('primaryColor', e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={currentConfig.primaryColor}
                onChange={(e) => handleChange('primaryColor', e.target.value)}
                className="flex-1 font-mono text-sm"
                placeholder="#3b82f6"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="accentColor">Accent Color</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="accentColor"
                value={currentConfig.accentColor}
                onChange={(e) => handleChange('accentColor', e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={currentConfig.accentColor}
                onChange={(e) => handleChange('accentColor', e.target.value)}
                className="flex-1 font-mono text-sm"
                placeholder="#22c55e"
              />
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <div className="space-y-2">
          <Label htmlFor="footerText">Custom Footer Text</Label>
          <Input
            id="footerText"
            value={currentConfig.footerText || ''}
            onChange={(e) => handleChange('footerText', e.target.value)}
            placeholder="© 2026 Your Company. All rights reserved."
          />
        </div>

        {/* Hide Quantis Branding */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
          <div>
            <Label htmlFor="hideQuantis" className="font-medium">
              Hide AIWMC Quantis Branding
            </Label>
            <p className="text-sm text-muted-foreground">
              Remove "Powered by AIWMC Quantis" from PDF exports
            </p>
          </div>
          <Switch
            id="hideQuantis"
            checked={currentConfig.hideQuantisBranding}
            onCheckedChange={(checked) => handleChange('hideQuantisBranding', checked)}
          />
        </div>

        {/* Preview */}
        <div className="p-4 rounded-lg border border-border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Preview</span>
          </div>
          <div 
            className="p-6 rounded-lg text-white text-center"
            style={{ backgroundColor: currentConfig.primaryColor }}
          >
            {currentConfig.logoUrl && (
              <img
                src={currentConfig.logoUrl}
                alt="Logo preview"
                className="h-8 mx-auto mb-2 object-contain"
              />
            )}
            <div className="text-lg font-bold">{currentConfig.companyName}</div>
            <div 
              className="text-sm mt-1 opacity-90"
              style={{ color: currentConfig.accentColor }}
            >
              Business Analysis Report
            </div>
          </div>
          {currentConfig.footerText && (
            <div className="text-center text-xs text-muted-foreground mt-3">
              {currentConfig.footerText}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving || (!branding && !hasChanges)}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

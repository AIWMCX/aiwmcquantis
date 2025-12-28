import React from 'react';
import { Building2, Sparkles, ChevronDown, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { INDUSTRY_OPTIONS } from '@/types/analysis';
import { cn } from '@/lib/utils';

interface IndustrySelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function IndustrySelector({ value, onChange, disabled }: IndustrySelectorProps) {
  const selectedIndustry = INDUSTRY_OPTIONS.find(i => i.id === value) || INDUSTRY_OPTIONS[0];
  const isManualSelection = value && value !== 'auto';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          Industry
        </Label>
        {isManualSelection && (
          <Badge variant="secondary" className="text-xs gap-1 bg-primary/10 text-primary border-0">
            <Sparkles className="w-3 h-3" />
            +10% confidence
          </Badge>
        )}
      </div>
      
      <Select value={value || 'auto'} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={cn(
          "w-full transition-colors",
          isManualSelection && "border-primary/30 bg-primary/5"
        )}>
          <SelectValue>
            <div className="flex items-center gap-2">
              <span className="text-base">{selectedIndustry.icon}</span>
              <span>{selectedIndustry.name}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {INDUSTRY_OPTIONS.map((industry) => (
            <SelectItem 
              key={industry.id} 
              value={industry.id}
              className="cursor-pointer"
            >
              <div className="flex items-center gap-3 py-1">
                <span className="text-lg flex-shrink-0">{industry.icon}</span>
                <div className="flex flex-col">
                  <span className="font-medium">{industry.name}</span>
                  <span className="text-xs text-muted-foreground">{industry.description}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {!isManualSelection && (
        <p className="text-xs text-muted-foreground">
          Select your industry for more accurate benchmarks
        </p>
      )}
    </div>
  );
}

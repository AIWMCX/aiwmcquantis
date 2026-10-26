import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
}

export function CurrencyInput({
  id,
  label,
  icon,
  value,
  onChange,
  disabled = false,
  placeholder = '0',
  min = 0,
  max = 100000000,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(value > 0 ? value.toLocaleString('en-US') : '');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const numValue = parseInt(raw, 10) || 0;
    const clampedValue = Math.min(Math.max(numValue, min), max);
    
    setDisplayValue(raw ? clampedValue.toLocaleString('en-US') : '');
    onChange(clampedValue);
  }, [onChange, min, max]);

  const handleBlur = useCallback(() => {
    if (value > 0) {
      setDisplayValue(value.toLocaleString('en-US'));
    }
  }, [value]);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
          $
        </span>
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            "pl-7 h-11 text-base font-medium",
            "focus:ring-2 focus:ring-primary/20"
          )}
        />
      </div>
    </div>
  );
}

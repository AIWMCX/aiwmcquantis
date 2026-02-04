import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, Plus, Trash2, ArrowRight, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { TemplateVariable, DocumentTemplate } from '@/types/document';

interface IntakeFormProps {
  template: DocumentTemplate;
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  onBack: () => void;
  isLoading?: boolean;
}

// Build Zod schema dynamically from template variables
function buildSchema(variables: TemplateVariable[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const v of variables) {
    let field: z.ZodTypeAny;

    switch (v.type) {
      case 'string':
        field = z.string();
        break;
      case 'number':
      case 'currency':
        field = z.coerce.number();
        break;
      case 'date':
        field = z.date();
        break;
      case 'boolean':
        field = z.boolean();
        break;
      case 'enum':
        field = z.string();
        break;
      case 'table':
        field = z.array(z.record(z.union([z.string(), z.number()])));
        break;
      default:
        field = z.unknown();
    }

    if (!v.required) {
      field = field.optional();
    }

    shape[v.key] = field;
  }

  return z.object(shape);
}

export function IntakeForm({ 
  template, 
  initialValues = {}, 
  onSubmit, 
  onBack,
  isLoading 
}: IntakeFormProps) {
  const schema = React.useMemo(() => buildSchema(template.variables), [template.variables]);

  const defaultValues = React.useMemo(() => {
    const values: Record<string, unknown> = {};
    for (const v of template.variables) {
      if (initialValues[v.key] !== undefined) {
        values[v.key] = initialValues[v.key];
      } else if (v.default !== undefined) {
        values[v.key] = v.default;
      } else if (v.type === 'table') {
        values[v.key] = [{}];
      } else if (v.type === 'boolean') {
        values[v.key] = false;
      }
    }
    return values;
  }, [template.variables, initialValues]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const renderField = (variable: TemplateVariable) => {
    const error = errors[variable.key];

    switch (variable.type) {
      case 'string':
        return (
          <Input
            {...register(variable.key)}
            placeholder={variable.placeholder}
            className={cn(error && 'border-destructive')}
          />
        );

      case 'number':
      case 'currency':
        return (
          <div className="relative">
            {variable.type === 'currency' && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            )}
            <Input
              {...register(variable.key)}
              type="number"
              step={variable.type === 'currency' ? '0.01' : '1'}
              placeholder={variable.placeholder}
              className={cn(variable.type === 'currency' && 'pl-7', error && 'border-destructive')}
            />
          </div>
        );

      case 'date': {
        const dateValue = watch(variable.key);
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !dateValue && 'text-muted-foreground',
                  error && 'border-destructive'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateValue ? format(new Date(dateValue as string), 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue ? new Date(dateValue as string) : undefined}
                onSelect={(date) => setValue(variable.key, date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );
      }

      case 'boolean':
        return (
          <div className="flex items-center gap-3">
            <Switch
              checked={!!watch(variable.key)}
              onCheckedChange={(checked) => setValue(variable.key, checked)}
            />
            <span className="text-sm text-muted-foreground">
              {watch(variable.key) ? 'Yes' : 'No'}
            </span>
          </div>
        );

      case 'enum':
        return (
          <Select
            value={watch(variable.key) as string}
            onValueChange={(value) => setValue(variable.key, value)}
          >
            <SelectTrigger className={cn(error && 'border-destructive')}>
              <SelectValue placeholder={variable.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent>
              {variable.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'table':
        return <TableField variable={variable} control={control} register={register} />;

      default:
        return <Textarea {...register(variable.key)} placeholder={variable.placeholder} />;
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Fill in the Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {template.variables.map((variable) => (
            <div key={variable.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor={variable.key}>
                  {variable.label}
                  {variable.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {variable.description && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{variable.description}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              {renderField(variable)}
              {errors[variable.key] && (
                <p className="text-sm text-destructive">
                  {errors[variable.key]?.message as string}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" disabled={isLoading} className="gap-2">
          Generate Document
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );
}

// Table field component for line items (e.g., invoice items)
function TableField({ 
  variable, 
  control,
  register 
}: { 
  variable: TemplateVariable; 
  control: any;
  register: any;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: variable.key,
  });

  const columns = variable.columns || ['item', 'value'];

  return (
    <div className="space-y-3">
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              {columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left text-sm font-medium capitalize">
                  {col}
                </th>
              ))}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} className="border-t">
                {columns.map((col) => (
                  <td key={col} className="px-3 py-2">
                    <Input
                      {...register(`${variable.key}.${index}.${col}`)}
                      placeholder={col}
                      className="h-8"
                    />
                  </td>
                ))}
                <td className="px-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({})}
        className="gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Row
      </Button>
    </div>
  );
}

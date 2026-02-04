import React, { useState } from 'react';
import { useTemplates } from '@/hooks/useTemplates';
import { TemplateCard } from './TemplateCard';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileText, Scale, Settings, Code } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { TemplateCategory, DocTemplate } from '@/types/document';

interface TemplatePickerProps {
  onSelect: (template: DocTemplate) => void;
  selectedId?: string;
}

const CATEGORIES: { value: TemplateCategory | 'all'; label: string; icon: React.ReactNode }[] = [
  { value: 'all', label: 'All', icon: <FileText className="w-4 h-4" /> },
  { value: 'finance', label: 'Finance', icon: <FileText className="w-4 h-4" /> },
  { value: 'legal', label: 'Legal', icon: <Scale className="w-4 h-4" /> },
  { value: 'operations', label: 'Operations', icon: <Settings className="w-4 h-4" /> },
  { value: 'tech', label: 'Tech', icon: <Code className="w-4 h-4" /> },
];

export function TemplatePicker({ onSelect, selectedId }: TemplatePickerProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<TemplateCategory | 'all'>('all');
  
  const { data: templates, isLoading } = useTemplates(
    category === 'all' ? undefined : category
  );

  const filteredTemplates = templates?.filter((t) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(searchLower) ||
      t.description?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Choose a Template</h2>
        <p className="text-muted-foreground">
          Start with a professional template and customize it to your needs.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category tabs */}
      <Tabs value={category} onValueChange={(v) => setCategory(v as TemplateCategory | 'all')}>
        <TabsList className="w-full grid grid-cols-5">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value} className="gap-2">
              {cat.icon}
              <span className="hidden sm:inline">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Template grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 rounded-lg" />
          ))}
        </div>
      ) : filteredTemplates?.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No templates found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates?.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedId === template.template_id}
              onSelect={() => onSelect(template)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

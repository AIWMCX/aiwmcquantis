/**
 * A/B Testing Dashboard Card
 * 
 * Displays current experiment assignments and allows admins to
 * force specific variants for testing purposes.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FlaskConical, 
  RefreshCw, 
  Settings,
  Eye
} from 'lucide-react';
import { 
  EXPERIMENTS, 
  getAllExperimentAssignments, 
  forceVariant, 
  resetExperiments,
  getVariant 
} from '@/lib/abTesting';
import { toast } from 'sonner';

export function ABTestingCard() {
  const [assignments, setAssignments] = useState<Record<string, string>>(
    getAllExperimentAssignments()
  );
  const [isResetting, setIsResetting] = useState(false);

  const refreshAssignments = () => {
    setAssignments(getAllExperimentAssignments());
  };

  const handleForceVariant = (experimentKey: string, variant: string) => {
    forceVariant(experimentKey as keyof typeof EXPERIMENTS, variant as never);
    refreshAssignments();
    toast.success(`Forced ${experimentKey} to "${variant}". Refresh the page to see changes.`);
  };

  const handleReset = () => {
    setIsResetting(true);
    resetExperiments();
    
    // Re-assign variants
    Object.keys(EXPERIMENTS).forEach((key) => {
      getVariant(key as keyof typeof EXPERIMENTS);
    });
    
    refreshAssignments();
    setIsResetting(false);
    toast.success('All experiments reset. New variants assigned.');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">A/B Testing</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={isResetting}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
            Reset All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Current experiment assignments for this browser. Force variants for testing.
        </p>

        <div className="space-y-4">
          {Object.entries(EXPERIMENTS).map(([key, experiment]) => {
            const currentVariant = assignments[key] || 'Not assigned';
            
            return (
              <div key={key} className="p-4 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">{experiment.id}</h4>
                    <p className="text-xs text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    <Eye className="h-3 w-3 mr-1" />
                    {currentVariant}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Select
                    onValueChange={(value) => handleForceVariant(key, value)}
                    defaultValue={assignments[key]}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Force variant..." />
                    </SelectTrigger>
                    <SelectContent>
                      {experiment.variants.map((variant) => (
                        <SelectItem key={variant} value={variant}>
                          {variant}
                          {variant === currentVariant && ' (current)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleForceVariant(key, experiment.variants[0])}
                    title="Reset to control"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {experiment.variants.map((variant) => (
                    <Badge
                      key={variant}
                      variant={variant === currentVariant ? 'default' : 'outline'}
                      className="text-xs cursor-pointer"
                      onClick={() => handleForceVariant(key, variant)}
                    >
                      {variant}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Testing Instructions</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Select a variant to force it for this browser</li>
            <li>• Refresh the page to see the variant in action</li>
            <li>• Use "Reset All" to get fresh random assignments</li>
            <li>• Check Google Analytics for experiment_exposure events</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

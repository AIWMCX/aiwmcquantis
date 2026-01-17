import { Loader2 } from "lucide-react";

/**
 * Full-page loading fallback for React.lazy code splitting
 * Displays centered spinner with professional branding
 */
const LoadingFallback = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm font-medium">
          Loading AIWMC Quantis™...
        </p>
      </div>
    </div>
  );
};

export default LoadingFallback;

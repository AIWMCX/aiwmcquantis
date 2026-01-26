import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton-first loading fallback for React.lazy code splitting
 * 
 * Displays content-shaped skeletons that match the actual page structure
 * for better perceived performance (content-first approach).
 * 
 * This dramatically improves perceived load time by showing recognizable
 * page structure immediately instead of a generic spinner.
 */
const LoadingFallback = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation skeleton */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-32" />
          </div>
          
          {/* Navigation links skeleton - hidden on mobile */}
          <div className="hidden md:flex items-center gap-6">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-14" />
          </div>
          
          {/* CTA button skeleton */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>
      </header>

      {/* Hero section skeleton */}
      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge skeleton */}
          <div className="flex justify-center">
            <Skeleton className="h-6 w-48 rounded-full" />
          </div>
          
          {/* Headline skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-12 md:h-16 w-3/4 mx-auto" />
            <Skeleton className="h-12 md:h-16 w-1/2 mx-auto" />
          </div>
          
          {/* Subheadline skeleton */}
          <div className="space-y-2 max-w-2xl mx-auto">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5 mx-auto" />
          </div>
          
          {/* CTA buttons skeleton */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Skeleton className="h-12 w-48 rounded-lg mx-auto sm:mx-0" />
            <Skeleton className="h-12 w-36 rounded-lg mx-auto sm:mx-0" />
          </div>
          
          {/* Trust indicators skeleton */}
          <div className="flex flex-wrap justify-center gap-6 pt-8">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        </div>

        {/* Demo preview skeleton */}
        <div className="mt-16 max-w-5xl mx-auto">
          <Skeleton className="h-[400px] md:h-[500px] w-full rounded-2xl" />
        </div>
      </main>

      {/* Footer skeleton */}
      <footer className="border-t border-border/40 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <Skeleton className="h-4 w-40" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-14" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LoadingFallback;

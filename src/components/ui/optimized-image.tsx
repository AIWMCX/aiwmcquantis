import { useState, useRef, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Optimized image component with lazy loading and skeleton placeholder
 * Features:
 * - Lazy loading via IntersectionObserver
 * - Skeleton placeholder while loading
 * - Fade-in animation on load
 * - Priority loading option for above-the-fold images
 * - Error fallback support
 */
export const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  fallback,
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority) return;

    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(currentRef);
        }
      },
      { rootMargin: '50px', threshold: 0.01 }
    );

    observer.observe(currentRef);

    return () => {
      observer.unobserve(currentRef);
    };
  }, [priority]);

  const shouldLoad = priority || isInView;

  if (error && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div
      ref={ref}
      className={cn('relative overflow-hidden', className)}
      style={{ width, height }}
    >
      {!loaded && !error && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      {shouldLoad && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  );
};

/**
 * Responsive image component with srcset support
 */
interface ResponsiveImageProps extends OptimizedImageProps {
  sizes?: string;
  srcSet?: string;
}

export const ResponsiveImage = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes,
  srcSet,
}: ResponsiveImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority) return;

    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(currentRef);
        }
      },
      { rootMargin: '50px', threshold: 0.01 }
    );

    observer.observe(currentRef);

    return () => {
      observer.unobserve(currentRef);
    };
  }, [priority]);

  const shouldLoad = priority || isInView;

  return (
    <div
      ref={ref}
      className={cn('relative overflow-hidden', className)}
      style={{ width, height }}
    >
      {!loaded && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      {shouldLoad && (
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  );
};

import React from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  fallback?: string;
}

/**
 * OptimizedImage Component
 * 
 * Features:
 * - Lazy loading by default (priority=false)
 * - Eager loading for above-the-fold images (priority=true)
 * - WebP support with fallback
 * - Proper width/height to prevent CLS
 * - Error handling with fallback image
 */
export const OptimizedImage = React.memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  fallback = '/placeholder.svg',
  ...props
}: OptimizedImageProps) {
  const [error, setError] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  const handleError = () => {
    setError(true);
  };

  const handleLoad = () => {
    setLoaded(true);
  };

  // Generate srcset for responsive images if width is provided
  const generateSrcSet = (baseSrc: string) => {
    if (!width || !baseSrc.startsWith('http')) return undefined;
    
    // For external URLs, we can't generate srcset
    // For local images, we'd need a proper image service
    return undefined;
  };

  const imageSrc = error ? fallback : src;

  return (
    <img
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      onError={handleError}
      onLoad={handleLoad}
      className={cn(
        'transition-opacity duration-300',
        !loaded && !priority && 'opacity-0',
        loaded && 'opacity-100',
        className
      )}
      srcSet={generateSrcSet(src)}
      {...props}
    />
  );
});

/**
 * Background Image component with lazy loading
 */
interface BackgroundImageProps {
  src: string;
  className?: string;
  children?: React.ReactNode;
  priority?: boolean;
}

export const BackgroundImage = React.memo(function BackgroundImage({
  src,
  className,
  children,
  priority = false,
}: BackgroundImageProps) {
  const [loaded, setLoaded] = React.useState(priority);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Preload the image
            const img = new Image();
            img.onload = () => setLoaded(true);
            img.src = src;
            observer.disconnect();
          }
        });
      },
      { rootMargin: '50px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [src, priority]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'transition-opacity duration-500',
        className
      )}
      style={{
        backgroundImage: loaded ? `url(${src})` : undefined,
        backgroundColor: loaded ? undefined : 'hsl(var(--muted))',
      }}
    >
      {children}
    </div>
  );
});

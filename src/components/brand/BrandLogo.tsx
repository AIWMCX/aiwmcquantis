import React from 'react';
import logo from '@/assets/brand/aiwmc-quantis-logo.webp';
import { cn } from '@/lib/utils';

/**
 * The approved AIWMC QUANTIS logo (silver/white lockup). It is designed for
 * dark surfaces and must not be recoloured or inverted; on a light surface
 * pass `tile` so it sits on its own navy plate instead.
 */
export function BrandLogo({
  height = 32,
  tile = false,
  className,
  alt = 'AIWMC Quantis',
}: {
  height?: number;
  tile?: boolean;
  className?: string;
  alt?: string;
}) {
  const img = (
    <img
      src={logo}
      alt={alt}
      width={Math.round((height * 217) / 82)}
      height={height}
      style={{ height, width: 'auto' }}
      className="block select-none object-contain"
      draggable={false}
      decoding="async"
    />
  );
  if (!tile) return <span className={cn('inline-flex', className)}>{img}</span>;
  return (
    <span
      className={cn('inline-flex items-center rounded-[6px]', className)}
      style={{
        background: 'linear-gradient(160deg, #0b1430, #050a1a)',
        padding: `${Math.round(height * 0.22)}px ${Math.round(height * 0.32)}px`,
        boxShadow: '0 0 0 1px rgba(110,155,255,0.18) inset',
      }}
    >
      {img}
    </span>
  );
}

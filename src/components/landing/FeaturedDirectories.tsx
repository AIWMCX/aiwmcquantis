import React from 'react';

/**
 * FeaturedDirectories — "As featured in" trust marquee.
 * Continuously scrolls directory names right-to-left in a single seamless motion.
 */
const DIRECTORIES = [
  'SaaSHub',
  'TopAI.tools',
  'Dang.ai',
  'insidr.ai',
  'There\'s An AI For That',
  'AI Tools Directory',
  'Futurepedia',
  'Product Hunt',
];

export function FeaturedDirectories() {
  // Duplicate list for seamless infinite scroll
  const items = [...DIRECTORIES, ...DIRECTORIES];

  return (
    <section
      aria-label="Featured in directories"
      className="border-y overflow-hidden"
      style={{
        borderColor: 'var(--q-border-default)',
        background: 'var(--q-bg-elevated)',
      }}
    >
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <p
          className="text-center text-[11px] uppercase tracking-[0.2em] mb-4"
          style={{ color: 'var(--q-text-tertiary)' }}
        >
          As featured in
        </p>

        <div className="relative">
          {/* Edge fade masks */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10"
            style={{
              background:
                'linear-gradient(to right, var(--q-bg-elevated), transparent)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10"
            style={{
              background:
                'linear-gradient(to left, var(--q-bg-elevated), transparent)',
            }}
          />

          <div className="flex w-max animate-marquee-x">
            {items.map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="flex items-center gap-2 px-8 whitespace-nowrap"
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--q-accent-primary)' }}
                  aria-hidden="true"
                />
                <span
                  className="text-base sm:text-lg font-semibold tracking-tight"
                  style={{ color: 'var(--q-text-primary)' }}
                >
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Quantis Design System — Shared Template Typography Constants
// Used in HTML string templates where CSS classes aren't available

export const tFont = {
  display: "'Sora', 'Inter', sans-serif",
  body: "'DM Sans', 'Inter', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

export const tStyle = {
  h1: `font-family: ${tFont.display}; font-weight: 700; letter-spacing: -0.02em;`,
  h2: `font-family: ${tFont.display}; font-weight: 600; letter-spacing: -0.01em;`,
  body: `font-family: ${tFont.body}; font-weight: 400;`,
  label: `font-family: ${tFont.body}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;`,
  metric: `font-family: ${tFont.mono}; font-weight: 600; font-variant-numeric: tabular-nums;`,
  legal: `font-family: ${tFont.body}; font-weight: 400; line-height: 1.8;`,
};

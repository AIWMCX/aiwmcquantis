import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const uiSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/ContentStudio.tsx'),
  'utf8',
);

describe('Content Studio UI: Visual format selector (Quantis Visual System, part 4)', () => {
  it('exposes all four brief-specified options: Auto, Financial chart, Editorial headline, Product proof', () => {
    expect(uiSource).toContain("{ id: 'auto', label: 'Auto' }");
    expect(uiSource).toContain("{ id: 'financial_chart', label: 'Financial chart' }");
    expect(uiSource).toContain("{ id: 'editorial_headline', label: 'Editorial headline' }");
    expect(uiSource).toMatch(/id:\s*'product_proof'/);
  });

  it('disables Product proof rather than silently pretending it works -- no renderer exists for it yet', () => {
    const idx = uiSource.indexOf("id: 'product_proof'");
    const line = uiSource.slice(idx, idx + 150);
    expect(line).toContain('disabled: true');
  });

  it('sends the selected visual_format to content-studio-generate', () => {
    expect(uiSource).toContain('visual_format: visualFormat');
  });

  it('reads visual_mode/source_status back from the response for the badges', () => {
    expect(uiSource).toContain("setVisualMode((data as any).visual_mode ?? null)");
    expect(uiSource).toContain("setSourceStatus((data as any).source_status ?? null)");
  });
});

describe('Content Studio UI: result panel relabeled per the brief (SD)', () => {
  it('names the deterministic card "Quantis social asset preview", not "Generated Image"', () => {
    expect(uiSource).toContain('Quantis social asset preview');
    // The old generic label for the deterministic card is gone.
    expect(uiSource).not.toMatch(/Headline card \(AIWMC Quantis brand template\)/);
  });

  it('the deterministic card renders before the FLUX photo -- the photo is secondary, not the primary "Generated Image"', () => {
    const cardIdx = uiSource.indexOf('Quantis social asset preview');
    const photoIdx = uiSource.indexOf('Optional background texture');
    expect(cardIdx).toBeGreaterThan(-1);
    expect(photoIdx).toBeGreaterThan(-1);
    expect(cardIdx).toBeLessThan(photoIdx);
  });

  it('never labels the FLUX photo "Generated Image" -- it is an optional background texture now', () => {
    expect(uiSource).not.toContain('Generated image (Hugging Face FLUX.1-schnell)');
    expect(uiSource).toContain('Optional background texture');
  });

  it('shows a Financial chart badge and an Illustrative example badge when applicable', () => {
    expect(uiSource).toMatch(/visualMode === 'financial_chart'[\s\S]{0,120}Financial chart/);
    expect(uiSource).toMatch(/sourceStatus === 'illustrative'[\s\S]{0,220}Illustrative example/);
  });

  it('provides a working PNG download control (keyboard-accessible native <a>, not a div/onClick)', () => {
    const idx = uiSource.indexOf('Download PNG');
    expect(idx).toBeGreaterThan(-1);
    const block = uiSource.slice(Math.max(0, idx - 400), idx);
    expect(block).toContain('download=');
    expect(block).toContain('href={card.url}');
    expect(block).toContain('focus-visible:outline');
  });

  it('gives the card meaningful alt text (the actual topic), not a generic label', () => {
    expect(uiSource).toMatch(/alt=\{`AIWMC Quantis social asset: \$\{topic \|\| 'generated post'\}`\}/);
  });
});
